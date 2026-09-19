"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface LoginState {
  status: "idle" | "error";
  message: string;
  errorCode?: "ADMIN_ACCOUNT";
}

function getStringValue(
  formData: FormData,
  key: string
): string {
  const value = formData.get(key);

  return typeof value === "string"
    ? value.trim()
    : "";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getSafeRedirectPath(
  value: string
): string {
  if (
    value.startsWith("/") &&
    !value.startsWith("//") &&
    value !== "/admin" &&
    !value.startsWith("/admin/")
  ) {
    return value;
  }

  return "/";
}

function getLoginErrorMessage(
  message: string
): string {
  const normalizedMessage =
    message.toLowerCase();

  if (
    normalizedMessage.includes(
      "email not confirmed"
    )
  ) {
    return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  }

  if (
    normalizedMessage.includes(
      "invalid login credentials"
    )
  ) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  }

  if (
    normalizedMessage.includes(
      "rate limit"
    )
  ) {
    return "มีการเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export async function loginAction(
  _previousState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = getStringValue(
    formData,
    "email"
  ).toLowerCase();

  const password = getStringValue(
    formData,
    "password"
  );

  const nextPath = getSafeRedirectPath(
    getStringValue(formData, "next") || "/"
  );

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

  if (!password) {
    return {
      status: "error",
      message: "กรุณากรอกรหัสผ่าน",
    };
  }

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    console.error(
      "Supabase login error:",
      {
        message: error.message,
        status: error.status,
        code: error.code,
      }
    );

    return {
      status: "error",
      message: getLoginErrorMessage(
        error.message
      ),
    };
  }

  if (
    data.user?.app_metadata?.role === "admin" ||
    data.user?.app_metadata?.role === "superadmin"
  ) {
    const { error: signOutError } =
      await supabase.auth.signOut();

    if (signOutError) {
      console.error(
        "Unable to clear an admin session from the user login:",
        {
          message: signOutError.message,
          status: signOutError.status,
          code: signOutError.code,
        }
      );
    }

    return {
      status: "error",
      errorCode: "ADMIN_ACCOUNT",
      message:
        "บัญชีนี้เป็นบัญชีผู้ดูแล กรุณาเข้าสู่ระบบผ่านเว็บไซต์ผู้ดูแล",
    };
  }

  redirect(nextPath);
}
