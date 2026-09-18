import type { Metadata } from "next";

import RiceNewsDashboard from "@/components/news/RiceNewsDashboard";

export const metadata: Metadata = {
  title: "ข่าวสารและความรู้",
  description:
    "ข่าวราคาข้าว การเตือนภัยโรค สภาพอากาศ สิทธิประโยชน์ และความรู้สำหรับคนปลูกข้าว",
};

export default function NewsPage() {
  return <RiceNewsDashboard />;
}
