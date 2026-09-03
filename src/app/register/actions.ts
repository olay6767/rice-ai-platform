"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export interface RegisterState {
  status: "idle" | "success" | "error";
  message: string;
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

function getRegisterErrorMessage(
  errorMessage: string
): string {
  const normalizedMessage =
    errorMessage.toLowerCase();

  if (
    normalizedMessage.includes(
      "user already registered"
    )
  ) {
    return "อีเมลนี้ถูกใช้งานแล้ว กรุณาเข้าสู่ระบบหรือใช้อีเมลอื่น";
  }

  if (
    normalizedMessage.includes(
      "email address is invalid"
    ) ||
    (normalizedMessage.includes("email") &&
      normalizedMessage.includes("invalid"))
  ) {
    return "รูปแบบอีเมลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }

  if (
    normalizedMessage.includes(
      "password should be"
    ) ||
    normalizedMessage.includes(
      "weak password"
    )
  ) {
    return "รหัสผ่านยังไม่ผ่านเงื่อนไขความปลอดภัย";
  }

  if (
    normalizedMessage.includes(
      "email rate limit"
    ) ||
    normalizedMessage.includes(
      "rate limit"
    )
  ) {
    return "มีการสมัครหรือส่งอีเมลบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (
    normalizedMessage.includes(
      "signup is disabled"
    )
  ) {
    return "ระบบสมัครสมาชิกถูกปิดใช้งานชั่วคราว";
  }

  if (
    normalizedMessage.includes(
      "invalid api key"
    )
  ) {
    return "การตั้งค่า Supabase API key ไม่ถูกต้อง";
  }

  return "สมัครสมาชิกไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่";
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

export async function registerAction(
  _previousState: RegisterState,
  formData: FormData
): Promise<RegisterState> {
  const fullName = getStringValue(
    formData,
    "fullName"
  );

  const email = getStringValue(
    formData,
    "email"
  ).toLowerCase();

  const passwordValue =
    formData.get("password");

  const confirmPasswordValue =
    formData.get("confirmPassword");

  const password =
    typeof passwordValue === "string"
      ? passwordValue
      : "";

  const confirmPassword =
    typeof confirmPasswordValue === "string"
      ? confirmPasswordValue
      : "";

  const acceptedTerms =
    formData.get("acceptedTerms") === "on";

  if (!fullName) {
    return {
      status: "error",
      message: "กรุณากรอกชื่อและนามสกุล",
    };
  }

  if (fullName.length < 2) {
    return {
      status: "error",
      message:
        "ชื่อและนามสกุลต้องมีอย่างน้อย 2 ตัวอักษร",
    };
  }

  if (fullName.length > 100) {
    return {
      status: "error",
      message:
        "ชื่อและนามสกุลต้องไม่เกิน 100 ตัวอักษร",
    };
  }

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

  if (password.length < 8) {
    return {
      status: "error",
      message:
        "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
    };
  }

  if (password.length > 72) {
    return {
      status: "error",
      message:
        "รหัสผ่านต้องไม่เกิน 72 ตัวอักษร",
    };
  }

  if (!confirmPassword) {
    return {
      status: "error",
      message: "กรุณายืนยันรหัสผ่าน",
    };
  }

  if (password !== confirmPassword) {
    return {
      status: "error",
      message:
        "รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน",
    };
  }

  if (!acceptedTerms) {
    return {
      status: "error",
      message:
        "กรุณายอมรับข้อกำหนดการใช้งานและนโยบายความเป็นส่วนตัว",
    };
  }

  const headersList = await headers();

  const origin = getOrigin(
    headersList.get("origin")
  );

  /*
   * ไม่จำเป็นต้องส่ง next ซ้อนใน query
   * callback จะพาไป /login?confirmed=true เอง
   */
  const callbackUrl =
    `${origin}/auth/callback`;

  const supabase = await createClient();

  const { data, error } =
    await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: callbackUrl,

        data: {
          full_name: fullName,

          /*
           * ผู้สมัครทั่วไปต้องเริ่มต้นเป็น user
           * ห้ามรับ role จากข้อมูลในฟอร์ม
           */
          role: "user",
        },
      },
    });

  if (error) {
    console.error(
      "Supabase registration error:",
      {
        message: error.message,
        status: error.status,
        code: error.code,
      }
    );

    return {
      status: "error",
      message: getRegisterErrorMessage(
        error.message
      ),
    };
  }

  if (!data.user) {
    return {
      status: "error",
      message:
        "ไม่สามารถสร้างบัญชีได้ กรุณาลองใหม่อีกครั้ง",
    };
  }

  /*
   * หากปิด Confirm email ใน Supabase
   * ระบบจะสร้าง session ให้ทันที
   */
  if (data.session) {
    redirect("/");
  }

  /*
   * หากเปิด Confirm email
   * ผู้ใช้ต้องกดลิงก์ยืนยันในอีเมลก่อน
   */
  return {
    status: "success",
    message:
      "สมัครสมาชิกสำเร็จ กรุณาตรวจสอบอีเมลและกดลิงก์ยืนยันบัญชี",
  };
}