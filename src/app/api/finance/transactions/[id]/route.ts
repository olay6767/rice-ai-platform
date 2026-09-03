import {
  isCategoryForType,
  isFinanceCategory,
  isFinanceTransactionType,
  type FinanceTransactionSource,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SELECT_FIELDS = "id, transaction_type, category, amount, description, transaction_date, transaction_time, notes, source, account_id, source_text, ai_confidence, created_at, updated_at";

interface TransactionRow {
  id: string;
  transaction_type: "income" | "expense";
  category: string;
  amount: number | string;
  description: string;
  transaction_date: string;
  transaction_time: string | null;
  notes: string;
  source: string;
  account_id: string | null;
  source_text: string;
  ai_confidence: number | string | null;
  created_at: string;
  updated_at: string;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime());
}

function isTime(value: unknown): value is string | null {
  return value === null || value === undefined || (typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value));
}

function isSource(value: unknown): value is FinanceTransactionSource {
  return value === "chat" || value === "manual" || value === "recurring" || value === "receipt" || value === "voice" || value === "pdf";
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function mapRow(row: TransactionRow): SavedFinanceTransaction {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    category: row.category,
    amount: Number(row.amount),
    description: row.description,
    transactionDate: row.transaction_date,
    transactionTime: row.transaction_time,
    notes: row.notes,
    source: isSource(row.source) ? row.source : "chat",
    accountId: row.account_id,
    sourceText: row.source_text,
    confidence: row.ai_confidence === null ? 0 : Number(row.ai_confidence),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

function databaseError(error: { code?: string; message?: string }): Response {
  console.error("Finance transaction mutation failed", error);
  return jsonError(500, "DATABASE_ERROR", "ไม่สามารถแก้ไขรายการได้ กรุณาลองใหม่");
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  let payload: Record<string, unknown>;
  try { payload = (await request.json()) as Record<string, unknown>; } catch { return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const { id } = await context.params;
  const transactionType = payload.transactionType;
  const category = payload.category;
  const amount = typeof payload.amount === "number" ? Math.round(payload.amount * 100) / 100 : Number.NaN;
  const description = typeof payload.description === "string" ? payload.description.trim() : "";
  const transactionDate = payload.transactionDate;
  const transactionTime = typeof payload.transactionTime === "string" && payload.transactionTime.trim() ? payload.transactionTime.trim() : null;
  const notes = typeof payload.notes === "string" ? payload.notes.trim() : "";
  const accountId = payload.accountId === null || payload.accountId === undefined ? null : payload.accountId;

  if (!isFinanceTransactionType(transactionType) || !isFinanceCategory(category) || !isCategoryForType(category, transactionType) || !Number.isFinite(amount) || amount <= 0 || amount > 999_999_999_999.99 || !description || description.length > 200 || !isIsoDate(transactionDate) || !isTime(transactionTime) || notes.length > 1000 || (accountId !== null && !isUuid(accountId))) {
    return jsonError(400, "INVALID_TRANSACTION", "กรุณากรอกข้อมูลรายการให้ครบและถูกต้อง");
  }

  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนแก้ไขรายการ");
    const result = await supabase.from("finance_transactions").update({
      transaction_type: transactionType,
      category,
      amount,
      description,
      transaction_date: transactionDate,
      transaction_time: transactionTime,
      notes,
      account_id: accountId,
    }).eq("id", id).eq("user_id", user.id).select(SELECT_FIELDS).single();
    if (result.error) return databaseError(result.error);
    return Response.json({ data: mapRow(result.data as TransactionRow) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unexpected finance transaction update error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถแก้ไขรายการได้");
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await context.params;
  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนลบรายการ");
    const result = await supabase.from("finance_transactions").delete().eq("id", id).eq("user_id", user.id);
    if (result.error) return databaseError(result.error);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected finance transaction delete error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถลบรายการได้");
  }
}
