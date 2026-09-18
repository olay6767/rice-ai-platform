"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export interface ProfileActionState {
  status: "idle" | "success" | "error";
  message: string;
}

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

async function authenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export async function updateProfileAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const fullName = textValue(formData, "fullName");
  const phone = textValue(formData, "phone");
  const province = textValue(formData, "province");
  const district = textValue(formData, "district");
  const farmName = textValue(formData, "farmName");

  if (fullName.length < 2 || fullName.length > 100) {
    return {
      status: "error",
      message: "กรุณากรอกชื่อที่มีความยาว 2–100 ตัวอักษร",
    };
  }

  if (phone && !/^[0-9+\-\s]{9,20}$/.test(phone)) {
    return {
      status: "error",
      message: "รูปแบบหมายเลขโทรศัพท์ไม่ถูกต้อง",
    };
  }

  if (
    province.length > 100 ||
    district.length > 100 ||
    farmName.length > 120
  ) {
    return {
      status: "error",
      message: "ข้อมูลที่อยู่หรือชื่อฟาร์มยาวเกินไป",
    };
  }

  const { supabase, user, error } = await authenticatedClient();

  if (error || !user) {
    return {
      status: "error",
      message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    data: {
      ...user.user_metadata,
      full_name: fullName,
      phone,
      province,
      district,
      farm_name: farmName,
    },
  });

  if (updateError) {
    console.error("Unable to update user profile:", {
      message: updateError.message,
      status: updateError.status,
      code: updateError.code,
    });

    return {
      status: "error",
      message: "บันทึกข้อมูลโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่",
    };
  }

  revalidatePath("/", "layout");
  revalidatePath("/profile");

  return {
    status: "success",
    message: "บันทึกข้อมูลโปรไฟล์แล้ว",
  };
}

export async function changePasswordAction(
  _previousState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const currentPassword = textValue(formData, "currentPassword");
  const newPassword = textValue(formData, "newPassword");
  const confirmPassword = textValue(formData, "confirmPassword");

  if (!currentPassword) {
    return {
      status: "error",
      message: "กรุณากรอกรหัสผ่านปัจจุบัน",
    };
  }

  if (newPassword.length < 8 || newPassword.length > 72) {
    return {
      status: "error",
      message: "รหัสผ่านใหม่ต้องมีความยาว 8–72 ตัวอักษร",
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      status: "error",
      message: "ยืนยันรหัสผ่านใหม่ไม่ตรงกัน",
    };
  }

  if (currentPassword === newPassword) {
    return {
      status: "error",
      message: "รหัสผ่านใหม่ต้องไม่ซ้ำกับรหัสผ่านปัจจุบัน",
    };
  }

  const { supabase, user, error } = await authenticatedClient();

  if (error || !user?.email) {
    return {
      status: "error",
      message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
    };
  }

  const { error: verificationError } =
    await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

  if (verificationError) {
    return {
      status: "error",
      message: "รหัสผ่านปัจจุบันไม่ถูกต้อง",
    };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) {
    console.error("Unable to change user password:", {
      message: updateError.message,
      status: updateError.status,
      code: updateError.code,
    });

    return {
      status: "error",
      message: "เปลี่ยนรหัสผ่านไม่สำเร็จ กรุณาลองใหม่",
    };
  }

  return {
    status: "success",
    message: "เปลี่ยนรหัสผ่านสำเร็จ",
  };
}
