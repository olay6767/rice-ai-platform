import type { Metadata } from "next";

import FloodDashboard from "@/components/flood/FloodDashboard";

export const metadata: Metadata = {
  title: "แดชบอร์ดสถานการณ์น้ำท่วม",
  description:
    "วิเคราะห์เหตุการณ์น้ำท่วมรายปี รายเดือน และรายจังหวัด พร้อมแผนที่ประเทศไทย",
};

export default function FloodAnalyticsPage() {
  return <FloodDashboard />;
}
