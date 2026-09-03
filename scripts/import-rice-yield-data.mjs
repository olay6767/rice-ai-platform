import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const DATA_ROOT = resolve(
  ROOT,
  "datarice",
  "Rice_Yield_Thailand_Handoff_v1"
);
const DRY_RUN = process.argv.includes("--dry-run");
const EXPECTED = {
  provinces: 77,
  monthly: 13_860,
  yearly: 1_078,
  predictions: 154,
  intervals: 154,
};

function loadLocalEnv() {
  const envPath = resolve(ROOT, ".env.local");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }

  const [headers, ...records] = rows;
  if (!headers) return [];

  return records.map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]))
  );
}

function readCsv(...segments) {
  const path = resolve(DATA_ROOT, ...segments);
  return parseCsv(readFileSync(path, "utf8").replace(/^\uFEFF/, ""));
}

function numberOrNull(value) {
  if (value === undefined || value === null || value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid number: ${value}`);
  return parsed;
}

function requiredNumber(value, label) {
  const parsed = numberOrNull(value);
  if (parsed === null) throw new Error(`Missing required number: ${label}`);
  return parsed;
}

function asBoolean(value) {
  return ["1", "true", "yes"].includes(String(value).trim().toLowerCase());
}

function squaredDistance(pointA, pointB) {
  const dx = pointA[0] - pointB[0];
  const dy = pointA[1] - pointB[1];
  return dx * dx + dy * dy;
}

function squaredSegmentDistance(point, start, end) {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const t = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (t > 1) {
      x = end[0];
      y = end[1];
    } else if (t > 0) {
      x += dx * t;
      y += dy * t;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyRadial(points, toleranceSquared) {
  let previous = points[0];
  const simplified = [previous];

  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (squaredDistance(point, previous) > toleranceSquared) {
      simplified.push(point);
      previous = point;
    }
  }

  if (previous !== points.at(-1)) simplified.push(points.at(-1));
  return simplified;
}

function simplifyDouglasPeuckerStep(points, first, last, toleranceSquared, result) {
  let maxDistance = toleranceSquared;
  let selectedIndex = 0;

  for (let index = first + 1; index < last; index += 1) {
    const distance = squaredSegmentDistance(points[index], points[first], points[last]);
    if (distance > maxDistance) {
      selectedIndex = index;
      maxDistance = distance;
    }
  }

  if (maxDistance <= toleranceSquared) return;
  if (selectedIndex - first > 1) {
    simplifyDouglasPeuckerStep(points, first, selectedIndex, toleranceSquared, result);
  }
  result.push(points[selectedIndex]);
  if (last - selectedIndex > 1) {
    simplifyDouglasPeuckerStep(points, selectedIndex, last, toleranceSquared, result);
  }
}

function simplifyDouglasPeucker(points, toleranceSquared) {
  const last = points.length - 1;
  const result = [points[0]];
  simplifyDouglasPeuckerStep(points, 0, last, toleranceSquared, result);
  result.push(points[last]);
  return result;
}

function simplifyRing(ring, tolerance = 0.0025) {
  if (!Array.isArray(ring) || ring.length <= 6) return ring;
  const closed = squaredDistance(ring[0], ring.at(-1)) < Number.EPSILON;
  const points = closed ? ring.slice(0, -1) : [...ring];
  const toleranceSquared = tolerance * tolerance;
  const radial = simplifyRadial(points, toleranceSquared);
  let simplified = simplifyDouglasPeucker(radial, toleranceSquared);

  if (simplified.length < 3) simplified = points.slice(0, 3);
  if (closed) simplified.push([...simplified[0]]);
  return simplified;
}

function simplifyGeometry(geometry) {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring)),
    };
  }

  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => simplifyRing(ring))
      ),
    };
  }

  throw new Error(`Unsupported geometry type: ${geometry.type}`);
}

function assertCount(label, records, expected) {
  if (records.length !== expected) {
    throw new Error(`${label}: expected ${expected.toLocaleString()}, got ${records.length.toLocaleString()}`);
  }
}

async function upsertInChunks(supabase, table, rows, onConflict, chunkSize = 500) {
  for (let index = 0; index < rows.length; index += chunkSize) {
    const chunk = rows.slice(index, index + chunkSize);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table}: ${error.message}`);
    process.stdout.write(`\r${table}: ${Math.min(index + chunk.length, rows.length)}/${rows.length}`);
  }
  process.stdout.write("\n");
}

loadLocalEnv();

const provinceSource = readCsv("01_Master", "province_master.csv");
const monthlySource = readCsv("02_Monthly_Data", "province_monthly_environment.csv");
const yearlySource = readCsv("03_Yield", "province_yearly_yield.csv");
const predictionSource = readCsv("04_Prediction", "province_yearly_predictions.csv");
const intervalSource = readCsv("04_Prediction", "prediction_intervals.csv");
const shapGlobalSource = readCsv("06_Explainability", "shap_global.csv");
const shapGroupSource = readCsv("06_Explainability", "shap_group.csv");
const geojson = JSON.parse(
  readFileSync(resolve(DATA_ROOT, "05_Map", "thailand_provinces.geojson"), "utf8")
);
const modelMetadata = JSON.parse(
  readFileSync(resolve(DATA_ROOT, "07_Model", "model_metadata.json"), "utf8")
);

assertCount("provinces", provinceSource, EXPECTED.provinces);
assertCount("monthly environment", monthlySource, EXPECTED.monthly);
assertCount("yearly yield", yearlySource, EXPECTED.yearly);
assertCount("predictions", predictionSource, EXPECTED.predictions);
assertCount("prediction intervals", intervalSource, EXPECTED.intervals);
assertCount("map features", geojson.features, EXPECTED.provinces);

const geometryByProvince = new Map(
  geojson.features.map((feature) => [
    Number(feature.properties.province_id),
    simplifyGeometry(feature.geometry),
  ])
);

const provinces = provinceSource.map((row) => ({
  id: requiredNumber(row.province_id, "province_id"),
  gid_1: row.gid_1,
  province_en: row.province_en,
  province_th: row.province_th,
  region: row.region,
  region_code: row.region_code,
  boundary_geojson: geometryByProvince.get(Number(row.province_id)) ?? null,
}));

const monthly = monthlySource.map((row) => ({
  province_id: requiredNumber(row.province_id, "monthly.province_id"),
  year: requiredNumber(row.year, "monthly.year"),
  month: requiredNumber(row.month, "monthly.month"),
  temperature_mean_c: numberOrNull(row.temperature_mean_c),
  dewpoint_mean_c: numberOrNull(row.dewpoint_mean_c),
  soil_moisture_mean: numberOrNull(row.soil_moisture_mean),
  rainfall_total_mm: numberOrNull(row.rainfall_total_mm),
  evaporation_total_mm: numberOrNull(row.evaporation_total_mm),
  solar_total_mj_m2: numberOrNull(row.solar_total_mj_m2),
  ndvi_mean: numberOrNull(row.ndvi_mean),
  ndvi_median: numberOrNull(row.ndvi_median),
  ndvi_std: numberOrNull(row.ndvi_std),
  ndvi_min: numberOrNull(row.ndvi_min),
  ndvi_max: numberOrNull(row.ndvi_max),
  rice_valid_ratio_mean: numberOrNull(row.rice_valid_ratio_mean),
  rice_ndvi_imputed: asBoolean(row.rice_ndvi_imputed),
  rice_ndvi_structural_missing: asBoolean(row.rice_ndvi_structural_missing),
  rice_ndvi_final_quality: row.rice_ndvi_final_quality || null,
  grid_cell_count: numberOrNull(row.grid_cell_count),
}));

const yearly = yearlySource.map((row) => ({
  province_id: requiredNumber(row.province_id, "yield.province_id"),
  crop_start_year: requiredNumber(row.crop_start_year, "yield.crop_start_year"),
  crop_year: row.crop_year,
  actual_yield: requiredNumber(row.actual_yield, "yield.actual_yield"),
  yield_per_harvested_rai: numberOrNull(row.yield_per_harvested_rai),
  production_ton: numberOrNull(row.production_ton),
  harvested_area_rai: numberOrNull(row.harvested_area_rai),
  planted_area_rai: numberOrNull(row.planted_area_rai),
}));

const predictions = predictionSource.map((row) => ({
  province_id: requiredNumber(row.province_id, "prediction.province_id"),
  crop_start_year: requiredNumber(row.crop_start_year, "prediction.crop_start_year"),
  crop_year: row.crop_year,
  actual_yield: requiredNumber(row.actual_yield, "prediction.actual_yield"),
  predicted_yield: requiredNumber(row.predicted_yield, "prediction.predicted_yield"),
  residual: requiredNumber(row.residual, "prediction.residual"),
  absolute_error: requiredNumber(row.absolute_error, "prediction.absolute_error"),
  percentage_error: numberOrNull(row.percentage_error),
  model_version: row.model_version,
}));

const intervals = intervalSource.map((row) => ({
  province_id: requiredNumber(row.province_id, "interval.province_id"),
  crop_start_year: requiredNumber(row.crop_start_year, "interval.crop_start_year"),
  predicted_yield: requiredNumber(row.predicted_yield, "interval.predicted_yield"),
  lower_90: requiredNumber(row.lower_90, "interval.lower_90"),
  upper_90: requiredNumber(row.upper_90, "interval.upper_90"),
  interval_width: requiredNumber(row.interval_width, "interval.interval_width"),
  covered: asBoolean(row.covered),
  interval_method: row.interval_method,
  nominal_coverage: requiredNumber(row.nominal_coverage, "interval.nominal_coverage"),
  prediction_source: row.prediction_source,
}));

const shapGlobal = shapGlobalSource.map((row) => ({
  feature: row.feature,
  feature_group: row.feature_group,
  mean_abs_shap: requiredNumber(row.mean_abs_shap, "shap.mean_abs_shap"),
  mean_signed_shap: numberOrNull(row.mean_signed_shap),
  importance_percent: requiredNumber(row.importance_percent, "shap.importance_percent"),
  rank: requiredNumber(row.rank, "shap.rank"),
}));

const shapGroups = shapGroupSource.map((row) => ({
  feature_group: row.feature_group,
  mean_abs_shap: requiredNumber(row.total_mean_abs_shap, "shap_group.total_mean_abs_shap"),
  importance_percent: requiredNumber(row.importance_percent, "shap_group.importance_percent"),
  rank: requiredNumber(row.rank, "shap_group.rank"),
}));

const averageIntervalWidth =
  intervals.reduce((sum, row) => sum + row.interval_width, 0) / intervals.length;
const empiricalCoverage =
  intervals.filter((row) => row.covered).length / intervals.length;

const metadata = {
  model_version: modelMetadata.model_version,
  model_name: modelMetadata.model_name,
  target: modelMetadata.target,
  target_unit: modelMetadata.target_unit,
  feature_count: modelMetadata.feature_count,
  development_period: modelMetadata.development_period,
  final_test_period: modelMetadata.final_test_period,
  parameters: modelMetadata.parameters,
  test_metrics: modelMetadata.test_metrics,
  notes: modelMetadata.notes,
  interval_metadata: {
    method: intervalSource[0]?.interval_method,
    nominal_coverage: intervalSource[0] ? Number(intervalSource[0].nominal_coverage) : null,
    empirical_coverage: empiricalCoverage,
    average_width_kg_rai: averageIntervalWidth,
    prediction_source: intervalSource[0]?.prediction_source,
    note: "Interval center predictions are from a separate conformal calibration experiment and are not identical to final model predictions.",
  },
};

console.log("Rice Yield Thailand data validation passed:");
console.log({
  provinces: provinces.length,
  monthly: monthly.length,
  yearly: yearly.length,
  predictions: predictions.length,
  intervals: intervals.length,
  shapGlobal: shapGlobal.length,
  shapGroups: shapGroups.length,
});

if (DRY_RUN) {
  console.log("Dry run complete. No database writes were performed.");
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local before importing."
  );
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

await upsertInChunks(supabase, "rice_provinces", provinces, "id", 100);
await upsertInChunks(
  supabase,
  "rice_environment_monthly",
  monthly,
  "dashboard_version_id,province_id,year,month"
);
await upsertInChunks(
  supabase,
  "rice_yield_yearly",
  yearly,
  "dashboard_version_id,province_id,crop_start_year"
);
await upsertInChunks(
  supabase,
  "rice_yield_predictions",
  predictions,
  "dashboard_version_id,province_id,crop_start_year,model_version"
);
await upsertInChunks(
  supabase,
  "rice_prediction_intervals",
  intervals,
  "province_id,crop_start_year,interval_method"
);
await upsertInChunks(supabase, "rice_shap_global", shapGlobal, "feature");
await upsertInChunks(supabase, "rice_shap_group", shapGroups, "feature_group");
await upsertInChunks(supabase, "rice_model_metadata", [metadata], "model_version");

console.log("Rice Yield Thailand import completed successfully.");
