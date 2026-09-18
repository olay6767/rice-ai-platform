"use client";

import { AlertTriangle, Binary, FlaskConical, Gauge, Sigma } from "lucide-react";
import { useEffect, useState } from "react";

import { readJsonResponse } from "@/lib/http/json";
import type { RiceModelMetadata, RiceShapFeature, RiceShapGroup, RiceYieldPrediction } from "@/lib/rice-yield/types";
import { RiceBarChart, RiceHorizontalBars, RiceScatterPlot } from "./RiceCharts";
import { RiceErrorState, RiceLoadingState, RicePanel } from "./RiceAnalyticsShell";

interface PerformanceData {
  metadata: RiceModelMetadata | null;
  modelComparison: Array<{ model: string; r2: number }>;
  predictions: Array<RiceYieldPrediction & { province_th: string }>;
}

interface ShapData {
  global: RiceShapFeature[];
  groups: RiceShapGroup[];
}

interface Baseline { model: string; mae: number; r2: number }
interface Ablation { group: string; r2: number }
interface Envelope<T> { data?: T; error?: { message?: string } }

export default function RiceResearchDashboard() {
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [shap, setShap] = useState<ShapData | null>(null);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [ablation, setAblation] = useState<Ablation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const responses = await Promise.all([
          fetch("/api/v1/research/model-performance", { signal: controller.signal }),
          fetch("/api/v1/research/shap-global", { signal: controller.signal }),
          fetch("/api/v1/research/ablation", { signal: controller.signal }),
          fetch("/api/v1/research/baselines", { signal: controller.signal }),
        ]);
        const payloads = await Promise.all(responses.map((response) => readJsonResponse(response))) as [
          Envelope<PerformanceData>, Envelope<ShapData>, Envelope<Ablation[]>, Envelope<Baseline[]>
        ];
        const failedIndex = responses.findIndex((response) => !response.ok);
        if (failedIndex >= 0) throw new Error(payloads[failedIndex].error?.message ?? "ไม่สามารถโหลดข้อมูลงานวิจัยได้");
        if (!payloads[0].data || !payloads[1].data || !payloads[2].data || !payloads[3].data) throw new Error("ข้อมูลวิจัยไม่ครบถ้วน");
        setPerformance(payloads[0].data);
        setShap(payloads[1].data);
        setAblation(payloads[2].data);
        setBaselines(payloads[3].data);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดข้อมูลได้");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  if (loading) return <RiceLoadingState label="กำลังโหลดผลการวิจัยและโมเดล…" />;
  if (error) return <RiceErrorState message={error} />;
  if (!performance || !shap) return null;

  const metrics = performance.metadata?.test_metrics ?? {};
  return (
    <div className="space-y-7">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "โมเดลสุดท้าย", value: performance.metadata?.model_name ?? "Extra Trees Regressor", detail: performance.metadata?.model_version ?? "Environmental v1.0", icon: Binary },
          { label: "MAE", value: `${Number(metrics.MAE ?? 54.08).toFixed(2)} กก./ไร่`, detail: "ความคลาดเคลื่อนสัมบูรณ์เฉลี่ย", icon: Gauge },
          { label: "RMSE", value: `${Number(metrics.RMSE ?? 68.93).toFixed(2)} กก./ไร่`, detail: "ให้น้ำหนักความผิดพลาดขนาดใหญ่", icon: Sigma },
          { label: "R²", value: Number(metrics.R2 ?? 0.75).toFixed(3), detail: "ไม่ใช่ Accuracy 75%", icon: FlaskConical },
        ].map(({ label, value, detail, icon: Icon }) => (
          <article key={label} className="rounded-2xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-[#0d2014]">
            <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
            <p className="mt-4 text-xs text-emerald-950/50 dark:text-white/50">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
            <p className="mt-1 text-xs text-emerald-950/50 dark:text-white/50">{detail}</p>
          </article>
        ))}
      </section>

      <div role="note" className="flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <p>R² = 0.750 ไม่ได้หมายถึงความแม่นยำ 75% และผลพยากรณ์ช่วง 2023–2024 เป็นผลทดสอบย้อนหลัง ไม่ใช่การพยากรณ์อนาคตแบบสด</p>
      </div>

      <RicePanel title="เปรียบเทียบโมเดล" description="ผล Rolling Temporal Cross-Validation">
        <RiceHorizontalBars title="ค่า R² ของโมเดล" unit="" digits={3} items={performance.modelComparison.map((item) => ({ label: item.model, value: item.r2 }))} />
      </RicePanel>

      <div className="grid gap-7 xl:grid-cols-2">
        <RicePanel title="ผลจริงเทียบผลพยากรณ์" description="จุดใกล้เส้น y = x แสดงว่าค่าพยากรณ์ใกล้ค่าจริง">
          <RiceScatterPlot title="ผลจริงเทียบผลพยากรณ์ 2023–2024" points={performance.predictions.map((row) => ({ actual: row.actual_yield, predicted: row.predicted_yield, label: `${row.province_th} ${row.crop_start_year}` }))} />
        </RicePanel>
        <RicePanel title="Ablation Study" description="เปรียบเทียบชุดตัวแปรด้วย Mean R² จาก Rolling CV">
          <RiceBarChart title="Ablation Study" unit="R²" digits={3} items={ablation.map((item, index) => ({ label: item.group, value: item.r2, color: ["#3b82a0", "#6f9c35", "#147d55"][index] }))} />
        </RicePanel>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <RicePanel title="กลุ่มตัวแปรที่มีอิทธิพลต่อโมเดล" description="สัดส่วน Mean Absolute SHAP ตามกลุ่มตัวแปร">
          <RiceHorizontalBars title="SHAP Feature Groups" items={shap.groups.map((item) => ({ label: item.feature_group, value: item.importance_percent }))} />
        </RicePanel>
        <RicePanel title="Top 15 Features" description="จัดอันดับจาก Mean Absolute SHAP">
          <RiceHorizontalBars title="Top 15 SHAP Features" items={shap.global.slice(0, 15).map((item) => ({ label: item.feature, value: item.importance_percent }))} />
        </RicePanel>
      </div>

      <div role="note" className="rounded-2xl border border-sky-300 bg-sky-50 p-4 text-sm leading-6 text-sky-950 dark:border-sky-300/20 dark:bg-sky-300/10 dark:text-sky-100">
        SHAP อธิบายว่าตัวแปรมีอิทธิพลต่อค่าพยากรณ์ของโมเดลอย่างไร แต่ไม่ควรตีความว่าเป็นความสัมพันธ์เชิงเหตุและผลโดยตรง
      </div>

      <RicePanel title="เปรียบเทียบกับ Baseline" description="Historical Baselines ใช้ข้อมูลผลผลิตในอดีต จึงเป็น Benchmark คนละลักษณะกับ Environmental-only ML Model">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-sm">
            <thead><tr className="border-b border-emerald-950/10 text-left text-emerald-950/55 dark:border-white/10 dark:text-white/55"><th className="py-3 pr-4">วิธี</th><th className="px-4 py-3 text-right">MAE (กก./ไร่)</th><th className="px-4 py-3 text-right">R²</th></tr></thead>
            <tbody>{baselines.map((row) => <tr key={row.model} className="border-b border-emerald-950/5 dark:border-white/5"><td className="py-3 pr-4 font-medium">{row.model}</td><td className="px-4 py-3 text-right tabular-nums">{row.mae.toFixed(2)}</td><td className="px-4 py-3 text-right tabular-nums">{row.r2.toFixed(3)}</td></tr>)}</tbody>
          </table>
        </div>
      </RicePanel>
    </div>
  );
}
