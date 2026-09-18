import type { Metadata } from "next";
import { Suspense } from "react";

import DisasterOverviewDashboard from "@/components/disaster-overview/DisasterOverviewDashboard";
import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";

export const metadata: Metadata = {
  title: "ภาพรวมภัยพิบัติประเทศไทย",
  description:
    "เปรียบเทียบความถี่ที่พบบันทึกภัยน้ำท่วม ภัยแล้ง และพายุรายเดือน รายปี และรายจังหวัด",
};

export default function DisasterOverviewPage() {
  return (
    <RiceAnalyticsShell
      eyebrow="Thailand Disaster Overview"
      title="ภาพรวมภัยพิบัติ"
      description="น้ำท่วม ภัยแล้ง และพายุในมุมมองเดียว"
      notice={null}
      heroImage="/images/8.png"
      heroImageAlt=""
    >
      <Suspense
        fallback={
          <RiceLoadingState label="กำลังเตรียมภาพรวมภัยพิบัติ…" />
        }
      >
        <DisasterOverviewDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
