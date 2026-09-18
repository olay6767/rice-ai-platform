import {
  getFinanceCategoryLabel,
  isFinanceCategory,
  type FinanceTransactionSource,
  type FinanceTransactionType,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const SELECT_FIELDS = "id, transaction_type, category, amount, description, transaction_date, transaction_time, notes, source, account_id, source_text, ai_confidence, created_at, updated_at";

interface Row {
  id: string;
  transaction_type: FinanceTransactionType;
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

function validDate(value: string | null): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()));
}

function source(value: string): FinanceTransactionSource {
  return ["chat", "manual", "recurring", "receipt", "voice", "pdf"].includes(value) ? value as FinanceTransactionSource : "chat";
}

function mapRow(row: Row, customLabels: Map<string, string>): SavedFinanceTransaction {
  return {
    id: row.id,
    transactionType: row.transaction_type,
    category: isFinanceCategory(row.category) ? row.category : "other_expense",
    categoryLabel: getFinanceCategoryLabel(row.category, customLabels.get(row.category)),
    amount: Number(row.amount),
    description: row.description,
    transactionDate: row.transaction_date,
    transactionTime: row.transaction_time,
    notes: row.notes,
    source: source(row.source),
    accountId: row.account_id,
    sourceText: row.source_text,
    confidence: row.ai_confidence === null ? 0 : Number(row.ai_confidence),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูรายการ");

    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    const transactionType = url.searchParams.get("type");
    const category = url.searchParams.get("category");
    const search = (url.searchParams.get("search") ?? "").trim().toLowerCase();
    if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to) || (transactionType && transactionType !== "income" && transactionType !== "expense") || (category && !isFinanceCategory(category)) || search.length > 100) {
      return jsonError(400, "INVALID_FILTER", "ตัวกรองรายการไม่ถูกต้อง");
    }

    let query = supabase.from("finance_transactions").select(SELECT_FIELDS).eq("user_id", user.id).order("transaction_date", { ascending: false }).order("transaction_time", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(500);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    if (transactionType) query = query.eq("transaction_type", transactionType);
    if (category) query = query.eq("category", category);
    const [result, categoriesResult] = await Promise.all([
      query,
      supabase.from("finance_categories").select("category_key, name").eq("user_id", user.id),
    ]);
    if (result.error) throw result.error;
    const labelMap = new Map((categoriesResult.data ?? []).map((row) => [row.category_key as string, row.name as string]));
    const transactions = (result.data as Row[] ?? []).map((row) => mapRow(row, labelMap)).filter((item) => {
      if (!search) return true;
      return item.description.toLowerCase().includes(search) || item.category.toLowerCase().includes(search) || (item.categoryLabel ?? "").toLowerCase().includes(search) || String(item.amount).includes(search);
    });
    const dailyTotals = new Map<string, number>();
    for (const item of transactions) {
      dailyTotals.set(item.transactionDate, (dailyTotals.get(item.transactionDate) ?? 0) + (item.transactionType === "income" ? item.amount : -item.amount));
    }
    return Response.json({ data: { transactions, dailyTotals: Array.from(dailyTotals, ([date, total]) => ({ date, total: Math.round(total * 100) / 100 })) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Finance transaction list request failed", error);
    return jsonError(500, "DATABASE_ERROR", "ไม่สามารถโหลดรายการย้อนหลังได้ กรุณาลองใหม่");
  }
}
