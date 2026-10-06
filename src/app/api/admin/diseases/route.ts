import { getAdminContext } from "@/lib/admin/auth";
import type { AdminDisease } from "@/lib/admin/types";

export const runtime = "nodejs";

function fail(status: number, message: string): Response {
  return Response.json({ error: { code: "DISEASE_ADMIN_ERROR", message } }, { status });
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
  void request;
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  return fail(405, "รายการ Class โรคเป็นข้อมูลอ้างอิงแบบอ่านอย่างเดียว");
}

export async function DELETE(request: Request): Promise<Response> {
  void request;
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  return fail(405, "Class โรคจากโมเดลห้ามลบถาวร กรุณาใช้ปุ่มปิดการแสดงผลแทน");
}
