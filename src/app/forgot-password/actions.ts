"use server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";

export interface ForgotPasswordState {
  status: "idle" | "success" | "error";
  message: string;
}

function getOrigin(
  requestOrigin: string | null
): string {
  const configuredSiteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.trim();

  const origin =
    requestOrigin ||
    configuredSiteUrl ||
    "http://localhost:3000";

  return origin.replace(/\/+$/, "");
}

function getEmail(formData: FormData): string {
  const value = formData.get("email");

  return typeof value === "string"
    ? value.trim().toLowerCase()
    : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getResetErrorMessage(
  errorMessage: string
): string {
  const normalized = errorMessage.toLowerCase();

  if (
    normalized.includes("rate limit") ||
    normalized.includes("too many requests")
  ) {
    return "มีการขอลิงก์บ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (
    normalized.includes("invalid api key") ||
    normalized.includes("api key")
  ) {
    return "ระบบยืนยันตัวตนยังไม่พร้อมใช้งาน กรุณาติดต่อผู้ดูแลระบบ";
  }

  return "ส่งลิงก์ตั้งรหัสผ่านไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export async function forgotPasswordAction(
  _previousState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = getEmail(formData);

  if (!email) {
    return {
      status: "error",
      message: "กรุณากรอกอีเมล",
    };
  }

  if (!isValidEmail(email)) {
    return {
      status: "error",
      message: "รูปแบบอีเมลไม่ถูกต้อง",
    };
  }

  const headersList = await headers();
  const origin = getOrigin(
    headersList.get("origin")
  );
  const callbackUrl = new URL(
    "/auth/callback",
    origin
  );

  callbackUrl.searchParams.set(
    "next",
    "/reset-password"
  );

  const supabase = await createClient();
  const { error } =
    await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: callbackUrl.toString(),
      }
    );

  if (error) {
    console.error(
      "Supabase password reset request error:",
      {
        message: error.message,
        status: error.status,
        code: error.code,
      }
    );

    return {
      status: "error",
      message: getResetErrorMessage(
        error.message
      ),
    };
  }

  return {
    status: "success",
    message:
      "หากอีเมลนี้มีบัญชีอยู่ เราได้ส่งลิงก์ตั้งรหัสผ่านใหม่ให้แล้ว กรุณาตรวจสอบกล่องข้อความและโฟลเดอร์สแปม",
  };
}
