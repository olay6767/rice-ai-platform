import { getAdminContext } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminUser } from "@/lib/admin/types";

export const runtime = "nodejs";

function failure(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status });
}

function mapUser(user: {
  id: string;
  email?: string;
  app_metadata?: Record<string, unknown>;
  banned_until?: string;
  created_at: string;
  last_sign_in_at?: string;
}): AdminUser {
  const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;
  return {
    id: user.id,
    email: user.email ?? "ไม่มีอีเมล",
    role: user.app_metadata?.role === "admin" ? "admin" : "user",
    disabled: bannedUntil > Date.now(),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;

  try {
    const query = new URL(request.url).searchParams.get("search")?.trim().toLowerCase() ?? "";
    const admin = createAdminClient();
    const result = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (result.error) throw result.error;
    const users = result.data.users
      .map(mapUser)
      .filter((user) => !query || user.email.toLowerCase().includes(query));
    return Response.json({ data: users }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load admin users", error);
    return failure(503, "USER_ADMIN_UNAVAILABLE", error instanceof Error ? error.message : "ไม่สามารถโหลดผู้ใช้งานได้");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;

  try {
    const body = (await request.json()) as { id?: unknown; role?: unknown; disabled?: unknown };
    if (typeof body.id !== "string" || !body.id) return failure(400, "INVALID_USER", "ไม่พบผู้ใช้งาน");
    if (body.id === context.user.id && body.disabled === true) return failure(400, "SELF_DISABLE", "ไม่สามารถปิดบัญชีที่กำลังใช้งานได้");

    const admin = createAdminClient();
    const current = await admin.auth.admin.getUserById(body.id);
    if (current.error || !current.data.user) throw current.error ?? new Error("ไม่พบผู้ใช้งาน");

    const attributes: {
      app_metadata?: Record<string, unknown>;
      ban_duration?: string;
    } = {};
    if (body.role === "user" || body.role === "admin") {
      attributes.app_metadata = { ...current.data.user.app_metadata, role: body.role };
    }
    if (typeof body.disabled === "boolean") {
      attributes.ban_duration = body.disabled ? "876000h" : "none";
    }
    if (!attributes.app_metadata && attributes.ban_duration === undefined) {
      return failure(400, "NO_CHANGE", "ไม่มีข้อมูลที่ต้องแก้ไข");
    }

    const updated = await admin.auth.admin.updateUserById(body.id, attributes);
    if (updated.error || !updated.data.user) throw updated.error ?? new Error("แก้ไขผู้ใช้งานไม่สำเร็จ");

    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.user.id,
      action: "role_update",
      resource_type: "user",
      resource_id: body.id,
      summary: typeof body.disabled === "boolean"
        ? `${body.disabled ? "ปิด" : "เปิด"}การใช้งานบัญชี ${updated.data.user.email ?? "ผู้ใช้"}`
        : `เปลี่ยนสิทธิ์ ${updated.data.user.email ?? "ผู้ใช้"} เป็น ${body.role}`,
    });

    return Response.json({ data: mapUser(updated.data.user) });
  } catch (error) {
    console.error("Unable to update admin user", error);
    return failure(500, "USER_UPDATE_FAILED", error instanceof Error ? error.message : "แก้ไขผู้ใช้งานไม่สำเร็จ");
  }
}
