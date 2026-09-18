import type { Metadata } from "next";

import RiceAnalyticsShell from "@/components/rice-yield/RiceAnalyticsShell";
import RiceResearchDashboard from "@/components/rice-yield/RiceResearchDashboard";

export const metadata: Metadata = { title: "งานวิจัยและแบบจำลองผลผลิตข้าว" };

export default function RiceResearchPage() {
  return (
    <RiceAnalyticsShell title="งานวิจัยและแบบจำลอง" description="ผลการประเมิน Extra Trees Regressor การเปรียบเทียบโมเดล Ablation Study และ SHAP Explainability">
      <RiceResearchDashboard />
    </RiceAnalyticsShell>
  );
}

