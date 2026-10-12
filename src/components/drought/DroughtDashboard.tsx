"use client";

import {
  ChevronDown,
  Funnel,
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

import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import ProvinceMapSelect from "@/components/analytics/ProvinceMapSelect";
import { RiceErrorState, RiceLoadingState } from "@/components/rice-yield/RiceAnalyticsShell";
import { readJsonResponse } from "@/lib/http/json";
import {
  isDroughtDashboardData,
  type DroughtDashboardData,
} from "@/lib/drought/types";

import ThailandDroughtMap from "./ThailandDroughtMap";

const ALL = "all";
const DATA_URL = "/data/drought/ภัยแล้ง_Dashboard_Data.json";
const DROUGHT_ORANGE = "#F97316";
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

function formatNumber(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("th-TH");
}

function DroughtPanel({
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
      className={`min-w-0 rounded-2xl border border-orange-950/10 bg-white p-4 shadow-[0_16px_50px_rgba(124,45,18,0.06)] sm:rounded-3xl sm:p-6 dark:border-orange-200/10 dark:bg-[#17130f] ${className}`}
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
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-xs font-semibold text-emerald-950/70 dark:text-white/70">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-12 w-full rounded-xl border border-orange-950/15 bg-[#fffdfb] px-3 text-sm text-[#2b1b12] outline-none transition focus:border-orange-600 focus:ring-2 focus:ring-orange-500/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
      >
        {children}
      </select>
    </label>
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
    <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-2xl bg-white p-3.5 shadow-[0_12px_34px_rgba(124,45,18,0.08)] max-[359px]:min-h-[172px] sm:min-h-[136px] sm:flex-row sm:items-center sm:justify-start sm:gap-4 sm:p-4 dark:bg-[#17130f]">
      <div className="flex min-w-0 items-center gap-2.5 max-[359px]:flex-col max-[359px]:items-start sm:contents">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_7px_18px_rgba(124,45,18,0.15)] sm:h-[72px] sm:w-[72px] dark:bg-white/95">
          <Image
            src={imageSrc}
            alt=""
            width={72}
            height={72}
            sizes="(max-width: 639px) 44px, 72px"
            className="h-8 w-8 object-contain sm:h-14 sm:w-14"
          />
        </div>
        <p className="min-w-0 break-words text-[1.35rem] font-bold leading-[1.05] tracking-tight text-orange-700 tabular-nums sm:hidden dark:text-orange-300">
          {value}
        </p>
      </div>
      <div className="min-w-0">
        <p className="hidden break-words text-2xl font-bold leading-none tracking-tight text-orange-700 tabular-nums sm:block dark:text-orange-300">
          {value}
        </p>
        <p className="line-clamp-2 text-[11px] font-semibold leading-4 text-emerald-950/75 sm:mt-1.5 dark:text-white/75">
          {label}
        </p>
        <p className="mt-1 text-[9px] leading-4 text-emerald-950/45 sm:text-[10px] dark:text-white/45">
          {detail}
        </p>
      </div>
    </article>
  );
}

type DroughtTooltipProps = Partial<TooltipContentProps<number, string>> & {
  unit: string;
};

function DroughtChartTooltip({ active, payload, label, unit }: DroughtTooltipProps) {
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

export default function DroughtDashboard() {
  const [data, setData] = useState<DroughtDashboardData | null>(null);
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

        if (!response.ok || !isDroughtDashboardData(payload)) {
          throw new Error("รูปแบบข้อมูลภัยแล้งไม่ถูกต้องหรือไม่ครบถ้วน");
        }

        setData(payload);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error ? cause.message : "ไม่สามารถโหลดข้อมูลภัยแล้งได้"
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

    const yearSummary = selectedYear
      ? data.yearly.find((item) => item.ปี === selectedYear)
      : undefined;
    const monthSummary = selectedMonthNumber
      ? data.month_overall.find((item) => item.เดือนเลข === selectedMonthNumber)
      : undefined;
    const yearMonthSummary =
      selectedYear && selectedMonthNumber
        ? data.monthly_full.find(
            (item) =>
              item.ปี === selectedYear && item.เดือนเลข === selectedMonthNumber
          )
        : undefined;
    const provinceSummary = selectedProvince
      ? data.heatmap.find((item) => item.จังหวัด === selectedProvince)
      : undefined;
    const provinceYearSummary =
      selectedProvince && selectedYear
        ? data.province_year.find(
            (item) => item.ปี === selectedYear && item.จังหวัด === selectedProvince
          )
        : undefined;
    const unavailableProvinceMonth = Boolean(
      selectedProvince && selectedMonthNumber && provinceSummary
    );

    let recordLabel = "พบบันทึกภัยแล้ง";
    let recordValue: number | null;
    let recordDetail = "รายการจากชุดข้อมูล";

    if (unavailableProvinceMonth) {
      recordValue = null;
      recordDetail = "ไม่มีข้อมูลแยกจังหวัด × เดือน";
    } else if (selectedProvince && selectedYear) {
      recordValue = provinceYearSummary?.month_count ?? 0;
      recordDetail = `พ.ศ. ${selectedYear} · ${selectedProvince}`;
    } else if (selectedProvince) {
      recordValue = provinceSummary?.record_count ?? 0;
      recordDetail = `ภาพรวมของ${selectedProvince}`;
    } else if (yearMonthSummary) {
      recordLabel = "จังหวัดที่พบบันทึก";
      recordValue = yearMonthSummary.province_count;
      recordDetail = `${yearMonthSummary.เดือน} พ.ศ. ${yearMonthSummary.ปี}`;
    } else if (yearSummary) {
      recordValue = yearSummary.record_count;
      recordDetail = `ข้อมูลปี พ.ศ. ${yearSummary.ปี}`;
    } else if (monthSummary) {
      recordValue = monthSummary.record_count;
      recordDetail = `รวมทุกปีในเดือน${monthSummary.เดือน}`;
    } else {
      recordValue = data.kpi.total_records;
      recordDetail = `ครอบคลุม ${data.kpi.total_years.toLocaleString("th-TH")} ปี`;
    }

    let provinceCount: number | null;
    if (unavailableProvinceMonth) {
      provinceCount = null;
    } else if (selectedProvince) {
      provinceCount = selectedYear
        ? provinceYearSummary
          ? 1
          : 0
        : provinceSummary
          ? 1
          : 0;
    } else if (yearMonthSummary) {
      provinceCount = yearMonthSummary.province_count;
    } else if (yearSummary) {
      provinceCount = yearSummary.province_count;
    } else if (monthSummary) {
      provinceCount = monthSummary.province_count;
    } else {
      provinceCount = data.kpi.total_provinces;
    }

    let monthCount: number | null;
    if (unavailableProvinceMonth) {
      monthCount = null;
    } else if (selectedMonthNumber) {
      monthCount = (yearMonthSummary?.province_count ?? monthSummary?.record_count ?? 0) > 0 ? 1 : 0;
    } else if (selectedProvince && selectedYear) {
      monthCount = provinceYearSummary?.month_count ?? 0;
    } else if (selectedProvince) {
      monthCount = provinceSummary?.unique_month_count ?? 0;
    } else if (yearSummary) {
      monthCount = yearSummary.month_count;
    } else {
      monthCount = data.kpi.total_months;
    }

    const topMonth = selectedMonthNumber
      ? {
          name: data.filters.months[selectedMonthNumber - 1] ?? "—",
          detail: yearMonthSummary
            ? `${yearMonthSummary.province_count.toLocaleString("th-TH")} จังหวัดที่พบบันทึก`
            : `${(monthSummary?.record_count ?? 0).toLocaleString("th-TH")} บันทึก`,
        }
      : selectedYear
        ? (() => {
            const item = data.top_month_by_year.find((row) => row.ปี === selectedYear);
            return {
              name: item?.เดือน ?? "—",
              detail: item
                ? `${item.province_count.toLocaleString("th-TH")} จังหวัดที่พบบันทึก`
                : "ไม่พบบันทึกภัยแล้ง",
            };
          })()
        : {
            name: data.kpi.top_month,
            detail: `${data.kpi.top_month_records.toLocaleString("th-TH")} บันทึก · ${data.kpi.top_month_provinces.toLocaleString("th-TH")} จังหวัด`,
          };

    const barData = (selectedYear ? data.monthly_full.filter((item) => item.ปี === selectedYear) : data.month_overall)
      .filter(
        (item) =>
          selectedMonthNumber === null || item.เดือนเลข === selectedMonthNumber
      )
      .map((item) => ({
        monthName: item.เดือน,
        month:
          THAI_MONTH_ABBREVIATIONS[item.เดือนเลข - 1] ?? item.เดือน,
        value: item.province_count,
      }));

    const visibleYears = selectedYear ? [selectedYear] : data.filters.years;
    const lineData = unavailableProvinceMonth
      ? []
      : visibleYears.map((year) => {
          let value = 0;

          if (selectedProvince) {
            value =
              data.province_year.find(
                (item) => item.ปี === year && item.จังหวัด === selectedProvince
              )?.month_count ?? 0;
          } else if (selectedMonthNumber) {
            value =
              data.monthly_full.find(
                (item) => item.ปี === year && item.เดือนเลข === selectedMonthNumber
              )?.province_count ?? 0;
          } else {
            value = data.yearly.find((item) => item.ปี === year)?.record_count ?? 0;
          }

          return { year, value };
        });

    const lineUnit = selectedProvince ? "เดือน" : selectedMonthNumber ? "จังหวัด" : "บันทึก";
    const ranking = selectedYear
      ? data.top5_by_year
          .filter((item) => item.ปี === selectedYear)
          .map((item) => ({
            rank: item.rank,
            province: item.จังหวัด,
            value: item.month_count,
            detail: `${item.month_count.toLocaleString("th-TH")} เดือน`,
          }))
      : data.top5.map((item) => ({
          rank: item.rank,
          province: item.จังหวัด,
          value: item.record_count,
          detail: `${item.record_count.toLocaleString("th-TH")} บันทึก · ${item.year_count.toLocaleString("th-TH")} ปี`,
        }));

    const mapValues = new Map<string, number>();
    if (selectedYear) {
      data.province_year
        .filter((item) => item.ปี === selectedYear)
        .forEach((item) => mapValues.set(item.จังหวัด, item.month_count));
    } else {
      data.heatmap.forEach((item) => mapValues.set(item.จังหวัด, item.record_count));
    }

    return {
      recordLabel,
      recordValue,
      recordDetail,
      provinceCount,
      monthCount,
      topMonth,
      barData,
      lineData,
      lineUnit,
      ranking,
      mapValues,
      mapScope: selectedYear ? `ปี พ.ศ. ${selectedYear}` : "ภาพรวมทุกปี",
      mapValueUnit: selectedYear ? ("เดือน" as const) : ("ครั้ง" as const),
      unavailableProvinceMonth,
    };
  }, [data, selectedMonthNumber, selectedProvince, selectedYear]);

  function resetFilters() {
    setYearFilter(ALL);
    setMonthFilter(ALL);
    setProvinceFilter(ALL);
  }

  if (loading) {
    return <RiceLoadingState label="กำลังโหลดข้อมูลแดชบอร์ดภัยแล้ง…" />;
  }

  if (error || !data || !dashboard) {
    return (
      <RiceErrorState
        message={error ?? "ไม่สามารถเตรียมข้อมูลแดชบอร์ดภัยแล้งได้"}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  const selectedMonthLabel = selectedMonthNumber
    ? data.filters.months[selectedMonthNumber - 1]
    : "ทุกเดือน";
  const provinceOptions =
    selectedProvince && !data.filters.provinces.includes(selectedProvince)
      ? [...data.filters.provinces, selectedProvince].sort((first, second) =>
          first.localeCompare(second, "th")
        )
      : data.filters.provinces;
  const rankingMaximum = Math.max(...dashboard.ranking.map((item) => item.value), 1);
  const chartFilters = () => (
    <DroughtChartFilters
      years={data.filters.years}
      months={data.filters.months}
      provinces={provinceOptions}
      yearFilter={yearFilter}
      monthFilter={monthFilter}
      provinceFilter={provinceFilter}
      onYearChange={setYearFilter}
      onMonthChange={setMonthFilter}
      onProvinceChange={setProvinceFilter}
      onReset={resetFilters}
    />
  );

  return (
    <div className="space-y-5 sm:space-y-7">
      <DashboardMascotInsight
        dashboardName="บันทึกภัยแล้ง"
        summary={
          dashboard.unavailableProvinceMonth
            ? "ข้อมูลต้นฉบับไม่มีมิติจังหวัดร่วมกับเดือน จึงไม่สร้างค่าประมาณขึ้นมาแทน"
            : `มุมมอง ${selectedYear ? `พ.ศ. ${selectedYear}` : "ทุกปี"} ${selectedMonthLabel} ${selectedProvince ?? "ทุกจังหวัด"} พบบันทึก ${formatNumber(dashboard.recordValue)} รายการ ครอบคลุม ${formatNumber(dashboard.provinceCount)} จังหวัด และเดือนที่เด่นคือ${dashboard.topMonth.name}`
        }
        recommendation={
          dashboard.unavailableProvinceMonth
            ? "ควรเลือกจังหวัดหรือเดือนอย่างใดอย่างหนึ่งเพื่อดูข้อมูลที่ชุดต้นฉบับรองรับ และไม่ควรตีความช่องว่างเป็นเหตุการณ์ที่ไม่เกิดขึ้น"
            : (dashboard.recordValue ?? 0) > 0
              ? `ควรให้${selectedProvince ? `พื้นที่${selectedProvince}` : "จังหวัดที่พบบ่อย"}ตรวจปริมาณน้ำสำรอง ความชื้นดิน และลำดับการให้น้ำตามช่วงการเจริญเติบโต พร้อมติดตามประกาศจากหน่วยงานในพื้นที่`
              : "ควรตรวจความครบถ้วนของบันทึกและติดตามปริมาณน้ำอย่างต่อเนื่องก่อนสรุปว่าพื้นที่ไม่มีความเสี่ยงภัยแล้ง"
        }
      />

      <section
        aria-label="ตัวชี้วัดบันทึกภัยแล้ง"
        className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4"
      >
        <KpiCard
          label={dashboard.recordLabel}
          value={formatNumber(dashboard.recordValue)}
          detail={dashboard.recordDetail}
          imageSrc="/images/30.png"
        />
        <KpiCard
          label="จังหวัดที่พบบันทึก"
          value={formatNumber(dashboard.provinceCount)}
          detail="จำนวนจังหวัดตามตัวกรอง"
          imageSrc="/images/31.png"
        />
        <KpiCard
          label="เดือนที่มีบันทึก"
          value={formatNumber(dashboard.monthCount)}
          detail="จำนวนเดือนตามมิติข้อมูลที่เลือก"
          imageSrc="/images/32.png"
        />
        <KpiCard
          label={selectedMonthNumber ? "เดือนที่เลือก" : "เดือนที่พบบันทึกมากที่สุด"}
          value={dashboard.topMonth.name}
          detail={dashboard.topMonth.detail}
          imageSrc="/images/21.png"
        />
      </section>

      {dashboard.unavailableProvinceMonth ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-100">
          ชุดข้อมูล JSON ไม่มีมิติ “จังหวัด × เดือน” จึงไม่คำนวณค่าผสมนี้ขึ้นเอง กรุณาเลือกจังหวัดหรือเดือนอย่างใดอย่างหนึ่งเพื่อดูกราฟที่ตรงกับข้อมูลต้นฉบับ
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-2 sm:gap-7">
        <DroughtPanel
          title="จำนวนจังหวัดรายเดือน"
          action={chartFilters()}
        >
          {selectedProvince ? (
            <EmptyChart message="ไม่มีข้อมูลรายเดือนแยกจังหวัดใน JSON ชุดนี้" />
          ) : (
            <div
              role="img"
              aria-label="กราฟแท่งจำนวนจังหวัดที่พบบันทึกภัยแล้งรายเดือน"
              className="h-72 w-full sm:h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dashboard.barData} margin={{ top: 12, right: 8, left: -16, bottom: 22 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" opacity={0.55} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} interval={0} height={40} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<DroughtChartTooltip unit="จังหวัด" />} />
                  <Bar dataKey="value" name="จังหวัดที่พบบันทึก" fill={DROUGHT_ORANGE} radius={[14, 14, 2, 2]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </DroughtPanel>

        <DroughtPanel
          title="แนวโน้มรายปี"
          action={chartFilters()}
        >
          {dashboard.lineData.length === 0 ? (
            <EmptyChart message="ไม่มีข้อมูลสำหรับมิติตัวกรองนี้" />
          ) : (
            <div
              role="img"
              aria-label={`กราฟเส้นแนวโน้มรายปี หน่วย${dashboard.lineUnit}`}
              className="h-72 w-full sm:h-80"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dashboard.lineData} margin={{ top: 12, right: 18, left: -12, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d6d3d1" opacity={0.55} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<DroughtChartTooltip unit={dashboard.lineUnit} />} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="ความถี่ที่พบ"
                    stroke={DROUGHT_ORANGE}
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#ffffff", stroke: DROUGHT_ORANGE, strokeWidth: 3 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </DroughtPanel>
      </div>

      <div className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] sm:gap-7">
        <DroughtPanel
          title="แผนที่ความถี่ที่พบบันทึกภัยแล้ง"
          action={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              {chartFilters()}
              <ProvinceMapSelect
                value={provinceFilter}
                provinces={provinceOptions}
                onChange={setProvinceFilter}
              />
            </div>
          }
        >
          <ThailandDroughtMap
            values={dashboard.mapValues}
            selectedProvince={selectedProvince}
            onSelectProvince={(province) => setProvinceFilter(province ?? ALL)}
            scopeLabel={dashboard.mapScope}
            valueUnit={dashboard.mapValueUnit}
            compact
          />
          {selectedMonthNumber ? (
            <p className="mt-4 rounded-xl border border-amber-300/70 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-950 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-100">
              JSON มีผลรวมรายเดือน แต่ไม่มีรายชื่อจังหวัดในแต่ละเดือน แผนที่จึงคงข้อมูล{selectedYear ? "รายปีจาก province_year" : "ภาพรวมจาก heatmap"}และไม่สร้างค่าจังหวัดขึ้นเอง
            </p>
          ) : null}
        </DroughtPanel>

        <DroughtPanel
          title={selectedYear ? `จังหวัดที่พบบ่อย ปี ${selectedYear}` : "จังหวัดที่พบบ่อยสูงสุด"}
          action={chartFilters()}
          className="flex h-full flex-col"
        >
          {dashboard.ranking.length === 0 ? (
            <EmptyChart message="ไม่พบบันทึกภัยแล้งสำหรับปีที่เลือก" />
          ) : (
            <ol className="grid min-h-[28rem] flex-1 grid-rows-5 gap-3">
              {dashboard.ranking.map((item) => {
                const selected = selectedProvince === item.province;
                return (
                  <li key={`${item.rank}-${item.province}`} className="min-h-0">
                    <button
                      type="button"
                      onClick={() =>
                        setProvinceFilter(selected ? ALL : item.province)
                      }
                      aria-pressed={selected}
                      className={`flex h-full w-full items-center rounded-lg px-2 py-3 text-left transition ${
                        selected
                          ? "bg-orange-50 shadow-[inset_3px_0_0_#f97316] dark:bg-orange-300/10"
                          : "hover:bg-orange-50/60 dark:hover:bg-white/5"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-semibold">{item.province}</span>
                          <span className="shrink-0 font-semibold tabular-nums text-orange-800 dark:text-orange-300">
                            {item.detail}
                          </span>
                        </div>
                        <div className="mt-3 h-3 overflow-hidden rounded-[4px] bg-orange-100 dark:bg-white/10">
                          <div
                            className="h-full rounded-[4px] bg-orange-600 dark:bg-orange-400"
                            style={{ width: `${(item.value / rankingMaximum) * 100}%` }}
                          />
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>
          )}
          {selectedProvince && !dashboard.ranking.some((item) => item.province === selectedProvince) ? (
            <p className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-950 dark:bg-orange-300/10 dark:text-orange-100">
              {selectedProvince} ไม่อยู่ในอันดับที่แสดงของมุมมองนี้
            </p>
          ) : null}
        </DroughtPanel>
      </div>
    </div>
  );
}

function DroughtChartFilters({
  years,
  months,
  provinces,
  yearFilter,
  monthFilter,
  provinceFilter,
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
            {[...years].reverse().map((year) => (
              <option key={year} value={year}>
                {year} (ค.ศ. {year - 543})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="เดือน" value={monthFilter} onChange={onMonthChange}>
            <option value={ALL}>ทุกเดือน</option>
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

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-orange-950/15 bg-orange-50/30 px-6 text-center text-sm leading-6 text-emerald-950/55 dark:border-white/15 dark:bg-white/[0.03] dark:text-white/55">
      {message}
    </div>
  );
}
