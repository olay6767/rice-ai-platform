"use client";

import Link from "next/link";
import { ArrowLeft, CloudRain, Droplets, Leaf, MapPin, Satellite, ThermometerSun, Wheat } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { readJsonResponse } from "@/lib/http/json";
import type {
  RiceMonthlyEnvironment,
  RiceDashboardVersion,
  RicePredictionInterval,
  RiceProvince,
  RiceYearlyYield,
  RiceYieldPrediction,
} from "@/lib/rice-yield/types";
import { RiceBarChart, RiceLineChart } from "./RiceCharts";
import { RiceErrorState, RiceLoadingState, RicePanel } from "./RiceAnalyticsShell";

interface YieldDetail {
  version: RiceDashboardVersion;
  province: RiceProvince;
  yield: RiceYearlyYield[];
  predictions: RiceYieldPrediction[];
  intervals: RicePredictionInterval[];
}

interface EnvironmentDetail {
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

const REGION_LABELS: Record<RiceProvince["region"], string> = {
  North: "ภาคเหนือ",
  Northeast: "ภาคตะวันออกเฉียงเหนือ",
  Central: "ภาคกลาง",
  South: "ภาคใต้",
};

function format(value: number | null | undefined, digits = 1) {
  return typeof value === "number"
    ? value.toLocaleString("th-TH", { maximumFractionDigits: digits })
    : "ไม่มีข้อมูล";
}

export default function RiceProvinceDetail({ provinceId }: { provinceId: number }) {
  const searchParams = useSearchParams();
  const versionKey = searchParams.get("version") ?? "";
  const [chosenYear, setYear] = useState<number | null>(null);
  const [detail, setDetail] = useState<YieldDetail | null>(null);
  const availableYears = [...new Set([...(detail?.version.cropYears ?? []), ...(detail?.version.environmentYears ?? [])])].sort((a,b)=>b-a);
  const year = chosenYear ?? detail?.version.cropYears.at(-1) ?? detail?.version.environmentYears.at(-1) ?? 0;
  const [environment, setEnvironment] = useState<EnvironmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const versionQuery = versionKey
          ? `&version=${encodeURIComponent(versionKey)}`
          : "";
        const [yieldResponse, environmentResponse] = await Promise.all([
          fetch(
            `/api/v1/provinces/${provinceId}/yield?${versionQuery.slice(1)}`,
            { signal: controller.signal, cache: "no-store" }
          ),
          fetch(`/api/v1/provinces/${provinceId}/environment?year=${year}${versionQuery}`, {
            signal: controller.signal,
            cache: "no-store",
          }),
        ]);
        const yieldPayload = await readJsonResponse<Envelope<YieldDetail>>(yieldResponse);
        const environmentPayload = await readJsonResponse<Envelope<EnvironmentDetail>>(environmentResponse);
        if (!yieldResponse.ok || !yieldPayload.data) {
          throw new Error(yieldPayload.error?.message ?? "ไม่สามารถโหลดข้อมูลผลผลิตได้");
        }
        if (!environmentResponse.ok || !environmentPayload.data) {
          throw new Error(environmentPayload.error?.message ?? "ไม่สามารถโหลดข้อมูลสิ่งแวดล้อมได้");
        }
        setDetail(yieldPayload.data);
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

  const selectedYield = detail?.yield.find((row) => row.crop_start_year === year);
  const selectedPrediction = detail?.predictions.find((row) => row.crop_start_year === year);
  const difference = selectedPrediction
    ? selectedPrediction.actual_yield - selectedPrediction.predicted_yield
    : null;
  const percentageDifference = selectedPrediction
    ? (Math.abs(difference ?? 0) / Math.max(1, selectedPrediction.actual_yield)) * 100
    : null;
  const predictionsByYear = useMemo(
    () => new Map(detail?.predictions.map((row) => [row.crop_start_year, row]) ?? []),
    [detail]
  );

  if (loading && !detail) return <RiceLoadingState label="กำลังโหลดข้อมูลจังหวัด…" />;
  if (error) return <RiceErrorState message={error} />;
  if (!detail || !environment) return null;

  const metrics = [
    { label: "ผลผลิตจริง", value: format(selectedYield?.actual_yield), unit: "กก./ไร่", icon: Wheat },
    { label: "ผลผลิตพยากรณ์", value: format(selectedPrediction?.predicted_yield), unit: "กก./ไร่", icon: Satellite },
    { label: "ผลต่างจริง − พยากรณ์", value: format(difference), unit: "กก./ไร่", icon: Satellite },
    { label: "ร้อยละความคลาดเคลื่อน", value: format(percentageDifference), unit: "%", icon: Satellite },
    { label: "ฝนรวมรายปี", value: format(environment.summary.annualRainfall), unit: "มม.", icon: CloudRain },
    { label: "อุณหภูมิเฉลี่ย", value: format(environment.summary.meanTemperature), unit: "°C", icon: ThermometerSun },
    { label: "NDVI เฉลี่ย", value: format(environment.summary.meanNdvi, 3), unit: "ดัชนี", icon: Leaf },
    { label: "ความชื้นในดินเฉลี่ย", value: format(environment.summary.meanSoilMoisture, 3), unit: "ค่าชุดข้อมูล", icon: Droplets },
  ];

  return (
    <div className="space-y-5 sm:space-y-7">
      <div className="flex min-w-0 flex-col gap-5 rounded-2xl bg-[#0b2e1c] p-4 text-white sm:rounded-3xl sm:p-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <Link href={versionKey ? `/dashboard?version=${encodeURIComponent(versionKey)}` : "/dashboard"} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm text-emerald-100 hover:text-white">
            <ArrowLeft aria-hidden="true" className="h-4 w-4" /> กลับแดชบอร์ด
          </Link>
          <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-200"><MapPin className="h-4 w-4 shrink-0" /> {REGION_LABELS[detail.province.region]}</p>
          <h2 className="mt-2 break-words text-3xl font-bold leading-tight text-white sm:text-4xl">{detail.province.province_th}</h2>
          <p className="mt-1 break-words text-sm text-white/60">{detail.province.province_en} · รหัสจังหวัด {detail.province.id}</p>
          <p className="mt-2 text-xs font-semibold text-emerald-200">เวอร์ชันข้อมูล: {detail.version.label}</p>
        </div>
        <label className="grid w-full gap-1.5 text-sm font-semibold text-white lg:w-56">
          ปีที่ต้องการดู
          <select value={year} onChange={(event) => setYear(Number(event.target.value))} className="min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-base font-semibold text-white outline-none focus:border-emerald-300 sm:text-sm">
            {availableYears.map((item) => (
              <option className="bg-[#0b2e1c] text-white" key={item} value={item}>{item + 543}/{String(item + 544).slice(-2)}</option>
            ))}
          </select>
        </label>
      </div>

      <section aria-label="ตัวชี้วัดจังหวัด" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {metrics.map(({ label, value, unit, icon: Icon }) => (
          <article key={label} className="min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-3.5 dark:border-white/10 dark:bg-[#0d2014] sm:p-4">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="order-2 min-w-0 sm:order-1"><p className="min-h-10 text-xs leading-5 text-emerald-950/55 sm:min-h-0 dark:text-white/55">{label}</p><p className="mt-1 break-words text-xl font-bold tabular-nums sm:mt-2 sm:text-2xl">{value}</p><p className="mt-1 text-[11px] text-emerald-950/45 sm:text-xs dark:text-white/45">{unit}</p></div>
              <span className="order-1 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800 sm:order-2 sm:h-10 sm:w-10 dark:bg-emerald-300/10 dark:text-emerald-200"><Icon aria-hidden="true" className="h-4 w-4 sm:h-5 sm:w-5" /></span>
            </div>
          </article>
        ))}
      </section>

      <RicePanel title="ประวัติผลผลิตข้าวของจังหวัด" description="ผลผลิตจริงและผลพยากรณ์จากข้อมูลในเวอร์ชันที่เลือก">
        <RiceLineChart
          title={`ประวัติผลผลิต ${detail.province.province_th}`}
          xLabel="ปีเริ่มเพาะปลูก"
          yLabel="กก./ไร่"
          series={[
            { id: "actual", label: "ผลผลิตจริง", points: detail.yield.map((row) => ({ x: row.crop_start_year, value: row.actual_yield, label: row.crop_year })) },
            { id: "predicted", label: "ผลผลิตพยากรณ์", dashed: true, points: detail.yield.map((row) => ({ x: row.crop_start_year, value: predictionsByYear.get(row.crop_start_year)?.predicted_yield ?? null, label: row.crop_year })) },
          ]}
        />
      </RicePanel>

      <RicePanel title="ผลจริงเทียบผลพยากรณ์" description="แสดงเฉพาะปีที่มีผลพยากรณ์จากแบบจำลอง">
        <RiceBarChart
          title="ผลจริงเทียบผลพยากรณ์"
          unit="กก./ไร่"
          items={detail.predictions.flatMap((row) => [
            { label: `จริง ${row.crop_start_year}`, value: row.actual_yield, color: "#147d55" },
            { label: `พยากรณ์ ${row.crop_start_year}`, value: row.predicted_yield, color: "#d39b28" },
          ])}
        />
      </RicePanel>

      <RicePanel title="ช่วงประมาณการของแบบจำลอง" description="ผลจากการทดลอง Split Conformal Prediction ซึ่งใช้ค่ากลางคนละชุดกับผลพยากรณ์หลัก">
        <div className="grid gap-3 sm:hidden">
          {detail.intervals.map((row) => (
            <article key={`mobile-${row.crop_start_year}-${row.interval_method}`} className="rounded-2xl border border-emerald-950/10 bg-emerald-50/35 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold text-emerald-950/50 dark:text-white/50">ปีเพาะปลูก</p>
                  <h3 className="mt-0.5 text-lg font-bold">{row.crop_start_year + 543}/{String(row.crop_start_year + 544).slice(-2)}</h3>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${row.covered ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-300/15 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-300/15 dark:text-rose-200"}`}>
                  {row.covered ? "ครอบคลุมค่าจริง" : "ไม่ครอบคลุมค่าจริง"}
                </span>
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="min-w-0 rounded-xl bg-white p-2.5 dark:bg-white/[0.05]"><dt className="text-[10px] leading-4 text-emerald-950/50 dark:text-white/50">ค่ากลาง</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{format(row.predicted_yield)}</dd></div>
                <div className="min-w-0 rounded-xl bg-white p-2.5 dark:bg-white/[0.05]"><dt className="text-[10px] leading-4 text-emerald-950/50 dark:text-white/50">ขอบล่าง 90%</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{format(row.lower_90)}</dd></div>
                <div className="min-w-0 rounded-xl bg-white p-2.5 dark:bg-white/[0.05]"><dt className="text-[10px] leading-4 text-emerald-950/50 dark:text-white/50">ขอบบน 90%</dt><dd className="mt-1 break-words text-sm font-bold tabular-nums">{format(row.upper_90)}</dd></div>
              </dl>
              <p className="mt-2 text-right text-[10px] text-emerald-950/45 dark:text-white/45">หน่วย: กก./ไร่</p>
            </article>
          ))}
        </div>
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="border-b border-emerald-950/10 text-emerald-950/55 dark:border-white/10 dark:text-white/55"><th className="py-3 pr-4">ปีเพาะปลูก</th><th className="px-4 py-3 text-right">ค่ากลางทดลอง</th><th className="px-4 py-3 text-right">ขอบล่าง 90%</th><th className="px-4 py-3 text-right">ขอบบน 90%</th><th className="px-4 py-3 text-right">ครอบคลุมค่าจริง</th></tr></thead>
            <tbody>{detail.intervals.map((row) => (
              <tr key={`${row.crop_start_year}-${row.interval_method}`} className="border-b border-emerald-950/5 dark:border-white/5"><td className="py-3 pr-4 font-semibold">{row.crop_start_year + 543}/{String(row.crop_start_year + 544).slice(-2)}</td><td className="px-4 py-3 text-right">{format(row.predicted_yield)}</td><td className="px-4 py-3 text-right">{format(row.lower_90)}</td><td className="px-4 py-3 text-right">{format(row.upper_90)}</td><td className="px-4 py-3 text-right">{row.covered ? "ใช่" : "ไม่"}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </RicePanel>
    </div>
  );
}
