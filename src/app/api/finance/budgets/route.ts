import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  isFinanceCategory,
  type ExpenseCategory,
  type FinanceBudget,
  type FinanceBudgetCategoryStatus,
  type FinanceBudgetInsight,
  type FinanceBudgetOverview,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface FinanceBudgetRow {
  id: string;
  budget_month: string;
  category: string;
  amount: number | string;
  created_at: string;
  updated_at: string;
}

interface ExpenseRow {
  category: string;
  amount: number | string;
}

function jsonError(
  status: number,
  code: string,
  message: string
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function isValidMonth(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month] = value.split("-").map(Number);

  return year >= 2000 && month >= 1 && month <= 12;
}

function getCurrentMonth(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
}

function getMonthBounds(month: string): {
  start: string;
  end: string;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, monthNumber - 1, 1));
  const end = new Date(Date.UTC(year, monthNumber, 1));

  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

function getPreviousMonth(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const previous = new Date(Date.UTC(year, monthNumber - 2, 1));

  return previous.toISOString().slice(0, 7);
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    isFinanceCategory(value) &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}

function mapBudget(row: FinanceBudgetRow): FinanceBudget {
  return {
    id: row.id,
    month: row.budget_month.slice(0, 7),
    category: isExpenseCategory(row.category)
      ? row.category
      : "other_farm_expense",
    amount: Number(row.amount),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildInsights(
  categories: FinanceBudgetCategoryStatus[],
  totalBudget: number,
  totalExpense: number,
  overBudgetCount: number,
  previousMonthExpense: number
): FinanceBudgetInsight[] {
  const insights: FinanceBudgetInsight[] = [];
  const categoriesWithExpense = categories.filter(
    (category) => category.actual > 0
  );
  const highestExpense = [...categoriesWithExpense].sort(
    (left, right) => right.actual - left.actual
  )[0];

  if (totalBudget === 0) {
    insights.push({
      tone: "neutral",
      title: "เริ่มตั้งงบรายหมวด",
      description:
        "กำหนดงบสำหรับหมวดที่ใช้บ่อย เพื่อให้ระบบช่วยติดตามและแจ้งเตือนได้",
    });
  } else if (overBudgetCount > 0) {
    insights.push({
      tone: "warning",
      title: `เกินงบ ${overBudgetCount.toLocaleString("th-TH")} หมวด`,
      description:
        "ตรวจสอบรายการในหมวดที่เกินงบ และวางแผนลดค่าใช้จ่ายในช่วงที่เหลือของเดือน",
    });
  } else if (totalExpense / totalBudget >= 0.8) {
    insights.push({
      tone: "warning",
      title: "ใช้ไปมากกว่า 80% ของงบ",
      description:
        "ยังไม่เกินงบ แต่ควรติดตามค่าใช้จ่ายใกล้ชิดก่อนสิ้นเดือน",
    });
  } else {
    insights.push({
      tone: "positive",
      title: "การใช้จ่ายยังอยู่ในแผน",
      description:
        "ค่าใช้จ่ายรวมยังไม่เกินงบที่ตั้งไว้ในเดือนนี้",
    });
  }

  if (previousMonthExpense > 0) {
    const expenseChangePercent =
      ((totalExpense - previousMonthExpense) / previousMonthExpense) * 100;

    if (expenseChangePercent >= 10) {
      insights.push({
        tone: "warning",
        title: `รายจ่ายเพิ่ม ${expenseChangePercent.toLocaleString("th-TH", {
          maximumFractionDigits: 1,
        })}% จากเดือนก่อน`,
        description:
          "ลองทบทวนหมวดที่ใช้จ่ายสูงสุด เพื่อหาโอกาสลดต้นทุนในเดือนถัดไป",
      });
    } else if (expenseChangePercent <= -10) {
      insights.push({
        tone: "positive",
        title: `รายจ่ายลด ${Math.abs(expenseChangePercent).toLocaleString("th-TH", {
          maximumFractionDigits: 1,
        })}% จากเดือนก่อน`,
        description:
          "แนวโน้มค่าใช้จ่ายลดลงต่อเนื่อง รักษาวินัยการใช้จ่ายแบบนี้ไว้",
      });
    }
  }

  if (highestExpense) {
    insights.push({
      tone: "neutral",
      title: `ใช้จ่ายสูงสุด: ${FINANCE_CATEGORY_LABELS[highestExpense.category]}`,
      description: `ใช้ไป ${new Intl.NumberFormat("th-TH", {
        style: "currency",
        currency: "THB",
        maximumFractionDigits: 0,
      }).format(highestExpense.actual)} ในเดือนนี้`,
    });
  } else {
    insights.push({
      tone: "neutral",
      title: "ยังไม่มีรายจ่ายในเดือนนี้",
      description:
        "เมื่อเริ่มบันทึกรายการ ระบบจะแสดงหมวดที่ใช้จ่ายสูงและแนวโน้มให้",
    });
  }

  return insights;
}

function databaseError(
  error: { code?: string; message?: string }
): Response {
  console.error("Finance budget request failed", error);

  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(
      503,
      "BUDGET_SCHEMA_NOT_READY",
      "ระบบงบประมาณยังไม่พร้อม กรุณาติดตั้ง migration งบประมาณการเงินก่อน"
    );
  }

  return jsonError(
    500,
    "DATABASE_ERROR",
    "ไม่สามารถจัดการข้อมูลงบประมาณได้ กรุณาลองใหม่"
  );
}

async function getAuthenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

export async function GET(request: Request): Promise<Response> {
  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedUser();

    if (authError || !user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนดูงบประมาณ"
      );
    }

    const requestedMonth = new URL(request.url).searchParams
      .get("month")
      ?.trim();

    if (requestedMonth && !isValidMonth(requestedMonth)) {
      return jsonError(
        400,
        "INVALID_MONTH",
        "เดือนไม่ถูกต้อง กรุณาเลือกเดือนในรูปแบบ YYYY-MM"
      );
    }

    const month = requestedMonth || getCurrentMonth();
    const range = getMonthBounds(month);
    const previousRange = getMonthBounds(getPreviousMonth(month));
    const [budgetsResult, expensesResult, previousExpensesResult] =
      await Promise.all([
      supabase
        .from("finance_budgets")
        .select("id, budget_month, category, amount, created_at, updated_at")
        .eq("user_id", user.id)
        .eq("budget_month", range.start)
        .order("category"),
      supabase
        .from("finance_transactions")
        .select("category, amount")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", range.start)
        .lt("transaction_date", range.end),
      supabase
        .from("finance_transactions")
        .select("amount")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .gte("transaction_date", previousRange.start)
        .lt("transaction_date", previousRange.end),
      ]);

    if (budgetsResult.error) {
      return databaseError(budgetsResult.error);
    }

    if (expensesResult.error) {
      return databaseError(expensesResult.error);
    }

    if (previousExpensesResult.error) {
      return databaseError(previousExpensesResult.error);
    }

    const budgets = ((budgetsResult.data ?? []) as FinanceBudgetRow[]).map(
      mapBudget
    );
    const budgetValues = new Map<ExpenseCategory, number>();
    const actualValues = new Map<ExpenseCategory, number>();
    const transactionCounts = new Map<ExpenseCategory, number>();

    for (const budget of budgets) {
      budgetValues.set(budget.category, budget.amount);
    }

    for (const expense of (expensesResult.data ?? []) as ExpenseRow[]) {
      if (!isExpenseCategory(expense.category)) {
        continue;
      }

      actualValues.set(
        expense.category,
        (actualValues.get(expense.category) ?? 0) + Number(expense.amount)
      );
      transactionCounts.set(
        expense.category,
        (transactionCounts.get(expense.category) ?? 0) + 1
      );
    }

    const categories = EXPENSE_CATEGORIES.map((category) => {
      const budget = budgetValues.get(category) ?? 0;
      const actual = actualValues.get(category) ?? 0;

      return {
        category,
        budget: Math.round(budget * 100) / 100,
        actual: Math.round(actual * 100) / 100,
        remaining: Math.round((budget - actual) * 100) / 100,
        utilizationPercent:
          budget > 0
            ? Math.round((actual / budget) * 10_000) / 100
            : null,
        transactionCount: transactionCounts.get(category) ?? 0,
      } satisfies FinanceBudgetCategoryStatus;
    });
    const totalBudget = budgets.reduce(
      (total, budget) => total + budget.amount,
      0
    );
    const totalExpense = categories.reduce(
      (total, category) => total + category.actual,
      0
    );
    const previousMonthExpense = (
      previousExpensesResult.data ?? []
    ).reduce(
      (total, expense) => total + Number(expense.amount),
      0
    );
    const overBudgetCount = categories.filter(
      (category) => category.budget > 0 && category.actual > category.budget
    ).length;
    const overview: FinanceBudgetOverview = {
      month,
      totalBudget: Math.round(totalBudget * 100) / 100,
      totalExpense: Math.round(totalExpense * 100) / 100,
      remaining: Math.round((totalBudget - totalExpense) * 100) / 100,
      utilizationPercent:
        totalBudget > 0
          ? Math.round((totalExpense / totalBudget) * 10_000) / 100
          : null,
      previousMonthExpense:
        Math.round(previousMonthExpense * 100) / 100,
      expenseChangePercent:
        previousMonthExpense > 0
          ? Math.round(
              ((totalExpense - previousMonthExpense) /
                previousMonthExpense) *
                10_000
            ) / 100
          : null,
      overBudgetCount,
      budgets,
      categories,
      insights: buildInsights(
        categories,
        totalBudget,
        totalExpense,
        overBudgetCount,
        previousMonthExpense
      ),
    };

    return Response.json(
      { data: overview },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected finance budget error", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถโหลดข้อมูลงบประมาณได้ กรุณาลองใหม่"
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง");
  }

  if (!payload || typeof payload !== "object") {
    return jsonError(400, "INVALID_REQUEST", "ข้อมูลตั้งงบไม่ครบถ้วน");
  }

  const value = payload as Record<string, unknown>;
  const month = value.month;
  const category = value.category;
  const amount =
    typeof value.amount === "number"
      ? Math.round(value.amount * 100) / 100
      : Number.NaN;

  if (
    !isValidMonth(month) ||
    !isExpenseCategory(category) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 999_999_999_999.99
  ) {
    return jsonError(
      400,
      "INVALID_BUDGET",
      "กรุณาเลือกเดือน หมวดรายจ่าย และจำนวนงบที่ถูกต้อง"
    );
  }

  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedUser();

    if (authError || !user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนตั้งงบประมาณ"
      );
    }

    const { data, error } = await supabase
      .from("finance_budgets")
      .upsert(
        {
          user_id: user.id,
          budget_month: `${month}-01`,
          category,
          amount,
        },
        { onConflict: "user_id,budget_month,category" }
      )
      .select("id, budget_month, category, amount, created_at, updated_at")
      .single();

    if (error) {
      return databaseError(error);
    }

    return Response.json(
      { data: mapBudget(data as FinanceBudgetRow) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected finance budget save error", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถบันทึกงบประมาณได้ กรุณาลองใหม่"
    );
  }
}

export async function DELETE(request: Request): Promise<Response> {
  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedUser();

    if (authError || !user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนลบงบประมาณ"
      );
    }

    const url = new URL(request.url);
    const month = url.searchParams.get("month")?.trim();
    const category = url.searchParams.get("category")?.trim();

    if (!isValidMonth(month) || !isExpenseCategory(category)) {
      return jsonError(
        400,
        "INVALID_BUDGET",
        "ข้อมูลงบประมาณที่ต้องการลบไม่ถูกต้อง"
      );
    }

    const { error } = await supabase
      .from("finance_budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("budget_month", `${month}-01`)
      .eq("category", category);

    if (error) {
      return databaseError(error);
    }

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected finance budget delete error", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถลบงบประมาณได้ กรุณาลองใหม่"
    );
  }
}
