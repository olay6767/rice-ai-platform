import { getFinanceCategoryLabel } from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function csvCell(value: string | number | null): string {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: { code: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อนส่งออกข้อมูล" } }, { status: 401 });
    const url = new URL(request.url);
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    let query = supabase.from("finance_transactions").select("transaction_date, transaction_time, description, transaction_type, category, amount, notes, source").eq("user_id", user.id).order("transaction_date", { ascending: false }).limit(5000);
    if (from) query = query.gte("transaction_date", from);
    if (to) query = query.lte("transaction_date", to);
    const [result, categoryResult] = await Promise.all([query, supabase.from("finance_categories").select("category_key, name").eq("user_id", user.id)]);
    if (result.error) throw result.error;
    const labels = new Map((categoryResult.data ?? []).map((row) => [row.category_key as string, row.name as string]));
    const rows = result.data ?? [];
    const content = [
      ["วันที่", "เวลา", "รายการ", "ประเภท", "หมวด", "จำนวนเงิน", "หมายเหตุ", "ช่องทาง"].map(csvCell).join(","),
      ...rows.map((row) => [row.transaction_date, row.transaction_time, row.description, row.transaction_type === "income" ? "รายรับ" : "รายจ่าย", getFinanceCategoryLabel(row.category as string, labels.get(row.category as string)), row.amount as number, row.notes, row.source].map(csvCell).join(",")),
    ].join("\r\n");
    return new Response(`\uFEFF${content}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=finance-transactions.csv", "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Finance export failed", error);
    return Response.json({ error: { code: "EXPORT_FAILED", message: "ไม่สามารถส่งออกข้อมูลได้" } }, { status: 500 });
  }
}
