import type { Metadata } from "next";
import { Suspense } from "react";

import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";
import RiceYieldDashboard from "@/components/rice-yield/RiceYieldDashboard";

export const metadata: Metadata = {
  title: "แดชบอร์ดวิเคราะห์ผลผลิตข้าว 77 จังหวัด",
  description:
    "แดชบอร์ดผลผลิตข้าวรายปี พร้อมค่าพยากรณ์และแผนที่ผลผลิต 77 จังหวัด",
};

export default function DashboardPage() {
  return (
    <RiceAnalyticsShell
      title="วิเคราะห์ผลผลิตข้าวไทย"
      description="ติดตามผลผลิตข้าวรายปีและแนวโน้มรายจังหวัด"
      notice="ผลผลิตเป็นข้อมูลรายปี ส่วนภูมิอากาศ NDVI และความชื้นในดินเป็นข้อมูลรายเดือน"
      heroImage="/images/58.jpg"
      heroImageAlt="รถเกี่ยวข้าวกำลังเก็บเกี่ยวผลผลิตในนาข้าว"
      heroImageMode="background"
    >
      <Suspense fallback={<RiceLoadingState label="กำลังเตรียมแดชบอร์ด…" />}>
        <RiceYieldDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
