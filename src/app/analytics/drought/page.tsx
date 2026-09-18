import type { Metadata } from "next";
import { Suspense } from "react";

import DroughtDashboard from "@/components/drought/DroughtDashboard";
import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";

export const metadata: Metadata = {
  title: "แดชบอร์ดบันทึกภัยแล้งประเทศไทย",
  description:
    "สำรวจความถี่ที่พบบันทึกภัยแล้งรายปี รายเดือน และรายจังหวัด พร้อมแผนที่ประเทศไทยครบทุกจังหวัด",
};

export default function DroughtAnalyticsPage() {
  return (
    <RiceAnalyticsShell
      eyebrow="Drought Intelligence · Thailand"
      title="แดชบอร์ดบันทึกภัยแล้ง"
      description="ดูแนวโน้มบันทึกภัยแล้งรายเดือนและรายปี พร้อมสำรวจข้อมูลแต่ละจังหวัดบนแผนที่"
      notice={null}
      heroImage="/images/drought-dashboard-hero.png"
      heroImageAlt="ทุ่งนาแห้งแตกระแหงในชนบทไทยช่วงฤดูแล้ง"
      heroImageMode="background"
    >
      <Suspense fallback={<RiceLoadingState label="กำลังเตรียมแดชบอร์ดภัยแล้ง…" />}>
        <DroughtDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
