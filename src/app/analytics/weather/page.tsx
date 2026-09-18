import type { Metadata } from "next";

import WeatherDashboard from "@/components/weather/WeatherDashboard";

export const metadata: Metadata = {
  title: "สภาพอากาศเพื่อการเกษตร",
  description:
    "ติดตามอุณหภูมิ ความชื้น ฝน ความชื้นในดิน และแนวโน้มสภาพอากาศสำหรับวางแผนดูแลแปลงนา",
};

export default function WeatherAnalyticsPage() {
  return <WeatherDashboard />;
}
