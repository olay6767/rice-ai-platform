"use client";

import {
  CalendarRange,
  ChevronDown,
  Funnel,
  Map,
} from "lucide-react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import type {
  RiceProvinceGeoJson,
  RiceYieldDashboardData,
  RiceYieldRecord,
  RiceYieldStaticData,
} from "@/lib/rice-yield/static-dashboard-types";
import {
  ForecastBadge,
  HistoricalYieldForecastChart,
  ThailandYieldChoropleth,
  TopForecastChangeChart,
} from "./RiceYieldStaticVisualizations";
import {
  RiceEmptyState,
  RiceErrorState,
  RiceLoadingState,
  RicePanel,
} from "./RiceAnalyticsShell";

const YIELD_PANEL_CLASS =
  "!rounded-xl !border-0 !shadow-[0_14px_36px_rgba(38,76,50,0.12)]";

function formatNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signedNumber(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${formatNumber(value, digits)}`;
}

function isDashboardData(value: unknown): value is RiceYieldDashboardData {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RiceYieldDashboardData>;
  return Boolean(
    candidate.metadata &&
      Array.isArray(candidate.provinces) &&
      Array.isArray(candidate.years) &&
      Array.isArray(candidate.records) &&
      candidate.province_history &&
      candidate.year_summary
  );
}

function isYearlyRecords(value: unknown): value is RiceYieldRecord[] {
  return Array.isArray(value) && value.every((record) => {
    if (!record || typeof record !== "object") return false;
    const candidate = record as Partial<RiceYieldRecord>;
    return (
      typeof candidate.province === "string" &&
      typeof candidate.crop_year === "string" &&
      typeof candidate.yield_kg_rai === "number" &&
      typeof candidate.is_forecast === "boolean"
    );
  });
}

function isProvinceGeoJson(value: unknown): value is RiceProvinceGeoJson {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<RiceProvinceGeoJson>;
  return (
    candidate.type === "FeatureCollection" &&
    Array.isArray(candidate.features) &&
    candidate.features.every(
      (feature) =>
        feature?.type === "Feature" &&
        typeof feature.properties?.province_th === "string" &&
        (feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
    )
  );
}

function validateDashboardData(
  dashboardValue: unknown,
  recordsValue: unknown,
  geoJsonValue: unknown
): RiceYieldStaticData {
  if (!isDashboardData(dashboardValue)) {
    throw new Error("โครงสร้างข้อมูลสรุปผลผลิตข้าวไม่ถูกต้อง");
  }
  if (!isYearlyRecords(recordsValue)) {
    throw new Error("โครงสร้างข้อมูลผลผลิตข้าวรายปีไม่ถูกต้อง");
  }
  if (!isProvinceGeoJson(geoJsonValue)) {
    throw new Error("โครงสร้างขอบเขตแผนที่จังหวัดไม่ถูกต้อง");
  }

  if (
    recordsValue.length !== dashboardValue.metadata.record_count ||
    geoJsonValue.features.length !== dashboardValue.metadata.province_count
  ) {
    throw new Error("จำนวนระเบียนหรือจำนวนจังหวัดไม่ตรงกับ metadata ของชุดข้อมูล");
  }

  return {
    dashboard: dashboardValue,
    records: recordsValue,
    geoJson: geoJsonValue,
  };
}

async function fetchDashboardData(signal: AbortSignal): Promise<RiceYieldStaticData> {
  const response = await fetch("/api/v1/dashboard?view=yield-dashboard", {
    signal,
    cache: "no-store",
  });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (payload as { error?: { message?: unknown } })?.error?.message;
    throw new Error(
      typeof message === "string"
        ? message
        : `โหลดข้อมูลผลผลิตข้าวไม่สำเร็จ (HTTP ${response.status})`
    );
  }

  const data = (payload as { data?: Partial<RiceYieldStaticData> })?.data;
  return validateDashboardData(data?.dashboard, data?.records, data?.geoJson);
}

export default function RiceYieldDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [data, setData] = useState<RiceYieldStaticData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchDashboardData(controller.signal);
        if (!controller.signal.aborted) setData(result);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setData(null);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "ไม่สามารถโหลดข้อมูลผลผลิตข้าวได้"
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [reloadKey]);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const query = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value) query.set(key, value);
        else query.delete(key);
      });
      const suffix = query.toString();
      router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  const requestedYear = searchParams.get("yieldYear");
  const selectedYear =
    data?.dashboard.years.some((year) => year.crop_year === requestedYear)
      ? (requestedYear as string)
      : data?.dashboard.metadata.latest_crop_year ?? "";
  const firstProvinceWithData =
    data?.records.find((record) => record.crop_year === selectedYear)?.province ??
    data?.dashboard.provinces[0] ??
    "";
  const requestedProvince = searchParams.get("yieldProvince");
  const selectedProvince =
    data?.records.some(
      (record) =>
        record.crop_year === selectedYear &&
        record.province === requestedProvince
    )
      ? (requestedProvince as string)
      : firstProvinceWithData;

  const yearRecords = useMemo(
    () => data?.records.filter((record) => record.crop_year === selectedYear) ?? [],
    [data, selectedYear]
  );
  const selectedRecord = yearRecords.find((record) => record.province === selectedProvince) ?? null;
  const selectedYieldChange = selectedRecord?.change_kg_rai ?? null;
  const provinceHistory = useMemo(
    () => data?.records.filter((record) => record.province === selectedProvince) ?? [],
    [data, selectedProvince]
  );
  const selectedYearDefinition = data?.dashboard.years.find(
    (year) => year.crop_year === selectedYear
  );

  if (loading) {
    return <RiceLoadingState label="กำลังโหลดข้อมูลผลผลิตและแผนที่ 77 จังหวัด…" />;
  }

  if (error) {
    return <RiceErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  if (!data) {
    return <RiceEmptyState message="ไม่พบชุดข้อมูลสำหรับสร้างหน้าแดชบอร์ดผลผลิต" />;
  }

  const cards = [
    {
      label: "ผลผลิตปีที่เลือก",
      value: formatNumber(selectedRecord?.yield_kg_rai ?? null),
      unit: "kg/ไร่",
      image: "/images/18.png",
      imageAlt: "กระสอบข้าวและรวงข้าว",
    },
    {
      label: "ผลผลิตปีก่อน",
      value: formatNumber(selectedRecord?.previous_yield_kg_rai ?? null),
      unit: "kg/ไร่",
      image: "/images/19.png",
      imageAlt: "เกษตรกรกับรวงข้าว",
    },
    {
      label: "เปลี่ยนแปลงจากปีก่อน",
      value: signedNumber(selectedRecord?.change_kg_rai ?? null),
      unit: "kg/ไร่",
      image: "/images/20.png",
      imageAlt: "ตาชั่งเปรียบเทียบผลผลิต",
    },
    {
      label: "อัตราการเปลี่ยนแปลง",
      value: signedNumber(selectedRecord?.change_percent ?? null),
      unit: "%",
      image: "/images/21.png",
      imageAlt: "ตรารับรองผลผลิต",
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <section
        aria-label="ตัวกรองผลผลิต"
        className="rounded-xl bg-white p-4 shadow-[0_14px_36px_rgba(38,76,50,0.12)] dark:bg-[#0d2014] sm:p-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold sm:text-xl">ตัวกรองผลผลิต</h2>
            <p className="mt-1 text-xs text-emerald-950/55 dark:text-white/55">
              ชุดข้อมูล {data.dashboard.metadata.title} · เลือกปีการผลิตและจังหวัด
            </p>
          </div>
          <ForecastBadge isForecast={Boolean(selectedYearDefinition?.is_forecast)} />
        </div>
        <YieldFilters
          years={data.dashboard.years}
          provinces={data.dashboard.provinces}
          selectedYear={selectedYear}
          selectedProvince={selectedProvince}
          defaultYear={data.dashboard.metadata.latest_crop_year}
          defaultProvince={firstProvinceWithData}
          onApply={(year, province) =>
            updateQuery({ yieldYear: year, yieldProvince: province })
          }
        />
      </section>

      <DashboardMascotInsight
        dashboardName="ผลผลิตข้าว"
        summary={
          selectedRecord
            ? `จังหวัด${selectedProvince} ปีการผลิต ${selectedYear} มีผลผลิต ${formatNumber(selectedRecord.yield_kg_rai)} kg/ไร่ ${selectedYieldChange === null ? "และไม่มีข้อมูลเปรียบเทียบปีก่อน" : selectedYieldChange > 0 ? `เพิ่มขึ้น ${formatNumber(selectedYieldChange)} kg/ไร่จากปีก่อน` : selectedYieldChange < 0 ? `ลดลง ${formatNumber(Math.abs(selectedYieldChange))} kg/ไร่จากปีก่อน` : "ไม่เปลี่ยนแปลงจากปีก่อน"} และเป็น${selectedRecord.is_forecast ? "ค่าพยากรณ์" : "ข้อมูลจริง"}`
            : `ไม่พบข้อมูลผลผลิตของจังหวัด${selectedProvince}ในปีการผลิต ${selectedYear}`
        }
        recommendation={
          !selectedRecord
            ? "ควรตรวจปีการผลิตและจังหวัดที่เลือก หรือทบทวนความครบถ้วนของข้อมูลก่อนวางแผน"
            : selectedRecord.is_forecast
              ? "ควรใช้ค่าพยากรณ์เพื่อเตรียมปัจจัยการผลิตและงบประมาณ พร้อมติดตามข้อมูลจริงเมื่อมีการเก็บเกี่ยว ไม่ควรใช้เป็นผลผลิตที่ยืนยันแล้ว"
              : (selectedYieldChange ?? 0) < 0
                ? "ควรตรวจสาเหตุระดับแปลง เช่น น้ำ ความชื้นดิน โรค และพื้นที่เก็บเกี่ยว แล้วเปรียบเทียบกับปีก่อนก่อนเลือกมาตรการแก้ไข"
                : "ควรรักษาวิธีจัดการแปลงที่ให้ผลดี พร้อมติดตามน้ำ โรค และต้นทุน เพื่อให้ผลผลิตที่เพิ่มขึ้นคงต่อเนื่อง"
        }
      />

      {selectedRecord ? (
        <section aria-label="ข้อมูลสรุปผลผลิต" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, unit, image, imageAlt }) => (
            <YieldKpiCard
              key={`${label}-${unit}`}
              label={label}
              value={value}
              unit={unit}
              image={image}
              imageAlt={imageAlt}
            />
          ))}
        </section>
      ) : (
        <RiceEmptyState message="ไม่พบข้อมูลสรุปของจังหวัดและปีที่เลือก" />
      )}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(360px,0.7fr)] sm:gap-7">
        <RicePanel
          title="แผนที่ผลผลิตรายจังหวัด"
          description={`ปี ${selectedYear} · หน่วย ${data.dashboard.metadata.unit}`}
          action={<ForecastBadge isForecast={Boolean(selectedYearDefinition?.is_forecast)} />}
          className={`min-w-0 ${YIELD_PANEL_CLASS}`}
        >
          <ThailandYieldChoropleth
            geoJson={data.geoJson}
            records={yearRecords}
            selectedProvince={selectedProvince}
            onSelectProvince={(province) => updateQuery({ yieldProvince: province })}
          />
        </RicePanel>

        <RicePanel
          title="จังหวัดที่ผลผลิตเปลี่ยนแปลงสูงสุด"
          description={`10 อันดับ · ปี ${selectedYear}`}
          className={`min-w-0 ${YIELD_PANEL_CLASS}`}
        >
          <TopForecastChangeChart records={yearRecords} />
        </RicePanel>
      </div>

      <RicePanel
        title="แนวโน้มผลผลิตรายปี"
        description={`จังหวัด${selectedProvince} · ${provinceHistory.some((record) => record.is_forecast) ? "ข้อมูลจริงและค่าพยากรณ์" : "ข้อมูลจริงย้อนหลัง"}`}
        action={<ForecastBadge isForecast={Boolean(selectedRecord?.is_forecast)} />}
        className={YIELD_PANEL_CLASS}
      >
        <HistoricalYieldForecastChart history={provinceHistory} selectedYear={selectedYear} />
      </RicePanel>
    </div>
  );
}

function YieldKpiCard({
  label,
  value,
  unit,
  image,
  imageAlt,
}: {
  label: string;
  value: string;
  unit: string;
  image: string;
  imageAlt: string;
}) {
  return (
    <article className="flex min-h-[108px] min-w-0 items-center rounded-xl bg-white px-4 py-4 text-[#23654C] shadow-[0_10px_28px_rgba(64,145,108,0.16)] dark:bg-[#0d2014] sm:px-5">
      <div className="flex w-full items-center gap-3.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white shadow-[0_7px_20px_rgba(30,53,38,0.18)]">
          <Image
            src={image}
            alt={imageAlt}
            width={38}
            height={38}
            className="h-9 w-9 object-contain opacity-80 brightness-0"
          />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium leading-5 text-[#557060]">{label}</p>
          <p className="mt-0.5 break-words text-[1.7rem] font-bold leading-none tabular-nums text-[#173523] dark:text-white">
            {value}
          </p>
          <p className="mt-1.5 text-[11px] text-[#6d8274] dark:text-white/55">{unit}</p>
        </div>
      </div>
    </article>
  );
}

function YieldFilters({
  years,
  provinces,
  selectedYear,
  selectedProvince,
  defaultYear,
  defaultProvince,
  onApply,
}: {
  years: RiceYieldDashboardData["years"];
  provinces: string[];
  selectedYear: string;
  selectedProvince: string;
  defaultYear: string;
  defaultProvince: string;
  onApply: (year: string, province: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draftYear, setDraftYear] = useState(selectedYear);
  const [draftProvince, setDraftProvince] = useState(selectedProvince);

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls="yield-dashboard-filters"
          onClick={() => {
            if (!open) {
              setDraftYear(selectedYear);
              setDraftProvince(selectedProvince);
            }
            setOpen((current) => !current);
          }}
          className="inline-flex min-h-9 items-center gap-2 rounded-full bg-[#f2f4ef] px-4 text-xs font-medium text-[#557060] transition hover:bg-[#e9eedf]"
        >
          <Funnel aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.7} />
          เลือกข้อมูล
          <ChevronDown
            aria-hidden="true"
            className={`h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        <span className="rounded-full bg-[#eef5e8] px-3 py-1.5 text-[11px] font-semibold text-[#315d42]">
          ปี {selectedYear}
        </span>
        <span className="rounded-full bg-[#fff4cf] px-3 py-1.5 text-[11px] font-semibold text-[#7c6217]">
          {selectedProvince}
        </span>
      </div>

      {open ? (
        <div
          id="yield-dashboard-filters"
          className="mt-3 rounded-xl bg-[#f8fbf2] p-3 shadow-[0_10px_28px_rgba(47,79,58,0.12)] sm:p-4"
        >
          <div className="grid gap-3 md:grid-cols-2">
            <FilterSelect
              label="ปีการผลิต"
              value={draftYear}
              onChange={setDraftYear}
              icon={<CalendarRange className="h-4 w-4" />}
            >
              {[...years].reverse().map((year) => (
                <option key={year.crop_year} value={year.crop_year}>
                  {year.crop_year}{year.is_forecast ? " — Forecast" : " — Actual"}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect
              label="จังหวัด"
              value={draftProvince}
              onChange={setDraftProvince}
              icon={<Map className="h-4 w-4" />}
            >
              {provinces.map((province) => (
                <option key={province} value={province}>{province}</option>
              ))}
            </FilterSelect>
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftYear(defaultYear);
                setDraftProvince(defaultProvince);
              }}
              className="min-h-9 rounded-full bg-white px-5 text-xs font-medium text-[#315d42] shadow-sm transition hover:bg-[#f4f8e9]"
            >
              รีเซ็ต
            </button>
            <button
              type="button"
              onClick={() => {
                onApply(draftYear, draftProvince);
                setOpen(false);
              }}
              className="min-h-9 rounded-full bg-[#40916C] px-5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(64,145,108,0.25)] transition hover:bg-[#357b5b]"
            >
              แสดงข้อมูล
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  icon,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="grid min-w-0 gap-2 text-sm font-semibold">
      <span className="inline-flex items-center gap-2">{icon}{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-lg border border-[#40916C]/25 bg-white px-3 text-sm font-normal outline-none transition focus:border-[#40916C] focus:ring-2 focus:ring-[#40916C]/15 dark:border-white/15 dark:bg-white/5"
      >
        {children}
      </select>
    </label>
  );
}
