import type { Metadata } from "next";

import InfographicNewsBrowser from "@/components/infographic/InfographicNewsBrowser";

export const metadata: Metadata = {
  title: "ข่าวสาร",
  description: "ข่าวสาร ความรู้เรื่องข้าว พันธุ์ข้าว โรคใบข้าว การปลูกดูแล และเกษตรอัจฉริยะ",
};

export default function InfographicPage() {
  return <InfographicNewsBrowser />;
}
