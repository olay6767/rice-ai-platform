export interface StormKpi {
  total_provinces: number;
  total_records: number;
  total_years: number;
  total_months: number;
  top_month: string;
  top_month_records: number;
  top_province: string;
  top_province_records: number;
}

export interface StormMonthOverall {
  เดือน: string;
  เดือนเลข: number;
  record_count: number;
  province_count: number;
}

export interface StormMonthly {
  ปี: number;
  เดือน: string;
  เดือนเลข: number;
  province_count: number;
}

export interface StormYearly {
  ปี: number;
  record_count: number;
  province_count: number;
  month_count: number;
}

export interface StormTopProvince {
  rank: number;
  จังหวัด: string;
  record_count: number;
  year_count: number;
  month_count: number;
}

export interface StormHeatmapProvince {
  จังหวัด: string;
  record_count: number;
  year_count: number;
  month_count: number;
}

export interface StormProvinceYear {
  ปี: number;
  จังหวัด: string;
  month_count: number;
}

export interface StormTopProvinceByYear {
  ปี: number;
  จังหวัด: string;
  month_count: number;
  rank: number;
}

export interface StormTopMonthByYear {
  ปี: number;
  เดือน: string;
  เดือนเลข: number;
  province_count: number;
}

export interface StormDetailedKpi {
  province_count: number;
  total_events: number;
  affected_people: number;
  affected_households: number;
  housing_damage: number;
  agriculture_damage: number;
}

export interface StormDetailedProvince {
  ปี: number;
  ภูมิภาค: string;
  จังหวัด: string;
  จำนวนครั้ง: number;
  จำนวนอำเภอ: number;
  จำนวนตำบล: number;
  จำนวนชุมชน: number;
  ผู้ได้รับผลกระทบ: number;
  ครัวเรือนได้รับผลกระทบ: number;
  ที่อยู่อาศัยเสียหาย: number;
  พื้นที่เกษตรเสียหาย: number;
}

export interface StormDetailedTopProvince extends StormDetailedProvince {
  rank: number;
}

export interface StormDetailedRegion {
  ภูมิภาค: string;
  province_count: number;
  total_events: number;
  affected_people: number;
  agriculture_damage: number;
}

export interface StormDashboardData {
  kpi: StormKpi;
  month_overall: StormMonthOverall[];
  monthly: StormMonthly[];
  yearly: StormYearly[];
  top5: StormTopProvince[];
  heatmap: StormHeatmapProvince[];
  province_year: StormProvinceYear[];
  top5_by_year: StormTopProvinceByYear[];
  top_month_by_year: StormTopMonthByYear[];
  year_2568: {
    kpi: StormDetailedKpi;
    provinces: StormDetailedProvince[];
    top5: StormDetailedTopProvince[];
    regions: StormDetailedRegion[];
  };
  filters: {
    years: number[];
    months: string[];
    provinces: string[];
  };
}

export function isStormDashboardData(value: unknown): value is StormDashboardData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<StormDashboardData>;
  const detailed = candidate.year_2568;

  return Boolean(
    candidate.kpi &&
      Number.isFinite(candidate.kpi.total_records) &&
      Array.isArray(candidate.month_overall) &&
      Array.isArray(candidate.monthly) &&
      Array.isArray(candidate.yearly) &&
      Array.isArray(candidate.top5) &&
      Array.isArray(candidate.heatmap) &&
      Array.isArray(candidate.province_year) &&
      Array.isArray(candidate.top5_by_year) &&
      Array.isArray(candidate.top_month_by_year) &&
      detailed &&
      Number.isFinite(detailed.kpi?.total_events) &&
      Array.isArray(detailed.provinces) &&
      Array.isArray(detailed.top5) &&
      candidate.filters &&
      Array.isArray(candidate.filters.years) &&
      Array.isArray(candidate.filters.months) &&
      Array.isArray(candidate.filters.provinces)
  );
}
