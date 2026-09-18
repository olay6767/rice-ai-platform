"use client";

import {
  CalendarDays,
  ChevronDown,
  Funnel,
  Wheat,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import Select from "@/components/ui/Select";
import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import { fetchRicePriceDashboardData } from "@/lib/rice-price/dashboard-data";
import type { RicePriceDashboardData, RicePriceRecord } from "@/lib/rice-price/types";
import { RiceErrorState, RiceLoadingState, RicePanel } from "@/components/rice-yield/RiceAnalyticsShell";
import {
  CompareRiceChart,
  Forecast2569Chart,
  formatPrice,
  PriceHeatmap,
  PriceTimelineChart,
} from "./RicePriceCharts";

function validNumber(value: string | null, options: number[], fallback: number): number {
  const parsed = Number(value);
  return options.includes(parsed) ? parsed : fallback;
}

function average(records: RicePriceRecord[]): number {
  return records.reduce((total, record) => total + record.price, 0) / Math.max(records.length, 1);
}

export default function RicePriceDashboard() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RicePriceDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchRicePriceDashboardData(controller.signal)
      .then(setData)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(reason instanceof Error ? reason.message : "ไม่สามารถโหลดข้อมูลราคาข้าวได้");
      });

    return () => controller.abort();
  }, [reloadKey]);

  const updateQuery = useCallback(
    (key: string, value: string) => {
      const query = new URLSearchParams(searchParams.toString());
      query.set(key, value);
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  if (error) {
    return (
      <RiceErrorState
        message={error}
        onRetry={() => {
          setError(null);
          setData(null);
          setReloadKey((current) => current + 1);
        }}
      />
    );
  }

  if (!data) {
    return <RiceLoadingState label="กำลังเตรียมข้อมูลราคาข้าวไทย…" />;
  }

  const { filters } = data;
  const selectedRiceType = filters.riceTypes.includes(searchParams.get("riceType") ?? "")
    ? (searchParams.get("riceType") as string)
    : filters.riceTypes[0];
  const selectedYear = validNumber(searchParams.get("priceYear"), filters.yearsBe, 2569);
  const selectedMonth = validNumber(
    searchParams.get("priceMonth"),
    filters.months.map((month) => month.value),
    1
  );

  return (
    <DashboardContent
      data={data}
      selectedRiceType={selectedRiceType}
      selectedYear={selectedYear}
      selectedMonth={selectedMonth}
      onFilterChange={updateQuery}
    />
  );
}

function DashboardContent({
  data,
  selectedRiceType,
  selectedYear,
  selectedMonth,
  onFilterChange,
}: {
  data: RicePriceDashboardData;
  selectedRiceType: string;
  selectedYear: number;
  selectedMonth: number;
  onFilterChange: (key: string, value: string) => void;
}) {
  const selectedTypeRecords = useMemo(
    () => data.monthly.filter((record) => record.riceType === selectedRiceType),
    [data.monthly, selectedRiceType]
  );
  const yearRecords = useMemo(
    () => selectedTypeRecords.filter((record) => record.yearBe === selectedYear).sort((a, b) => a.month - b.month),
    [selectedTypeRecords, selectedYear]
  );
  const selectedRecord = yearRecords.find((record) => record.month === selectedMonth);
  const minimum = yearRecords.reduce<RicePriceRecord | null>(
    (current, record) => (!current || record.price < current.price ? record : current),
    null
  );
  const maximum = yearRecords.reduce<RicePriceRecord | null>(
    (current, record) => (!current || record.price > current.price ? record : current),
    null
  );
  const comparisonRecords = data.monthly.filter(
    (record) => record.yearBe === selectedYear && record.month === selectedMonth
  );
  const monthLabel = data.filters.months.find((month) => month.value === selectedMonth)?.label ?? "";
  const isForecastYear = selectedYear === 2569;
  const previousRecord = selectedRecord
    ? [...selectedTypeRecords]
        .filter((record) => record.date < selectedRecord.date)
        .sort((first, second) => first.date.localeCompare(second.date))
        .at(-1)
    : undefined;
  const priceChange =
    selectedRecord && previousRecord
      ? selectedRecord.price - previousRecord.price
      : null;
  const priceChangePercent =
    priceChange !== null && previousRecord && previousRecord.price !== 0
      ? (priceChange / previousRecord.price) * 100
      : null;

  return (
    <div className="space-y-5 sm:space-y-7">
      <DashboardMascotInsight
        dashboardName="ราคาข้าวไทย"
        summary={
          selectedRecord
            ? `${selectedRiceType} เดือน${monthLabel} ${selectedYear} มีราคา ${formatPrice(selectedRecord.price, 2)} บาทต่อ 100 กก.${priceChange === null ? " และไม่มีข้อมูลเดือนก่อนสำหรับเปรียบเทียบ" : ` ${priceChange > 0 ? "เพิ่มขึ้น" : priceChange < 0 ? "ลดลง" : "ไม่เปลี่ยนแปลง"} ${formatPrice(Math.abs(priceChange), 2)} บาท${priceChangePercent === null ? "" : ` หรือ ${Math.abs(priceChangePercent).toLocaleString("th-TH", { maximumFractionDigits: 2 })}%`}จากข้อมูลก่อนหน้า`} โดยเป็น${isForecastYear ? "ค่าพยากรณ์" : "ข้อมูลราคา"}`
            : `ไม่พบข้อมูลราคา${selectedRiceType}ในเดือน${monthLabel} ${selectedYear}`
        }
        recommendation={
          !selectedRecord
            ? "ควรตรวจชนิดข้าว ปี และเดือนที่เลือกก่อนใช้ข้อมูลประกอบการวางแผน"
            : isForecastYear
              ? "ควรใช้แนวโน้มนี้ทำแผนรายรับและต้นทุนหลายกรณี พร้อมติดตามราคาจริงก่อนตัดสินใจ ไม่ควรถือค่าพยากรณ์เป็นราคาที่รับประกัน"
              : (priceChange ?? 0) < 0
                ? "ควรเปรียบเทียบต้นทุนการเก็บรักษา เงื่อนไขสัญญา และข้อมูลตลาดล่าสุดก่อนกำหนดช่วงจำหน่าย โดยไม่ตัดสินใจจากราคาเดือนเดียว"
                : "ควรติดตามแนวโน้มหลายเดือนและเปรียบเทียบข้าวชนิดอื่น เพื่อวางแผนช่วงจำหน่ายโดยคำนึงถึงต้นทุนและคุณภาพผลผลิต"
        }
      />

      <section aria-label="ตัวชี้วัดสำคัญ" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          imageSrc="/images/23.png"
          label="ราคาเดือนที่เลือก"
          value={selectedRecord ? formatPrice(selectedRecord.price, 2) : "—"}
          unit="บาท / 100 กก."
          detail={`${monthLabel} ${selectedYear}`}
        />
        <KpiCard
          imageSrc="/images/24.png"
          label="ราคาเฉลี่ย"
          value={yearRecords.length ? formatPrice(average(yearRecords), 2) : "—"}
          unit="บาท / 100 กก."
          detail={`เฉลี่ย 12 เดือน ปี ${selectedYear}`}
        />
        <KpiCard
          imageSrc="/images/25.png"
          label="ราคาต่ำสุด"
          value={minimum ? formatPrice(minimum.price, 2) : "—"}
          unit="บาท / 100 กก."
          detail={minimum ? minimum.monthNameTh : "ไม่มีข้อมูล"}
        />
        <KpiCard
          imageSrc="/images/26.png"
          label="ราคาสูงสุด"
          value={maximum ? formatPrice(maximum.price, 2) : "—"}
          unit="บาท / 100 กก."
          detail={maximum ? maximum.monthNameTh : "ไม่มีข้อมูล"}
        />
      </section>

      <RicePanel
        title="1. ราคาย้อนหลัง + พยากรณ์"
        description={`แนวโน้มราคา ${selectedRiceType} รายเดือน พ.ศ. 2558–2569 แยกข้าวจริงและพยากรณ์`}
        action={
          <PriceChartFilters
            data={data}
            selectedRiceType={selectedRiceType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onFilterChange={onFilterChange}
          />
        }
      >
        <PriceTimelineChart records={selectedTypeRecords} selectedDate={selectedRecord?.date ?? ""} />
      </RicePanel>

      <RicePanel
        title="2. Heatmap ราคาข้าวรายเดือน"
        description="สีเข้มหมายถึงราคาสูงขึ้น สีเหลืองคือข้อมูลจริง และสีส้มคือพยากรณ์"
        action={
          <PriceChartFilters
            data={data}
            selectedRiceType={selectedRiceType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onFilterChange={onFilterChange}
          />
        }
      >
        <PriceHeatmap records={selectedTypeRecords} selectedYear={selectedYear} selectedMonth={selectedMonth} />
      </RicePanel>

      <RicePanel
        title="4. เปรียบเทียบข้าว 5 ชนิด"
        description={`เทียบข้าว 5 ชนิด · ${monthLabel} ${selectedYear}`}
        action={
          <PriceChartFilters
            data={data}
            selectedRiceType={selectedRiceType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onFilterChange={onFilterChange}
          />
        }
      >
        <CompareRiceChart
          records={comparisonRecords}
          riceTypes={data.filters.riceTypes}
          selectedRiceType={selectedRiceType}
        />
      </RicePanel>

      <RicePanel
        title="5. พยากรณ์ปี 2569"
        description="แนวโน้มพยากรณ์ 12 เดือน แยกสีประจำข้าวทั้ง 5 ชนิด และเน้นชนิดที่เลือกด้วยเส้นหนา"
        action={
          <PriceChartFilters
            data={data}
            selectedRiceType={selectedRiceType}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onFilterChange={onFilterChange}
          />
        }
      >
        <Forecast2569Chart
          records={data.forecasts2569}
          riceTypes={data.filters.riceTypes}
          selectedRiceType={selectedRiceType}
          selectedMonth={selectedMonth}
        />
      </RicePanel>
    </div>
  );
}

function PriceChartFilters({
  data,
  selectedRiceType,
  selectedYear,
  selectedMonth,
  onFilterChange,
}: {
  data: RicePriceDashboardData;
  selectedRiceType: string;
  selectedYear: number;
  selectedMonth: number;
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <details className="group relative z-40 self-start">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-2 rounded-full bg-[#edf2e5] px-3.5 text-xs font-semibold text-[#557060] transition-colors hover:bg-[#e3ead9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600/35 [&::-webkit-details-marker]:hidden dark:bg-white/10 dark:text-emerald-100 dark:hover:bg-white/15">
        <Funnel aria-hidden="true" className="h-3.5 w-3.5" />
        เลือกข้อมูล
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
      </summary>

      <div className="absolute left-0 z-50 mt-2 w-[min(86vw,42rem)] rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-[0_18px_48px_rgba(11,46,28,0.16)] sm:left-auto sm:right-0 dark:border-white/10 dark:bg-[#0d2014]">
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            label="ชนิดข้าว"
            value={selectedRiceType}
            options={data.filters.riceTypes.map((riceType) => ({ value: riceType, label: riceType }))}
            startAdornment={<Wheat aria-hidden="true" className="h-4 w-4" />}
            fullWidth
            selectSize="md"
            onValueChange={(value) => onFilterChange("riceType", value)}
          />
          <Select
            label="ปี (พ.ศ.)"
            value={selectedYear}
            options={[...data.filters.yearsBe].reverse().map((year) => ({
              value: year,
              label: year === 2569 ? `${year} — พยากรณ์` : String(year),
            }))}
            startAdornment={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
            fullWidth
            selectSize="md"
            onValueChange={(value) => onFilterChange("priceYear", value)}
          />
          <Select
            label="เดือน"
            value={selectedMonth}
            options={data.filters.months.map((month) => ({ value: month.value, label: month.label }))}
            startAdornment={<CalendarDays aria-hidden="true" className="h-4 w-4" />}
            fullWidth
            selectSize="md"
            onValueChange={(value) => onFilterChange("priceMonth", value)}
          />
        </div>
      </div>
    </details>
  );
}

function KpiCard({
  imageSrc,
  label,
  value,
  unit,
  detail,
}: {
  imageSrc: string;
  label: string;
  value: string;
  unit?: string;
  detail: string;
}) {
  return (
    <article className="flex min-h-[128px] min-w-0 items-center gap-2.5 rounded-2xl bg-white p-2.5 shadow-[0_12px_34px_rgba(11,46,28,0.07)] sm:min-h-[136px] sm:gap-4 sm:p-4 dark:bg-[#0d2014]">
      <div className="relative grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-white shadow-[0_7px_18px_rgba(11,46,28,0.14)] sm:h-[72px] sm:w-[72px] dark:bg-white/95">
        <Image
          src={imageSrc}
          alt=""
          width={72}
          height={72}
          className="h-11 w-11 object-contain sm:h-14 sm:w-14"
        />
      </div>
      <div className="min-w-0">
        <p className="break-words text-xl font-bold leading-none tracking-tight text-emerald-800 tabular-nums sm:text-2xl dark:text-emerald-300">
          {value}
        </p>
        <p className="mt-1.5 truncate text-[11px] font-semibold text-emerald-950/75 dark:text-white/75">
          {label}
        </p>
        {unit ? (
          <p className="mt-0.5 truncate text-[9px] text-emerald-950/45 sm:text-[10px] dark:text-white/45">
            {unit}
          </p>
        ) : null}
        <p className="mt-1 line-clamp-1 text-[9px] leading-4 text-emerald-950/45 sm:text-[10px] dark:text-white/45">
          {detail}
        </p>
      </div>
    </article>
  );
}
