import { getAdminContext } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  const result = await context.supabase
    .from("admin_activity_logs")
    .select("id,actor_id,action,resource_type,resource_id,summary,created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (result.error) return Response.json({ error: { code: "ACTIVITY_ERROR", message: "ไม่สามารถโหลด Activity Log ได้" } }, { status: 500 });

  const actorNames = new Map<string, string>();
  try {
    const admin = createAdminClient();
    const users = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (!users.error) for (const user of users.data.users) actorNames.set(user.id, user.email ?? "Admin");
  } catch {
    // หากยังไม่ตั้งค่า service role จะแสดงชื่อกลางแทน โดย Log ยังใช้งานได้
  }

  return Response.json({
    data: (result.data ?? []).map((item) => ({
      ...item,
      admin: item.actor_id ? actorNames.get(item.actor_id) ?? "Admin" : "System",
    })),
  }, { headers: { "Cache-Control": "no-store" } });
}
