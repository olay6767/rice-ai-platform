export interface RiceYieldRecord {
  province: string;
  crop_year: string;
  crop_start_year_be: number;
  crop_end_year_be: number;
  crop_start_year_ad: number;
  crop_end_year_ad: number;
  yield_kg_rai: number;
  previous_yield_kg_rai: number | null;
  change_kg_rai: number | null;
  change_percent: number | null;
  trend: string;
  data_type: string;
  is_forecast: boolean;
}

export interface RiceYieldYear {
  crop_year: string;
  crop_start_year_be: number;
  crop_end_year_be: number;
  is_forecast: boolean;
}

export interface RiceYieldYearSummary {
  is_forecast: boolean;
  province_count: number;
  average_yield_kg_rai: number;
  max_yield_kg_rai: number;
  min_yield_kg_rai: number;
  increase_count: number;
  decrease_count: number;
  stable_count: number;
}

export interface RiceYieldDashboardData {
  metadata: {
    title: string;
    unit: string;
    province_count: number;
    year_count: number;
    record_count: number;
    latest_crop_year: string;
  };
  provinces: string[];
  years: RiceYieldYear[];
  records: Array<
    Omit<
      RiceYieldRecord,
      "crop_end_year_be" | "crop_start_year_ad" | "crop_end_year_ad" | "data_type"
    >
  >;
  province_history: Record<
    string,
    Array<{
      crop_year: string;
      year: number;
      yield_kg_rai: number;
      change_kg_rai: number | null;
      change_percent: number | null;
      is_forecast: boolean;
    }>
  >;
  year_summary: Record<string, RiceYieldYearSummary>;
}

export type RicePosition = [number, number];

export type RiceProvinceGeometry =
  | { type: "Polygon"; coordinates: RicePosition[][] }
  | { type: "MultiPolygon"; coordinates: RicePosition[][][] };

export interface RiceProvinceFeature {
  type: "Feature";
  properties: {
    province_id: number;
    gid_1: string;
    province_en: string;
    province_th: string;
    region: string;
    region_code: string;
  };
  geometry: RiceProvinceGeometry;
}

export interface RiceProvinceGeoJson {
  type: "FeatureCollection";
  features: RiceProvinceFeature[];
}

export interface RiceYieldStaticData {
  dashboard: RiceYieldDashboardData;
  records: RiceYieldRecord[];
  geoJson: RiceProvinceGeoJson;
}
