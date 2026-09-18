import { createClient } from "@/lib/supabase/server";
import type { FarmField, FarmFieldInput } from "@/lib/farms/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT = "id,name,province,district,subdistrict,area_rai,rice_variety,planting_date,expected_harvest_date,latitude,longitude,is_primary,created_at,updated_at";

interface FarmFieldRow {
  id: string; name: string; province: string; district: string | null; subdistrict: string | null;
  area_rai: number | string; rice_variety: string; planting_date: string | null; expected_harvest_date: string | null;
  latitude: number | string | null; longitude: number | string | null; is_primary: boolean; created_at: string; updated_at: string;
}

function errorResponse(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: HEADERS });
}

function success(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: HEADERS });
}

function map(row: FarmFieldRow): FarmField {
  return {
    id: row.id, name: row.name, province: row.province, district: row.district, subdistrict: row.subdistrict,
    areaRai: Number(row.area_rai), riceVariety: row.rice_variety, plantingDate: row.planting_date,
    expectedHarvestDate: row.expected_harvest_date, latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude), isPrimary: row.is_primary,
    createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

async function authenticated() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function requiredText(value: unknown, label: string, min: number, max: number): string {
  if (typeof value !== "string") throw new Error(`${label}ไม่ถูกต้อง`);
  const text = value.trim();
  if (text.length < min || text.length > max) throw new Error(`${label}ต้องมีความยาว ${min}–${max} ตัวอักษร`);
  return text;
}

function optionalText(value: unknown, label: string, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") throw new Error(`${label}ไม่ถูกต้อง`);
  const text = value.trim();
  if (text.length > max) throw new Error(`${label}ยาวเกิน ${max} ตัวอักษร`);
  return text || null;
}

function dateValue(value: unknown, label: string, required = false): string | null {
  if (value === null || value === undefined || value === "") {
    if (required) throw new Error(`กรุณาระบุ${label}`);
    return null;
  }
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${label}ไม่ถูกต้อง`);
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) throw new Error(`${label}ไม่ถูกต้อง`);
  return value;
}

function coordinate(value: unknown, label: string, min: number, max: number): number | null {
  if (value === null || value === undefined || value === "") return null;
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(number) || number < min || number > max) throw new Error(`${label}ไม่ถูกต้อง`);
  return Math.round(number * 1_000_000) / 1_000_000;
}

function farmInput(payload: Record<string, unknown>): FarmFieldInput {
  const area = typeof payload.areaRai === "number" ? payload.areaRai : typeof payload.areaRai === "string" ? Number(payload.areaRai) : Number.NaN;
  if (!Number.isFinite(area) || area <= 0 || area > 1_000_000) throw new Error("พื้นที่ปลูกต้องมากกว่า 0 และไม่เกิน 1,000,000 ไร่");
  const plantingDate = dateValue(payload.plantingDate, "วันเริ่มปลูก", true);
  const expectedHarvestDate = dateValue(payload.expectedHarvestDate, "วันคาดว่าเก็บเกี่ยว");
  if (plantingDate && expectedHarvestDate && expectedHarvestDate < plantingDate) throw new Error("วันคาดว่าเก็บเกี่ยวต้องไม่ก่อนวันเริ่มปลูก");
  const latitude = coordinate(payload.latitude, "ละติจูด", -90, 90);
  const longitude = coordinate(payload.longitude, "ลองจิจูด", -180, 180);
  if ((latitude === null) !== (longitude === null)) throw new Error("กรุณาระบุพิกัดละติจูดและลองจิจูดให้ครบทั้งคู่");
  return {
    name: requiredText(payload.name, "ชื่อแปลง", 2, 120), province: requiredText(payload.province, "จังหวัด", 2, 100),
    district: optionalText(payload.district, "อำเภอ", 100) ?? "", subdistrict: optionalText(payload.subdistrict, "ตำบล", 100) ?? "",
    areaRai: Math.round(area * 100) / 100, riceVariety: requiredText(payload.riceVariety, "พันธุ์ข้าว", 2, 120),
    plantingDate: plantingDate ?? "", expectedHarvestDate: expectedHarvestDate ?? "", latitude, longitude,
    isPrimary: payload.isPrimary === true,
  };
}

function databaseError(error: unknown, fallback: string): Response {
  const db = error as { code?: string; message?: string };
  if (db?.code === "23505") return errorResponse(409, "PRIMARY_CONFLICT", "ไม่สามารถกำหนดแปลงหลักได้ กรุณาลองใหม่");
  if (db?.code === "23514") return errorResponse(400, "INVALID_FARM_FIELD", "ข้อมูลแปลงนาไม่ครบหรือไม่ถูกต้อง");
  console.error("Farm fields API failed", error);
  return errorResponse(500, "DATABASE_ERROR", fallback);
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase, user, error } = await authenticated();
    if (error || !user) return errorResponse(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนจัดการแปลงนา");
    const primaryOnly = new URL(request.url).searchParams.get("primary") === "1";
    if (primaryOnly) {
      const result = await supabase.from("rice_farm_fields").select(SELECT).eq("user_id", user.id).eq("is_primary", true).maybeSingle();
      if (result.error) throw result.error;
      return success({ field: result.data ? map(result.data as FarmFieldRow) : null });
    }
    const result = await supabase.from("rice_farm_fields").select(SELECT).eq("user_id", user.id).order("is_primary", { ascending: false }).order("updated_at", { ascending: false });
    if (result.error) throw result.error;
    return success({ fields: (result.data as FarmFieldRow[]).map(map) });
  } catch (error) {
    return databaseError(error, "ไม่สามารถโหลดข้อมูลแปลงนาได้ กรุณาติดตั้ง migration 202609040002 หากยังไม่ได้ติดตั้ง");
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: Record<string, unknown> | null;
  try { payload = object(await request.json()); } catch { payload = null; }
  if (!payload) return errorResponse(400, "INVALID_JSON", "รูปแบบข้อมูลแปลงนาไม่ถูกต้อง");
  let input: FarmFieldInput;
  try { input = farmInput(payload); } catch (error) { return errorResponse(400, "INVALID_FARM_FIELD", error instanceof Error ? error.message : "ข้อมูลแปลงนาไม่ถูกต้อง"); }
  try {
    const { supabase, user, error } = await authenticated();
    if (error || !user) return errorResponse(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนจัดการแปลงนา");
    const result = await supabase.from("rice_farm_fields").insert({
      user_id: user.id, name: input.name, province: input.province, district: input.district || null, subdistrict: input.subdistrict || null,
      area_rai: input.areaRai, rice_variety: input.riceVariety, planting_date: input.plantingDate || null,
      expected_harvest_date: input.expectedHarvestDate || null, latitude: input.latitude, longitude: input.longitude, is_primary: input.isPrimary,
    }).select(SELECT).single();
    if (result.error) throw result.error;
    return success(map(result.data as FarmFieldRow), 201);
  } catch (error) { return databaseError(error, "ไม่สามารถบันทึกแปลงนาได้"); }
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: Record<string, unknown> | null;
  try { payload = object(await request.json()); } catch { payload = null; }
  if (!payload || typeof payload.id !== "string" || !UUID.test(payload.id)) return errorResponse(400, "INVALID_FARM_FIELD", "ไม่พบแปลงนาที่ต้องการแก้ไข");
  let input: FarmFieldInput;
  try { input = farmInput(payload); } catch (error) { return errorResponse(400, "INVALID_FARM_FIELD", error instanceof Error ? error.message : "ข้อมูลแปลงนาไม่ถูกต้อง"); }
  try {
    const { supabase, user, error } = await authenticated();
    if (error || !user) return errorResponse(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนจัดการแปลงนา");
    const result = await supabase.from("rice_farm_fields").update({
      name: input.name, province: input.province, district: input.district || null, subdistrict: input.subdistrict || null,
      area_rai: input.areaRai, rice_variety: input.riceVariety, planting_date: input.plantingDate || null,
      expected_harvest_date: input.expectedHarvestDate || null, latitude: input.latitude, longitude: input.longitude, is_primary: input.isPrimary,
    }).eq("id", payload.id).eq("user_id", user.id).select(SELECT).maybeSingle();
    if (result.error) throw result.error;
    if (!result.data) return errorResponse(404, "FARM_FIELD_NOT_FOUND", "ไม่พบแปลงนาที่เลือก");
    return success(map(result.data as FarmFieldRow));
  } catch (error) { return databaseError(error, "ไม่สามารถแก้ไขแปลงนาได้"); }
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !UUID.test(id)) return errorResponse(400, "INVALID_FARM_FIELD", "ไม่พบแปลงนาที่ต้องการลบ");
  try {
    const { supabase, user, error } = await authenticated();
    if (error || !user) return errorResponse(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนจัดการแปลงนา");
    const current = await supabase.from("rice_farm_fields").select("id,is_primary").eq("id", id).eq("user_id", user.id).maybeSingle();
    if (current.error) throw current.error;
    if (!current.data) return errorResponse(404, "FARM_FIELD_NOT_FOUND", "ไม่พบแปลงนาที่เลือก");
    if (current.data.is_primary) {
      const other = await supabase.from("rice_farm_fields").select("id", { count: "exact", head: true }).eq("user_id", user.id).neq("id", id);
      if (other.error) throw other.error;
      if ((other.count ?? 0) > 0) return errorResponse(409, "PRIMARY_FARM_PROTECTED", "กรุณาเลือกแปลงอื่นเป็นแปลงหลักก่อนลบ");
    }
    const result = await supabase.from("rice_farm_fields").delete().eq("id", id).eq("user_id", user.id);
    if (result.error) throw result.error;
    return new Response(null, { status: 204, headers: HEADERS });
  } catch (error) { return databaseError(error, "ไม่สามารถลบแปลงนาได้"); }
}
