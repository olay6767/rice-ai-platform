export type RicePriceDataType = "observed" | "imputed" | "forecast";

export type ForecastReliability = "High" | "Medium" | "Low";

export interface RicePriceRecord {
  date: string;
  yearAd: number;
  yearBe: number;
  month: number;
  monthNameTh: string;
  riceType: string;
  price: number;
  dataType: RicePriceDataType;
  isImputed: boolean;
  imputeMethod: string | null;
  model: string | null;
  paramSet: string | null;
  forecastMethod: string | null;
  forecastReliability: ForecastReliability | null;
  source: string | null;
}

export interface RiceForecastRecord {
  date: string;
  yearAd: number;
  yearBe: number;
  month: number;
  monthNameTh: string;
  riceType: string;
  forecastPrice: number;
  model: string;
  paramSet: string;
  forecastMethod: string;
  forecastReliability: ForecastReliability;
}

export interface RicePriceSummary {
  riceType: string;
  forecastYear: number;
  forecastMin: number;
  forecastMax: number;
  forecastMean: number;
  forecastSd: number;
  january: number;
  december: number;
  change: number;
  changePct: number;
  reliability: ForecastReliability;
  status: string;
}

export interface RiceModelPerformance {
  riceType: string;
  finalMethod: string;
  cvMae: number;
  cvStdMae: number;
  cvMape: number;
  testMae: number;
  testMape: number;
  forecastMethod: string;
  reliability: ForecastReliability;
  status: string;
}

export interface RiceDataQuality {
  riceType: string;
  forecast: number;
  imputed: number;
  observed: number;
  historicalTotal: number;
  observedPct: number;
  imputedPct: number;
}

export interface RicePriceFilters {
  riceTypes: string[];
  yearsBe: number[];
  months: Array<{ value: number; label: string }>;
  regions: string[];
  provinces: string[];
  availability: {
    riceType: boolean;
    year: boolean;
    month: boolean;
    region: boolean;
    province: boolean;
  };
  notes: {
    region: string;
    province: string;
  };
}

export interface RicePriceDatasetInfo {
  id: string;
  versionKey: string;
  label: string;
  description: string;
  sourceName: string;
  sourceUrl: string | null;
  publishedAt: string | null;
  recordCount: number;
}

export interface RicePriceDashboardData {
  dataset: RicePriceDatasetInfo;
  monthly: RicePriceRecord[];
  forecasts: RiceForecastRecord[];
  summaries: RicePriceSummary[];
  modelPerformance: RiceModelPerformance[];
  quality: RiceDataQuality[];
  filters: RicePriceFilters;
}
