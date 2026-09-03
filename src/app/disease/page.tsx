import type { Metadata } from "next";

import RiceDiseaseDetector from "@/components/disease/RiceDiseaseDetector";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "ตรวจโรคข้าวจากภาพ",
  description:
    "อัปโหลดภาพใบข้าวเพื่อรับผลคาดการณ์โรคข้าวจากโมเดล ResNet50 พร้อมระดับความมั่นใจ",
};

async function getDiseaseUser(): Promise<{
  isAuthenticated: boolean;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return { isAuthenticated: Boolean(user) };
  } catch (error) {
    console.error("Unable to load disease detector user:", error);

    return { isAuthenticated: false };
  }
}

export default async function DiseasePage() {
  const user = await getDiseaseUser();

  return <RiceDiseaseDetector {...user} />;
}
