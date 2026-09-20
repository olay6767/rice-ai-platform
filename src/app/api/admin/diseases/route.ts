import { getAdminContext } from "@/lib/admin/auth";
import type { AdminDisease } from "@/lib/admin/types";

export const runtime = "nodejs";

function fail(status: number, message: string): Response {
  return Response.json({ error: { code: "DISEASE_ADMIN_ERROR", message } }, { status });
}

function text(value: unknown, max = 5000): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function GET(): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  const result = await context.supabase.from("rice_diseases").select("*").order("detection_count", { ascending: false });
  if (result.error) return fail(result.error.code === "42P01" || result.error.code === "PGRST205" ? 503 : 500, "กรุณาติดตั้ง migration ระบบจัดการโรคข้าว");
  return Response.json({ data: (result.data ?? []) as AdminDisease[] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  void request;
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  return fail(
    405,
    "ไม่สามารถเพิ่ม Class โรคจากหน้า Admin ได้ กรุณาอัปเดตโมเดลและ Class Order ผ่านกระบวนการ Model Release"
  );
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const body = (await request.json()) as Record<string, unknown>;
  const id = text(body.id, 100);
  if (!id) return fail(400, "ไม่พบรายการโรค");
  const current = await context.supabase
    .from("rice_diseases")
    .select("*")
    .eq("id", id)
    .single();
  if (current.error || !current.data) return fail(404, "ไม่พบรายการโรค");
  const changes = {
    name_th: text(body.nameTh, 160), name_en: text(body.nameEn, 160), image_url: text(body.imageUrl, 1000) || null,
    symptoms: text(body.symptoms), causes: text(body.causes), prevention: text(body.prevention), treatment: text(body.treatment),
    is_active: body.isActive !== false, updated_at: new Date().toISOString(),
  };
  const result = await context.supabase.from("rice_diseases").update(changes).eq("id", id).select("*").single();
  if (result.error) return fail(400, "แก้ไขข้อมูลโรคไม่สำเร็จ");
  await context.supabase.from("admin_activity_logs").insert({
    actor_id: context.user.id,
    action: "update",
    resource_type: "disease",
    resource_id: id,
    summary: `แก้ไขข้อมูลโรค ${current.data.disease_code}`,
    old_value: current.data,
    new_value: result.data,
  });
  return Response.json({ data: result.data as AdminDisease });
}

export async function DELETE(request: Request): Promise<Response> {
  void request;
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  return fail(405, "Class โรคจากโมเดลห้ามลบถาวร กรุณาใช้ปุ่มปิดการแสดงผลแทน");
}
