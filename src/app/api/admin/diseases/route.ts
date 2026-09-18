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
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const body = (await request.json()) as Record<string, unknown>;
  const record = {
    disease_code: text(body.diseaseCode, 100), name_th: text(body.nameTh, 160), name_en: text(body.nameEn, 160),
    image_url: text(body.imageUrl, 1000) || null, symptoms: text(body.symptoms), causes: text(body.causes),
    prevention: text(body.prevention), treatment: text(body.treatment), is_active: body.isActive !== false,
  };
  if (!record.disease_code || !record.name_th || !record.name_en) return fail(400, "กรุณากรอกชื่อโรคและรหัสโรคให้ครบ");
  const result = await context.supabase.from("rice_diseases").insert(record).select("*").single();
  if (result.error) return fail(400, result.error.code === "23505" ? "รหัสโรคนี้มีอยู่แล้ว" : "เพิ่มโรคไม่สำเร็จ");
  await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "create", resource_type: "disease", resource_id: result.data.id, summary: `เพิ่มโรค ${record.name_th}` });
  return Response.json({ data: result.data as AdminDisease });
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const body = (await request.json()) as Record<string, unknown>;
  const id = text(body.id, 100);
  if (!id) return fail(400, "ไม่พบรายการโรค");
  const changes = {
    name_th: text(body.nameTh, 160), name_en: text(body.nameEn, 160), image_url: text(body.imageUrl, 1000) || null,
    symptoms: text(body.symptoms), causes: text(body.causes), prevention: text(body.prevention), treatment: text(body.treatment),
    is_active: body.isActive !== false, updated_at: new Date().toISOString(),
  };
  const result = await context.supabase.from("rice_diseases").update(changes).eq("id", id).select("*").single();
  if (result.error) return fail(400, "แก้ไขข้อมูลโรคไม่สำเร็จ");
  await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "update", resource_type: "disease", resource_id: id, summary: `แก้ไขโรค ${changes.name_th}` });
  return Response.json({ data: result.data as AdminDisease });
}

export async function DELETE(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail(400, "ไม่พบรายการโรค");
  const result = await context.supabase.from("rice_diseases").delete().eq("id", id);
  if (result.error) return fail(400, "ลบข้อมูลโรคไม่สำเร็จ");
  await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "delete", resource_type: "disease", resource_id: id, summary: "ลบข้อมูลโรคข้าว" });
  return Response.json({ data: { id } });
}
