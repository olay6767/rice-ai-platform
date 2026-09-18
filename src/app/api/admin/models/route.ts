import { getAdminContext } from "@/lib/admin/auth";
import type { AdminAiModel } from "@/lib/admin/types";

export const runtime = "nodejs";

function errorResponse(status: number, message: string): Response {
  return Response.json({ error: { code: "MODEL_ADMIN_ERROR", message } }, { status });
}

export async function GET(): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  const result = await context.supabase
    .from("rice_model_metadata")
    .select("model_version, model_name, target, test_metrics, is_active, is_visible, updated_at")
    .order("is_active", { ascending: false })
    .order("updated_at", { ascending: false });
  if (result.error) {
    const schema = result.error.code === "42703" || result.error.code === "PGRST204";
    return errorResponse(schema ? 503 : 500, schema ? "กรุณาติดตั้ง migration ระบบจัดการ AI Model" : "ไม่สามารถโหลดข้อมูลโมเดลได้");
  }
  return Response.json({ data: (result.data ?? []) as AdminAiModel[] }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const body = (await request.json()) as { version?: unknown; active?: unknown; visible?: unknown };
  if (typeof body.version !== "string" || !body.version) return errorResponse(400, "กรุณาเลือกโมเดล");

  if (body.active === true) {
    const cleared = await context.supabase.from("rice_model_metadata").update({ is_active: false }).neq("model_version", body.version);
    if (cleared.error) return errorResponse(500, "ไม่สามารถเปลี่ยน Active Model ได้");
  }
  const changes: Record<string, boolean | string> = { updated_at: new Date().toISOString() };
  if (typeof body.active === "boolean") changes.is_active = body.active;
  if (typeof body.visible === "boolean") changes.is_visible = body.visible;
  const updated = await context.supabase
    .from("rice_model_metadata")
    .update(changes)
    .eq("model_version", body.version)
    .select("model_version, model_name, target, test_metrics, is_active, is_visible, updated_at")
    .single();
  if (updated.error) return errorResponse(500, "บันทึกสถานะโมเดลไม่สำเร็จ");

  await context.supabase.from("admin_activity_logs").insert({
    actor_id: context.user.id,
    action: "update",
    resource_type: "ai_model",
    summary: body.active === true ? `เปลี่ยน Active Model เป็น ${body.version}` : `แก้สถานะการแสดง Forecast ของ ${body.version}`,
  });
  return Response.json({ data: updated.data as AdminAiModel });
}
