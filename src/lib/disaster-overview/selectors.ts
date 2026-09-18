import type {
  DisasterName,
  DisasterOverviewData,
  DisasterRecord,
  FloodImpactProvince,
  ImpactKpi,
  StormImpactProvince,
} from "./types";

export const ALL = "all";
const TOP_LIMIT = 5;
export type DisasterKey = "flood" | "drought" | "storm";

export interface OverviewFilters {
  year: string;
  month: string;
  province: string;
  disaster: string;
}

export const DEFAULT_OVERVIEW_FILTERS: OverviewFilters = {
  year: ALL,
  month: ALL,
  province: ALL,
  disaster: ALL,
};

export const THAI_SHORT_MONTHS = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
] as const;

const DISASTER_CONFIG: Array<{ name: DisasterName; key: DisasterKey }> = [
  { name: "น้ำท่วม", key: "flood" },
  { name: "ภัยแล้ง", key: "drought" },
  { name: "พายุ", key: "storm" },
];

export interface ChartRow {
  label: string;
  fullLabel: string;
  flood: number | null;
  drought: number | null;
  storm: number | null;
}

export interface ImpactView {
  disaster: DisasterName;
  events: number | null;
  people: number | null;
  households: number | null;
  housing: number | null;
  agriculture: number | null;
}

export interface RankingItem {
  province: string;
  flood: number | null;
  drought: number | null;
  storm: number | null;
  typeCount: number;
  total: number;
}

function disasterKey(disaster: DisasterName): DisasterKey {
  if (disaster === "น้ำท่วม") return "flood";
  if (disaster === "ภัยแล้ง") return "drought";
  return "storm";
}

function sumRecords(records: DisasterRecord[]): number | null {
  if (records.length === 0) return null;
  return records.reduce((sum, record) => sum + record.record_count, 0);
}

function sumNullable(values: Array<number | null>): number | null {
  const available = values.filter((value): value is number => value !== null);
  if (available.length === 0) return null;
  return available.reduce((sum, value) => sum + value, 0);
}

function normalizeFloodImpact(
  kpi: ImpactKpi | null,
  province: FloodImpactProvince | undefined
): ImpactView {
  return {
    disaster: "น้ำท่วม",
    events: province?.event_count ?? kpi?.total_events ?? null,
    people: province?.affected_people ?? kpi?.affected_people ?? null,
    households:
      province?.affected_households ?? kpi?.affected_households ?? null,
    housing: province?.housing_damage ?? kpi?.housing_damage ?? null,
    agriculture:
      province?.agriculture_damage ?? kpi?.agriculture_damage ?? null,
  };
}

function normalizeStormImpact(
  kpi: ImpactKpi | null,
  province: StormImpactProvince | undefined
): ImpactView {
  return {
    disaster: "พายุ",
    events: province?.จำนวนครั้ง ?? kpi?.total_events ?? null,
    people: province?.ผู้ได้รับผลกระทบ ?? kpi?.affected_people ?? null,
    households:
      province?.ครัวเรือนได้รับผลกระทบ ??
      kpi?.affected_households ??
      null,
    housing: province?.ที่อยู่อาศัยเสียหาย ?? kpi?.housing_damage ?? null,
    agriculture:
      province?.พื้นที่เกษตรเสียหาย ?? kpi?.agriculture_damage ?? null,
  };
}

export function deriveDisasterOverview(
  data: DisasterOverviewData,
  filters: OverviewFilters
) {
  const selectedYear = filters.year === ALL ? null : Number(filters.year);
  const selectedMonth = filters.month === ALL ? null : Number(filters.month);
  const selectedProvince = filters.province === ALL ? null : filters.province;
  const selectedDisaster =
    filters.disaster === ALL ? null : (filters.disaster as DisasterName);

  const currentData = data;

  const summaryYear = data.summary_2568.year;
  const isSummaryMode = selectedYear === summaryYear;
  const comparisonYears = data.meta.monthly_comparison_period.years;
  const activeYears =
    selectedYear && !isSummaryMode ? [selectedYear] : comparisonYears;
  const visibleDisasters = selectedDisaster
    ? [selectedDisaster]
    : data.filters.disasters;

  const filteredRecords = data.records.filter(
    (record) =>
      activeYears.includes(record.ปี) &&
      (selectedMonth === null || record.เดือนเลข === selectedMonth) &&
      (selectedProvince === null || record.จังหวัด === selectedProvince) &&
      (selectedDisaster === null || record.ภัย === selectedDisaster)
  );

  const summaryFloodProvince =
    selectedProvince && data.summary_2568.flood
      ? data.summary_2568.flood.province_data.find(
          (item) => item.province === selectedProvince
        )
      : undefined;
  const summaryStormProvince =
    selectedProvince && data.summary_2568.storm
      ? data.summary_2568.storm.provinces.find(
          (item) => item.จังหวัด === selectedProvince
        )
      : undefined;

  const summaryImpacts: ImpactView[] = [
    normalizeFloodImpact(
      selectedProvince ? null : data.summary_2568.flood?.kpi ?? null,
      summaryFloodProvince
    ),
    {
      disaster: "ภัยแล้ง",
      events: null,
      people: null,
      households: null,
      housing: null,
      agriculture: null,
    } satisfies ImpactView,
    normalizeStormImpact(
      selectedProvince ? null : data.summary_2568.storm?.kpi ?? null,
      summaryStormProvince
    ),
  ].filter(
    (item) =>
      selectedDisaster === null || item.disaster === selectedDisaster
  );

  function recordMetric(disaster: DisasterName): number | null {
    if (selectedDisaster && selectedDisaster !== disaster) return null;
    return sumRecords(
      filteredRecords.filter((record) => record.ภัย === disaster)
    );
  }

  function summaryMetric(disaster: DisasterName): number | null {
    if (selectedDisaster && selectedDisaster !== disaster) return null;
    return (
      summaryImpacts.find((item) => item.disaster === disaster)?.events ??
      null
    );
  }

  const kpiValues = {
    flood: isSummaryMode
      ? summaryMetric("น้ำท่วม")
      : recordMetric("น้ำท่วม"),
    drought: isSummaryMode
      ? summaryMetric("ภัยแล้ง")
      : recordMetric("ภัยแล้ง"),
    storm: isSummaryMode
      ? summaryMetric("พายุ")
      : recordMetric("พายุ"),
  };

  let completeProvinceCount: number | null = null;
  if (!selectedDisaster && !isSummaryMode) {
    const hasFullCoverage = data.coverage.every((coverage) =>
      activeYears.every(
        (year) =>
          year >= coverage.start_year && year <= coverage.end_year
      )
    );

    if (hasFullCoverage) {
      const provinceDisasters = new Map<string, Set<DisasterName>>();
      filteredRecords.forEach((record) => {
        const found =
          provinceDisasters.get(record.จังหวัด) ??
          new Set<DisasterName>();
        found.add(record.ภัย);
        provinceDisasters.set(record.จังหวัด, found);
      });
      completeProvinceCount = [...provinceDisasters.values()].filter(
        (found) => found.size === data.filters.disasters.length
      ).length;
    }
  }

  const exactMonthlyComparison =
    selectedYear === null &&
    selectedMonth === null &&
    selectedProvince === null &&
    selectedDisaster === null;

  const monthRows = data.filters.months
    .filter(
      (month) => selectedMonth === null || month.month === selectedMonth
    )
    .map((month): ChartRow => {
      const common = data.comparison.monthly_common.find(
        (item) => item.month === month.month
      );
      const row: ChartRow = {
        label: THAI_SHORT_MONTHS[month.month - 1] ?? month.month_name,
        fullLabel: month.month_name,
        flood: null,
        drought: null,
        storm: null,
      };

      DISASTER_CONFIG.forEach((config) => {
        if (!visibleDisasters.includes(config.name)) return;

        if (exactMonthlyComparison) {
          row[config.key] =
            common?.[
              (config.key + "_avg") as
                | "flood_avg"
                | "drought_avg"
                | "storm_avg"
            ] ?? null;
          return;
        }

        const total = sumRecords(
          data.records.filter(
            (record) =>
              activeYears.includes(record.ปี) &&
              record.เดือนเลข === month.month &&
              record.ภัย === config.name &&
              (selectedProvince === null ||
                record.จังหวัด === selectedProvince)
          )
        );
        row[config.key] =
          total === null ? null : total / activeYears.length;
      });

      return row;
    });

  const historicalYears = data.comparison.yearly_all.map(
    (item) => item.year
  );
  const yearlyRows = data.comparison.yearly_all
    .map((source): ChartRow => {
      const row: ChartRow = {
        label: String(source.year),
        fullLabel: "พ.ศ. " + source.year,
        flood: null,
        drought: null,
        storm: null,
      };

      DISASTER_CONFIG.forEach((config) => {
        if (!visibleDisasters.includes(config.name)) return;

        if (selectedProvince === null && selectedMonth === null) {
          row[config.key] = source[config.key];
          return;
        }

        row[config.key] = sumRecords(
          data.records.filter(
            (record) =>
              record.ปี === source.year &&
              record.ภัย === config.name &&
              (selectedMonth === null ||
                record.เดือนเลข === selectedMonth) &&
              (selectedProvince === null ||
                record.จังหวัด === selectedProvince)
          )
        );
      });

      return row;
    });

  function deriveRankingFromRecords(): RankingItem[] {
    const byProvince = new Map<
      string,
      Record<DisasterKey, number | null>
    >();

    filteredRecords.forEach((record) => {
      const values = byProvince.get(record.จังหวัด) ?? {
        flood: null,
        drought: null,
        storm: null,
      };
      const key = disasterKey(record.ภัย);
      values[key] = (values[key] ?? 0) + record.record_count;
      byProvince.set(record.จังหวัด, values);
    });

    return [...byProvince.entries()]
      .map(([province, values]) => ({
        province,
        ...values,
        typeCount: Object.values(values).filter(
          (value) => value !== null
        ).length,
        total: sumNullable(Object.values(values)) ?? 0,
      }))
      .sort(
        (first, second) =>
          second.typeCount - first.typeCount ||
          second.total - first.total
      )
      .slice(0, TOP_LIMIT);
  }

  function deriveSummaryRanking(): RankingItem[] {
    const floodValues = new Map<string, number>();
    const stormValues = new Map<string, number>();
    currentData.summary_2568.flood?.province_data.forEach((item) =>
      floodValues.set(item.province, item.event_count)
    );
    currentData.summary_2568.storm?.provinces.forEach((item) =>
      stormValues.set(item.จังหวัด, item.จำนวนครั้ง)
    );

    return currentData.filters.provinces
      .filter(
        (province) =>
          selectedProvince === null || province === selectedProvince
      )
      .map((province): RankingItem => {
        const flood =
          selectedDisaster === null || selectedDisaster === "น้ำท่วม"
            ? floodValues.get(province) ?? null
            : null;
        const drought = null;
        const storm =
          selectedDisaster === null || selectedDisaster === "พายุ"
            ? stormValues.get(province) ?? null
            : null;
        const values = { flood, drought, storm };

        return {
          province,
          ...values,
          typeCount: Object.values(values).filter(
            (value) => value !== null
          ).length,
          total: sumNullable(Object.values(values)) ?? 0,
        };
      })
      .filter((item) => item.typeCount > 0)
      .sort(
        (first, second) =>
          second.typeCount - first.typeCount ||
          second.total - first.total
      )
      .slice(0, TOP_LIMIT);
  }

  const exactTopComparison =
    !isSummaryMode &&
    selectedYear === null &&
    selectedMonth === null &&
    selectedProvince === null &&
    selectedDisaster === null;
  const ranking = isSummaryMode
    ? deriveSummaryRanking()
    : exactTopComparison
      ? data.comparison.top_multi_disaster_provinces
          .slice(0, TOP_LIMIT)
          .map((item) => ({
            province: item.province,
            flood: item.flood,
            drought: item.drought,
            storm: item.storm,
            typeCount: item.disaster_type_count,
            total: item.total_record_frequency,
          }))
      : deriveRankingFromRecords();

  const exactMapComparison =
    !isSummaryMode &&
    selectedYear === null &&
    selectedMonth === null &&
    selectedProvince === null;
  const mapValues = new Map<string, number>();

  if (isSummaryMode) {
    const floodValues = new Map<string, number>();
    const stormValues = new Map<string, number>();
    data.summary_2568.flood?.province_data.forEach((item) =>
      floodValues.set(item.province, item.event_count)
    );
    data.summary_2568.storm?.provinces.forEach((item) =>
      stormValues.set(item.จังหวัด, item.จำนวนครั้ง)
    );

    data.filters.provinces.forEach((province) => {
      if (selectedProvince && selectedProvince !== province) return;
      const value = sumNullable([
        selectedDisaster === null || selectedDisaster === "น้ำท่วม"
          ? floodValues.get(province) ?? null
          : null,
        selectedDisaster === null || selectedDisaster === "พายุ"
          ? stormValues.get(province) ?? null
          : null,
      ]);
      if (value !== null) mapValues.set(province, value);
    });
  } else if (exactMapComparison) {
    data.comparison.provinces_common.forEach((item) => {
      const value = selectedDisaster
        ? item[disasterKey(selectedDisaster)]
        : item.total_record_frequency;
      if (value !== null) mapValues.set(item.province, value);
    });
  } else {
    const byProvince = new Map<string, number>();
    filteredRecords.forEach((record) => {
      byProvince.set(
        record.จังหวัด,
        (byProvince.get(record.จังหวัด) ?? 0) + record.record_count
      );
    });
    byProvince.forEach((value, province) =>
      mapValues.set(province, value)
    );
  }

  const mapUnavailableNote =
    isSummaryMode && selectedDisaster === "ภัยแล้ง"
      ? "ไม่มีข้อมูลสรุปภัยแล้งสำหรับปีที่เลือก"
      : mapValues.size === 0
        ? "ไม่มีข้อมูลตามตัวกรองนี้"
        : undefined;

  return {
    summaryYear,
    isSummaryMode,
    activeYears,
    historicalYears,
    visibleDisasters,
    kpiValues,
    completeProvinceCount,
    monthRows,
    yearlyRows,
    ranking,
    mapValues,
    mapUnavailableNote,
    summaryImpacts,
    comparisonLabel:
      data.meta.monthly_comparison_period.start_year +
      "–" +
      data.meta.monthly_comparison_period.end_year,
  };
}

export function overviewScope(
  data: DisasterOverviewData,
  filters: OverviewFilters
): string {
  const year = filters.year === ALL
    ? "ข้อมูลทั้งหมด"
    : `พ.ศ. ${filters.year}`;
  const month = filters.month === ALL
    ? ""
    : ` · ${THAI_SHORT_MONTHS[Number(filters.month) - 1] ?? ""}`;
  return year + month;
}

export function historicalTrendRows(
  rows: ChartRow[],
  throughYear: string
): ChartRow[] {
  return throughYear === ALL
    ? rows
    : rows.filter((row) => Number(row.label) <= Number(throughYear));
}
