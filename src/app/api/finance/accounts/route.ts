import { createClient } from "@/lib/supabase/server";
import type { FinanceAccount } from "@/lib/finance/types";

export const runtime = "nodejs";

type AccountType = FinanceAccount["accountType"];
interface AccountRow { id: string; name: string; account_type: AccountType; is_enabled: boolean }

function jsonError(status: number, code: string, message: string): Response { return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
function validType(value: unknown): value is AccountType { return value === "cash" || value === "personal" || value === "business" || value === "family" || value === "other"; }
function map(row: AccountRow): FinanceAccount { return { id: row.id, name: row.name, accountType: row.account_type, isEnabled: row.is_enabled }; }
async function authenticated() { const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser(); return { supabase, user, error }; }

export async function GET(): Promise<Response> {
  try { const { supabase, user, error } = await authenticated(); if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_accounts").select("id, name, account_type, is_enabled").eq("user_id", user.id).order("created_at"); if (result.error) throw result.error; return Response.json({ data: (result.data as AccountRow[]).map(map) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Finance accounts load failed", error); return jsonError(500, "DATABASE_ERROR", "ไม่สามารถโหลดบัญชีได้ กรุณาติดตั้ง migration 202608200001 หากยังไม่ได้ติดตั้ง"); }
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>; try { body = (await request.json()) as Record<string, unknown>; } catch { return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const name = typeof body.name === "string" ? body.name.trim() : ""; const accountType = body.accountType;
  if (!name || name.length > 80 || !validType(accountType)) return jsonError(400, "INVALID_ACCOUNT", "กรุณาระบุชื่อและประเภทบัญชีให้ถูกต้อง");
  try { const { supabase, user, error } = await authenticated(); if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_accounts").insert({ user_id: user.id, name, account_type: accountType }).select("id, name, account_type, is_enabled").single(); if (result.error) throw result.error; return Response.json({ data: map(result.data as AccountRow) }, { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Finance account create failed", error); return jsonError(500, "DATABASE_ERROR", "ไม่สามารถเพิ่มบัญชีได้"); }
}

export async function PATCH(request: Request): Promise<Response> {
  let body: Record<string, unknown>; try { body = (await request.json()) as Record<string, unknown>; } catch { return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const id = typeof body.id === "string" ? body.id : ""; if (!id || typeof body.isEnabled !== "boolean") return jsonError(400, "INVALID_ACCOUNT", "ข้อมูลบัญชีไม่ถูกต้อง");
  try { const { supabase, user, error } = await authenticated(); if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_accounts").update({ is_enabled: body.isEnabled }).eq("id", id).eq("user_id", user.id).select("id, name, account_type, is_enabled").single(); if (result.error) throw result.error; return Response.json({ data: map(result.data as AccountRow) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { console.error("Finance account update failed", error); return jsonError(500, "DATABASE_ERROR", "ไม่สามารถแก้ไขบัญชีได้"); }
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return jsonError(400, "INVALID_ACCOUNT", "ไม่พบบัญชี");
  try { const { supabase, user, error } = await authenticated(); if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_accounts").delete().eq("id", id).eq("user_id", user.id); if (result.error) throw result.error; return new Response(null, { status: 204 }); }
  catch (error) { console.error("Finance account delete failed", error); return jsonError(500, "DATABASE_ERROR", "ไม่สามารถลบบัญชีได้"); }
}
