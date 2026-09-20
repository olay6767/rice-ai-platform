import type { Metadata } from "next";
import { Suspense } from "react";

import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";
import StormDashboard from "@/components/storm/StormDashboard";

export const metadata: Metadata = {
  title: "แดชบอร์ดวิเคราะห์บันทึกพายุประเทศไทย",
  description:
    "สำรวจความถี่ที่พบบันทึกพายุรายเดือน รายปี และรายจังหวัด พร้อมข้อมูลผลกระทบตามที่มีในชุดข้อมูล",
};

export default function StormAnalyticsPage() {
  return (
    <RiceAnalyticsShell
      eyebrow="Storm Intelligence · Thailand"
      title="แดชบอร์ดวิเคราะห์บันทึกพายุ"
      description="ดูแนวโน้มบันทึกพายุรายเดือนและรายปี พร้อมสำรวจข้อมูลแต่ละจังหวัดบนแผนที่"
      notice={null}
      heroImage="/images/61.png"
      heroImageAlt="นาข้าวได้รับความเสียหายจากพายุและลมแรง"
      heroImageMode="background"
      heroImagePosition="center 48%"
    >
      <Suspense
        fallback={
          <RiceLoadingState label="กำลังเตรียมแดชบอร์ดพายุ…" />
        }
      >
        <StormDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
