import type { Metadata } from "next";
import { Suspense } from "react";

import RiceAnalyticsShell, { RiceLoadingState } from "@/components/rice-yield/RiceAnalyticsShell";
import RiceMonthlyEnvironmentPageContent from "@/components/rice-yield/RiceMonthlyEnvironment";

export const metadata: Metadata = { title: "สิ่งแวดล้อมรายเดือน" };

export default function RiceMonthlyPage() {
  return (
    <RiceAnalyticsShell title="สิ่งแวดล้อมรายเดือน" description="วิเคราะห์ฝน อุณหภูมิเฉลี่ย ความเขียวของพืชจากดาวเทียม และความชื้นในดินรายจังหวัด">
      <Suspense fallback={<RiceLoadingState />}>
        <RiceMonthlyEnvironmentPageContent />
      </Suspense>
    </RiceAnalyticsShell>
  );
}

