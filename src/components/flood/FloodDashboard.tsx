"use client";

import {
  CalendarRange,
  ChevronDown,
  CloudRain,
  Funnel,
  RotateCcw,
} from "lucide-react";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";

import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import { readJsonResponse } from "@/lib/http/json";
import {
  RiceBarChart,
  RiceHorizontalBars,
  RiceLineChart,
} from "@/components/rice-yield/RiceCharts";
import {
  RiceErrorState,
  RiceLoadingState,
  RicePanel,
} from "@/components/rice-yield/RiceAnalyticsShell";
import RiceAnalyticsNav from "@/components/rice-yield/RiceAnalyticsNav";
import ThailandFloodMap from "./ThailandFloodMap";

interface FloodAnnualRecord {
  year: number;
  year_ad: number;
  province: string;
  flood_events: number;
}

interface FloodMonthlyRecord extends FloodAnnualRecord {
  month: number;
  month_name: string;
}

const ALL = "all";
const MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];
const FLOOD_YEAR_COLORS: Record<number, string> = {
  2563: "#123B5D",
  2564: "#1672B8",
  2565: "#00A6C7",
  2566: "#58B7D3",
  2567: "#5267B2",
};
const FLOOD_CHART_BLUE = "#168FB2";

function isFloodAnnualRecord(value: unknown): value is FloodAnnualRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<FloodAnnualRecord>;
  return (
    Number.isInteger(record.year) &&
    Number.isInteger(record.year_ad) &&
    typeof record.province === "string" &&
    Number.isFinite(record.flood_events)
  );
}

function isFloodMonthlyRecord(value: unknown): value is FloodMonthlyRecord {
  if (!isFloodAnnualRecord(value)) return false;
  const record = value as Partial<FloodMonthlyRecord>;
  return Number.isInteger(record.month) && typeof record.month_name === "string";
}

function formatNumber(value: number): string {
  return value.toLocaleString("th-TH");
}

function sumEvents(records: Array<{ flood_events: number }>): number {
  return records.reduce((sum, record) => sum + record.flood_events, 0);
}

function aggregateBy<RecordType extends { flood_events: number }>(
  records: RecordType[],
  key: (record: RecordType) => string
): Map<string, number> {
  const result = new Map<string, number>();
  for (const record of records) {
    const group = key(record);
    result.set(group, (result.get(group) ?? 0) + record.flood_events);
  }
  return result;
}

function maximumEntry(values: Map<string, number>): [string, number] | null {
  let result: [string, number] | null = null;
  for (const entry of values) {
    if (!result || entry[1] > result[1]) result = entry;
  }
  return result;
}

export default function FloodDashboard() {
  const [annualRecords, setAnnualRecords] = useState<FloodAnnualRecord[]>([]);
  const [monthlyRecords, setMonthlyRecords] = useState<FloodMonthlyRecord[]>([]);
  const [yearFilter, setYearFilter] = useState(ALL);
  const [monthFilter, setMonthFilter] = useState(ALL);
  const [provinceFilter, setProvinceFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [annualResponse, monthlyResponse] = await Promise.all([
          fetch("/data/flood_annual.json", {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }),
          fetch("/data/flood_monthly.json", {
            signal: controller.signal,
            headers: { Accept: "application/json" },
          }),
        ]);
        if (!annualResponse.ok || !monthlyResponse.ok) {
          throw new Error("ไม่สามารถโหลดข้อมูลน้ำท่วมได้");
        }
        const [annualPayload, monthlyPayload]: [unknown, unknown] = await Promise.all([
          readJsonResponse(annualResponse),
          readJsonResponse(monthlyResponse),
        ]);
        if (!Array.isArray(annualPayload) || !Array.isArray(monthlyPayload)) {
          throw new Error("รูปแบบข้อมูลน้ำท่วมไม่ถูกต้อง");
        }
        const validAnnualRecords = annualPayload.filter(isFloodAnnualRecord);
        const validMonthlyRecords = monthlyPayload.filter(isFloodMonthlyRecord);
        if (
          validAnnualRecords.length !== annualPayload.length ||
          validMonthlyRecords.length !== monthlyPayload.length ||
          validAnnualRecords.length === 0 ||
          validMonthlyRecords.length === 0
        ) {
          throw new Error("ข้อมูลน้ำท่วมไม่ครบถ้วนหรือไม่มีระเบียนที่ใช้งานได้");
        }
        setAnnualRecords(validAnnualRecords);
        setMonthlyRecords(validMonthlyRecords);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลน้ำท่วมได้"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [reloadKey]);

  const years = useMemo(
    () => [...new Set(annualRecords.map((record) => record.year))].sort((a, b) => a - b),
    [annualRecords]
  );
  const monthlyYears = useMemo(
    () => [...new Set(monthlyRecords.map((record) => record.year))].sort((a, b) => a - b),
    [monthlyRecords]
  );
  const provinces = useMemo(
    () =>
      [...new Set(annualRecords.map((record) => record.province))].sort((a, b) =>
        a.localeCompare(b, "th")
      ),
    [annualRecords]
  );

  const filteredAnnualRecords = useMemo(
    () =>
      annualRecords.filter(
        (record) =>
          (yearFilter === ALL || record.year === Number(yearFilter)) &&
          (provinceFilter === ALL || record.province === provinceFilter)
      ),
    [annualRecords, provinceFilter, yearFilter]
  );
  const filteredMonthlyRecords = useMemo(
    () =>
      monthlyRecords.filter(
        (record) =>
          (yearFilter === ALL || record.year === Number(yearFilter)) &&
          (monthFilter === ALL || record.month === Number(monthFilter)) &&
          (provinceFilter === ALL || record.province === provinceFilter)
      ),
    [monthFilter, monthlyRecords, provinceFilter, yearFilter]
  );
  const monthlyDataUnavailable =
    yearFilter !== ALL && !monthlyYears.includes(Number(yearFilter));

  const provinceTotals = useMemo(
    () => aggregateBy(filteredAnnualRecords, (record) => record.province),
    [filteredAnnualRecords]
  );
  const monthTotals = useMemo(
    () => aggregateBy(filteredMonthlyRecords, (record) => String(record.month)),
    [filteredMonthlyRecords]
  );
  const yearMonthTotals = useMemo(
    () =>
      aggregateBy(
        filteredMonthlyRecords,
        (record) => `${record.year}-${record.month}`
      ),
    [filteredMonthlyRecords]
  );
  const yearTotals = useMemo(
    () => aggregateBy(filteredAnnualRecords, (record) => String(record.year)),
    [filteredAnnualRecords]
  );
  const topProvince = useMemo(() => maximumEntry(provinceTotals), [provinceTotals]);
  const topYear = useMemo(() => maximumEntry(yearTotals), [yearTotals]);
  const totalEvents = useMemo(
    () => sumEvents(filteredAnnualRecords),
    [filteredAnnualRecords]
  );

  const visibleMonthlyYears =
    yearFilter === ALL
      ? monthlyYears
      : monthlyYears.includes(Number(yearFilter))
        ? [Number(yearFilter)]
        : [];
  const visibleMonths =
    monthFilter === ALL ? MONTHS.map((_, index) => index + 1) : [Number(monthFilter)];
  const visibleAnnualProvinces = useMemo(() => {
    const scoped = provinceFilter === ALL ? provinces : [provinceFilter];
    return scoped
      .map((province) => ({ province, total: provinceTotals.get(province) ?? 0 }))
      .sort((a, b) => b.total - a.total || a.province.localeCompare(b.province, "th"));
  }, [provinceFilter, provinceTotals, provinces]);
  const topTenProvinces = visibleAnnualProvinces
    .filter((item) => item.total > 0)
    .slice(0, 10);
  const selectedYearLabel =
    yearFilter === ALL ? "ทุกปี" : `พ.ศ. ${formatNumber(Number(yearFilter))}`;
  const selectedProvinceLabel = provinceFilter === ALL ? "ทุกจังหวัด" : provinceFilter;

  const cards = [
    {
      label: "เหตุการณ์น้ำท่วมรวม",
      value: formatNumber(totalEvents),
      unit: "ครั้ง",
      imageSrc: "/images/27.png",
      imageFit: "contain" as const,
    },
    {
      label: "จังหวัดที่ได้รับผลกระทบ",
      value: formatNumber(provinceTotals.size),
      unit: `จาก ${formatNumber(provinces.length)} จังหวัด`,
      imageSrc: "/images/12.png",
      imageFit: "contain" as const,
    },
    {
      label: "จังหวัดที่มีเหตุการณ์สูงสุด",
      value: topProvince?.[0] ?? "ไม่มีข้อมูล",
      unit: topProvince ? `${formatNumber(topProvince[1])} ครั้ง` : "—",
      imageSrc: "/images/28.png",
      imageFit: "cover" as const,
    },
    {
      label: "ปีที่มีเหตุการณ์สูงสุด",
      value: topYear ? `พ.ศ. ${formatNumber(Number(topYear[0]))}` : "ไม่มีข้อมูล",
      unit: topYear ? `${formatNumber(topYear[1])} ครั้ง` : "—",
      imageSrc: "/images/30.png",
      imageFit: "contain" as const,
    },
  ];

  function resetFilters() {
    setYearFilter(ALL);
    setMonthFilter(ALL);
    setProvinceFilter(ALL);
  }

  const chartFilters = () => (
    <FloodChartFilters
      years={years}
      provinces={provinces}
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
    <main className="min-h-dvh overflow-x-hidden bg-[#f7f8f3] pb-24 text-[#11251a] sm:pb-20 dark:bg-[#07140c] dark:text-white">
      <section className="relative isolate overflow-hidden bg-[#eef6ee] dark:bg-[#091b11]">
        <Image
          src="/images/28.png"
          alt="ชุมชนไทยในพื้นที่น้ำท่วมและการส่งมอบสิ่งของช่วยเหลือ"
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[68%_center] opacity-45 sm:object-center sm:opacity-55 dark:opacity-30"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-r from-[#eef6ee] via-[#f5f7ef]/95 to-[#e9f3f4]/60 sm:to-[#e9f3f4]/35 dark:from-[#091b11] dark:via-[#091b11]/95 dark:to-[#0b2534]/50"
        />
        <div className="dashboard-container relative pb-5 pt-7 sm:py-14">
          <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-sky-700/15 bg-white/75 px-3 py-1 text-[11px] font-semibold text-sky-800 backdrop-blur-sm sm:text-xs dark:border-sky-300/20 dark:bg-white/5 dark:text-sky-200">
                <CloudRain aria-hidden="true" className="h-4 w-4" />
                Flood Intelligence · Thailand
              </div>
              <h1 className="max-w-[21rem] text-[1.85rem] font-bold leading-[1.12] tracking-tight sm:max-w-none sm:text-4xl lg:text-5xl">
                แดชบอร์ดสถานการณ์น้ำท่วม
              </h1>
              <p className="mt-3 max-w-[22rem] text-[13px] leading-[1.7] text-emerald-950/70 sm:max-w-2xl sm:text-base sm:leading-7 dark:text-white/65">
                สำรวจแนวโน้มและการกระจายตัวของเหตุการณ์น้ำท่วมรายปี รายเดือน
                และรายจังหวัดจากข้อมูลรายปี พ.ศ. 2563–2568 และข้อมูลรายเดือนถึง พ.ศ. 2567
              </p>
          </div>
          <nav
            aria-label="เมนูแดชบอร์ดการเกษตรและสภาพอากาศ"
            className="-mx-5 mt-4 overflow-x-auto px-5 pb-2 [scroll-padding-inline:1.25rem] [scrollbar-width:none] sm:mx-0 sm:mt-7 sm:px-0 [&::-webkit-scrollbar]:hidden"
          >
            <Suspense fallback={<div className="h-11" />}>
              <RiceAnalyticsNav />
            </Suspense>
          </nav>
        </div>
      </section>

      <div className="dashboard-container space-y-4 py-5 sm:space-y-7 sm:py-10">
        {loading ? <RiceLoadingState label="กำลังโหลดข้อมูลสถานการณ์น้ำท่วม…" /> : null}
        {error ? (
          <RiceErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
        ) : null}

        {!loading && !error ? (
          <>
            <DashboardMascotInsight
              dashboardName="สถานการณ์น้ำท่วม"
              summary={
                filteredAnnualRecords.length
                  ? `ในมุมมอง ${selectedYearLabel} และ${selectedProvinceLabel} พบน้ำท่วมรวม ${formatNumber(totalEvents)} ครั้ง ครอบคลุม ${formatNumber(provinceTotals.size)} จังหวัด${topProvince ? ` โดย${topProvince[0]}มีจำนวนสูงสุด ${formatNumber(topProvince[1])} ครั้ง` : ""}`
                  : `ไม่พบข้อมูลน้ำท่วมรายปีในมุมมอง ${selectedYearLabel} และ${selectedProvinceLabel}`
              }
              recommendation={
                totalEvents > 0
                  ? `ควรให้${provinceFilter === ALL ? `จังหวัด${topProvince?.[0] ?? "ที่พบเหตุการณ์สูง"}` : `พื้นที่${provinceFilter}`}ตรวจทางระบายน้ำ จุดเสี่ยง เส้นทางอพยพ และช่องทางแจ้งเตือน พร้อมยืนยันสถานการณ์กับประกาศทางการก่อนดำเนินการ`
                  : "ควรติดตามข้อมูลฝนและประกาศเตือนภัยต่อเนื่อง รวมทั้งตรวจความครบถ้วนของข้อมูลก่อนสรุปว่าพื้นที่ไม่มีความเสี่ยง"
              }
            />

            <section aria-label="ตัวชี้วัดสถานการณ์น้ำท่วม" className="grid grid-cols-2 gap-2.5 sm:gap-4 xl:grid-cols-4">
              {cards.map(({ label, value, unit, imageSrc, imageFit }) => (
                <FloodKpiCard
                  key={label}
                  label={label}
                  value={value}
                  unit={unit}
                  imageSrc={imageSrc}
                  imageFit={imageFit}
                />
              ))}
            </section>

            {filteredAnnualRecords.length === 0 ? (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-200/20 dark:bg-amber-200/10 dark:text-amber-100">
                ไม่พบข้อมูลน้ำท่วมรายปีในตัวกรองนี้
              </div>
            ) : null}

            <div className="grid gap-5 xl:grid-cols-2 sm:gap-7">
              <RicePanel
                title="แนวโน้มเหตุการณ์รายเดือน"
                description="เปรียบเทียบจำนวนเหตุการณ์ในแต่ละเดือน โดยแต่ละเส้นแทนหนึ่งปี พ.ศ."
                action={chartFilters()}
              >
                {monthlyDataUnavailable ? (
                  <MonthlyUnavailable />
                ) : (
                  <RiceLineChart
                    title="แนวโน้มเหตุการณ์น้ำท่วมรายเดือน"
                    xLabel="เดือน"
                    yLabel="ครั้ง"
                    height={420}
                    fitWidth
                    series={visibleMonthlyYears.map((year) => ({
                      id: String(year),
                      label: `พ.ศ. ${year}`,
                      color: FLOOD_YEAR_COLORS[year],
                      points: visibleMonths.map((month) => ({
                        x: month,
                        value: yearMonthTotals.get(`${year}-${month}`) ?? 0,
                        label: `${MONTHS[month - 1]} ${year}`,
                      })),
                    }))}
                    toggleable
                  />
                )}
              </RicePanel>

              <RicePanel
                title="เหตุการณ์รายเดือน"
                description="เปรียบเทียบฤดูกาลน้ำท่วมจากผลรวมรายเดือน"
                action={chartFilters()}
              >
                {monthlyDataUnavailable ? (
                  <MonthlyUnavailable />
                ) : (
                  <RiceBarChart
                    title="จำนวนเหตุการณ์น้ำท่วมรายเดือน"
                    unit="ครั้ง"
                    height={500}
                    fitWidth
                    alignmentLegendLabels={visibleMonthlyYears.map(
                      (year) => `พ.ศ. ${year}`
                    )}
                    items={visibleMonths.map((month) => ({
                      label: String(month),
                      value: monthTotals.get(String(month)) ?? 0,
                      color: FLOOD_CHART_BLUE,
                    }))}
                  />
                )}
              </RicePanel>
            </div>

            <div className="grid gap-5 xl:grid-cols-[minmax(0,1.28fr)_minmax(0,0.72fr)] sm:gap-7">
              <RicePanel
                title="แผนที่ความถี่เหตุการณ์น้ำท่วม"
                description="สีเข้มหมายถึงจำนวนเหตุการณ์สูง แตะหรือคลิกจังหวัดเพื่อใช้เป็นตัวกรอง"
                action={chartFilters()}
              >
                <ThailandFloodMap
                  values={provinceTotals}
                  selectedProvince={provinceFilter === ALL ? null : provinceFilter}
                  onSelectProvince={(province) => setProvinceFilter(province ?? ALL)}
                />
              </RicePanel>

              <RicePanel
                title="10 จังหวัดที่มีเหตุการณ์สูงสุด"
                description="จัดอันดับตามผลรวมภายใต้ตัวกรองปัจจุบัน"
                action={chartFilters()}
                className="flex h-full flex-col"
              >
                {topTenProvinces.length ? (
                  <RiceHorizontalBars
                    title="สิบจังหวัดที่มีเหตุการณ์น้ำท่วมสูงสุด"
                    unit=" ครั้ง"
                    digits={0}
                    barRadius={2}
                    fillHeight
                    items={topTenProvinces.map((item) => ({
                      label: item.province,
                      value: item.total,
                      color: FLOOD_CHART_BLUE,
                    }))}
                  />
                ) : (
                  <p className="py-16 text-center text-sm text-emerald-950/50 dark:text-white/50">
                    ไม่มีข้อมูลสำหรับจัดอันดับ
                  </p>
                )}
              </RicePanel>
            </div>

          </>
        ) : null}
      </div>
    </main>
  );
}

function FloodChartFilters({
  years,
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
      <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-full bg-[#edf2e5] px-3.5 text-xs font-semibold text-[#557060] transition-colors hover:bg-[#e3ead9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35 [&::-webkit-details-marker]:hidden dark:bg-white/10 dark:text-emerald-100 dark:hover:bg-white/15">
        <Funnel aria-hidden="true" className="h-3.5 w-3.5" />
        เลือกข้อมูล
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 z-50 mt-2 w-[min(88vw,44rem)] rounded-2xl bg-white p-4 shadow-[0_18px_48px_rgba(11,46,28,0.16)] sm:left-auto sm:right-0 dark:bg-[#0d2014]">
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
            {MONTHS.map((month, index) => (
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
            className="inline-flex min-h-9 items-center justify-center gap-2 rounded-xl bg-emerald-50 px-3 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white/10 dark:text-emerald-200 dark:hover:bg-white/15"
          >
            <RotateCcw aria-hidden="true" className="h-3.5 w-3.5" />
            รีเซ็ตตัวกรอง
          </button>
        </div>
      </div>
    </details>
  );
}

function FloodKpiCard({
  label,
  value,
  unit,
  imageSrc,
  imageFit,
}: {
  label: string;
  value: string;
  unit: string;
  imageSrc: string;
  imageFit: "contain" | "cover";
}) {
  return (
    <article className="flex min-h-[148px] min-w-0 flex-col justify-between rounded-2xl bg-white p-3.5 shadow-[0_12px_34px_rgba(11,46,28,0.07)] max-[359px]:min-h-[172px] sm:min-h-[136px] sm:flex-row sm:items-center sm:justify-start sm:gap-4 sm:p-4 dark:bg-[#0d2014]">
      <div className="flex min-w-0 items-center gap-2.5 max-[359px]:flex-col max-[359px]:items-start sm:contents">
        <div className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_7px_18px_rgba(11,46,28,0.14)] sm:h-[72px] sm:w-[72px] dark:bg-white/95">
          <Image
            src={imageSrc}
            alt=""
            width={72}
            height={72}
            sizes="(max-width: 639px) 44px, 72px"
            className={imageFit === "cover" ? "h-full w-full object-cover" : "h-8 w-8 object-contain sm:h-14 sm:w-14"}
          />
        </div>
        <p className="min-w-0 break-words text-[1.35rem] font-bold leading-[1.05] tracking-tight text-sky-700 tabular-nums sm:hidden dark:text-sky-300">
          {value}
        </p>
      </div>
      <div className="min-w-0">
        <p className="hidden break-words text-2xl font-bold leading-none tracking-tight text-sky-700 tabular-nums sm:block dark:text-sky-300">
          {value}
        </p>
        <p className="line-clamp-2 text-xs font-semibold leading-[1.45] text-emerald-950/75 sm:mt-1.5 sm:text-[11px] sm:leading-4 dark:text-white/75">
          {label}
        </p>
        <p className="mt-1 text-[10px] leading-4 text-emerald-950/45 dark:text-white/45">
          {unit}
        </p>
      </div>
    </article>
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
    <label className="grid min-w-0 gap-1.5 text-xs font-semibold sm:text-sm">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 text-sm font-normal outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-white/15 dark:bg-white/5"
      >
        {children}
      </select>
    </label>
  );
}

function MonthlyUnavailable() {
  return (
    <div
      role="status"
      className="grid min-h-64 place-items-center rounded-2xl border border-dashed border-sky-800/20 bg-sky-50/60 px-6 text-center dark:border-sky-200/20 dark:bg-sky-300/5"
    >
      <div>
        <CalendarRange
          aria-hidden="true"
          className="mx-auto h-8 w-8 text-sky-600 dark:text-sky-300"
        />
        <p className="mt-3 font-semibold">ไม่มีข้อมูลรายเดือนสำหรับปี 2568</p>
        <p className="mt-1 text-xs text-emerald-950/50 dark:text-white/50">
          เลือกปี พ.ศ. 2563–2567 หรือทุกปีเพื่อดูข้อมูลรายเดือน
        </p>
      </div>
    </div>
  );
}
