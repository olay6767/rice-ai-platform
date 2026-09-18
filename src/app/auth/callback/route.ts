import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

function getSafeNextPath(value: string | null): string {
  if (
    value &&
    value.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/login?confirmed=true";
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);

  const code =
    requestUrl.searchParams.get("code");

  const nextPath = getSafeNextPath(
    requestUrl.searchParams.get("next")
  );

  if (!code) {
    return NextResponse.redirect(
      new URL(
        "/login?error=confirmation_failed",
        requestUrl.origin
      )
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.exchangeCodeForSession(
      code
    );

  if (error) {
    console.error(
      "Supabase auth callback error:",
      {
        message: error.message,
        status: error.status,
        code: error.code,
      }
    );

    return NextResponse.redirect(
      new URL(
        "/login?error=confirmation_failed",
        requestUrl.origin
      )
    );
  }

  /*
   * หลังแลก code สำเร็จ Supabase จะสร้าง session
   * ให้อัตโนมัติ
   *
   * สำหรับโปรเจกต์นี้ เราให้ผู้ใช้เข้าสู่ระบบเอง
   * หลังยืนยันอีเมล จึงออกจาก session ที่สร้างขึ้นก่อน
   */
  const { error: signOutError } =
    await supabase.auth.signOut();

  if (signOutError) {
    console.error(
      "Supabase callback sign-out error:",
      {
        message: signOutError.message,
        status: signOutError.status,
        code: signOutError.code,
      }
    );
  }

  return NextResponse.redirect(
    new URL(nextPath, requestUrl.origin)
  );
}