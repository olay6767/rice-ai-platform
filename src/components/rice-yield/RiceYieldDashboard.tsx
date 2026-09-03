"use client";

import { CalendarRange, CloudRain, Droplets, Leaf, Map, Satellite, ThermometerSun, Wheat } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type {
  RiceDashboardResponse,
  RiceDashboardVersion,
  RiceProvince,
  RiceRegion,
} from "@/lib/rice-yield/types";
import { RiceLineChart } from "./RiceCharts";
import {
  RiceErrorState,
  RiceLoadingState,
  RicePanel,
} from "./RiceAnalyticsShell";
import ThailandYieldMap from "./ThailandYieldMap";

const REGIONS: Array<{ value: RiceRegion; label: string }> = [
  { value: "North", label: "ภาคเหนือ" },
  { value: "Northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { value: "Central", label: "ภาคกลาง" },
  { value: "South", label: "ภาคใต้" },
];

const MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

interface ApiEnvelope<T> {
  data?: T;
  error?: { message?: string };
}

function numberParam(value: string | null, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function formatMetric(value: number | null, digits = 1) {
  return value === null
    ? "ไม่มีข้อมูล"
    : value.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

export default function RiceYieldDashboard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const versionKey = searchParams.get("version") ?? "";
  const month = numberParam(searchParams.get("month"), 8, 1, 12);
  const regionValue = searchParams.get("region");
  const region = REGIONS.some((item) => item.value === regionValue)
    ? (regionValue as RiceRegion)
    : null;
  const provinceId = numberParam(searchParams.get("province"), 0, 1, 999) || null;
  const [provinces, setProvinces] = useState<RiceProvince[]>([]);
  const [versions, setVersions] = useState<RiceDashboardVersion[]>([]);
  const selectedVersion = versions.find(item => item.key === versionKey) ?? versions.find(item => item.isDefault) ?? versions[0];
  const cropYear = numberParam(searchParams.get("cropYear"), selectedVersion?.cropYears.at(-1) ?? 0, 1900, 2200);
  const year = numberParam(searchParams.get("year"), selectedVersion?.environmentYears.at(-1) ?? selectedVersion?.cropYears.at(-1) ?? 0, 1900, 2200);
  const [dashboard, setDashboard] = useState<RiceDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const updateQuery = useCallback(
    (updates: Record<string, string | null>) => {
      const query = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) query.delete(key);
        else query.set(key, value);
      }
      router.replace(`${pathname}?${query.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams]
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      const query = new URLSearchParams({
        cropYear: String(cropYear),
        year: String(year),
        month: String(month),
      });
      if (region) query.set("region", region);
      if (provinceId) query.set("province", String(provinceId));
      if (versionKey) query.set("version", versionKey);
      try {
        const [provinceResponse, versionResponse, dashboardResponse] = await Promise.all([
          fetch("/api/v1/provinces", { signal: controller.signal }),
          fetch("/api/v1/dashboard/versions", {
            signal: controller.signal,
            cache: "no-store",
          }),
          fetch(`/api/v1/dashboard?${query}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const provincePayload = (await provinceResponse.json()) as ApiEnvelope<RiceProvince[]>;
        const versionPayload = (await versionResponse.json()) as ApiEnvelope<RiceDashboardVersion[]>;
        const dashboardPayload = (await dashboardResponse.json()) as ApiEnvelope<RiceDashboardResponse>;
        if (!provinceResponse.ok || !provincePayload.data) {
          throw new Error(provincePayload.error?.message ?? "ไม่สามารถโหลดรายชื่อจังหวัดได้");
        }
        if (!versionResponse.ok || !versionPayload.data) {
          throw new Error(versionPayload.error?.message ?? "ไม่สามารถโหลดเวอร์ชันข้อมูลได้");
        }
        if (controller.signal.aborted) return;
        setProvinces(provincePayload.data);
        setVersions(versionPayload.data);
        if (!dashboardResponse.ok || !dashboardPayload.data) {
          throw new Error(dashboardPayload.error?.message ?? "ไม่สามารถโหลดแดชบอร์ดได้");
        }
        setDashboard(dashboardPayload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setDashboard(null);
        setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [cropYear, month, provinceId, region, reloadKey, versionKey, year]);

  const filteredProvinces = useMemo(
    () => provinces.filter((province) => !region || province.region === region),
    [provinces, region]
  );
  const selectedProvince = provinces.find((province) => province.id === provinceId);
  const scopeLabel = selectedProvince?.province_th ?? REGIONS.find((item) => item.value === region)?.label ?? "ประเทศไทย";
  const kpis = dashboard?.kpis;

  const cards = [
    { label: "ผลผลิตจริงเฉลี่ย", value: formatMetric(kpis?.averageActualYield ?? null), unit: "กก./ไร่", icon: Wheat, tone: "bg-emerald-100 text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200" },
    { label: "ผลผลิตพยากรณ์เฉลี่ย", value: formatMetric(kpis?.averagePredictedYield ?? null), unit: "กก./ไร่", icon: Satellite, tone: "bg-amber-100 text-amber-800 dark:bg-amber-300/10 dark:text-amber-200" },
    { label: "ปริมาณฝน", value: formatMetric(kpis?.rainfall ?? null), unit: "มม./เดือน", icon: CloudRain, tone: "bg-sky-100 text-sky-800 dark:bg-sky-300/10 dark:text-sky-200" },
    { label: "อุณหภูมิเฉลี่ย", value: formatMetric(kpis?.meanTemperature ?? null), unit: "°C", icon: ThermometerSun, tone: "bg-orange-100 text-orange-800 dark:bg-orange-300/10 dark:text-orange-200" },
    { label: "ความเขียวของพืช (NDVI)", value: formatMetric(kpis?.meanNdvi ?? null, 3), unit: "ดัชนี", icon: Leaf, tone: "bg-lime-100 text-lime-800 dark:bg-lime-300/10 dark:text-lime-200" },
    { label: "ความชื้นในดิน", value: formatMetric(kpis?.meanSoilMoisture ?? null, 3), unit: "ค่าชุดข้อมูล", icon: Droplets, tone: "bg-teal-100 text-teal-800 dark:bg-teal-300/10 dark:text-teal-200" },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <RicePanel
        title="ตัวกรองข้อมูล"
        description={`กำลังดูข้อมูล ${scopeLabel} · เวอร์ชัน ${dashboard?.version.label ?? (loading ? "กำลังโหลด" : "ไม่พร้อมแสดงผล")} · ตัวกรองถูกเก็บใน URL และแชร์มุมมองนี้ได้`}
        action={<span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-800 sm:text-xs dark:bg-emerald-300/10 dark:text-emerald-200"><CalendarRange className="h-4 w-4 shrink-0" /> ปีเพาะปลูกและปีปฏิทินแยกกัน</span>}
      >
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-6">
          <FilterSelect
            className="col-span-2 sm:col-span-1"
            label="เวอร์ชันข้อมูล"
            value={versionKey || dashboard?.version.key || ""}
            onChange={(value) =>
              updateQuery({
                version: value || null,
                province: null,
                cropYear: null,
                year: null,
              })
            }
          >
            {!versions.length && <option value="">{loading ? "กำลังโหลดเวอร์ชัน…" : "ยังไม่มีเวอร์ชันที่เผยแพร่"}</option>}
            {versions.map((version) => (
              <option key={version.id} value={version.key}>
                {version.label}{version.isDefault ? " (ค่าเริ่มต้น)" : ""}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="ปีเพาะปลูก" value={cropYear} onChange={(value) => updateQuery({ cropYear: value })}>
            {selectedVersion?.cropYears.length ? [...selectedVersion.cropYears].reverse().map((item) => <option key={item} value={item}>{item + 543}/{String(item + 544).slice(-2)}</option>) : <option value={cropYear}>ยังไม่มีข้อมูลรายปี</option>}
          </FilterSelect>
          <FilterSelect label="ปีข้อมูลรายเดือน" value={year} onChange={(value) => updateQuery({ year: value })}>
            {selectedVersion?.environmentYears.length ? [...selectedVersion.environmentYears].reverse().map((item) => <option key={item} value={item}>{item + 543}</option>) : <option value={year}>ยังไม่มีข้อมูลรายเดือน</option>}
          </FilterSelect>
          <FilterSelect label="เดือน" value={month} onChange={(value) => updateQuery({ month: value })}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </FilterSelect>
          <FilterSelect label="ภูมิภาค" value={region ?? ""} onChange={(value) => updateQuery({ region: value || null, province: null })}>
            <option value="">ทุกภูมิภาค</option>
            {REGIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </FilterSelect>
          <FilterSelect className="col-span-2 sm:col-span-1" label="จังหวัด" value={provinceId ?? ""} onChange={(value) => updateQuery({ province: value || null })}>
            <option value="">ทุกจังหวัด</option>
            {filteredProvinces.map((province) => <option key={province.id} value={province.id}>{province.province_th}</option>)}
          </FilterSelect>
        </div>
      </RicePanel>

      {loading ? <RiceLoadingState label="กำลังคำนวณตัวชี้วัดและแนวโน้ม…" /> : null}
      {error ? <RiceErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} /> : null}
      {!loading && !error && dashboard ? (
        <>
          <section aria-label="ตัวชี้วัดสำคัญ" className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
            {cards.map(({ label, value, unit, icon: Icon, tone }) => (
              <article key={label} className="min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-3.5 shadow-[0_12px_35px_rgba(11,46,28,0.05)] sm:rounded-3xl sm:p-5 dark:border-white/10 dark:bg-[#0d2014]">
                <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 order-2 sm:order-1"><p className="min-h-10 text-xs leading-5 text-emerald-950/55 sm:min-h-0 sm:text-sm dark:text-white/55">{label}</p><p className="mt-1 break-words text-2xl font-bold tabular-nums sm:mt-2 sm:text-3xl">{value}</p><p className="mt-1 text-[11px] text-emerald-950/50 sm:text-xs dark:text-white/50">{unit}</p></div>
                  <span className={`order-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl sm:order-2 sm:h-11 sm:w-11 sm:rounded-2xl ${tone}`}><Icon aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" /></span>
                </div>
              </article>
            ))}
          </section>

          <RicePanel title="แนวโน้มผลผลิตข้าวรายปี" description="ค่าเฉลี่ยผลผลิตจริงและผลพยากรณ์จากข้อมูลในเวอร์ชันที่เลือก">
            <RiceLineChart
              title="แนวโน้มผลผลิตข้าวรายปี"
              xLabel="ปีเริ่มเพาะปลูก"
              yLabel="กก./ไร่"
              series={[
                { id: "actual", label: "ผลผลิตจริง", points: dashboard.trend.map((point) => ({ x: point.year, value: point.actualYield, label: point.cropYear ?? String(point.year) })) },
                { id: "predicted", label: "ผลผลิตพยากรณ์", dashed: true, points: dashboard.trend.map((point) => ({ x: point.year, value: point.predictedYield, label: point.cropYear ?? String(point.year) })) },
              ]}
            />
          </RicePanel>

          <RicePanel
            title="แผนที่ผลผลิตและสิ่งแวดล้อมรายจังหวัด"
            description="สลับชั้นข้อมูล วางเมาส์หรือแตะจังหวัด ซูม เลื่อน และเปิดเต็มจอได้"
            action={<span className="inline-flex items-center gap-2 text-xs text-emerald-950/55 dark:text-white/55"><Map className="h-4 w-4" /> {dashboard.coverage.provinces} จังหวัดในขอบเขต</span>}
          >
            <ThailandYieldMap
              cropYear={cropYear}
              environmentYear={year}
              month={month}
              region={region}
              versionKey={dashboard.version.key}
            />
          </RicePanel>
        </>
      ) : null}
    </div>
  );
}

function FilterSelect({
  className = "",
  label,
  value,
  onChange,
  children,
}: {
  className?: string;
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className={`min-w-0 grid gap-1.5 text-xs font-semibold sm:text-sm ${className}`}>
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full min-w-0 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-2.5 text-sm font-normal outline-none focus:border-emerald-600 sm:min-h-12 sm:px-3 dark:border-white/15 dark:bg-white/5"
      >
        {children}
      </select>
    </label>
  );
}
