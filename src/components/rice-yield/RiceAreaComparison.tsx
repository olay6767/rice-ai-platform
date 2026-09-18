"use client";

import { ChevronDown, GitCompareArrows, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { readJsonResponse } from "@/lib/http/json";
import type { RiceComparisonMetric, RiceProvince, RiceRegion, RiceDashboardVersion } from "@/lib/rice-yield/types";
import { RiceBarChart, RiceLineChart } from "./RiceCharts";
import { RiceErrorState, RiceLoadingState, RicePanel } from "./RiceAnalyticsShell";

const REGIONS: Array<{ value: RiceRegion; label: string }> = [
  { value: "North", label: "ภาคเหนือ" },
  { value: "Northeast", label: "ภาคตะวันออกเฉียงเหนือ" },
  { value: "Central", label: "ภาคกลาง" },
  { value: "South", label: "ภาคใต้" },
];

const METRICS: Array<{ value: RiceComparisonMetric; label: string; unit: string; yearly: boolean }> = [
  { value: "actual_yield", label: "ผลผลิตจริง", unit: "กก./ไร่", yearly: true },
  { value: "predicted_yield", label: "ผลผลิตพยากรณ์", unit: "กก./ไร่", yearly: true },
  { value: "rainfall", label: "ปริมาณฝน", unit: "มม.", yearly: false },
  { value: "temperature", label: "อุณหภูมิเฉลี่ย", unit: "°C", yearly: false },
  { value: "ndvi", label: "NDVI", unit: "ดัชนี", yearly: false },
  { value: "soil_moisture", label: "ความชื้นในดิน", unit: "ค่าชุดข้อมูล", yearly: false },
];

interface ComparisonResponse {
  version: RiceDashboardVersion;
  filters: { type: "province" | "region"; ids: string[]; metric: RiceComparisonMetric; year: number };
  aggregation: "mean_across_provinces";
  series: Array<{ id: string; label: string; points: Array<{ period: number; value: number | null }> }>;
}

interface Envelope<T> { data?: T; error?: { message?: string } }

export default function RiceAreaComparison() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const mode = search.get("type") === "region" ? "region" : "province";
  const metricValue = search.get("metric");
  const metric = (METRICS.some((item) => item.value === metricValue) ? metricValue : "actual_yield") as RiceComparisonMetric;
  const yearValue = Number(search.get("year"));
  const versionKey = search.get("version") ?? "";
  const defaultIds = mode === "region" ? REGIONS.map((item) => item.value) : ["1", "2"];
  const ids = (search.get("ids") ?? defaultIds.join(",")).split(",").filter(Boolean);
  const [provinces, setProvinces] = useState<RiceProvince[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [provinceSearch, setProvinceSearch] = useState("");
  const metricDefinition = METRICS.find((item) => item.value === metric) ?? METRICS[0];
  const years = (metricDefinition.yearly ? comparison?.version.cropYears : comparison?.version.environmentYears) ?? [];
  const year = Number.isInteger(yearValue) && yearValue >= 1900 && yearValue <= 2200 ? yearValue : years.at(-1) ?? 2024;

  const update = useCallback((updates: Record<string, string>) => {
    const query = new URLSearchParams(search.toString());
    for (const [key, value] of Object.entries(updates)) query.set(key, value);
    router.replace(`${pathname}?${query}`, { scroll: false });
  }, [pathname, router, search]);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = new URLSearchParams({ type: mode, ids: ids.join(","), metric, year: String(year) });
        if (versionKey) query.set("version", versionKey);
        const [provinceResponse, comparisonResponse] = await Promise.all([
          fetch("/api/v1/provinces", { signal: controller.signal }),
          fetch(`/api/v1/compare?${query}`, { signal: controller.signal, cache: "no-store" }),
        ]);
        const provincePayload = await readJsonResponse<Envelope<RiceProvince[]>>(provinceResponse);
        const comparisonPayload = await readJsonResponse<Envelope<ComparisonResponse>>(comparisonResponse);
        if (!provinceResponse.ok || !provincePayload.data) throw new Error(provincePayload.error?.message ?? "โหลดจังหวัดไม่สำเร็จ");
        if (!comparisonResponse.ok || !comparisonPayload.data) throw new Error(comparisonPayload.error?.message ?? "เปรียบเทียบข้อมูลไม่สำเร็จ");
        setProvinces(provincePayload.data);
        setComparison(comparisonPayload.data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  // ids is intentionally represented by its stable URL string.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, metric, search.get("ids"), versionKey, year]);

  const groupedProvinces = useMemo(() => {
    const query = provinceSearch.trim().toLocaleLowerCase("th");

    return REGIONS.map((region) => ({
      ...region,
      provinces: provinces.filter(
        (province) =>
          province.region === region.value &&
          (!query ||
            province.province_th.toLocaleLowerCase("th").includes(query) ||
            province.province_en.toLocaleLowerCase("en").includes(query))
      ),
    })).filter((group) => group.provinces.length > 0);
  }, [provinceSearch, provinces]);

  function toggleId(id: string) {
    const selected = ids.includes(id);
    const maximum = mode === "province" ? 5 : 4;
    if (!selected && ids.length >= maximum) return;
    const next = selected ? ids.filter((item) => item !== id) : [...ids, id];
    update({ ids: next.join(",") });
  }

  return (
    <div className="space-y-7">
      <RicePanel title="ตั้งค่าการเปรียบเทียบ" description="เลือก 2–5 จังหวัด หรือเปรียบเทียบ 4 ภูมิภาคด้วยค่าเฉลี่ยข้ามจังหวัด">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="grid gap-1.5 text-sm font-semibold">โหมด
            <select value={mode} onChange={(event) => update({ type: event.target.value, ids: event.target.value === "region" ? REGIONS.map((item) => item.value).join(",") : "1,2" })} className="min-h-12 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 dark:border-white/15 dark:bg-white/5"><option value="province">เปรียบเทียบจังหวัด</option><option value="region">เปรียบเทียบภูมิภาค</option></select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">ตัวชี้วัด
            <select value={metric} onChange={(event) => update({ metric: event.target.value })} className="min-h-12 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 dark:border-white/15 dark:bg-white/5">{METRICS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </label>
          <label className="grid gap-1.5 text-sm font-semibold">{metricDefinition.yearly ? "ปีเริ่มเพาะปลูก" : "ปีปฏิทิน"}
            <select value={year} onChange={(event) => update({ year: event.target.value })} className="min-h-12 rounded-xl border border-emerald-950/15 bg-[#fbfcf9] px-3 dark:border-white/15 dark:bg-white/5">{years.length ? [...years].reverse().map((item) => <option key={item} value={item}>{item + 543}</option>) : <option value={year}>ยังไม่มีข้อมูล</option>}</select>
          </label>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3"><p className="text-sm font-semibold">พื้นที่ที่เลือก</p><span className="text-xs text-emerald-950/50 dark:text-white/50">เลือกแล้ว {ids.length} รายการ</span></div>
          {mode === "region" ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{REGIONS.map((region) => <AreaToggle key={region.value} label={region.label} selected={ids.includes(region.value)} onClick={() => toggleId(region.value)} />)}</div>
          ) : (
            <details className="group overflow-hidden rounded-2xl border border-emerald-950/10 bg-white/70 dark:border-white/10 dark:bg-white/[0.04]">
              <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-emerald-950 dark:text-white">
                    เลือกจังหวัด
                  </p>
                  <p className="mt-0.5 text-xs text-emerald-950/50 dark:text-white/50">
                    กดเพื่อเปิดรายการและค้นหาจังหวัด
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-300/10 dark:text-emerald-200">
                  {ids.length}/5
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-emerald-950/50 transition-transform group-open:rotate-180 dark:text-white/50" />
              </summary>

              <div className="border-t border-emerald-950/10 p-3 sm:p-4 dark:border-white/10">
                <label className="relative block">
                  <span className="sr-only">ค้นหาจังหวัด</span>
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-950/40 dark:text-white/40" />
                  <input
                    type="search"
                    value={provinceSearch}
                    onChange={(event) => setProvinceSearch(event.target.value)}
                    placeholder="ค้นหาชื่อจังหวัด..."
                    className="h-11 w-full rounded-xl border border-emerald-950/10 bg-[#fbfcf9] pl-9 pr-3 text-sm outline-none transition placeholder:text-emerald-950/35 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15 dark:border-white/10 dark:bg-[#0d2014] dark:text-white dark:placeholder:text-white/35"
                  />
                </label>

                <div className="mt-3 max-h-80 space-y-4 overflow-y-auto pr-1 [scrollbar-width:thin]">
                  {groupedProvinces.length > 0 ? (
                    groupedProvinces.map((group) => (
                      <div key={group.value}>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                          {group.label}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                          {group.provinces.map((province) => (
                            <AreaToggle
                              key={province.id}
                              label={province.province_th}
                              selected={ids.includes(String(province.id))}
                              disabled={!ids.includes(String(province.id)) && ids.length >= 5}
                              onClick={() => toggleId(String(province.id))}
                            />
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="py-8 text-center text-sm text-emerald-950/50 dark:text-white/50">
                      ไม่พบจังหวัดที่ค้นหา
                    </p>
                  )}
                </div>
              </div>
            </details>
          )}
          {ids.length < 2 ? <p role="alert" className="mt-3 text-sm text-amber-700 dark:text-amber-200">กรุณาเลือกอย่างน้อย 2 พื้นที่เพื่อเปรียบเทียบ</p> : null}
        </div>
      </RicePanel>

      {loading ? <RiceLoadingState label="กำลังเปรียบเทียบพื้นที่…" /> : null}
      {error ? <RiceErrorState message={error} /> : null}
      {!loading && !error && comparison ? (
        <RicePanel
          title={`${metricDefinition.label} · ${year + 543}`}
          description={mode === "region" ? "ค่าภูมิภาคใช้ค่าเฉลี่ยข้ามจังหวัด ไม่ใช่ผลรวมของทุกจังหวัด" : "แสดงค่าตามจังหวัดที่เลือก"}
          action={<span className="inline-flex items-center gap-2 text-xs text-emerald-950/55 dark:text-white/55"><GitCompareArrows className="h-4 w-4" /> {comparison.series.length} พื้นที่</span>}
        >
          {metricDefinition.yearly ? (
            <RiceBarChart title={metricDefinition.label} unit={metricDefinition.unit} items={comparison.series.map((series, index) => ({ label: series.label, value: series.points[0]?.value ?? null, color: ["#147d55", "#d39b28", "#3b82a0", "#9a5fd0", "#d75b5b"][index % 5] }))} />
          ) : (
            <RiceLineChart title={metricDefinition.label} xLabel="เดือน" yLabel={metricDefinition.unit} digits={["ndvi", "soil_moisture"].includes(metric) ? 3 : 1} series={comparison.series.map((series) => ({ id: series.id, label: series.label, points: series.points.map((point) => ({ x: point.period, value: point.value })) }))} />
          )}
        </RicePanel>
      ) : null}
    </div>
  );
}

function AreaToggle({ label, selected, disabled = false, onClick }: { label: string; selected: boolean; disabled?: boolean; onClick: () => void }) {
  return (
    <label
      className={`inline-flex min-h-10 w-full cursor-pointer items-center gap-2.5 rounded-xl border px-3 text-sm transition focus-within:ring-2 focus-within:ring-emerald-600/35 ${
        selected
          ? "border-emerald-700 bg-emerald-100 font-semibold text-emerald-900 dark:border-emerald-300 dark:bg-emerald-300/15 dark:text-emerald-100"
          : "border-emerald-950/10 bg-white hover:border-emerald-700/30 hover:bg-emerald-50/60 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/8"
      } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
    >
      <input
        type="checkbox"
        checked={selected}
        disabled={disabled}
        onChange={onClick}
        className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-700 disabled:cursor-not-allowed dark:accent-emerald-300"
      />
      <span>{label}</span>
    </label>
  );
}
