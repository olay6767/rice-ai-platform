import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface RecurringRow {
  id: string;
  transaction_type: "income" | "expense";
  category: string;
  description: string;
  amount: number | string;
  day_of_month: number;
  account_id: string | null;
  notes: string;
  last_generated_on: string | null;
}

function bangkokDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function POST(): Promise<Response> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return Response.json({ error: { code: "AUTH_REQUIRED", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" } }, { status: 401 });
    const today = bangkokDate();
    const [year, month, day] = today.split("-").map(Number);
    const result = await supabase.from("finance_recurring_transactions").select("id, transaction_type, category, description, amount, day_of_month, account_id, notes, last_generated_on").eq("user_id", user.id).eq("is_enabled", true).lte("day_of_month", day);
    if (result.error) throw result.error;
    let generated = 0;
    for (const row of (result.data as RecurringRow[])) {
      const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(row.day_of_month).padStart(2, "0")}`;
      if (row.last_generated_on && row.last_generated_on >= dueDate) continue;
      const insert = await supabase.from("finance_transactions").insert({
        user_id: user.id,
        client_request_id: crypto.randomUUID(),
        transaction_type: row.transaction_type,
        category: row.category,
        amount: Number(row.amount),
        description: row.description,
        transaction_date: dueDate,
        notes: row.notes,
        source: "recurring",
        account_id: row.account_id,
        recurring_transaction_id: row.id,
        source_text: `รายการประจำ: ${row.description}`,
        ai_confidence: 1,
      });
      if (insert.error) throw insert.error;
      const update = await supabase.from("finance_recurring_transactions").update({ last_generated_on: dueDate }).eq("id", row.id).eq("user_id", user.id);
      if (update.error) throw update.error;
      generated += 1;
    }
    return Response.json({ data: { generated } }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Recurring generation failed", error);
    return Response.json({ error: { code: "RECURRING_GENERATION_FAILED", message: "ไม่สามารถสร้างรายการประจำได้" } }, { status: 500 });
  }
}
