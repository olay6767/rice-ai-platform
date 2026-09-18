"use client";

import {
  ChevronDown,
  Funnel,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import ThailandFrequencyMap from "@/components/drought/ThailandDroughtMap";
import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import {
  RiceErrorState,
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";
import { readJsonResponse } from "@/lib/http/json";
import {
  isStormDashboardData,
  type StormDashboardData,
  type StormDetailedProvince,
} from "@/lib/storm/types";

const ALL = "all";
const DATA_URL = "/data/storm/พายุ_Dashboard_Data.json";
const FREQUENCY_LABEL = "ความถี่ที่พบบันทึกพายุ";
const STORM_KPI_IMAGES = ["/images/34.png", "/images/12.png", "/images/31.png", "/images/32.png"];
const STORM_RED = "#D32F2F";
const THAI_MONTH_ABBREVIATIONS = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
] as const;

function formatNumber(value: number | null, maximumFractionDigits = 0): string {
  return value === null
    ? "—"
    : value.toLocaleString("th-TH", { maximumFractionDigits });
}

function StormPanel({
  title,
  description,
  action,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={
        "min-w-0 rounded-2xl border border-orange-950/10 bg-white p-4 shadow-[0_16px_50px_rgba(124,45,18,0.06)] sm:rounded-3xl sm:p-6 dark:border-orange-200/10 dark:bg-[#17130f] " +
        className
      }
    >
      <div className="mb-4 flex min-w-0 flex-col gap-2.5 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight sm:text-2xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-emerald-950/55 sm:text-sm dark:text-white/55">
              {description}
            </p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled = false,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-emerald-950/70 dark:text-white/70">
      {label}
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-orange-950/15 bg-[#fffdfb] px-3 text-sm text-[#2b1b12] outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 disabled:cursor-not-allowed disabled:opacity-55 dark:border-white/15 dark:bg-white/5 dark:text-white"
      >
        {children}
      </select>
    </label>
  );
}

function StormChartFilters({
  years,
  months,
  provinces,
  yearFilter,
  monthFilter,
  provinceFilter,
  monthDisabled,
  onYearChange,
  onMonthChange,
  onProvinceChange,
  onReset,
}: {
  years: number[];
  months: string[];
  provinces: string[];
  yearFilter: string;
  monthFilter: string;
  provinceFilter: string;
  monthDisabled: boolean;
  onYearChange: (value: string) => void;
  onMonthChange: (value: string) => void;
  onProvinceChange: (value: string) => void;
  onReset: () => void;
}) {
  const isDefault = yearFilter === ALL && monthFilter === ALL && provinceFilter === ALL;

  return (
    <details className="group relative z-40 self-start">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full bg-[#f4eee4] px-3.5 text-xs font-semibold text-[#7b4b28] transition-colors hover:bg-[#eee2d1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600/30 [&::-webkit-details-marker]:hidden dark:bg-white/10 dark:text-orange-100 dark:hover:bg-white/15">
        <Funnel aria-hidden="true" className="h-3.5 w-3.5" />
        เลือกข้อมูล
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
        />
      </summary>

      <div className="absolute left-0 z-50 mt-2 w-[min(88vw,44rem)] rounded-2xl bg-white p-4 shadow-[0_18px_48px_rgba(124,45,18,0.17)] sm:left-auto sm:right-0 dark:bg-[#24170f]">
        <div className="grid gap-3 md:grid-cols-3">
          <FilterSelect label="ปี พ.ศ." value={yearFilter} onChange={onYearChange}>
            <option value={ALL}>ทุกปี</option>
            {years.map((year) => (
              <option key={year} value={year}>
                {year} (ค.ศ. {year - 543})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="เดือน"
            value={monthFilter}
            disabled={monthDisabled}
            onChange={onMonthChange}
          >
            <option value={ALL}>{monthDisabled ? "ไม่มีข้อมูลแยกเดือน" : "ทุกเดือน"}</option>
            {months.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="จังหวัด" value={provinceFilter} onChange={onProvinceChange}>
            <option value={ALL}>ทุกจังหวัด</option>
            {provinces.map((province) => (
              <option key={province} value={province}>
                {province}
              </option>
            ))}
          </FilterSelect>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onReset}
            disabled={isDefault}
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-orange-50 px-3 text-xs font-semibold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-orange-200 dark:hover:bg-white/15"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            รีเซ็ตตัวกรอง
          </button>
        </div>
      </div>
    </details>
  );
}

function KpiCard({
  label,
  value,
  detail,
  imageSrc,
}: {
  label: string;
  value: string;
  detail: string;
  imageSrc: string;
}) {
  return (
    <article className="flex min-h-[128px] min-w-0 items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_12px_34px_rgba(124,45,18,0.08)] sm:min-h-[136px] sm:gap-4 sm:p-4 dark:bg-[#17130f]">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_7px_18px_rgba(124,45,18,0.15)] sm:h-[72px] sm:w-[72px] dark:bg-white/95">
        <Image
          src={imageSrc}
          alt=""
          width={72}
          height={72}
          sizes="72px"
          className="h-11 w-11 object-contain sm:h-14 sm:w-14"
        />
      </div>
      <div className="min-w-0">
        <p className="break-words text-xl font-bold leading-none tracking-tight text-orange-700 tabular-nums sm:text-2xl dark:text-orange-300">
          {value}
        </p>
        <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-4 text-emerald-950/75 dark:text-white/75">
          {label}
        </p>
        <p className="mt-1 text-[9px] leading-4 text-emerald-950/45 sm:text-[10px] dark:text-white/45">
          {detail}
        </p>
      </div>
    </article>
  );
}

type StormTooltipProps = Partial<TooltipContentProps<number, string>> & {
  unit: string;
};

function StormChartTooltip({ active, payload, label, unit }: StormTooltipProps) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const source = item.payload as { monthName?: string; year?: number } | undefined;
  const shownLabel = source?.monthName ?? source?.year ?? label;

  return (
    <div className="rounded-xl border border-orange-950/10 bg-white px-3 py-2 text-xs shadow-lg dark:border-white/15 dark:bg-[#24170f]">
      <p className="font-semibold">{shownLabel}</p>
      <p className="mt-1 text-orange-700 dark:text-orange-300">
        {Number(item.value ?? 0).toLocaleString("th-TH")} {unit}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid h-72 place-items-center rounded-2xl bg-orange-50/55 px-5 text-center text-sm leading-6 text-emerald-950/55 dark:bg-orange-300/[0.05] dark:text-white/55">
      {message}
    </div>
  );
}

interface RankingItem {
  rank: number;
  province: string;
  value: number;
  detail: string;
  impacts?: {
    people: number;
    households: number;
    housing: number;
    agriculture: number;
  };
}

function detailImpacts(row: StormDetailedProvince) {
  return {
    people: row.ผู้ได้รับผลกระทบ,
    households: row.ครัวเรือนได้รับผลกระทบ,
    housing: row.ที่อยู่อาศัยเสียหาย,
    agriculture: row.พื้นที่เกษตรเสียหาย,
  };
}

export default function StormDashboard() {
  const [data, setData] = useState<StormDashboardData | null>(null);
  const [yearFilter, setYearFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(ALL);
  const [provinceFilter, setProvinceFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(DATA_URL, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = await readJsonResponse<unknown>(response);

        if (!response.ok || !isStormDashboardData(payload)) {
          throw new Error("รูปแบบข้อมูลพายุไม่ถูกต้องหรือไม่ครบถ้วน");
        }

        setData(payload);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูลพายุได้"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadData();
    return () => controller.abort();
  }, [reloadKey]);

  const selectedYear = yearFilter === ALL ? null : Number(yearFilter);
  const selectedMonthNumber = monthFilter === ALL ? null : Number(monthFilter);
  const selectedProvince = provinceFilter === ALL ? null : provinceFilter;

  const dashboard = useMemo(() => {
    if (!data) return null;

    const detailedYear =
      data.year_2568.provinces[0]?.ปี ?? data.year_2568.top5[0]?.ปี ?? null;
    const isDetailedYear =
      detailedYear !== null && selectedYear === detailedYear;
    const years = Array.from(
      new Set([
        ...data.filters.years,
        ...(detailedYear === null ? [] : [detailedYear]),
      ])
    ).sort((first, second) => first - second);

    const yearSummary = selectedYear
      ? data.yearly.find((item) => item.ปี === selectedYear)
      : undefined;
    const monthSummary = selectedMonthNumber
      ? data.month_overall.find(
          (item) => item.เดือนเลข === selectedMonthNumber
        )
      : undefined;
    const yearMonthSummary =
      selectedYear && selectedMonthNumber && !isDetailedYear
        ? data.monthly.find(
            (item) =>
              item.ปี === selectedYear &&
              item.เดือนเลข === selectedMonthNumber
          )
        : undefined;
    const provinceSummary = selectedProvince
      ? data.heatmap.find((item) => item.จังหวัด === selectedProvince)
      : undefined;
    const provinceYearSummary =
      selectedProvince && selectedYear && !isDetailedYear
        ? data.province_year.find(
            (item) =>
              item.ปี === selectedYear && item.จังหวัด === selectedProvince
          )
        : undefined;
    const detailedProvince =
      selectedProvince && isDetailedYear
        ? data.year_2568.provinces.find(
            (item) => item.จังหวัด === selectedProvince
          )
        : undefined;
    const provinceMonthUnavailable = Boolean(
      selectedProvince && selectedMonthNumber
    );

    let recordValue: number | null = data.kpi.total_records;
    let recordDetail = "รวมทุกปีจากชุดข้อมูล";
    let recordLabel = FREQUENCY_LABEL;

    if (provinceMonthUnavailable) {
      recordValue = null;
      recordDetail = "ไม่มีข้อมูลแยกจังหวัดตามเดือน";
    } else if (selectedProvince && selectedYear) {
      recordValue = provinceYearSummary?.month_count ?? 0;
      recordDetail =
        "จำนวนเดือนที่พบใน " + selectedProvince + " พ.ศ. " + selectedYear;
    } else if (selectedProvince) {
      recordValue = provinceSummary?.record_count ?? 0;
      recordDetail = "ภาพรวมของ" + selectedProvince;
    } else if (yearMonthSummary) {
      recordLabel = "จังหวัดที่พบบันทึกพายุ";
      recordValue = yearMonthSummary.province_count;
      recordDetail =
        yearMonthSummary.เดือน + " พ.ศ. " + yearMonthSummary.ปี;
    } else if (yearSummary) {
      recordValue = yearSummary.record_count;
      recordDetail = "ข้อมูลปี พ.ศ. " + yearSummary.ปี;
    } else if (monthSummary) {
      recordValue = monthSummary.record_count;
      recordDetail = "รวมทุกปีในเดือน" + monthSummary.เดือน;
    }

    let provinceCount: number | null = data.kpi.total_provinces;
    if (provinceMonthUnavailable) {
      provinceCount = null;
    } else if (selectedProvince) {
      provinceCount =
        provinceSummary || provinceYearSummary || detailedProvince ? 1 : 0;
    } else if (yearMonthSummary) {
      provinceCount = yearMonthSummary.province_count;
    } else if (yearSummary) {
      provinceCount = yearSummary.province_count;
    } else if (monthSummary) {
      provinceCount = monthSummary.province_count;
    }

    let monthCount: number | null = data.kpi.total_months;
    if (provinceMonthUnavailable) {
      monthCount = null;
    } else if (selectedMonthNumber) {
      monthCount = 1;
    } else if (selectedProvince && selectedYear) {
      monthCount = provinceYearSummary?.month_count ?? 0;
    } else if (selectedProvince) {
      monthCount = provinceSummary?.month_count ?? 0;
    } else if (yearSummary) {
      monthCount = yearSummary.month_count;
    }

    const topProvince = selectedYear
      ? data.top5_by_year.find((item) => item.ปี === selectedYear)
      : data.top5[0];
    const topProvinceName =
      selectedProvince ??
      (topProvince && "จังหวัด" in topProvince
        ? topProvince.จังหวัด
        : data.kpi.top_province);
    const topProvinceDetail = selectedProvince
      ? "จังหวัดที่กำลังเลือก"
      : selectedYear && topProvince
        ? formatNumber(topProvince.month_count) + " เดือนที่พบ"
        : formatNumber(data.kpi.top_province_records) + " บันทึก";

    const historicalBarSource = selectedYear
      ? data.monthly.filter((item) => item.ปี === selectedYear)
      : data.month_overall;
    const barData =
      isDetailedYear || selectedProvince
        ? []
        : historicalBarSource
            .filter(
              (item) =>
                selectedMonthNumber === null ||
                item.เดือนเลข === selectedMonthNumber
            )
            .map((item) => ({
              monthName: item.เดือน,
              month:
                THAI_MONTH_ABBREVIATIONS[item.เดือนเลข - 1] ?? item.เดือน,
              value: item.province_count,
            }));
    const barEmptyMessage = isDetailedYear
      ? "ข้อมูลรายละเอียดปีนี้ไม่มีการแยกตามเดือน"
      : "ชุดข้อมูลไม่มีมิติรายจังหวัดแยกตามเดือน จึงไม่สร้างค่าขึ้นเอง";

    let lineData: { year: number; value: number }[] = [];
    let lineUnit = "ครั้ง";

    if (selectedProvince) {
      if (isDetailedYear && detailedYear !== null) {
        lineData = [
          {
            year: detailedYear,
            value: detailedProvince?.จำนวนครั้ง ?? 0,
          },
        ];
      } else if (!selectedMonthNumber) {
        const visibleYears = selectedYear
          ? [selectedYear]
          : data.filters.years;
        lineData = visibleYears.map((year) => ({
          year,
          value:
            data.province_year.find(
              (item) =>
                item.ปี === year && item.จังหวัด === selectedProvince
            )?.month_count ?? 0,
        }));
        lineUnit = "เดือน";
      }
    } else if (selectedMonthNumber) {
      const visibleYears = selectedYear ? [selectedYear] : data.filters.years;
      lineData = visibleYears.map((year) => ({
        year,
        value:
          data.monthly.find(
            (item) =>
              item.ปี === year && item.เดือนเลข === selectedMonthNumber
          )?.province_count ?? 0,
      }));
      lineUnit = "จังหวัด";
    } else if (selectedYear) {
      lineData = isDetailedYear && detailedYear !== null
        ? [{ year: detailedYear, value: data.year_2568.kpi.total_events }]
        : [{
            year: selectedYear,
            value: yearSummary?.record_count ?? 0,
          }];
    } else {
      lineData = data.yearly.map((item) => ({
        year: item.ปี,
        value: item.record_count,
      }));
      if (
        detailedYear !== null &&
        !lineData.some((item) => item.year === detailedYear)
      ) {
        lineData.push({
          year: detailedYear,
          value: data.year_2568.kpi.total_events,
        });
      }
      lineData.sort((first, second) => first.year - second.year);
    }

    let ranking: RankingItem[] = [];
    if (!selectedMonthNumber) {
      if (isDetailedYear) {
        if (selectedProvince) {
          const ordered = [...data.year_2568.provinces].sort(
            (first, second) => second.จำนวนครั้ง - first.จำนวนครั้ง
          );
          const index = ordered.findIndex(
            (item) => item.จังหวัด === selectedProvince
          );
          const row = index >= 0 ? ordered[index] : undefined;
          ranking = row
            ? [{
                rank: index + 1,
                province: row.จังหวัด,
                value: row.จำนวนครั้ง,
                detail: row.ภูมิภาค,
                impacts: detailImpacts(row),
              }]
            : [];
        } else {
          ranking = data.year_2568.top5.map((item) => ({
            rank: item.rank,
            province: item.จังหวัด,
            value: item.จำนวนครั้ง,
            detail: item.ภูมิภาค,
            impacts: detailImpacts(item),
          }));
        }
      } else if (selectedYear) {
        if (selectedProvince) {
          const ordered = data.province_year
            .filter((item) => item.ปี === selectedYear)
            .sort((first, second) => second.month_count - first.month_count);
          const index = ordered.findIndex(
            (item) => item.จังหวัด === selectedProvince
          );
          const row = index >= 0 ? ordered[index] : undefined;
          ranking = row
            ? [{
                rank: index + 1,
                province: row.จังหวัด,
                value: row.month_count,
                detail: formatNumber(row.month_count) + " เดือนที่พบ",
              }]
            : [];
        } else {
          ranking = data.top5_by_year
            .filter((item) => item.ปี === selectedYear)
            .map((item) => ({
              rank: item.rank,
              province: item.จังหวัด,
              value: item.month_count,
              detail: formatNumber(item.month_count) + " เดือนที่พบ",
            }));
        }
      } else if (selectedProvince) {
        const ordered = [...data.heatmap].sort(
          (first, second) => second.record_count - first.record_count
        );
        const index = ordered.findIndex(
          (item) => item.จังหวัด === selectedProvince
        );
        const row = index >= 0 ? ordered[index] : undefined;
        ranking = row
          ? [{
              rank: index + 1,
              province: row.จังหวัด,
              value: row.record_count,
              detail:
                formatNumber(row.record_count) +
                " บันทึก · " +
                formatNumber(row.year_count) +
                " ปี",
            }]
          : [];
      } else {
        ranking = data.top5.map((item) => ({
          rank: item.rank,
          province: item.จังหวัด,
          value: item.record_count,
          detail:
            formatNumber(item.record_count) +
            " บันทึก · " +
            formatNumber(item.year_count) +
            " ปี",
        }));
      }
    }

    const mapValues = new Map<string, number>();
    const mapUnavailableNote = selectedMonthNumber
      ? "ชุดข้อมูลไม่มีความถี่รายจังหวัดแยกตามเดือน แผนที่จึงไม่ระบายสีเพื่อหลีกเลี่ยงการสร้างข้อมูล"
      : undefined;
    if (!mapUnavailableNote) {
      if (isDetailedYear) {
        data.year_2568.provinces.forEach((item) =>
          mapValues.set(item.จังหวัด, item.จำนวนครั้ง)
        );
      } else if (selectedYear) {
        data.province_year
          .filter((item) => item.ปี === selectedYear)
          .forEach((item) =>
            mapValues.set(item.จังหวัด, item.month_count)
          );
      } else {
        data.heatmap.forEach((item) =>
          mapValues.set(item.จังหวัด, item.record_count)
        );
      }
    }

    const detailedMetrics = isDetailedYear
      ? detailedProvince
        ? [
            {
              label: FREQUENCY_LABEL,
              value: detailedProvince.จำนวนครั้ง,
              detail: detailedProvince.จังหวัด,
              fractions: 0,
            },
            {
              label: "ผู้ได้รับผลกระทบ",
              value: detailedProvince.ผู้ได้รับผลกระทบ,
              detail: "คน",
              fractions: 0,
            },
            {
              label: "ครัวเรือนได้รับผลกระทบ",
              value: detailedProvince.ครัวเรือนได้รับผลกระทบ,
              detail: "ครัวเรือน",
              fractions: 0,
            },
            {
              label: "บ้านเสียหาย",
              value: detailedProvince.ที่อยู่อาศัยเสียหาย,
              detail: "หลัง",
              fractions: 0,
            },
            {
              label: "พื้นที่เกษตรเสียหาย",
              value: detailedProvince.พื้นที่เกษตรเสียหาย,
              detail: "หน่วยตามชุดข้อมูล",
              fractions: 2,
            },
          ]
        : [
            {
              label: FREQUENCY_LABEL,
              value: data.year_2568.kpi.total_events,
              detail: "รวมทุกจังหวัด",
              fractions: 0,
            },
            {
              label: "ผู้ได้รับผลกระทบ",
              value: data.year_2568.kpi.affected_people,
              detail: "คน",
              fractions: 0,
            },
            {
              label: "ครัวเรือนได้รับผลกระทบ",
              value: data.year_2568.kpi.affected_households,
              detail: "ครัวเรือน",
              fractions: 0,
            },
            {
              label: "บ้านเสียหาย",
              value: data.year_2568.kpi.housing_damage,
              detail: "หลัง",
              fractions: 0,
            },
            {
              label: "พื้นที่เกษตรเสียหาย",
              value: data.year_2568.kpi.agriculture_damage,
              detail: "หน่วยตามชุดข้อมูล",
              fractions: 2,
            },
          ]
      : null;

    return {
      detailedYear,
      isDetailedYear,
      years,
      recordLabel,
      recordValue,
      recordDetail,
      provinceCount,
      monthCount,
      topProvinceName,
      topProvinceDetail,
      barData,
      barEmptyMessage,
      lineData,
      lineUnit,
      ranking,
      rankingUnit: isDetailedYear || !selectedYear ? "ครั้ง" : "เดือน",
      mapValues,
      mapUnavailableNote,
      mapScope: selectedYear
        ? "ปี พ.ศ. " + selectedYear
        : "ภาพรวมทุกปี",
      mapValueUnit: selectedYear && !isDetailedYear ? "เดือน" as const : "ครั้ง" as const,
      detailedMetrics,
      provinceMonthUnavailable,
    };
  }, [data, selectedMonthNumber, selectedProvince, selectedYear]);

  function resetFilters() {
    setYearFilter(ALL);
    setMonthFilter(ALL);
    setProvinceFilter(ALL);
  }

  if (loading) {
    return <RiceLoadingState label="กำลังโหลดข้อมูลแดชบอร์ดพายุ…" />;
  }

  if (error || !data || !dashboard) {
    return (
      <RiceErrorState
        message={error ?? "ไม่สามารถเตรียมข้อมูลแดชบอร์ดพายุได้"}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  const selectedMonthLabel = selectedMonthNumber
    ? data.filters.months[selectedMonthNumber - 1]
    : "ทุกเดือน";
  const rankingMaximum = Math.max(
    ...dashboard.ranking.map((item) => item.value),
    1
  );
  const handleYearChange = (value: string) => {
    setYearFilter(value);
    if (value !== ALL && Number(value) === dashboard.detailedYear) {
      setMonthFilter(ALL);
    }
  };
  const chartFilters = () => (
    <StormChartFilters
      years={dashboard.years}
      months={data.filters.months}
      provinces={data.filters.provinces}
      yearFilter={yearFilter}
      monthFilter={monthFilter}
      provinceFilter={provinceFilter}
      monthDisabled={dashboard.isDetailedYear}
      onYearChange={handleYearChange}
      onMonthChange={setMonthFilter}
      onProvinceChange={setProvinceFilter}
      onReset={resetFilters}
    />
  );

  return (
    <div className="space-y-5 sm:space-y-7">
      <DashboardMascotInsight
        dashboardName="วิเคราะห์พายุ"
        summary={
          dashboard.provinceMonthUnavailable
            ? "ข้อมูลต้นฉบับไม่มีมิติจังหวัดร่วมกับเดือน จึงไม่สร้างค่าประมาณขึ้นมาแทน"
            : `มุมมอง ${selectedYear ? `พ.ศ. ${selectedYear}` : "ทุกปี"} ${selectedMonthLabel} ${selectedProvince ?? "ทุกจังหวัด"} พบบันทึกพายุ ${formatNumber(dashboard.recordValue)} รายการ ครอบคลุม ${formatNumber(dashboard.provinceCount)} จังหวัด${dashboard.topProvinceName ? ` โดยพื้นที่ที่เด่นคือ${dashboard.topProvinceName}` : ""}`
        }
        recommendation={
          dashboard.provinceMonthUnavailable
            ? "ควรเลือกจังหวัดหรือเดือนอย่างใดอย่างหนึ่งเพื่อดูมิติที่ข้อมูลรองรับ และไม่ควรตีความช่องว่างเป็นการไม่เกิดพายุ"
            : (dashboard.recordValue ?? 0) > 0
              ? `ควรให้${selectedProvince ? `พื้นที่${selectedProvince}` : `จังหวัด${dashboard.topProvinceName}`}ตรวจอาคาร พื้นที่เพาะปลูก จุดหลบภัย และช่องทางสื่อสารฉุกเฉิน พร้อมติดตามประกาศเตือนภัยทางการ`
              : "ควรตรวจความครบถ้วนของบันทึกและติดตามประกาศอากาศต่อเนื่องก่อนสรุปว่าพื้นที่ไม่มีความเสี่ยงพายุ"
        }
      />

      {dashboard.detailedMetrics ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {dashboard.detailedMetrics.map((item, index) => (
            <KpiCard
              key={item.label}
              label={item.label}
              value={formatNumber(item.value, item.fractions)}
              detail={item.detail}
              imageSrc={STORM_KPI_IMAGES[index % STORM_KPI_IMAGES.length]}
            />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label={dashboard.recordLabel}
            value={formatNumber(dashboard.recordValue)}
            detail={dashboard.recordDetail}
            imageSrc="/images/34.png"
          />
          <KpiCard
            label="จังหวัดที่พบบันทึกพายุ"
            value={formatNumber(dashboard.provinceCount)}
            detail="จังหวัดตามตัวกรอง"
            imageSrc="/images/12.png"
          />
          <KpiCard
            label="เดือนที่พบบันทึกพายุ"
            value={formatNumber(dashboard.monthCount)}
            detail="เดือนตามตัวกรอง"
            imageSrc="/images/31.png"
          />
          <KpiCard
            label="จังหวัดที่พบบ่อยสูงสุด"
            value={dashboard.topProvinceName}
            detail={dashboard.topProvinceDetail}
            imageSrc="/images/32.png"
          />
        </div>
      )}

      {dashboard.provinceMonthUnavailable ? (
        <div className="rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
          JSON ไม่มีข้อมูลระดับจังหวัดแยกตามเดือน กราฟและแผนที่ส่วนที่ต้องใช้มิตินี้จึงแสดงว่าไม่มีข้อมูลแทนการคาดเดาตัวเลข
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2">
        <StormPanel
          title="จังหวัดที่พบบันทึกพายุรายเดือน"
          action={chartFilters()}
        >
          {dashboard.barData.length ? (
            <div className="h-72" role="img" aria-label="กราฟแท่งจำนวนจังหวัดที่พบบันทึกพายุรายเดือน">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={dashboard.barData}
                  margin={{ top: 8, right: 8, left: -14, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(124,45,18,0.12)"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <Tooltip
                    cursor={{ fill: "rgba(249,115,22,0.08)" }}
                    content={<StormChartTooltip unit="จังหวัด" />}
                  />
                  <Bar
                    dataKey="value"
                    name="จังหวัด"
                    fill={STORM_RED}
                    radius={[12, 12, 2, 2]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message={dashboard.barEmptyMessage} />
          )}
        </StormPanel>

        <StormPanel
          title="แนวโน้มรายปี"
          action={chartFilters()}
        >
          {dashboard.lineData.length ? (
            <div className="h-72" role="img" aria-label="กราฟเส้นแนวโน้มบันทึกพายุรายปี">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={dashboard.lineData}
                  margin={{ top: 12, right: 14, left: -14, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="rgba(124,45,18,0.12)"
                  />
                  <XAxis
                    dataKey="year"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "currentColor" }}
                  />
                  <Tooltip
                    content={
                      <StormChartTooltip unit={dashboard.lineUnit} />
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={FREQUENCY_LABEL}
                    stroke={STORM_RED}
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#fff5f5", stroke: STORM_RED, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyChart message="ไม่มีข้อมูลสำหรับตัวกรองนี้" />
          )}
        </StormPanel>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <StormPanel
          title="แผนที่ประเทศไทยรายจังหวัด"
          action={chartFilters()}
        >
          <ThailandFrequencyMap
            values={dashboard.mapValues}
            selectedProvince={selectedProvince}
            onSelectProvince={(province) =>
              setProvinceFilter(province ?? ALL)
            }
            scopeLabel={dashboard.mapScope}
            valueUnit={dashboard.mapValueUnit}
            frequencyLabel={FREQUENCY_LABEL}
            recordNoun="บันทึกพายุ"
            unavailableNote={dashboard.mapUnavailableNote}
            compact
          />
        </StormPanel>

        <StormPanel
          title={
            dashboard.isDetailedYear
              ? "จังหวัดที่พบบันทึกพายุสูงสุดในปีที่เลือก"
              : "จังหวัดที่พบบันทึกพายุสูงสุด"
          }
          action={chartFilters()}
          className="flex h-full flex-col"
        >
          {dashboard.ranking.length ? (
            <ol className="grid min-h-[34rem] flex-1 auto-rows-fr gap-3">
              {dashboard.ranking.map((item) => (
                  <li
                    key={item.province}
                    className="flex min-h-0 min-w-0 flex-col justify-center"
                  >
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-red-50 text-xs font-bold text-[#b93223] dark:bg-red-300/10 dark:text-red-200">
                        {item.rank.toLocaleString("th-TH")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {item.province}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-bold tabular-nums text-[#b93223] dark:text-red-300">
                            {formatNumber(item.value)} {dashboard.rankingUnit}
                          </p>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-[3px] bg-slate-200 dark:bg-white/10">
                          <div
                            className="h-full rounded-[3px]"
                            style={{
                              backgroundColor: STORM_RED,
                              width:
                                Math.max(
                                  4,
                                  (item.value / rankingMaximum) * 100
                                ) + "%",
                            }}
                          />
                        </div>
                        {item.impacts ? (
                          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[10px] leading-4 text-emerald-950/50 dark:text-white/50">
                            <div className="flex justify-between gap-2">
                              <dt>ผู้ได้รับผลกระทบ</dt>
                              <dd>{formatNumber(item.impacts.people)}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt>ครัวเรือน</dt>
                              <dd>{formatNumber(item.impacts.households)}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt>บ้านเสียหาย</dt>
                              <dd>{formatNumber(item.impacts.housing)}</dd>
                            </div>
                            <div className="flex justify-between gap-2">
                              <dt>พื้นที่เกษตร</dt>
                              <dd>{formatNumber(item.impacts.agriculture, 2)}</dd>
                            </div>
                          </dl>
                        ) : null}
                      </div>
                    </div>
                  </li>
                ))}
            </ol>
          ) : (
            <EmptyChart message="ไม่มีข้อมูลจัดอันดับสำหรับตัวกรองนี้" />
          )}
        </StormPanel>
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setReloadKey((current) => current + 1)}
          className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs font-semibold text-emerald-950/55 transition hover:bg-orange-50 hover:text-orange-800 dark:text-white/55 dark:hover:bg-orange-300/10 dark:hover:text-orange-200"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          โหลดข้อมูลใหม่
        </button>
      </div>
    </div>
  );
}
