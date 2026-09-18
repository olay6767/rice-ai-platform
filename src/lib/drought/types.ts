export interface DroughtKpi {
  total_provinces: number;
  total_records: number;
  total_years: number;
  total_months: number;
  top_month: string;
  top_month_records: number;
  top_month_provinces: number;
  top_province: string;
  top_province_records: number;
  top_province_years: number;
}

export interface DroughtMonthOverall {
  เดือน: string;
  เดือนเลข: number;
  record_count: number;
  province_count: number;
}

export interface DroughtMonthly {
  ปี: number;
  เดือน: string;
  เดือนเลข: number;
  province_count: number;
}

export interface DroughtYearly {
  ปี: number;
  record_count: number;
  province_count: number;
  month_count: number;
}

export interface DroughtTopProvince {
  rank: number;
  จังหวัด: string;
  record_count: number;
  year_count: number;
  unique_month_count: number;
}

export interface DroughtHeatmapProvince {
  จังหวัด: string;
  record_count: number;
  year_count: number;
  unique_month_count: number;
  frequency_level: string;
}

export interface DroughtProvinceYear {
  ปี: number;
  จังหวัด: string;
  month_count: number;
}

export interface DroughtTopProvinceByYear {
  ปี: number;
  rank: number;
  จังหวัด: string;
  month_count: number;
}

export interface DroughtTopMonthByYear {
  ปี: number;
  เดือน: string;
  เดือนเลข: number;
  province_count: number;
}

export interface DroughtDashboardData {
  kpi: DroughtKpi;
  month_overall: DroughtMonthOverall[];
  monthly: DroughtMonthly[];
  monthly_full: DroughtMonthly[];
  yearly: DroughtYearly[];
  top5: DroughtTopProvince[];
  heatmap: DroughtHeatmapProvince[];
  province_year: DroughtProvinceYear[];
  top5_by_year: DroughtTopProvinceByYear[];
  top_month_by_year: DroughtTopMonthByYear[];
  filters: {
    years: number[];
    months: string[];
    provinces: string[];
  };
}

export function isDroughtDashboardData(value: unknown): value is DroughtDashboardData {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<DroughtDashboardData>;
  const filters = candidate.filters;
  const kpi = candidate.kpi;

  return Boolean(
    kpi &&
      Number.isFinite(kpi.total_records) &&
      Number.isFinite(kpi.total_provinces) &&
      filters &&
      Array.isArray(filters.years) &&
      Array.isArray(filters.months) &&
      Array.isArray(filters.provinces) &&
      Array.isArray(candidate.month_overall) &&
      Array.isArray(candidate.monthly) &&
      Array.isArray(candidate.monthly_full) &&
      Array.isArray(candidate.yearly) &&
      Array.isArray(candidate.top5) &&
      Array.isArray(candidate.heatmap) &&
      Array.isArray(candidate.province_year) &&
      Array.isArray(candidate.top5_by_year) &&
      Array.isArray(candidate.top_month_by_year)
  );
}
