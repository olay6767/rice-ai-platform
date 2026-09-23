import type { Metadata } from "next";

import RiceChatbot from "@/components/chatbot/RiceChatbot";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Nong Serm ผู้ช่วยเกษตรกร",
  description:
    "ปรึกษาการทำเกษตรข้าวครบวงจร ตั้งแต่เตรียมดินจนถึงเก็บเกี่ยว ต้นทุน และการขายกับ Nong Serm",
};

async function getChatbotUser(): Promise<{
  isAuthenticated: boolean;
  displayName?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isAuthenticated: false };
    }

    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    return {
      isAuthenticated: true,
      displayName:
        fullName || user.email?.split("@")[0] || undefined,
    };
  } catch (error) {
    console.error("Unable to load chatbot user:", error);

    return { isAuthenticated: false };
  }
}

export default async function ChatbotPage() {
  const user = await getChatbotUser();

  return <RiceChatbot {...user} />;
}
