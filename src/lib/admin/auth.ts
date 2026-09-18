import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === "admin";
}

export function adminErrorResponse(
  status: 401 | 403,
  message: string
): Response {
  return Response.json(
    {
      error: {
        code: status === 401 ? "AUTH_REQUIRED" : "ADMIN_REQUIRED",
        message,
      },
    },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function getAdminContext() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      supabase,
      user: null,
      errorResponse: adminErrorResponse(
        401,
        "กรุณาเข้าสู่ระบบก่อนใช้งานหลังบ้าน"
      ),
    };
  }

  if (!isAdmin(user)) {
    return {
      supabase,
      user,
      errorResponse: adminErrorResponse(
        403,
        "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ"
      ),
    };
  }

  return { supabase, user, errorResponse: null };
}
