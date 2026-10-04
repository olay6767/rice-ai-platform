import "server-only";

import type { User } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";
import type { AdminRole } from "@/lib/admin/types";

export function getAdminRole(
  user: Pick<User, "app_metadata"> | null | undefined
): AdminRole {
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
    data: { user: currentUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !currentUser) {
    return {
      supabase,
      user: null,
      errorResponse: adminErrorResponse(
        401,
        "กรุณาเข้าสู่ระบบก่อนใช้งานหลังบ้าน"
      ),
    };
  }

  let user = currentUser;
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // getUser() reads the current role from Supabase Auth, while database RLS/RPC
  // reads the role embedded in the access-token JWT. Refresh a stale token after
  // an administrator changes a role so the UI and database authorize identically.
  if (session && getAdminRole(session.user) !== getAdminRole(currentUser)) {
    const refreshed = await supabase.auth.refreshSession();

    if (refreshed.error || !refreshed.data.user) {
      return {
        supabase,
        user: null,
        errorResponse: adminErrorResponse(
          401,
          "สิทธิ์บัญชีมีการเปลี่ยนแปลง กรุณาเข้าสู่ระบบใหม่"
        ),
      };
    }

    user = refreshed.data.user;
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
