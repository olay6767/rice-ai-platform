import { getAdminContext } from "@/lib/admin/auth";

export const runtime = "nodejs";
const CATEGORIES = new Set(["price", "flood", "drought", "storm"]);

function fail(status: number, message: string): Response {
  return Response.json({ error: { code: "AGRICULTURE_ADMIN_ERROR", message } }, { status });
}
function category(value: unknown): string {
  if (typeof value !== "string" || !CATEGORIES.has(value)) throw new Error("ประเภทข้อมูลไม่ถูกต้อง");
  return value;
}
function record(value: Record<string, unknown>, fixedCategory?: string) {
  const year = Number(value.year);
  const provinceId = value.provinceId === "" || value.provinceId == null ? null : Number(value.provinceId);
  const label = typeof value.label === "string" ? value.label.trim().slice(0, 180) : "";
  const numericValue = value.value === "" || value.value == null ? null : Number(value.value);
  if (!Number.isInteger(year) || year < 1900 || year > 2200 || !label) throw new Error("กรุณากรอกปีและชื่อข้อมูลให้ถูกต้อง");
  if (provinceId !== null && (!Number.isInteger(provinceId) || provinceId < 1 || provinceId > 999)) throw new Error("จังหวัดไม่ถูกต้อง");
  if (numericValue !== null && !Number.isFinite(numericValue)) throw new Error("ค่าข้อมูลไม่ถูกต้อง");
  return {
    category: category(fixedCategory ?? value.category), year, province_id: provinceId, label,
    value: numericValue, unit: typeof value.unit === "string" ? value.unit.trim().slice(0, 40) : "",
    details: typeof value.details === "object" && value.details ? value.details : {}, updated_at: new Date().toISOString(),
  };
}

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  const params = new URL(request.url).searchParams;
  let query = context.supabase.from("admin_agricultural_records").select("id,category,year,province_id,label,value,unit,details,created_at,updated_at").eq("category", category(params.get("category"))).order("year", { ascending: false }).limit(500);
  if (params.get("year")) query = query.eq("year", Number(params.get("year")));
  if (params.get("province")) query = query.eq("province_id", Number(params.get("province")));
  const result = await query;
  if (result.error) return fail(result.error.code === "42P01" || result.error.code === "PGRST205" ? 503 : 500, "กรุณาติดตั้ง migration ระบบข้อมูลการเกษตร");
  return Response.json({ data: result.data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const fixedCategory = category(form.get("category"));
      if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) return fail(415, "กรุณาใช้ไฟล์ CSV หรือบันทึกไฟล์ Excel เป็น CSV ก่อนอัปโหลด");
      const lines = (await file.text()).replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
      const headers = lines.shift()?.split(",").map((item) => item.trim()) ?? [];
      const rows = lines.map((line) => {
        const values = line.split(",").map((item) => item.trim());
        const source = Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""]));
        return record({ year: source.year, provinceId: source.province_id, label: source.label, value: source.value, unit: source.unit }, fixedCategory);
      });
      if (!rows.length || rows.length > 5000) return fail(400, "ไฟล์ต้องมีข้อมูล 1–5,000 แถว");
      const inserted = await context.supabase.from("admin_agricultural_records").insert(rows).select("*");
      if (inserted.error) throw inserted.error;
      await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "upload", resource_type: `agriculture_${fixedCategory}`, summary: `นำเข้าข้อมูล ${file.name} จำนวน ${rows.length} แถว` });
      return Response.json({ data: inserted.data ?? [] });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const prepared = record(body);
    const inserted = await context.supabase.from("admin_agricultural_records").insert(prepared).select("*").single();
    if (inserted.error) throw inserted.error;
    await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "create", resource_type: `agriculture_${prepared.category}`, resource_id: inserted.data.id, summary: `เพิ่มข้อมูล ${prepared.label}` });
    return Response.json({ data: inserted.data });
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : "บันทึกข้อมูลไม่สำเร็จ");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    if (typeof body.id !== "string") return fail(400, "ไม่พบรายการข้อมูล");
    const prepared = record(body);
    const updated = await context.supabase.from("admin_agricultural_records").update(prepared).eq("id", body.id).select("*").single();
    if (updated.error) throw updated.error;
    await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "update", resource_type: `agriculture_${prepared.category}`, resource_id: body.id, summary: `แก้ไขข้อมูล ${prepared.label}` });
    return Response.json({ data: updated.data });
  } catch (error) {
    return fail(400, error instanceof Error ? error.message : "แก้ไขข้อมูลไม่สำเร็จ");
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return fail(400, "ไม่พบรายการข้อมูล");
  const removed = await context.supabase.from("admin_agricultural_records").delete().eq("id", id);
  if (removed.error) return fail(400, "ลบข้อมูลไม่สำเร็จ");
  await context.supabase.from("admin_activity_logs").insert({ actor_id: context.user.id, action: "delete", resource_type: "agriculture", resource_id: id, summary: "ลบข้อมูลการเกษตร" });
  return Response.json({ data: { id } });
}
