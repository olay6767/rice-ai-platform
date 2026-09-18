export type DisasterName = "น้ำท่วม" | "ภัยแล้ง" | "พายุ";

export interface DisasterRecord {
  ภัย: DisasterName;
  ปี: number;
  เดือนเลข: number;
  เดือน: string;
  จังหวัด: string;
  record_count: number;
}

export interface ComparisonYear {
  year: number;
  flood: number | null;
  drought: number | null;
  storm: number | null;
}

export interface ComparisonMonth {
  month: number;
  month_name: string;
  flood: number | null;
  flood_avg: number | null;
  drought: number | null;
  drought_avg: number | null;
  storm: number | null;
  storm_avg: number | null;
}

export interface ComparisonProvince {
  province: string;
  flood: number | null;
  drought: number | null;
  storm: number | null;
  disaster_type_count: number;
  total_record_frequency: number;
}

export interface OverviewKpi {
  comparison_start_year: number;
  comparison_end_year: number;
  comparison_year_count: number;
  flood: {
    province_count: number;
    record_count: number;
    year_count: number;
  };
  drought: {
    province_count: number;
    record_count: number;
    year_count: number;
  };
  storm: {
    province_count: number;
    record_count: number;
    year_count: number;
  };
  three_disaster_provinces: number;
  two_plus_disaster_provinces: number;
}

export interface ImpactKpi {
  year?: number;
  province_count: number;
  total_events: number;
  affected_people: number;
  affected_households: number;
  housing_damage: number;
  agriculture_damage: number;
  evacuees?: number;
  fatalities?: number;
  injuries?: number;
}

export interface FloodImpactProvince {
  year: number;
  province: string;
  region: string;
  event_count: number;
  affected_people: number;
  affected_households: number;
  housing_damage: number;
  agriculture_damage: number;
}

export interface StormImpactProvince {
  ปี: number;
  ภูมิภาค: string;
  จังหวัด: string;
  จำนวนครั้ง: number;
  ผู้ได้รับผลกระทบ: number;
  ครัวเรือนได้รับผลกระทบ: number;
  ที่อยู่อาศัยเสียหาย: number;
  พื้นที่เกษตรเสียหาย: number;
}

export interface DisasterOverviewData {
  meta: {
    title: string;
    monthly_comparison_period: {
      start_year: number;
      end_year: number;
      years: number[];
    };
    available_years: number[];
    summary_years: number[];
    metric_definition: string;
    warning: string;
  };
  coverage: Array<{
    ภัย: DisasterName;
    start_year: number;
    end_year: number;
    year_count: number;
    province_count: number;
    record_count: number;
  }>;
  filters: {
    years: number[];
    monthly_comparison_years: number[];
    summary_years: number[];
    months: Array<{ month: number; month_name: string }>;
    provinces: string[];
    disasters: DisasterName[];
  };
  overview_kpi: OverviewKpi;
  comparison: {
    yearly_common: ComparisonYear[];
    yearly_all: ComparisonYear[];
    monthly_common: ComparisonMonth[];
    provinces_common: ComparisonProvince[];
    top_multi_disaster_provinces: ComparisonProvince[];
  };
  records: DisasterRecord[];
  summary_2568: {
    year: number;
    note: string;
    flood: {
      data_type: string;
      has_monthly_data: boolean;
      kpi: ImpactKpi;
      province_data: FloodImpactProvince[];
    } | null;
    drought: null;
    storm: {
      kpi: ImpactKpi;
      provinces: StormImpactProvince[];
    } | null;
  };
}

export function isDisasterOverviewData(
  value: unknown
): value is DisasterOverviewData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DisasterOverviewData>;

  return Boolean(
    candidate.meta &&
      candidate.filters &&
      Array.isArray(candidate.filters.years) &&
      Array.isArray(candidate.filters.months) &&
      Array.isArray(candidate.filters.provinces) &&
      Array.isArray(candidate.filters.disasters) &&
      candidate.overview_kpi &&
      candidate.comparison &&
      Array.isArray(candidate.comparison.monthly_common) &&
      Array.isArray(candidate.comparison.yearly_all) &&
      Array.isArray(candidate.comparison.provinces_common) &&
      Array.isArray(candidate.comparison.top_multi_disaster_provinces) &&
      Array.isArray(candidate.records) &&
      candidate.summary_2568 &&
      Number.isFinite(candidate.summary_2568.year)
  );
}
