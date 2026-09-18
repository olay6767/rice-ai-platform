import type { Metadata } from "next";
import { Suspense } from "react";

import RiceAnalyticsShell, { RiceLoadingState } from "@/components/rice-yield/RiceAnalyticsShell";
import RiceAreaComparison from "@/components/rice-yield/RiceAreaComparison";

export const metadata: Metadata = { title: "เปรียบเทียบพื้นที่ปลูกข้าว" };

export default function RiceComparePage() {
  return (
    <RiceAnalyticsShell title="เปรียบเทียบพื้นที่" description="เปรียบเทียบผลผลิตรายปีหรือสภาพแวดล้อมรายเดือนระหว่างจังหวัดและภูมิภาค">
      <Suspense fallback={<RiceLoadingState />}><RiceAreaComparison /></Suspense>
    </RiceAnalyticsShell>
  );
}

