import {
  isCategoryForType,
  isFinanceCategory,
  isFinanceTransactionType,
  type FinanceRecurringTransaction,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface Row { id: string; transaction_type: "income" | "expense"; category: string; description: string; amount: number | string; day_of_month: number; account_id: string | null; notes: string; is_enabled: boolean }
const FIELDS = "id, transaction_type, category, description, amount, day_of_month, account_id, notes, is_enabled";
function error(status: number, code: string, message: string): Response { return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } }); }
function map(row: Row): FinanceRecurringTransaction { return { id: row.id, transactionType: row.transaction_type, category: row.category, description: row.description, amount: Number(row.amount), dayOfMonth: row.day_of_month, accountId: row.account_id, notes: row.notes, isEnabled: row.is_enabled }; }
async function authenticated() { const supabase = await createClient(); const { data: { user }, error: authError } = await supabase.auth.getUser(); return { supabase, user, authError }; }
function valid(body: Record<string, unknown>): body is { transactionType: "income" | "expense"; category: string; description: string; amount: number; dayOfMonth: number; accountId?: string | null; notes?: string } { return isFinanceTransactionType(body.transactionType) && isFinanceCategory(body.category) && isCategoryForType(body.category, body.transactionType) && typeof body.description === "string" && body.description.trim().length > 0 && body.description.trim().length <= 200 && typeof body.amount === "number" && Number.isFinite(body.amount) && body.amount > 0 && typeof body.dayOfMonth === "number" && Number.isInteger(body.dayOfMonth) && body.dayOfMonth >= 1 && body.dayOfMonth <= 28 && (body.notes === undefined || (typeof body.notes === "string" && body.notes.length <= 1000)); }

export async function GET(): Promise<Response> {
  try { const { supabase, user, authError } = await authenticated(); if (authError || !user) return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_recurring_transactions").select(FIELDS).eq("user_id", user.id).order("day_of_month"); if (result.error) throw result.error; return Response.json({ data: (result.data as Row[]).map(map) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (caught) { console.error("Recurring load failed", caught); return error(500, "DATABASE_ERROR", "ไม่สามารถโหลดรายการประจำได้ กรุณาติดตั้ง migration 202608200001 หากยังไม่ได้ติดตั้ง"); }
}

export async function POST(request: Request): Promise<Response> {
  let body: Record<string, unknown>; try { body = (await request.json()) as Record<string, unknown>; } catch { return error(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  if (!valid(body)) return error(400, "INVALID_RECURRING", "กรุณากรอกข้อมูลรายการประจำให้ครบ");
  try { const { supabase, user, authError } = await authenticated(); if (authError || !user) return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_recurring_transactions").insert({ user_id: user.id, transaction_type: body.transactionType, category: body.category, description: body.description.trim(), amount: body.amount, day_of_month: body.dayOfMonth, account_id: body.accountId ?? null, notes: body.notes?.trim() ?? "" }).select(FIELDS).single(); if (result.error) throw result.error; return Response.json({ data: map(result.data as Row) }, { status: 201, headers: { "Cache-Control": "no-store" } }); }
  catch (caught) { console.error("Recurring create failed", caught); return error(500, "DATABASE_ERROR", "ไม่สามารถเพิ่มรายการประจำได้"); }
}

export async function PATCH(request: Request): Promise<Response> {
  let body: Record<string, unknown>; try { body = (await request.json()) as Record<string, unknown>; } catch { return error(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const id = typeof body.id === "string" ? body.id : ""; if (!id || typeof body.isEnabled !== "boolean") return error(400, "INVALID_RECURRING", "ข้อมูลรายการประจำไม่ถูกต้อง");
  try { const { supabase, user, authError } = await authenticated(); if (authError || !user) return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_recurring_transactions").update({ is_enabled: body.isEnabled }).eq("id", id).eq("user_id", user.id).select(FIELDS).single(); if (result.error) throw result.error; return Response.json({ data: map(result.data as Row) }, { headers: { "Cache-Control": "no-store" } }); }
  catch (caught) { console.error("Recurring update failed", caught); return error(500, "DATABASE_ERROR", "ไม่สามารถแก้ไขรายการประจำได้"); }
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id"); if (!id) return error(400, "INVALID_RECURRING", "ไม่พบรายการประจำ");
  try { const { supabase, user, authError } = await authenticated(); if (authError || !user) return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน"); const result = await supabase.from("finance_recurring_transactions").delete().eq("id", id).eq("user_id", user.id); if (result.error) throw result.error; return new Response(null, { status: 204 }); }
  catch (caught) { console.error("Recurring delete failed", caught); return error(500, "DATABASE_ERROR", "ไม่สามารถลบรายการประจำได้"); }
}
