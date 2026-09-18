import { readJsonResponse } from "@/lib/http/json";

import type {
  ForecastReliability,
  RiceDataQuality,
  RiceForecastRecord,
  RiceModelPerformance,
  RicePriceDashboardData,
  RicePriceDataType,
  RicePriceFilters,
  RicePriceRecord,
  RicePriceSummary,
} from "./types";

const DATA_ROOT = "/data/rice-price";

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell);
  return cells;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() ?? "");

  return lines
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
    });
}

function requiredNumber(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`ข้อมูล ${field} ไม่ถูกต้อง`);
  }
  return parsed;
}

function optional(value: string): string | null {
  return value.trim() || null;
}

function reliability(value: string): ForecastReliability {
  if (value === "High" || value === "Medium" || value === "Low") return value;
  throw new Error(`ค่า Reliability ไม่ถูกต้อง: ${value}`);
}

function dataType(value: string): RicePriceDataType {
  if (value === "observed" || value === "imputed" || value === "forecast") return value;
  throw new Error(`ประเภทข้อมูลไม่ถูกต้อง: ${value}`);
}

async function fetchText(fileName: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(`${DATA_ROOT}/${fileName}`, { signal });
  if (!response.ok) throw new Error(`โหลด ${fileName} ไม่สำเร็จ`);
  return response.text();
}

export async function fetchRicePriceDashboardData(
  signal?: AbortSignal
): Promise<RicePriceDashboardData> {
  const [monthlyText, forecastText, summaryText, performanceText, qualityText, filtersResponse] =
    await Promise.all([
      fetchText("rice_price_monthly.csv", signal),
      fetchText("rice_forecast_2569.csv", signal),
      fetchText("rice_summary.csv", signal),
      fetchText("rice_model_performance.csv", signal),
      fetchText("rice_data_quality.csv", signal),
      fetch(`${DATA_ROOT}/rice_filters.json`, { signal }),
    ]);

  if (!filtersResponse.ok) throw new Error("โหลด rice_filters.json ไม่สำเร็จ");

  const filterPayload = await readJsonResponse<{
    rice_types: string[];
    years_be: number[];
    months: Array<{ value: number; label: string }>;
    regions: string[];
    provinces: string[];
    availability: RicePriceFilters["availability"];
    notes: RicePriceFilters["notes"];
  }>(filtersResponse);

  const monthly: RicePriceRecord[] = parseCsv(monthlyText).map((row) => ({
    date: row.date,
    yearAd: requiredNumber(row.year_ad, "year_ad"),
    yearBe: requiredNumber(row.year_be, "year_be"),
    month: requiredNumber(row.month, "month"),
    monthNameTh: row.month_name_th,
    riceType: row.rice_type,
    price: requiredNumber(row.price, "price"),
    dataType: dataType(row.data_type),
    isImputed: row.is_imputed.toLowerCase() === "true",
    imputeMethod: optional(row.impute_method),
    model: optional(row.model),
    paramSet: optional(row.param_set),
    forecastMethod: optional(row.forecast_method),
    forecastReliability: row.forecast_reliability
      ? reliability(row.forecast_reliability)
      : null,
    source: optional(row.source),
  }));

  const forecasts2569: RiceForecastRecord[] = parseCsv(forecastText).map((row) => ({
    date: row.date,
    yearAd: requiredNumber(row.year_ad, "year_ad"),
    yearBe: requiredNumber(row.year_be, "year_be"),
    month: requiredNumber(row.month, "month"),
    monthNameTh: row.month_name_th,
    riceType: row.rice_type,
    forecastPrice: requiredNumber(row.forecast_price, "forecast_price"),
    model: row.model,
    paramSet: row.param_set,
    forecastMethod: row.forecast_method,
    forecastReliability: reliability(row.forecast_reliability),
  }));

  const summaries: RicePriceSummary[] = parseCsv(summaryText).map((row) => ({
    riceType: row.rice_type,
    forecastMin: requiredNumber(row.Forecast_Min, "Forecast_Min"),
    forecastMax: requiredNumber(row.Forecast_Max, "Forecast_Max"),
    forecastMean: requiredNumber(row.Forecast_Mean, "Forecast_Mean"),
    forecastSd: requiredNumber(row.Forecast_SD, "Forecast_SD"),
    january2569: requiredNumber(row.Jan_2569, "Jan_2569"),
    december2569: requiredNumber(row.Dec_2569, "Dec_2569"),
    change: requiredNumber(row.Change, "Change"),
    changePct: requiredNumber(row.Change_Pct, "Change_Pct"),
    reliability: reliability(row.reliability),
    status: row.status,
  }));

  const modelPerformance: RiceModelPerformance[] = parseCsv(performanceText).map((row) => ({
    riceType: row.rice_type,
    finalMethod: row.Final_Method,
    cvMae: requiredNumber(row.CV_MAE, "CV_MAE"),
    cvStdMae: requiredNumber(row.CV_Std_MAE, "CV_Std_MAE"),
    cvMape: requiredNumber(row.CV_MAPE, "CV_MAPE"),
    testMae: requiredNumber(row.Test_MAE, "Test_MAE"),
    testMape: requiredNumber(row.Test_MAPE, "Test_MAPE"),
    forecastMethod: row.forecast_method,
    reliability: reliability(row.reliability),
    status: row.status,
  }));

  const quality: RiceDataQuality[] = parseCsv(qualityText).map((row) => ({
    riceType: row.rice_type,
    forecast: requiredNumber(row.forecast, "forecast"),
    imputed: requiredNumber(row.imputed, "imputed"),
    observed: requiredNumber(row.observed, "observed"),
    historicalTotal: requiredNumber(row.historical_total, "historical_total"),
    observedPct: requiredNumber(row.observed_pct, "observed_pct"),
    imputedPct: requiredNumber(row.imputed_pct, "imputed_pct"),
  }));

  return {
    monthly,
    forecasts2569,
    summaries,
    modelPerformance,
    quality,
    filters: {
      riceTypes: filterPayload.rice_types,
      yearsBe: filterPayload.years_be,
      months: filterPayload.months,
      regions: filterPayload.regions,
      provinces: filterPayload.provinces,
      availability: filterPayload.availability,
      notes: filterPayload.notes,
    },
  };
}
