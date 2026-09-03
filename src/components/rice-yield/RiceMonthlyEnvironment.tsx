"use client";

import { CloudRain, Droplets, Leaf, ThermometerSun } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import type { RiceMonthlyEnvironment, RiceProvince, RiceDashboardVersion } from "@/lib/rice-yield/types";
import { RiceBarChart, RiceLineChart } from "./RiceCharts";
import { RiceErrorState, RiceLoadingState, RicePanel } from "./RiceAnalyticsShell";

const MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];

interface EnvironmentResponse {
  version: RiceDashboardVersion;
  province: RiceProvince;
  year: number;
  months: RiceMonthlyEnvironment[];
  summary: {
    annualRainfall: number | null;
    meanTemperature: number | null;
    meanNdvi: number | null;
    meanSoilMoisture: number | null;
  };
}

interface Envelope<T> {
  data?: T;
  error?: { message?: string };
}

function parseNumber(value: string | null, fallback: number, minimum: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : fallback;
}

function format(value: number | null, digits = 1) {
  return value === null ? "—" : value.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

export default function RiceMonthlyEnvironmentPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const provinceId = parseNumber(search.get("province"), 1, 1, 999);
  const versionKey = search.get("version") ?? "";
  const [provinces, setProvinces] = useState<RiceProvince[]>([]);
  const [environment, setEnvironment] = useState<EnvironmentResponse | null>(null);
  const year = parseNumber(search.get("year"), environment?.version.environmentYears.at(-1) ?? 0, 1900, 2200);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateQuery = useCallback((key: string, value: string) => {
    const query = new URLSearchParams(search.toString());
    query.set(key, value);
    router.replace(`${pathname}?${query}`, { scroll: false });
  }, [pathname, router, search]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [provincesResponse, environmentResponse] = await Promise.all([
          fetch("/api/v1/provinces", { signal: controller.signal }),
          fetch(`/api/v1/provinces/${provinceId}/environment?year=${year}${versionKey ? `&version=${encodeURIComponent(versionKey)}` : ""}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const provincesPayload = (await provincesResponse.json()) as Envelope<RiceProvince[]>;
        const environmentPayload = (await environmentResponse.json()) as Envelope<EnvironmentResponse>;
        if (!provincesResponse.ok || !provincesPayload.data) {
          throw new Error(provincesPayload.error?.message ?? "ไม่สามารถโหลดรายชื่อจังหวัดได้");
        }
        if (!environmentResponse.ok || !environmentPayload.data) {
          throw new Error(environmentPayload.error?.message ?? "ไม่สามารถโหลดข้อมูลรายเดือนได้");
        }
        setProvinces(provincesPayload.data);
        setEnvironment(environmentPayload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [provinceId, versionKey, year]);

  const rainRows = environment?.months.filter((row) => row.rainfall_total_mm !== null) ?? [];
  const highestRain = rainRows.reduce<RiceMonthlyEnvironment | null>(
    (current, row) => !current || (row.rainfall_total_mm ?? -Infinity) > (current.rainfall_total_mm ?? -Infinity) ? row : current,
    null
  );
  const lowestRain = rainRows.reduce<RiceMonthlyEnvironment | null>(
    (current, row) => !current || (row.rainfall_total_mm ?? Infinity) < (current.rainfall_total_mm ?? Infinity) ? row : current,
    null
  );

  return (
    <div className="space-y-7">
      <RicePanel title="เลือกพื้นที่และปี" description="ข้อมูลสิ่งแวดล้อมเป็นรายเดือน ส่วนผลผลิตข้าวไม่มีข้อมูลรายเดือน">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-sm font-semibold">จังหวัด
            <select value={provinceId} onChange={(event) => updateQuery("province", event.target.value)} className="min-h-12 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 dark:border-white/15 dark:bg-white/5">
              {provinces.map((province) => <option key={province.id} value={province.id}>{province.province_th} · {province.region}</option>)}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">ปีปฏิทิน
            <select value={year} onChange={(event) => updateQuery("year", event.target.value)} className="min-h-12 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 dark:border-white/15 dark:bg-white/5">
              {environment?.version.environmentYears.length ? [...environment.version.environmentYears].reverse().map((item) => <option key={item} value={item}>{item + 543}</option>) : <option value={year}>ยังไม่มีข้อมูลรายเดือน</option>}
            </select>
          </label>
        </div>
      </RicePanel>

      {loading ? <RiceLoadingState label="กำลังโหลดข้อมูล 12 เดือน…" /> : null}
      {error ? <RiceErrorState message={error} /> : null}
      {!loading && !error && environment ? (
        <>
          <section aria-label="สรุปข้อมูลรายปี" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "ฝนรวมรายปี", value: format(environment.summary.annualRainfall), unit: "มม.", icon: CloudRain },
              { label: "อุณหภูมิเฉลี่ย", value: format(environment.summary.meanTemperature), unit: "°C", icon: ThermometerSun },
              { label: "NDVI เฉลี่ย", value: format(environment.summary.meanNdvi, 3), unit: "ดัชนี", icon: Leaf },
              { label: "ความชื้นในดินเฉลี่ย", value: format(environment.summary.meanSoilMoisture, 3), unit: "ค่าชุดข้อมูล", icon: Droplets },
            ].map(({ label, value, unit, icon: Icon }) => (
              <article key={label} className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-[#0d2014]">
                <div className="flex items-start justify-between"><div><p className="text-xs text-emerald-950/55 dark:text-white/55">{label}</p><p className="mt-2 text-2xl font-bold">{value}</p><p className="text-xs text-emerald-950/45 dark:text-white/45">{unit}</p></div><Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" /></div>
              </article>
            ))}
          </section>

          <RicePanel title="ปริมาณฝนรายเดือน" description={`ฝนสูงสุด ${highestRain ? MONTHS[highestRain.month - 1] : "—"} · ฝนต่ำสุด ${lowestRain ? MONTHS[lowestRain.month - 1] : "—"}`}>
            <RiceBarChart title="ปริมาณฝนรายเดือน" unit="มม." digits={1} items={environment.months.map((row) => ({ label: MONTHS[row.month - 1], value: row.rainfall_total_mm, color: "#2878a8" }))} />
          </RicePanel>

          <div className="grid gap-7 xl:grid-cols-2">
            <RicePanel title="อุณหภูมิเฉลี่ยรายเดือน" description="ชุดข้อมูลมีอุณหภูมิเฉลี่ยเท่านั้น จึงไม่สร้างค่าต่ำสุด/สูงสุดขึ้นเอง">
              <RiceLineChart title="อุณหภูมิเฉลี่ยรายเดือน" xLabel="เดือน" yLabel="°C" digits={1} series={[{ id: "temperature", label: "อุณหภูมิเฉลี่ย", points: environment.months.map((row) => ({ x: row.month, value: row.temperature_mean_c, label: MONTHS[row.month - 1] })) }]} />
            </RicePanel>
            <RicePanel title="ความเขียวของพืชจากดาวเทียม (NDVI)" description="NDVI ต่ำไม่ได้หมายถึงโรคพืชโดยตรง และค่าที่หายจะไม่ถูกแทนด้วย 0">
              <RiceLineChart title="NDVI รายเดือน" xLabel="เดือน" yLabel="NDVI" digits={3} series={[
                { id: "mean", label: "ค่าเฉลี่ย", points: environment.months.map((row) => ({ x: row.month, value: row.ndvi_mean, label: MONTHS[row.month - 1] })) },
                { id: "median", label: "มัธยฐาน", dashed: true, points: environment.months.map((row) => ({ x: row.month, value: row.ndvi_median, label: MONTHS[row.month - 1] })) },
              ]} />
            </RicePanel>
          </div>

          <RicePanel title="ความชื้นในดินรายเดือน" description="ค่าเฉลี่ยจากชุดข้อมูลระดับจังหวัด">
            <RiceLineChart title="ความชื้นในดินรายเดือน" xLabel="เดือน" yLabel="ความชื้นในดิน" digits={3} series={[{ id: "soil", label: "ความชื้นในดิน", points: environment.months.map((row) => ({ x: row.month, value: row.soil_moisture_mean, label: MONTHS[row.month - 1] })) }]} />
          </RicePanel>

          <details className="rounded-3xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-[#0d2014]">
            <summary className="cursor-pointer text-lg font-bold">ข้อมูลสิ่งแวดล้อมขั้นสูง</summary>
            <p className="mt-2 text-sm text-emerald-950/55 dark:text-white/55">จุดน้ำค้าง การระเหย และรังสีดวงอาทิตย์</p>
            <div className="mt-5"><RiceLineChart title="ข้อมูลสิ่งแวดล้อมขั้นสูง" xLabel="เดือน" yLabel="ค่าชุดข้อมูล" digits={2} series={[
              { id: "dewpoint", label: "จุดน้ำค้าง (°C)", points: environment.months.map((row) => ({ x: row.month, value: row.dewpoint_mean_c })) },
              { id: "evaporation", label: "การระเหย (มม.)", points: environment.months.map((row) => ({ x: row.month, value: row.evaporation_total_mm })) },
              { id: "solar", label: "รังสีดวงอาทิตย์ (MJ/m²)", points: environment.months.map((row) => ({ x: row.month, value: row.solar_total_mj_m2 })) },
            ]} /></div>
          </details>

          <RicePanel title="ตารางข้อมูล 12 เดือน" description="แสดงค่าตามชุดข้อมูลต้นฉบับ โดยใช้ขีดเมื่อไม่มีข้อมูล">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead><tr className="border-b border-emerald-950/10 text-left text-emerald-950/55 dark:border-white/10 dark:text-white/55"><th className="py-3 pr-4">เดือน</th><th className="px-3 py-3 text-right">ฝน (มม.)</th><th className="px-3 py-3 text-right">อุณหภูมิ (°C)</th><th className="px-3 py-3 text-right">NDVI</th><th className="px-3 py-3 text-right">ความชื้นดิน</th><th className="px-3 py-3 text-right">จุดน้ำค้าง</th><th className="px-3 py-3 text-right">การระเหย</th><th className="px-3 py-3 text-right">รังสีดวงอาทิตย์</th><th className="px-3 py-3">คุณภาพ NDVI</th></tr></thead>
                <tbody>{environment.months.map((row) => <tr key={row.month} className="border-b border-emerald-950/5 dark:border-white/5"><td className="py-3 pr-4 font-semibold">{MONTHS[row.month - 1]}</td><td className="px-3 py-3 text-right">{format(row.rainfall_total_mm)}</td><td className="px-3 py-3 text-right">{format(row.temperature_mean_c)}</td><td className="px-3 py-3 text-right">{format(row.ndvi_mean, 3)}</td><td className="px-3 py-3 text-right">{format(row.soil_moisture_mean, 3)}</td><td className="px-3 py-3 text-right">{format(row.dewpoint_mean_c)}</td><td className="px-3 py-3 text-right">{format(row.evaporation_total_mm)}</td><td className="px-3 py-3 text-right">{format(row.solar_total_mj_m2)}</td><td className="px-3 py-3">{row.rice_ndvi_final_quality ?? "—"}</td></tr>)}</tbody>
              </table>
            </div>
          </RicePanel>
        </>
      ) : null}
    </div>
  );
}
