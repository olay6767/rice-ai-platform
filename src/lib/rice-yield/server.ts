import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  RiceComparisonMetric,
  RiceDashboardResponse,
  RiceDashboardVersion,
  RiceMapFeature,
  RiceMapMetric,
  RiceModelMetadata,
  RiceMonthlyEnvironment,
  RicePredictionInterval,
  RiceProvince,
  RiceRegion,
  RiceShapFeature,
  RiceShapGroup,
  RiceTrendPoint,
  RiceYearlyYield,
  RiceYieldPrediction,
} from "./types";
import type {
  RiceProvinceGeoJson,
  RiceYieldDashboardData,
  RiceYieldRecord,
  RiceYieldStaticData,
} from "./static-dashboard-types";

const PROVINCE_FIELDS =
  "id,gid_1,province_en,province_th,region,region_code,boundary_geojson";
const MONTHLY_FIELDS =
  "province_id,year,month,temperature_mean_c,dewpoint_mean_c,soil_moisture_mean,rainfall_total_mm,evaporation_total_mm,solar_total_mj_m2,ndvi_mean,ndvi_median,ndvi_std,ndvi_min,ndvi_max,rice_valid_ratio_mean,rice_ndvi_imputed,rice_ndvi_structural_missing,rice_ndvi_final_quality,grid_cell_count";
const YEARLY_FIELDS =
  "province_id,crop_start_year,crop_year,actual_yield,yield_per_harvested_rai,production_ton,harvested_area_rai,planted_area_rai";
const PREDICTION_FIELDS =
  "province_id,crop_start_year,crop_year,actual_yield,predicted_yield,residual,absolute_error,percentage_error,model_version";
const INTERVAL_FIELDS =
  "province_id,crop_start_year,predicted_yield,lower_90,upper_90,interval_width,covered,interval_method,nominal_coverage,prediction_source";
const VERSION_FIELDS =
  "id,version_key,label,description,is_default,published_at,created_at";

export class RiceDataError extends Error {
  constructor(
    message: string,
    public readonly code = "RICE_DATA_ERROR",
    public readonly status = 500
  ) {
    super(message);
    this.name = "RiceDataError";
  }
}

function throwDatabaseError(error: { code?: string; message: string }): never {
  const schemaNotReady = error.code === "42P01" || error.code === "PGRST205";
  throw new RiceDataError(
    schemaNotReady
      ? "ยังไม่ได้ติดตั้งฐานข้อมูลวิเคราะห์ผลผลิตข้าว"
      : "ไม่สามารถโหลดข้อมูลวิเคราะห์ผลผลิตข้าวได้",
    schemaNotReady ? "RICE_SCHEMA_NOT_READY" : "RICE_DATABASE_ERROR",
    schemaNotReady ? 503 : 500
  );
}

function mean(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value)
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
}

function sum(values: Array<number | null | undefined>): number | null {
  const valid = values.filter((value): value is number =>
    typeof value === "number" && Number.isFinite(value)
  );
  if (valid.length === 0) return null;
  return valid.reduce((total, value) => total + value, 0);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function cropYearLabel(cropStartYear: number): string {
  const startYearBe = cropStartYear + 543;
  return `${startYearBe}/${String(startYearBe + 1).slice(-2)}`;
}

function recordKey(provinceId: number, cropStartYear: number): string {
  return `${provinceId}:${cropStartYear}`;
}

function groupMean<T>(
  rows: T[],
  key: (row: T) => number,
  value: (row: T) => number | null
): Map<number, number | null> {
  const groups = new Map<number, Array<number | null>>();
  for (const row of rows) {
    const id = key(row);
    groups.set(id, [...(groups.get(id) ?? []), value(row)]);
  }
  return new Map([...groups].map(([id, values]) => [id, mean(values)]));
}

function isRiceRegion(value: string | null): value is RiceRegion {
  return ["North", "Northeast", "Central", "South"].includes(value ?? "");
}

export function parseRiceRegion(value: string | null): RiceRegion | null {
  return isRiceRegion(value) ? value : null;
}

export function parseInteger(
  value: string | null,
  fallback: number,
  minimum: number,
  maximum: number
): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum
    ? parsed
    : fallback;
}

function mapDashboardVersion(row: Record<string, unknown>): RiceDashboardVersion {
  return {
    id: String(row.id),
    key: String(row.version_key),
    label: String(row.label),
    description: String(row.description ?? ""),
    isDefault: row.is_default === true,
    cropYears: [],
    environmentYears: [],
    publishedAt:
      typeof row.published_at === "string" ? row.published_at : null,
  };
}

export async function getRiceDashboardVersions(): Promise<RiceDashboardVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rice_dashboard_versions")
    .select(VERSION_FIELDS)
    .eq("status", "published")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throwDatabaseError(error);
  return Promise.all((data ?? []).map(async (row) => {
    const version = mapDashboardVersion(row as Record<string, unknown>);
    const years = await supabase.rpc("rice_dashboard_years", {p_id: version.id});
    if (years.error) throwDatabaseError(years.error);
    return { ...version, ...(years.data as {cropYears:number[];environmentYears:number[]}) };
  }));
}

async function resolveDashboardVersion(
  requestedKey?: string | null
): Promise<RiceDashboardVersion> {
  const versions = await getRiceDashboardVersions();
  const selected = requestedKey
    ? versions.find((version) => version.key === requestedKey)
    : versions.find((version) => version.isDefault) ?? versions[0];

  if (!selected) {
    throw new RiceDataError(
      requestedKey
        ? "ไม่พบเวอร์ชันข้อมูล Dashboard ที่เลือก"
        : "ยังไม่มีเวอร์ชันข้อมูล Dashboard ที่เผยแพร่",
      requestedKey ? "DASHBOARD_VERSION_NOT_FOUND" : "DASHBOARD_VERSION_EMPTY",
      requestedKey ? 404 : 503
    );
  }

  return selected;
}

export async function getRiceProvinces(includeGeometry = false): Promise<RiceProvince[]> {
  const supabase = await createClient();
  const fields = includeGeometry ? PROVINCE_FIELDS : PROVINCE_FIELDS.replace(",boundary_geojson", "");
  const { data, error } = await supabase
    .from("rice_provinces")
    .select(fields)
    .order("province_th", { ascending: true });

  if (error) throwDatabaseError(error);
  return (data ?? []) as unknown as RiceProvince[];
}

async function getScopeProvinceIds(
  region: RiceRegion | null,
  provinceId: number | null
): Promise<{ provinces: RiceProvince[]; ids: number[] }> {
  const provinces = await getRiceProvinces(false);
  const scoped = provinces.filter((province) => {
    if (provinceId !== null) return province.id === provinceId;
    if (region) return province.region === region;
    return true;
  });

  return { provinces: scoped, ids: scoped.map((province) => province.id) };
}

async function getYearlyRows(
  ids: number[],
  versionId: string,
  year?: number
): Promise<RiceYearlyYield[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("rice_yield_yearly")
    .select(YEARLY_FIELDS)
    .in("province_id", ids)
    .eq("dashboard_version_id", versionId)
    .order("crop_start_year", { ascending: true })
    .order("province_id", { ascending: true });
  if (year !== undefined) query = query.eq("crop_start_year", year);
  const rows: RiceYearlyYield[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throwDatabaseError(error);
    rows.push(...((data ?? []) as unknown as RiceYearlyYield[]));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

async function getPredictionRows(
  ids: number[],
  versionId: string,
  year?: number
): Promise<RiceYieldPrediction[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("rice_yield_predictions")
    .select(PREDICTION_FIELDS)
    .in("province_id", ids)
    .eq("dashboard_version_id", versionId)
    .order("crop_start_year", { ascending: true })
    .order("province_id", { ascending: true })
    .order("model_version", { ascending: true });
  if (year !== undefined) query = query.eq("crop_start_year", year);
  const rows: RiceYieldPrediction[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throwDatabaseError(error);
    rows.push(...((data ?? []) as unknown as RiceYieldPrediction[]));
    if ((data?.length ?? 0) < 1000) return rows;
  }
}

async function getEnvironmentRows(
  ids: number[],
  versionId: string,
  year: number,
  month?: number
): Promise<RiceMonthlyEnvironment[]> {
  if (ids.length === 0) return [];
  const supabase = await createClient();
  let query = supabase
    .from("rice_environment_monthly")
    .select(MONTHLY_FIELDS)
    .in("province_id", ids)
    .eq("dashboard_version_id", versionId)
    .eq("year", year)
    .order("month", { ascending: true })
    .range(0, 1999);
  if (month !== undefined) query = query.eq("month", month);
  const { data, error } = await query;
  if (error) throwDatabaseError(error);
  return (data ?? []) as unknown as RiceMonthlyEnvironment[];
}

export async function getRiceDashboard(filters: {
  version: string | null;
  cropYear: number;
  year: number;
  month: number;
  region: RiceRegion | null;
  provinceId: number | null;
}): Promise<RiceDashboardResponse> {
  const version = await resolveDashboardVersion(filters.version);
  const { provinces, ids } = await getScopeProvinceIds(filters.region, filters.provinceId);
  filters = { ...filters,
    cropYear: filters.cropYear || version.cropYears.at(-1) || 2024,
    year: filters.year || version.environmentYears.at(-1) || version.cropYears.at(-1) || 2024,
  };
  const [selectedYield, selectedPredictions, environment, allYield, allPredictions] =
    await Promise.all([
      getYearlyRows(ids, version.id, filters.cropYear),
      getPredictionRows(ids, version.id, filters.cropYear),
      getEnvironmentRows(ids, version.id, filters.year, filters.month),
      getYearlyRows(ids, version.id),
      getPredictionRows(ids, version.id),
    ]);

  const actualByYear = groupMean(allYield, (row) => row.crop_start_year, (row) => row.actual_yield);
  const predictedByYear = groupMean(
    allPredictions,
    (row) => row.crop_start_year,
    (row) => row.predicted_yield
  );
  const cropYearLabels = new Map(
    allYield.map((row) => [row.crop_start_year, row.crop_year] as const)
  );
  const trendYears = [...new Set([...actualByYear.keys(), ...predictedByYear.keys()])].sort(
    (a, b) => a - b
  );
  const trend: RiceTrendPoint[] = trendYears.map((year) => ({
    year,
    cropYear: cropYearLabels.get(year) ?? null,
    actualYield: actualByYear.get(year) ?? null,
    predictedYield: predictedByYear.get(year) ?? null,
  }));

  return {
    version,
    filters: { ...filters, version: version.key },
    coverage: {
      provinces: provinces.length,
      cropYears: [...new Set(allYield.map((row) => row.crop_start_year))].sort((a, b) => a - b),
      environmentYears: version.environmentYears,
    },
    kpis: {
      averageActualYield: mean(selectedYield.map((row) => row.actual_yield)),
      averagePredictedYield: mean(selectedPredictions.map((row) => row.predicted_yield)),
      rainfall: mean(environment.map((row) => row.rainfall_total_mm)),
      meanTemperature: mean(environment.map((row) => row.temperature_mean_c)),
      meanNdvi: mean(environment.map((row) => row.ndvi_mean)),
      meanSoilMoisture: mean(environment.map((row) => row.soil_moisture_mean)),
    },
    trend,
  };
}

/**
 * Adapts the published Supabase dataset to the existing user dashboard shape.
 * Observed yield takes precedence when a prediction and an actual value share
 * a province/year. Predictions are forecasts only where no actual value exists.
 */
export async function getRiceYieldDashboardView(
  versionKey?: string | null
): Promise<{ version: RiceDashboardVersion; data: RiceYieldStaticData }> {
  const version = await resolveDashboardVersion(versionKey);
  const provinces = await getRiceProvinces(true);
  const provinceIds = provinces.map((province) => province.id);
  const [yearlyRows, predictionRows] = await Promise.all([
    getYearlyRows(provinceIds, version.id),
    getPredictionRows(provinceIds, version.id),
  ]);

  const provincesById = new Map(provinces.map((province) => [province.id, province]));
  const yearlyByKey = new Map(
    yearlyRows.map((row) => [recordKey(row.province_id, row.crop_start_year), row])
  );
  const predictionsByKey = new Map(
    predictionRows.map((row) => [recordKey(row.province_id, row.crop_start_year), row])
  );
  const keys = new Set([...yearlyByKey.keys(), ...predictionsByKey.keys()]);

  const recordsWithoutChanges = [...keys].flatMap((key) => {
    const yearly = yearlyByKey.get(key);
    const prediction = predictionsByKey.get(key);
    const source = yearly ?? prediction;
    if (!source) return [];

    const province = provincesById.get(source.province_id);
    if (!province) return [];

    const cropStartYear = source.crop_start_year;
    const isForecast = !yearly && Boolean(prediction);
    const yieldValue = yearly?.actual_yield ?? prediction?.predicted_yield;
    if (yieldValue === undefined || !Number.isFinite(yieldValue)) return [];

    return [{
      province: province.province_th,
      crop_year: source.crop_year || cropYearLabel(cropStartYear),
      crop_start_year_be: cropStartYear + 543,
      crop_end_year_be: cropStartYear + 544,
      crop_start_year_ad: cropStartYear,
      crop_end_year_ad: cropStartYear + 1,
      yield_kg_rai: round(yieldValue),
      previous_yield_kg_rai: null,
      change_kg_rai: null,
      change_percent: null,
      trend: "คงที่",
      data_type: isForecast ? "forecast" : "actual",
      is_forecast: isForecast,
    } satisfies RiceYieldRecord];
  }).sort((first, second) =>
    first.province.localeCompare(second.province, "th") ||
    first.crop_start_year_ad - second.crop_start_year_ad
  );

  const recordsByProvince = new Map<string, RiceYieldRecord[]>();
  for (const record of recordsWithoutChanges) {
    const history = recordsByProvince.get(record.province) ?? [];
    history.push(record);
    recordsByProvince.set(record.province, history);
  }

  const records: RiceYieldRecord[] = [];
  for (const history of recordsByProvince.values()) {
    history.forEach((record, index) => {
      const previous = history[index - 1];
      const previousYield = previous?.yield_kg_rai ?? null;
      const change = previousYield === null
        ? null
        : round(record.yield_kg_rai - previousYield);
      const changePercent = change === null || previousYield === 0
        ? null
        : round((change / previousYield) * 100);
      records.push({
        ...record,
        previous_yield_kg_rai: previousYield,
        change_kg_rai: change,
        change_percent: changePercent,
        trend: change === null || change === 0
          ? "คงที่"
          : change > 0
            ? "เพิ่มขึ้น"
            : "ลดลง",
      });
    });
  }
  records.sort((first, second) =>
    first.crop_start_year_ad - second.crop_start_year_ad ||
    first.province.localeCompare(second.province, "th")
  );

  if (records.length === 0) {
    throw new RiceDataError(
      "เวอร์ชัน Dashboard ที่เผยแพร่ยังไม่มีข้อมูลผลผลิตข้าว",
      "RICE_DASHBOARD_EMPTY",
      503
    );
  }

  const recordsByYear = new Map<string, RiceYieldRecord[]>();
  for (const record of records) {
    const rows = recordsByYear.get(record.crop_year) ?? [];
    rows.push(record);
    recordsByYear.set(record.crop_year, rows);
  }

  const years = [...recordsByYear.entries()]
    .map(([cropYear, rows]) => ({
      crop_year: cropYear,
      crop_start_year_be: rows[0].crop_start_year_be,
      crop_end_year_be: rows[0].crop_end_year_be,
      is_forecast: rows.some((row) => row.is_forecast),
    }))
    .sort((first, second) => first.crop_start_year_be - second.crop_start_year_be);

  const yearSummary: RiceYieldDashboardData["year_summary"] = {};
  for (const [cropYear, rows] of recordsByYear) {
    const values = rows.map((row) => row.yield_kg_rai);
    yearSummary[cropYear] = {
      is_forecast: rows.some((row) => row.is_forecast),
      province_count: new Set(rows.map((row) => row.province)).size,
      average_yield_kg_rai: round(values.reduce((total, value) => total + value, 0) / values.length),
      max_yield_kg_rai: Math.max(...values),
      min_yield_kg_rai: Math.min(...values),
      increase_count: rows.filter((row) => (row.change_kg_rai ?? 0) > 0).length,
      decrease_count: rows.filter((row) => (row.change_kg_rai ?? 0) < 0).length,
      stable_count: rows.filter((row) => row.change_kg_rai === 0).length,
    };
  }

  const provinceHistory: RiceYieldDashboardData["province_history"] = {};
  for (const [province, history] of recordsByProvince) {
    provinceHistory[province] = history.map((row) => ({
      crop_year: row.crop_year,
      year: row.crop_start_year_be,
      yield_kg_rai: row.yield_kg_rai,
      change_kg_rai: row.change_kg_rai,
      change_percent: row.change_percent,
      is_forecast: row.is_forecast,
    }));
  }

  const geoJson: RiceProvinceGeoJson = {
    type: "FeatureCollection",
    features: provinces.flatMap((province) => province.boundary_geojson ? [{
      type: "Feature" as const,
      properties: {
        province_id: province.id,
        gid_1: province.gid_1,
        province_en: province.province_en,
        province_th: province.province_th,
        region: province.region,
        region_code: province.region_code,
      },
      geometry: province.boundary_geojson,
    }] : []),
  };

  const provinceNames = provinces
    .map((province) => province.province_th)
    .sort((first, second) => first.localeCompare(second, "th"));
  const latestYear = years.at(-1)?.crop_year ?? "";
  const dashboard: RiceYieldDashboardData = {
    metadata: {
      title: version.label,
      unit: "kg/rai",
      province_count: geoJson.features.length,
      year_count: years.length,
      record_count: records.length,
      latest_crop_year: latestYear,
    },
    provinces: provinceNames,
    years,
    records: records.map((record) => ({
      province: record.province,
      crop_year: record.crop_year,
      crop_start_year_be: record.crop_start_year_be,
      yield_kg_rai: record.yield_kg_rai,
      previous_yield_kg_rai: record.previous_yield_kg_rai,
      change_kg_rai: record.change_kg_rai,
      change_percent: record.change_percent,
      trend: record.trend,
      is_forecast: record.is_forecast,
    })),
    province_history: provinceHistory,
    year_summary: yearSummary,
  };

  return { version, data: { dashboard, records, geoJson } };
}

const MAP_FIELD: Record<RiceMapMetric, keyof RiceMonthlyEnvironment | keyof RiceYieldPrediction> = {
  actual_yield: "actual_yield",
  predicted_yield: "predicted_yield",
  absolute_error: "absolute_error",
  residual: "residual",
  rainfall: "rainfall_total_mm",
  temperature: "temperature_mean_c",
  ndvi: "ndvi_mean",
  soil_moisture: "soil_moisture_mean",
};

export function isRiceMapMetric(value: string | null): value is RiceMapMetric {
  return value !== null && value in MAP_FIELD;
}

export async function getRiceMapData(filters: {
  version: string | null;
  metric: RiceMapMetric;
  year: number;
  month: number;
  region: RiceRegion | null;
}): Promise<{ type: "FeatureCollection"; features: RiceMapFeature[] }> {
  const version = await resolveDashboardVersion(filters.version);
  const provinces = (await getRiceProvinces(true)).filter(
    (province) => !filters.region || province.region === filters.region
  );
  const ids = provinces.map((province) => province.id);
  const yearlyMetric = ["actual_yield", "predicted_yield", "absolute_error", "residual"].includes(
    filters.metric
  );
  const [yieldRows, predictionRows, environmentRows] = await Promise.all([
    yearlyMetric
      ? getYearlyRows(ids, version.id, filters.year)
      : Promise.resolve([]),
    yearlyMetric
      ? getPredictionRows(ids, version.id, filters.year)
      : Promise.resolve([]),
    yearlyMetric
      ? Promise.resolve([])
      : getEnvironmentRows(ids, version.id, filters.year, filters.month),
  ]);
  const yields = new Map(yieldRows.map((row) => [row.province_id, row] as const));
  const predictions = new Map(
    predictionRows.map((row) => [row.province_id, row] as const)
  );
  const environments = new Map(
    environmentRows.map((row) => [row.province_id, row] as const)
  );

  const features = provinces.flatMap((province): RiceMapFeature[] => {
    if (!province.boundary_geojson) return [];
    const yearly = yields.get(province.id);
    const prediction = predictions.get(province.id);
    const environment = environments.get(province.id);
    const source = yearlyMetric ? prediction ?? yearly : environment;
    const rawValue = source?.[MAP_FIELD[filters.metric] as keyof typeof source];
    const value = typeof rawValue === "number" ? rawValue : null;

    return [
      {
        type: "Feature",
        id: province.id,
        properties: {
          provinceId: province.id,
          provinceTh: province.province_th,
          provinceEn: province.province_en,
          region: province.region,
          year: filters.year,
          month: yearlyMetric ? null : filters.month,
          value,
          actualYield: yearly?.actual_yield ?? prediction?.actual_yield ?? null,
          predictedYield: prediction?.predicted_yield ?? null,
          absoluteError: prediction?.absolute_error ?? null,
          residual: prediction?.residual ?? null,
        },
        geometry: province.boundary_geojson,
      },
    ];
  });

  return { type: "FeatureCollection", features };
}

export async function getProvinceYieldDetail(
  provinceId: number,
  versionKey?: string | null
) {
  const version = await resolveDashboardVersion(versionKey);
  const provinces = await getRiceProvinces(false);
  const province = provinces.find((item) => item.id === provinceId);
  if (!province) throw new RiceDataError("ไม่พบจังหวัดที่ระบุ", "PROVINCE_NOT_FOUND", 404);
  const [yieldRows, predictions, intervals] = await Promise.all([
    getYearlyRows([provinceId], version.id),
    getPredictionRows([provinceId], version.id),
    version.key === "baseline-2026" ? getPredictionIntervals(provinceId) : Promise.resolve([]),
  ]);
  return { version, province, yield: yieldRows, predictions, intervals };
}

export async function getProvinceEnvironment(
  provinceId: number,
  year: number,
  versionKey?: string | null
) {
  const version = await resolveDashboardVersion(versionKey);
  year = year || version.environmentYears.at(-1) || version.cropYears.at(-1) || 2024;
  const provinces = await getRiceProvinces(false);
  const province = provinces.find((item) => item.id === provinceId);
  if (!province) throw new RiceDataError("ไม่พบจังหวัดที่ระบุ", "PROVINCE_NOT_FOUND", 404);
  const months = await getEnvironmentRows([provinceId], version.id, year);
  return {
    version,
    province,
    year,
    months,
    summary: {
      annualRainfall: sum(months.map((row) => row.rainfall_total_mm)),
      meanTemperature: mean(months.map((row) => row.temperature_mean_c)),
      meanNdvi: mean(months.map((row) => row.ndvi_mean)),
      meanSoilMoisture: mean(months.map((row) => row.soil_moisture_mean)),
    },
  };
}

async function getPredictionIntervals(provinceId: number): Promise<RicePredictionInterval[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("rice_prediction_intervals")
    .select(INTERVAL_FIELDS)
    .eq("province_id", provinceId)
    .order("crop_start_year", { ascending: true });
  if (error) throwDatabaseError(error);
  return (data ?? []) as unknown as RicePredictionInterval[];
}

const COMPARISON_MONTHLY_FIELD: Record<
  Exclude<RiceComparisonMetric, "actual_yield" | "predicted_yield">,
  keyof RiceMonthlyEnvironment
> = {
  rainfall: "rainfall_total_mm",
  temperature: "temperature_mean_c",
  ndvi: "ndvi_mean",
  soil_moisture: "soil_moisture_mean",
};

export function isRiceComparisonMetric(value: string | null): value is RiceComparisonMetric {
  return [
    "actual_yield",
    "predicted_yield",
    "rainfall",
    "temperature",
    "ndvi",
    "soil_moisture",
  ].includes(value ?? "");
}

export async function getRiceComparison(filters: {
  version: string | null;
  type: "province" | "region";
  ids: string[];
  metric: RiceComparisonMetric;
  year: number;
}) {
  const version = await resolveDashboardVersion(filters.version);
  const provinces = await getRiceProvinces(false);
  const selected = provinces.filter((province) =>
    filters.type === "province"
      ? filters.ids.includes(String(province.id))
      : filters.ids.includes(province.region)
  );
  const ids = selected.map((province) => province.id);
  const yearly = filters.metric === "actual_yield" || filters.metric === "predicted_yield";
  const yieldRows =
    filters.metric === "actual_yield"
      ? await getYearlyRows(ids, version.id, filters.year)
      : [];
  const predictionRows =
    filters.metric === "predicted_yield"
      ? await getPredictionRows(ids, version.id, filters.year)
      : [];
  const environmentRows = yearly
    ? []
    : await getEnvironmentRows(ids, version.id, filters.year);
  const areaKeys = filters.type === "province" ? selected.map((province) => String(province.id)) : filters.ids;
  const provinceById = new Map(selected.map((province) => [province.id, province] as const));

  const series = areaKeys.map((areaKey) => {
    const areaProvinces = selected.filter((province) =>
      filters.type === "province" ? String(province.id) === areaKey : province.region === areaKey
    );
    const areaIds = new Set(areaProvinces.map((province) => province.id));
    const label =
      filters.type === "province"
        ? provinceById.get(Number(areaKey))?.province_th ?? areaKey
        : areaKey;

    if (yearly) {
      const rows = filters.metric === "actual_yield" ? yieldRows : predictionRows;
      const values = rows
        .filter((row) => areaIds.has(row.province_id))
        .map((row) =>
          filters.metric === "actual_yield"
            ? (row as RiceYearlyYield).actual_yield
            : (row as RiceYieldPrediction).predicted_yield
        );
      return { id: areaKey, label, points: [{ period: filters.year, value: mean(values) }] };
    }

    const monthlyMetric = filters.metric as Exclude<
      RiceComparisonMetric,
      "actual_yield" | "predicted_yield"
    >;
    const field = COMPARISON_MONTHLY_FIELD[monthlyMetric];
    return {
      id: areaKey,
      label,
      points: Array.from({ length: 12 }, (_, monthIndex) => {
        const month = monthIndex + 1;
        const rows = environmentRows.filter(
          (row) => row.month === month && areaIds.has(row.province_id)
        );
        return { period: month, value: mean(rows.map((row) => row[field] as number | null)) };
      }),
    };
  });

  return {
    version,
    filters: { ...filters, version: version.key },
    aggregation: "mean_across_provinces",
    series,
  };
}

export async function getRiceResearchData() {
  const version = await resolveDashboardVersion(null);
  const supabase = await createClient();
  const provinces = await getRiceProvinces(false);
  const [metadataResult, shapGlobalResult, shapGroupResult, predictions] = await Promise.all([
    supabase.from("rice_model_metadata").select("*").limit(1).maybeSingle(),
    supabase
      .from("rice_shap_global")
      .select("feature,feature_group,mean_abs_shap,mean_signed_shap,importance_percent,rank")
      .order("rank", { ascending: true }),
    supabase
      .from("rice_shap_group")
      .select("feature_group,mean_abs_shap,importance_percent,rank")
      .order("rank", { ascending: true }),
    getPredictionRows(
      provinces.map((province) => province.id),
      version.id
    ),
  ]);
  const firstError = metadataResult.error ?? shapGlobalResult.error ?? shapGroupResult.error;
  if (firstError) throwDatabaseError(firstError);

  return {
    version,
    metadata: metadataResult.data as unknown as RiceModelMetadata | null,
    shapGlobal: (shapGlobalResult.data ?? []) as unknown as RiceShapFeature[],
    shapGroups: (shapGroupResult.data ?? []) as unknown as RiceShapGroup[],
    predictions: predictions.map((prediction) => ({
      ...prediction,
      province_th:
        provinces.find((province) => province.id === prediction.province_id)?.province_th ??
        String(prediction.province_id),
    })),
    modelComparison: [
      { model: "Extra Trees", r2: 0.733846 },
      { model: "XGBoost", r2: 0.693057 },
      { model: "Gradient Boosting", r2: 0.672567 },
      { model: "Random Forest", r2: 0.662309 },
      { model: "Linear / Ridge", r2: 0.386004 },
    ],
    ablation: [
      { group: "Climate only", r2: 0.619381 },
      { group: "NDVI only", r2: 0.651906 },
      { group: "Climate + NDVI", r2: 0.733846 },
    ],
    baselines: [
      { model: "Previous-Year Yield", mae: 14.93, r2: 0.971 },
      { model: "Province Historical Mean", mae: 23.19, r2: 0.952 },
      { model: "Climate + NDVI Extra Trees", mae: 54.08, r2: 0.75 },
      { model: "Global Historical Mean", mae: 121.28, r2: 0 },
    ],
  };
}

export function riceApiError(error: unknown): Response {
  if (error instanceof RiceDataError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status, headers: { "Cache-Control": "no-store" } }
    );
  }
  console.error("Unexpected rice analytics error", error);
  return Response.json(
    { error: { code: "INTERNAL_ERROR", message: "ไม่สามารถโหลดข้อมูลได้" } },
    { status: 500, headers: { "Cache-Control": "no-store" } }
  );
}
