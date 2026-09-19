import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin/types";

function configuredSuperAdminEmails(): Set<string> {
  return new Set(
    (process.env.SUPER_ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getAdminRole(
  user: Pick<User, "email" | "app_metadata"> | null | undefined
): AdminRole {
  const email = user?.email?.trim().toLowerCase();

  if (email && configuredSuperAdminEmails().has(email)) {
    return "superadmin";
  }

  const role = user?.app_metadata?.role;

  if (role === "superadmin" || role === "admin") {
    return role;
  }

  return "user";
}

export function isAdmin(user: User | null | undefined): boolean {
  return getAdminRole(user) !== "user";
}

export function isSuperAdmin(user: User | null | undefined): boolean {
  return getAdminRole(user) === "superadmin";
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

  return {
    supabase,
    user,
    role: getAdminRole(user),
    errorResponse: null,
  };
}
