export type RiceRegion = "North" | "Northeast" | "Central" | "South";

export interface RiceDashboardVersion {
  id: string;
  key: string;
  label: string;
  description: string;
  isDefault: boolean;
  publishedAt: string | null;
  cropYears: number[];
  environmentYears: number[];
}

export interface RiceProvince {
  id: number;
  gid_1: string;
  province_en: string;
  province_th: string;
  region: RiceRegion;
  region_code: string;
  boundary_geojson?: RiceGeometry | null;
}

export type RicePosition = [number, number];

export interface RicePolygonGeometry {
  type: "Polygon";
  coordinates: RicePosition[][];
}

export interface RiceMultiPolygonGeometry {
  type: "MultiPolygon";
  coordinates: RicePosition[][][];
}

export type RiceGeometry = RicePolygonGeometry | RiceMultiPolygonGeometry;

export interface RiceMonthlyEnvironment {
  province_id: number;
  year: number;
  month: number;
  temperature_mean_c: number | null;
  dewpoint_mean_c: number | null;
  soil_moisture_mean: number | null;
  rainfall_total_mm: number | null;
  evaporation_total_mm: number | null;
  solar_total_mj_m2: number | null;
  ndvi_mean: number | null;
  ndvi_median: number | null;
  ndvi_std: number | null;
  ndvi_min: number | null;
  ndvi_max: number | null;
  rice_valid_ratio_mean: number | null;
  rice_ndvi_imputed: boolean;
  rice_ndvi_structural_missing: boolean;
  rice_ndvi_final_quality: string | null;
  grid_cell_count: number | null;
}

export interface RiceYearlyYield {
  province_id: number;
  crop_start_year: number;
  crop_year: string;
  actual_yield: number;
  yield_per_harvested_rai: number | null;
  production_ton: number | null;
  harvested_area_rai: number | null;
  planted_area_rai: number | null;
}

export interface RiceYieldPrediction {
  province_id: number;
  crop_start_year: number;
  crop_year: string;
  actual_yield: number;
  predicted_yield: number;
  residual: number;
  absolute_error: number;
  percentage_error: number | null;
  model_version: string;
}

export interface RicePredictionInterval {
  province_id: number;
  crop_start_year: number;
  predicted_yield: number;
  lower_90: number;
  upper_90: number;
  interval_width: number;
  covered: boolean | null;
  interval_method: string;
  nominal_coverage: number;
  prediction_source: string;
}

export interface RiceShapFeature {
  feature: string;
  feature_group: string;
  mean_abs_shap: number;
  mean_signed_shap: number | null;
  importance_percent: number;
  rank: number;
}

export interface RiceShapGroup {
  feature_group: string;
  mean_abs_shap: number;
  importance_percent: number;
  rank: number;
}

export interface RiceModelMetadata {
  model_version: string;
  model_name: string;
  target: string;
  target_unit: string;
  feature_count: number;
  development_period: string;
  final_test_period: string;
  parameters: Record<string, unknown>;
  test_metrics: Record<string, number>;
  notes: string[];
  interval_metadata: Record<string, unknown>;
}

export type RiceMapMetric =
  | "actual_yield"
  | "predicted_yield"
  | "absolute_error"
  | "residual"
  | "rainfall"
  | "temperature"
  | "ndvi"
  | "soil_moisture";

export type RiceComparisonMetric =
  | "actual_yield"
  | "predicted_yield"
  | "rainfall"
  | "temperature"
  | "ndvi"
  | "soil_moisture";

export interface RiceTrendPoint {
  year: number;
  cropYear: string | null;
  actualYield: number | null;
  predictedYield: number | null;
}

export interface RiceMapFeature {
  type: "Feature";
  id: number;
  properties: {
    provinceId: number;
    provinceTh: string;
    provinceEn: string;
    region: RiceRegion;
    year: number;
    month: number | null;
    value: number | null;
    actualYield: number | null;
    predictedYield: number | null;
    absoluteError: number | null;
    residual: number | null;
  };
  geometry: RiceGeometry;
}

export interface RiceDashboardResponse {
  version: RiceDashboardVersion;
  filters: {
    version: string;
    cropYear: number;
    year: number;
    month: number;
    region: RiceRegion | null;
    provinceId: number | null;
  };
  coverage: {
    provinces: number;
    cropYears: number[];
    environmentYears: number[];
  };
  kpis: {
    averageActualYield: number | null;
    averagePredictedYield: number | null;
    rainfall: number | null;
    meanTemperature: number | null;
    meanNdvi: number | null;
    meanSoilMoisture: number | null;
  };
  trend: RiceTrendPoint[];
}
