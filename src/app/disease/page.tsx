import type { Metadata } from "next";

import RiceDiseaseDetector from "@/components/disease/RiceDiseaseDetector";

export const metadata: Metadata = {
  title: "ตรวจโรคข้าวจากภาพ",
  description:
    "อัปโหลดภาพใบข้าวเพื่อรับผลคาดการณ์โรคข้าวจากโมเดล ResNet50 พร้อมระดับความมั่นใจ",
};

export default function DiseasePage() {
  return <RiceDiseaseDetector />;
}
