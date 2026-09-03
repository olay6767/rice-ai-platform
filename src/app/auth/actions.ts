"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error("Supabase sign-out error:", {
      message: error.message,
      status: error.status,
      code: error.code,
    });

    throw new Error(
      "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง"
    );
  }

  redirect("/");
}
