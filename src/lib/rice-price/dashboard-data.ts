import { readJsonResponse } from "@/lib/http/json";

import type {
  ForecastReliability,
  RiceDataQuality,
  RiceForecastRecord,
  RicePriceDashboardData,
  RicePriceDataType,
  RicePriceRecord,
  RicePriceSummary,
} from "./types";

const DATASET_API = "/api/v1/datasets/rice_price";
const PAGE_SIZE = 500;
const MONTHS_TH = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
] as const;

interface RicePriceApiRow {
  id?: number | string;
  observed_on: string;
  year: number;
  month: number;
  rice_type: string;
  price: number | string;
  unit: string;
  data_type: "actual" | "forecast";
  source: string | null;
  is_imputed: boolean;
  model_name: string | null;
  model_version: string | null;
  reliability: number | string | null;
  reliability_label: string | null;
  metadata: Record<string, unknown> | null;
  rice_type_code?: string;
  updated_at?: string | null;
}

interface RicePriceDatasetPage {
  data: RicePriceApiRow[];
  meta: {
    version: {
      id: string;
      version_key: string;
      label: string;
      description: string;
      source_name: string;
      source_url: string | null;
      published_at: string | null;
    };
    page: number;
    perPage: number;
    total: number;
  };
}

interface DatasetErrorPayload {
  error?: { message?: string };
}

function numeric(value: number | string, field: string): number {
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`ข้อมูล ${field} ไม่ถูกต้อง`);
  return result;
}

function metadataText(row: RicePriceApiRow, field: string): string | null {
  const value = row.metadata?.[field];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedPricePer100Kg(row: RicePriceApiRow): number {
  const price = numeric(row.price, "price");
  const unit = row.unit.toLowerCase().replace(/[\s._-]+/g, "");
  if (/100(?:กก|กิโลกรัม|kg|kilograms?)/.test(unit)) return price;
  if (/ตัน|tonne?|metricton/.test(unit)) return price / 10;
  if (/กก|กิโลกรัม|kg|kilograms?/.test(unit)) return price * 100;
  throw new Error(`ไม่รองรับหน่วยราคาข้าว "${row.unit}" กรุณาใช้บาท/100 กก., บาท/กก. หรือบาท/ตัน`);
}

function rowPriority(row: RicePriceApiRow): number {
  if (row.data_type === "forecast") return 1;
  return row.is_imputed ? 2 : 3;
}

function canonicalRows(rows: RicePriceApiRow[]): RicePriceApiRow[] {
  const selected = new Map<string, RicePriceApiRow>();
  for (const row of rows) {
    const key = `${row.rice_type_code || row.rice_type}\u0000${row.observed_on}`;
    const current = selected.get(key);
    if (!current) {
      selected.set(key, row);
      continue;
    }
    const priorityDifference = rowPriority(row) - rowPriority(current);
    const updatedDifference = (row.updated_at || "").localeCompare(current.updated_at || "");
    const idDifference = String(row.id ?? "").localeCompare(String(current.id ?? ""), "en", {
      numeric: true,
    });
    if (priorityDifference > 0 || (priorityDifference === 0 && (updatedDifference > 0 || (updatedDifference === 0 && idDifference > 0)))) {
      selected.set(key, row);
    }
  }
  return [...selected.values()];
}

function normalizedReliability(row: RicePriceApiRow): ForecastReliability | null {
  const label = row.reliability_label?.trim().toLowerCase();
  if (label === "high" || label === "สูง") return "High";
  if (label === "medium" || label === "กลาง") return "Medium";
  if (label === "low" || label === "ต่ำ") return "Low";
  if (row.reliability === null || row.reliability === "") return null;
  const score = Number(row.reliability);
  if (!Number.isFinite(score)) return null;
  if (score >= 0.8) return "High";
  if (score >= 0.5) return "Medium";
  return "Low";
}

function normalizedDataType(row: RicePriceApiRow): RicePriceDataType {
  if (row.data_type === "forecast") return "forecast";
  return row.is_imputed ? "imputed" : "observed";
}

async function fetchPage(page: number, signal?: AbortSignal): Promise<RicePriceDatasetPage> {
  const response = await fetch(`${DATASET_API}?page=${page}&perPage=${PAGE_SIZE}`, {
    signal,
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  const payload = await readJsonResponse<RicePriceDatasetPage | DatasetErrorPayload>(response);
  if (!response.ok || !("data" in payload) || !("meta" in payload)) {
    const message = "error" in payload ? payload.error?.message : undefined;
    throw new Error(message || "ไม่สามารถโหลดข้อมูลราคาข้าวจาก Dataset เริ่มต้นได้");
  }
  if (!Array.isArray(payload.data) || !payload.meta.version?.id) {
    throw new Error("รูปแบบข้อมูลราคาข้าวจากเซิร์ฟเวอร์ไม่ถูกต้อง");
  }
  return payload;
}

async function fetchAllRows(signal?: AbortSignal): Promise<{
  firstPage: RicePriceDatasetPage;
  rows: RicePriceApiRow[];
}> {
  const firstPage = await fetchPage(1, signal);
  const pageCount = Math.ceil(firstPage.meta.total / PAGE_SIZE);
  const remainingPages = await Promise.all(
    Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
      fetchPage(index + 2, signal)
    )
  );
  if (remainingPages.some((page) => page.meta.version.id !== firstPage.meta.version.id)) {
    throw new Error("Dataset เริ่มต้นเปลี่ยนระหว่างโหลดข้อมูล กรุณาลองอีกครั้ง");
  }
  return {
    firstPage,
    rows: [firstPage, ...remainingPages].flatMap((page) => page.data),
  };
}

function toRecord(row: RicePriceApiRow): RicePriceRecord {
  const yearAd = Number(row.year);
  const month = Number(row.month);
  if (!Number.isInteger(yearAd) || !Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("ข้อมูลปีหรือเดือนของราคาข้าวไม่ถูกต้อง");
  }
  return {
    date: row.observed_on,
    yearAd,
    yearBe: yearAd + 543,
    month,
    monthNameTh: metadataText(row, "monthNameTh") ?? MONTHS_TH[month - 1],
    riceType: row.rice_type,
    price: normalizedPricePer100Kg(row),
    dataType: normalizedDataType(row),
    isImputed: row.is_imputed,
    imputeMethod: metadataText(row, "imputeMethod"),
    model: row.model_name,
    paramSet: metadataText(row, "parameterSet") ?? row.model_version,
    forecastMethod: metadataText(row, "forecastMethod"),
    forecastReliability: normalizedReliability(row),
    source: row.source,
  };
}

function forecastRows(rows: RicePriceApiRow[]): RiceForecastRecord[] {
  return rows
    .filter((row) => row.data_type === "forecast")
    .map((row) => {
      const record = toRecord(row);
      return {
        date: record.date,
        yearAd: record.yearAd,
        yearBe: record.yearBe,
        month: record.month,
        monthNameTh: record.monthNameTh,
        riceType: record.riceType,
        forecastPrice: record.price,
        model: row.model_name ?? "Published Dataset",
        paramSet: metadataText(row, "parameterSet") ?? row.model_version ?? "ไม่ระบุ",
        forecastMethod: metadataText(row, "forecastMethod") ?? "Published Dataset",
        forecastReliability: normalizedReliability(row) ?? "Medium",
      };
    });
}

function summarizeForecasts(records: RiceForecastRecord[]): RicePriceSummary[] {
  const riceTypes = [...new Set(records.map((record) => record.riceType))];
  return riceTypes.map((riceType) => {
    const rows = records
      .filter((record) => record.riceType === riceType)
      .sort((first, second) => first.date.localeCompare(second.date));
    const values = rows.map((row) => row.forecastPrice);
    const mean = values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
    const variance = values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(values.length, 1);
    const first = values[0] ?? 0;
    const last = values.at(-1) ?? 0;
    return {
      riceType,
      forecastYear: rows[0]?.yearBe ?? 0,
      forecastMin: Math.min(...values),
      forecastMax: Math.max(...values),
      forecastMean: mean,
      forecastSd: Math.sqrt(variance),
      january: rows.find((row) => row.month === 1)?.forecastPrice ?? first,
      december: rows.find((row) => row.month === 12)?.forecastPrice ?? last,
      change: last - first,
      changePct: first === 0 ? 0 : ((last - first) / first) * 100,
      reliability: rows[0]?.forecastReliability ?? "Medium",
      status: rows.length === 12 ? "complete" : "partial",
    };
  });
}

function qualityRows(records: RicePriceRecord[]): RiceDataQuality[] {
  return [...new Set(records.map((record) => record.riceType))].map((riceType) => {
    const rows = records.filter((record) => record.riceType === riceType);
    const forecast = rows.filter((record) => record.dataType === "forecast").length;
    const imputed = rows.filter((record) => record.dataType === "imputed").length;
    const observed = rows.filter((record) => record.dataType === "observed").length;
    const historicalTotal = observed + imputed;
    return {
      riceType,
      forecast,
      imputed,
      observed,
      historicalTotal,
      observedPct: historicalTotal ? (observed / historicalTotal) * 100 : 0,
      imputedPct: historicalTotal ? (imputed / historicalTotal) * 100 : 0,
    };
  });
}

export async function fetchRicePriceDashboardData(
  signal?: AbortSignal
): Promise<RicePriceDashboardData> {
  const { firstPage, rows } = await fetchAllRows(signal);
  if (rows.length === 0) throw new Error("Dataset ราคาข้าวเริ่มต้นยังไม่มีข้อมูล");
  const selectedRows = canonicalRows(rows);
  const monthly = selectedRows.map(toRecord).sort((first, second) =>
    first.date.localeCompare(second.date) || first.riceType.localeCompare(second.riceType, "th")
  );
  const allForecasts = forecastRows(selectedRows);
  const latestForecastYear = allForecasts.reduce(
    (latest, record) => Math.max(latest, record.yearBe),
    0
  );
  const forecasts = allForecasts.filter((record) => record.yearBe === latestForecastYear);
  const riceTypes = [...new Set(monthly.map((record) => record.riceType))];
  const yearsBe = [...new Set(monthly.map((record) => record.yearBe))].sort((a, b) => a - b);
  const availableMonths = [...new Set(monthly.map((record) => record.month))].sort((a, b) => a - b);
  const version = firstPage.meta.version;

  return {
    dataset: {
      id: version.id,
      versionKey: version.version_key,
      label: version.label,
      description: version.description,
      sourceName: version.source_name,
      sourceUrl: version.source_url,
      publishedAt: version.published_at,
      recordCount: firstPage.meta.total,
    },
    monthly,
    forecasts,
    summaries: summarizeForecasts(forecasts),
    modelPerformance: [],
    quality: qualityRows(monthly),
    filters: {
      riceTypes,
      yearsBe,
      months: availableMonths.map((month) => ({ value: month, label: MONTHS_TH[month - 1] })),
      regions: [],
      provinces: [],
      availability: {
        riceType: riceTypes.length > 1,
        year: yearsBe.length > 1,
        month: availableMonths.length > 1,
        region: false,
        province: false,
      },
      notes: {
        region: "Dataset ราคาข้าวไม่มีข้อมูลระดับภูมิภาค",
        province: "Dataset ราคาข้าวไม่มีข้อมูลระดับจังหวัด",
      },
    },
  };
}
