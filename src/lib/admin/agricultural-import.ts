import "server-only";

import { createHash } from "node:crypto";

export const AGRICULTURAL_DATASET_TYPES = [
  "rice_price",
  "flood",
  "drought",
  "storm",
] as const;

export type AgriculturalDatasetType = (typeof AGRICULTURAL_DATASET_TYPES)[number];
export type AgriculturalRow = Record<string, unknown>;

export interface ProvinceLookup {
  ids: Set<number>;
  names: Map<string, number>;
}

export interface AgriculturalImportReport {
  rows: AgriculturalRow[];
  receivedRows: number;
  errorCount: number;
  errors: Array<{ row: number | null; message: string }>;
  warnings: string[];
  provinceCount: number;
  years: number[];
  duplicateCount: number;
  unknownProvinceCount: number;
  columns: string[];
}

const COLUMNS: Record<AgriculturalDatasetType, string[]> = {
  rice_price: [
    "observed_on", "year", "month", "rice_type", "rice_type_code", "price",
    "unit", "data_type", "source", "is_imputed", "model_name", "model_version",
    "forecast_date", "reliability", "reliability_label", "metadata",
  ],
  flood: [
    "year", "month", "province_id", "flood_events", "affected_area_rai",
    "affected_households", "affected_people", "agricultural_damage_rai", "source",
  ],
  drought: [
    "year", "month", "province_id", "drought_events", "affected_area_rai",
    "affected_households", "agricultural_damage_rai", "source",
  ],
  storm: [
    "occurred_on", "year", "month", "province_id", "storm_type", "storm_events",
    "affected_people", "affected_households", "damaged_houses",
    "agricultural_damage_rai", "source",
  ],
};

const RICE_TYPE_CODES = new Map([
  ["ข้าวขาว", "white-rice"],
  ["ข้าวนึ่ง", "parboiled-rice"],
  ["ข้าวหอมปทุมธานี", "pathum-thani-fragrant-rice"],
  ["ข้าวหอมมะลิ", "jasmine-rice"],
  ["ข้าวเหนียว", "glutinous-rice"],
]);

function normalizedName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, "").toLowerCase();
}

function valueOf(row: AgriculturalRow, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") return row[key];
  }
  return undefined;
}

function textValue(value: unknown, label: string, rowNumber: number, options: { required?: boolean; max?: number } = {}): string | null {
  const text = value === null || value === undefined ? "" : String(value).trim();
  if (!text) {
    if (options.required) throw new Error(`แถว ${rowNumber}: ไม่พบ ${label}`);
    return null;
  }
  if (text.length > (options.max ?? 500)) throw new Error(`แถว ${rowNumber}: ${label}ยาวเกินกำหนด`);
  return text;
}

function numberValue(value: unknown, label: string, rowNumber: number, options: { required?: boolean; integer?: boolean; min?: number; max?: number } = {}): number | null {
  if (value === null || value === undefined || value === "") {
    if (options.required) throw new Error(`แถว ${rowNumber}: ไม่พบ ${label}`);
    return null;
  }
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(parsed) || (options.integer && !Number.isInteger(parsed))) {
    throw new Error(`แถว ${rowNumber}: ${label}ต้องเป็นตัวเลข${options.integer ? "จำนวนเต็ม" : ""}`);
  }
  if (options.min !== undefined && parsed < options.min) throw new Error(`แถว ${rowNumber}: ${label}ต้องไม่น้อยกว่า ${options.min}`);
  if (options.max !== undefined && parsed > options.max) throw new Error(`แถว ${rowNumber}: ${label}ต้องไม่เกิน ${options.max}`);
  return parsed;
}

function integerValue(value: unknown, label: string, rowNumber: number, min: number, max: number): number {
  return numberValue(value, label, rowNumber, { required: true, integer: true, min, max }) as number;
}

function yearValue(value: unknown, rowNumber: number): number {
  let year = integerValue(value, "year", rowNumber, 1900, 2700);
  if (year > 2400) year -= 543;
  if (year < 1900 || year > 2200) throw new Error(`แถว ${rowNumber}: year ต้องอยู่ระหว่าง 1900–2200`);
  return year;
}

function booleanValue(value: unknown, rowNumber: number): boolean {
  if (typeof value === "boolean") return value;
  const text = String(value ?? "").trim().toLowerCase();
  if (["", "0", "false", "no", "n"].includes(text)) return false;
  if (["1", "true", "yes", "y"].includes(text)) return true;
  throw new Error(`แถว ${rowNumber}: ค่า boolean ต้องเป็น true/false หรือ 1/0`);
}

function dateValue(value: unknown, label: string, rowNumber: number, required = false): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`แถว ${rowNumber}: ไม่พบ ${label}`);
    return null;
  }
  const text = value instanceof Date
    ? value.toISOString().slice(0, 10)
    : String(value).trim();
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(text)
    ? text
    : (() => {
        const parsed = new Date(text);
        return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
      })();
  const parsedDate = iso ? new Date(`${iso}T00:00:00Z`) : null;
  if (!iso || !parsedDate || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== iso) {
    throw new Error(`แถว ${rowNumber}: ${label}ต้องเป็นวันที่ YYYY-MM-DD`);
  }
  return iso;
}

function provinceId(row: AgriculturalRow, rowNumber: number, provinces: ProvinceLookup): number {
  const direct = valueOf(row, "province_id", "provinceId");
  if (direct !== undefined) {
    const id = integerValue(direct, "province_id", rowNumber, 1, 999);
    if (!provinces.ids.has(id)) throw new Error(`แถว ${rowNumber}: ไม่พบ province_id ${id}`);
    return id;
  }
  const name = valueOf(row, "province", "province_th", "province_en", "จังหวัด");
  const id = provinces.names.get(normalizedName(name));
  if (!id) throw new Error(`แถว ${rowNumber}: ไม่พบจังหวัด “${String(name ?? "") || "ว่าง"}”`);
  return id;
}

function metadataValue(value: unknown, rowNumber: number): AgriculturalRow {
  if (value === undefined || value === null || value === "") return {};
  if (typeof value === "object" && !Array.isArray(value)) return value as AgriculturalRow;
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as AgriculturalRow;
    } catch {
      // Use the common error below.
    }
  }
  throw new Error(`แถว ${rowNumber}: metadata ต้องเป็น JSON object`);
}

function ricePriceRow(row: AgriculturalRow, rowNumber: number): AgriculturalRow {
  const observedOn = dateValue(valueOf(row, "observed_on", "date"), "observed_on", rowNumber, true) as string;
  const date = new Date(`${observedOn}T00:00:00Z`);
  const year = valueOf(row, "year", "year_ad", "year_be") === undefined
    ? date.getUTCFullYear()
    : yearValue(valueOf(row, "year", "year_ad", "year_be"), rowNumber);
  const month = valueOf(row, "month") === undefined
    ? date.getUTCMonth() + 1
    : integerValue(valueOf(row, "month"), "month", rowNumber, 1, 12);
  if (year !== date.getUTCFullYear() || month !== date.getUTCMonth() + 1) {
    throw new Error(`แถว ${rowNumber}: year/month ไม่ตรงกับ observed_on`);
  }
  const riceType = textValue(valueOf(row, "rice_type", "riceType"), "rice_type", rowNumber, { required: true, max: 160 }) as string;
  const sourceDataType = String(valueOf(row, "data_type", "dataType") ?? "actual").trim().toLowerCase();
  const dataType = sourceDataType === "forecast" ? "forecast" : "actual";
  const code = textValue(valueOf(row, "rice_type_code", "riceTypeCode"), "rice_type_code", rowNumber, { max: 80 })
    ?? RICE_TYPE_CODES.get(riceType)
    ?? `rice-${createHash("sha1").update(riceType).digest("hex").slice(0, 12)}`;
  const reliabilitySource = valueOf(row, "reliability");
  const reliability = reliabilitySource === undefined || reliabilitySource === ""
    ? null
    : numberValue(reliabilitySource, "reliability", rowNumber, { min: 0, max: 1 });
  return {
    observed_on: observedOn,
    year,
    month,
    rice_type: riceType,
    rice_type_code: code,
    price: numberValue(valueOf(row, "price", "forecast_price"), "price", rowNumber, { required: true, min: 0 }),
    unit: textValue(valueOf(row, "unit"), "unit", rowNumber, { max: 80 }) ?? "บาท/ตัน",
    data_type: dataType,
    source: textValue(valueOf(row, "source"), "source", rowNumber, { max: 500 }) ?? "",
    is_imputed: sourceDataType === "imputed" || booleanValue(valueOf(row, "is_imputed"), rowNumber),
    model_name: textValue(valueOf(row, "model_name", "model"), "model_name", rowNumber, { max: 160 }),
    model_version: textValue(valueOf(row, "model_version"), "model_version", rowNumber, { max: 160 }),
    forecast_date: dateValue(valueOf(row, "forecast_date"), "forecast_date", rowNumber),
    reliability,
    reliability_label: textValue(valueOf(row, "reliability_label", "forecast_reliability"), "reliability_label", rowNumber, { max: 80 }),
    metadata: metadataValue(valueOf(row, "metadata"), rowNumber),
  };
}

function disasterCategory(row: AgriculturalRow): AgriculturalDatasetType | null {
  const value = normalizedName(valueOf(row, "disaster_type", "category", "ภัย"));
  if (!value) return null;
  if (["flood", "น้ำท่วม"].includes(value)) return "flood";
  if (["drought", "ภัยแล้ง"].includes(value)) return "drought";
  if (["storm", "พายุ"].includes(value)) return "storm";
  return null;
}

function disasterRow(type: Exclude<AgriculturalDatasetType, "rice_price">, row: AgriculturalRow, rowNumber: number, provinces: ProvinceLookup): AgriculturalRow {
  const occurredOn = type === "storm"
    ? dateValue(valueOf(row, "occurred_on", "date"), "occurred_on", rowNumber)
    : null;
  const occurredDate = occurredOn ? new Date(`${occurredOn}T00:00:00Z`) : null;
  const year = valueOf(row, "year", "year_ad", "year_be", "ปี") === undefined
    ? occurredDate?.getUTCFullYear()
    : yearValue(valueOf(row, "year", "year_ad", "year_be", "ปี"), rowNumber);
  const month = valueOf(row, "month", "เดือนเลข") === undefined
    ? occurredDate ? occurredDate.getUTCMonth() + 1 : undefined
    : integerValue(valueOf(row, "month", "เดือนเลข"), "month", rowNumber, 1, 12);
  if (!year || !month) throw new Error(`แถว ${rowNumber}: ไม่พบ year หรือ month`);
  const id = provinceId(row, rowNumber, provinces);
  const eventValue = valueOf(row, `${type}_events`, "event_count", "record_count");
  const common = {
    year,
    month,
    province_id: id,
    source: textValue(valueOf(row, "source"), "source", rowNumber, { max: 500 }) ?? "",
  };
  if (type === "flood") return {
    ...common,
    flood_events: integerValue(eventValue, "flood_events", rowNumber, 0, 10_000_000),
    affected_area_rai: numberValue(valueOf(row, "affected_area_rai"), "affected_area_rai", rowNumber, { min: 0 }),
    affected_households: numberValue(valueOf(row, "affected_households"), "affected_households", rowNumber, { integer: true, min: 0 }),
    affected_people: numberValue(valueOf(row, "affected_people"), "affected_people", rowNumber, { integer: true, min: 0 }),
    agricultural_damage_rai: numberValue(valueOf(row, "agricultural_damage_rai"), "agricultural_damage_rai", rowNumber, { min: 0 }),
  };
  if (type === "drought") return {
    ...common,
    drought_events: integerValue(eventValue, "drought_events", rowNumber, 0, 10_000_000),
    affected_area_rai: numberValue(valueOf(row, "affected_area_rai"), "affected_area_rai", rowNumber, { min: 0 }),
    affected_households: numberValue(valueOf(row, "affected_households"), "affected_households", rowNumber, { integer: true, min: 0 }),
    agricultural_damage_rai: numberValue(valueOf(row, "agricultural_damage_rai"), "agricultural_damage_rai", rowNumber, { min: 0 }),
  };
  const finalOccurredOn = occurredOn ?? `${year}-${String(month).padStart(2, "0")}-01`;
  if (occurredDate && (occurredDate.getUTCFullYear() !== year || occurredDate.getUTCMonth() + 1 !== month)) {
    throw new Error(`แถว ${rowNumber}: year/month ไม่ตรงกับ occurred_on`);
  }
  return {
    ...common,
    occurred_on: finalOccurredOn,
    storm_type: textValue(valueOf(row, "storm_type"), "storm_type", rowNumber, { max: 160 }) ?? "monthly-record",
    storm_events: integerValue(eventValue, "storm_events", rowNumber, 0, 10_000_000),
    affected_people: numberValue(valueOf(row, "affected_people"), "affected_people", rowNumber, { integer: true, min: 0 }),
    affected_households: numberValue(valueOf(row, "affected_households"), "affected_households", rowNumber, { integer: true, min: 0 }),
    damaged_houses: numberValue(valueOf(row, "damaged_houses"), "damaged_houses", rowNumber, { integer: true, min: 0 }),
    agricultural_damage_rai: numberValue(valueOf(row, "agricultural_damage_rai"), "agricultural_damage_rai", rowNumber, { min: 0 }),
  };
}

function uniqueKey(type: AgriculturalDatasetType, row: AgriculturalRow): string {
  if (type === "rice_price") return [row.rice_type_code, row.observed_on, row.data_type, row.model_version ?? ""].join(":");
  if (type === "storm") return [row.occurred_on, row.province_id, row.storm_type].join(":");
  return [row.year, row.month, row.province_id].join(":");
}

export function inspectAgriculturalRows(
  type: AgriculturalDatasetType,
  sourceRows: Array<Record<string, unknown>>,
  provinces: ProvinceLookup
): AgriculturalImportReport {
  const rows: AgriculturalRow[] = [];
  const errors: Array<{ row: number | null; message: string }> = [];
  const warnings: string[] = [];
  const keys = new Set<string>();
  let duplicateCount = 0;
  let unknownProvinceCount = 0;
  let skippedCategories = 0;

  sourceRows.forEach((source, index) => {
    const rowNumber = index + 2;
    const category = disasterCategory(source);
    if (type !== "rice_price" && category && category !== type) {
      skippedCategories += 1;
      return;
    }
    try {
      const row = type === "rice_price"
        ? ricePriceRow(source, rowNumber)
        : disasterRow(type, source, rowNumber, provinces);
      const key = uniqueKey(type, row);
      if (keys.has(key)) {
        duplicateCount += 1;
        throw new Error(`แถว ${rowNumber}: ข้อมูลซ้ำกับแถวก่อนหน้า (${key})`);
      }
      keys.add(key);
      rows.push(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : `แถว ${rowNumber}: ข้อมูลไม่ถูกต้อง`;
      if (message.includes("ไม่พบจังหวัด") || message.includes("province_id")) unknownProvinceCount += 1;
      errors.push({ row: rowNumber, message: message.replace(/^แถว \d+:\s*/, "") });
    }
  });

  if (skippedCategories) warnings.push(`ข้าม ${skippedCategories.toLocaleString()} แถวที่เป็นภัยประเภทอื่น`);
  const years = [...new Set(rows.map((row) => Number(row.year)).filter(Number.isFinite))].sort((a, b) => a - b);
  const provinceCount = new Set(rows.map((row) => row.province_id).filter(Boolean)).size;
  return {
    rows,
    receivedRows: sourceRows.length,
    errorCount: errors.length,
    errors: errors.slice(0, 100),
    warnings,
    provinceCount,
    years,
    duplicateCount,
    unknownProvinceCount,
    columns: COLUMNS[type],
  };
}

export function isAgriculturalDatasetType(value: unknown): value is AgriculturalDatasetType {
  return typeof value === "string" && AGRICULTURAL_DATASET_TYPES.includes(value as AgriculturalDatasetType);
}
