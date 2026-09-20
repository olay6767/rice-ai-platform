import type { Metadata } from "next";
import { Suspense } from "react";

import RicePriceDashboard from "@/components/rice-price/RicePriceDashboard";
import RiceAnalyticsShell, {
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";

export const metadata: Metadata = {
  title: "ราคาข้าวไทย | Rice AI Platform",
  description:
    "แดชบอร์ดราคาข้าวไทยรายเดือน พ.ศ. 2558–2569 พร้อมราคาข้าวจริงและผลพยากรณ์ปี 2569",
};

export default function RicePricePage() {
  return (
    <RiceAnalyticsShell
      context="price"
      eyebrow="Rice Price Thailand"
      title="ราคาข้าวไทย"
      description="ติดตามแนวโน้มราคาข้าว 5 ชนิด ทั้งข้อมูลจริงและพยากรณ์รายเดือน"
      heroImage="/images/59.jpg"
      heroImageAlt="เกษตรกรกำลังเก็บเกี่ยวและรวบรวมผลผลิตข้าว"
      heroImageMode="background"
    >
      <Suspense fallback={<RiceLoadingState label="กำลังเตรียมแดชบอร์ดราคาข้าว…" />}>
        <RicePriceDashboard />
      </Suspense>
    </RiceAnalyticsShell>
  );
}
