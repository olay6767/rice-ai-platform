import type { Metadata } from "next";
import { Suspense } from "react";

import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";
import RiceYieldDashboard from "@/components/rice-yield/RiceYieldDashboard";

export const metadata: Metadata = {
  title: "แดชบอร์ดวิเคราะห์ผลผลิตข้าว 77 จังหวัด",
  description:
    "แดชบอร์ดผลผลิตข้าวจริง ผลพยากรณ์ ภูมิอากาศ NDVI และความชื้นในดินระดับจังหวัด",
};

export default function DashboardPage() {
  return (
    <RiceAnalyticsShell
      title="วิเคราะห์ผลผลิตข้าวไทย"
      description="สำรวจผลผลิตรายปี ภูมิอากาศรายเดือน และผลพยากรณ์จากแบบจำลองในระดับจังหวัด พร้อมแผนที่โต้ตอบทั่วประเทศไทย"
    >
      <Suspense fallback={<RiceLoadingState label="กำลังเตรียมแดชบอร์ด…" />}>
        <RiceYieldDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
