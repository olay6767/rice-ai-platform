import {
  isCategoryForType,
  isFinanceCategory,
  isFinanceTransactionType,
  type FinanceCategory,
  type FinanceOverview,
  type FinanceTrendPeriod,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface FinanceTransactionRow {
  id: string;
  transaction_type: string;
  category: string;
  amount: number | string;
  description: string;
  transaction_date: string;
  source_text: string;
  ai_confidence: number | string | null;
  transaction_time: string | null;
  notes: string;
  source: string;
  account_id: string | null;
  updated_at: string;
  created_at: string;
}

interface FinanceAnalyticsRow {
  transaction_type: string;
  category: string;
  amount: number | string;
  transaction_date: string;
}

const SELECT_FIELDS =
  "id, transaction_type, category, amount, description, transaction_date, transaction_time, notes, source, account_id, source_text, ai_confidence, created_at, updated_at";

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

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function isValidMonth(value: string): boolean {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month] = value.split("-").map(Number);

  return year >= 2000 && month >= 1 && month <= 12;
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

function getYearBounds(year: number): {
  start: string;
  end: string;
} {
  return {
    start: `${year}-01-01`,
    end: `${year + 1}-01-01`,
  };
}

function getYearTrendRange(year: number, throughMonth: number): {
  start: string;
  end: string;
  periods: string[];
} {
  return {
    ...getYearBounds(year),
    periods: Array.from(
      { length: throughMonth },
      (_, index) => `${year}-${String(index + 1).padStart(2, "0")}`
    ),
  };
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    )
  );
}

function isValidTime(value: unknown): value is string | null {
  return (
    value === null ||
    value === undefined ||
    (typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(value))
  );
}

function isFinanceSource(value: unknown): value is "chat" | "manual" | "recurring" | "receipt" | "voice" | "pdf" {
  return (
    value === "chat" ||
    value === "manual" ||
    value === "recurring" ||
    value === "receipt" ||
    value === "voice" ||
    value === "pdf"
  );
}

function getBangkokDateParts(): { year: number; month: number; day: number } {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month] = today.split("-").map(Number);
  const day = Number(today.slice(-2));

  return { year, month, day };
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getFinanceRange(): { currentMonth: string } {
  const { year, month } = getBangkokDateParts();

  return {
    currentMonth: `${year}-${String(month).padStart(2, "0")}`,
  };
}

function getTrendRange(period: FinanceTrendPeriod, anchorMonth?: string): {
  start: string;
  end: string;
  periods: string[];
} {
  const currentDate = getBangkokDateParts();
  const [anchorYear, anchorMonthNumber] = anchorMonth
    ? anchorMonth.split("-").map(Number)
    : [currentDate.year, currentDate.month];
  const year = anchorYear;
  const month = anchorMonthNumber;
  const day = currentDate.day;
  const toMonth = (date: Date) => date.toISOString().slice(0, 7);

  if (period === "week") {
    const endDate = new Date(Date.UTC(year, month - 1, day + 1));
    const startDate = new Date(Date.UTC(year, month - 1, day - 6));

    return {
      start: toIsoDate(startDate),
      end: toIsoDate(endDate),
      periods: Array.from({ length: 7 }, (_, index) =>
        toIsoDate(
          new Date(
            Date.UTC(
              startDate.getUTCFullYear(),
              startDate.getUTCMonth(),
              startDate.getUTCDate() + index
            )
          )
        )
      ),
    };
  }

  if (period === "year") {
    const startYear = year - 4;

    return {
      start: `${startYear}-01-01`,
      end: `${year + 1}-01-01`,
      periods: Array.from({ length: 5 }, (_, index) => String(startYear + index)),
    };
  }

  const rangeStart = new Date(Date.UTC(year, month - 6, 1));
  const rangeEnd = new Date(Date.UTC(year, month, 1));

  return {
    start: toIsoDate(rangeStart),
    end: toIsoDate(rangeEnd),
    periods: Array.from({ length: 6 }, (_, index) =>
      toMonth(
        new Date(
          Date.UTC(
            rangeStart.getUTCFullYear(),
            rangeStart.getUTCMonth() + index,
            1
          )
        )
      )
    ),
  };
}

function isFinanceTrendPeriod(value: string | null): value is FinanceTrendPeriod {
  return value === "week" || value === "month" || value === "year";
}

function getTrendKey(transactionDate: string, period: FinanceTrendPeriod): string {
  if (period === "week") return transactionDate;
  if (period === "year") return transactionDate.slice(0, 4);
  return transactionDate.slice(0, 7);
}

function mapRow(row: FinanceTransactionRow): SavedFinanceTransaction {
  return {
    id: row.id,
    transactionType:
      row.transaction_type === "income" ? "income" : "expense",
    category: isFinanceCategory(row.category)
      ? row.category
      : row.transaction_type === "income"
        ? "other_farm_income"
        : "other_farm_expense",
    amount: Number(row.amount),
    description: row.description,
    transactionDate: row.transaction_date,
    transactionTime: row.transaction_time,
    notes: row.notes,
    source: isFinanceSource(row.source) ? row.source : "chat",
    accountId: row.account_id,
    sourceText: row.source_text,
    confidence:
      row.ai_confidence === null ? 0 : Number(row.ai_confidence),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function databaseErrorResponse(
  error: { code?: string; message?: string }
): Response {
  console.error("Finance database request failed", error);

  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(
      503,
      "FINANCE_SCHEMA_NOT_READY",
      "ระบบการเงินยังไม่พร้อม กรุณาติดตั้ง migration 202607240001_create_finance_transactions.sql ก่อน"
    );
  }

  if (error.code === "42703") {
    return jsonError(
      503,
      "FINANCE_SCHEMA_OUTDATED",
      "โครงสร้างตารางการเงินเป็นเวอร์ชันเก่า กรุณาติดตั้ง migration การเงินให้ครบตามลำดับ"
    );
  }

  if (
    error.code === "23514" &&
    error.message?.includes("finance_transactions_category_matches_type")
  ) {
    return jsonError(
      503,
      "FINANCE_CATEGORY_SCHEMA_OUTDATED",
      "หมวดการเงินเกษตรยังไม่ได้ติดตั้ง กรุณารัน migration 202608060005_repair_finance_transaction_categories.sql แล้วลองบันทึกอีกครั้ง"
    );
  }

  if (error.code === "42501") {
    return jsonError(
      403,
      "FINANCE_ACCESS_DENIED",
      "บัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูลการเงิน กรุณาออกจากระบบและเข้าสู่ระบบใหม่"
    );
  }

  return jsonError(
    500,
    "DATABASE_ERROR",
    "ไม่สามารถโหลดหรือบันทึกข้อมูลการเงินได้ กรุณาลองใหม่"
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
        "กรุณาเข้าสู่ระบบก่อนดูข้อมูลการเงิน"
      );
    }

    const range = getFinanceRange();
    const url = new URL(request.url);
    const requestedMonth = url.searchParams.get("month")?.trim();
    const requestedScope = url.searchParams.get("scope")?.trim();
    const requestedTrendPeriod = url.searchParams.get("trendPeriod");
    const requestedCategory = url.searchParams
      .get("category")
      ?.trim();

    if (requestedMonth && !isValidMonth(requestedMonth)) {
      return jsonError(
        400,
        "INVALID_MONTH",
        "เดือนไม่ถูกต้อง กรุณาเลือกเดือนในรูปแบบ YYYY-MM"
      );
    }

    if (requestedScope && requestedScope !== "month" && requestedScope !== "year") {
      return jsonError(
        400,
        "INVALID_SCOPE",
        "ช่วงเวลาสรุปไม่ถูกต้อง"
      );
    }

    if (requestedTrendPeriod && !isFinanceTrendPeriod(requestedTrendPeriod)) {
      return jsonError(
        400,
        "INVALID_TREND_PERIOD",
        "ช่วงเวลาของกราฟไม่ถูกต้อง"
      );
    }

    if (requestedCategory && !isFinanceCategory(requestedCategory)) {
      return jsonError(
        400,
        "INVALID_CATEGORY",
        "หมวดหมู่ที่เลือกไม่ถูกต้อง"
      );
    }

    const selectedMonth = requestedMonth || range.currentMonth;
    const selectedYear = Number(selectedMonth.slice(0, 4));
    const selectedMonthNumber = Number(selectedMonth.slice(5, 7));
    const selectedRange = requestedScope === "year"
      ? getYearBounds(selectedYear)
      : getMonthBounds(selectedMonth);
    const trendPeriod: FinanceTrendPeriod = isFinanceTrendPeriod(
      requestedTrendPeriod
    )
      ? requestedTrendPeriod
      : "month";
    const trendRange = requestedScope === "year"
      ? getYearTrendRange(selectedYear, selectedMonthNumber)
      : getTrendRange(trendPeriod, requestedMonth);
    const selectedCategory = requestedCategory as
      | FinanceCategory
      | undefined;
    let recentQuery = supabase
      .from("finance_transactions")
      .select(SELECT_FIELDS)
      .eq("user_id", user.id)
      .gte("transaction_date", selectedRange.start)
      .lt("transaction_date", selectedRange.end)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);
    let summaryQuery = supabase
      .from("finance_transactions")
      .select("transaction_type, category, amount, transaction_date")
      .eq("user_id", user.id)
      .gte("transaction_date", selectedRange.start)
      .lt("transaction_date", selectedRange.end);
    let trendQuery = supabase
      .from("finance_transactions")
      .select("transaction_type, category, amount, transaction_date")
      .eq("user_id", user.id)
      .gte("transaction_date", trendRange.start)
      .lt("transaction_date", trendRange.end);

    if (selectedCategory) {
      recentQuery = recentQuery.eq("category", selectedCategory);
      summaryQuery = summaryQuery.eq("category", selectedCategory);
      trendQuery = trendQuery.eq("category", selectedCategory);
    }

    const [recentResult, summaryResult, trendResult] = await Promise.all([
      recentQuery,
      summaryQuery,
      trendQuery,
    ]);

    if (recentResult.error) {
      return databaseErrorResponse(recentResult.error);
    }

    if (trendResult.error) {
      return databaseErrorResponse(trendResult.error);
    }

    if (summaryResult.error) {
      return databaseErrorResponse(summaryResult.error);
    }

    let income = 0;
    let expense = 0;
    let transactionCount = 0;
    const trendValues = new Map<
      string,
      { income: number; expense: number }
    >();
    const categoryValues = new Map<
      string,
      {
        category: FinanceCategory;
        transactionType: "income" | "expense";
        amount: number;
      }
    >();

    for (const periodValue of trendRange.periods) {
      trendValues.set(periodValue, { income: 0, expense: 0 });
    }

    for (const row of (trendResult.data ?? []) as FinanceAnalyticsRow[]) {
      const amount = Number(row.amount);
      const trendKey = getTrendKey(row.transaction_date, trendPeriod);
      const trendTotals = trendValues.get(trendKey);
      const isIncome = row.transaction_type === "income";

      if (trendTotals) {
        if (isIncome) {
          trendTotals.income += amount;
        } else {
          trendTotals.expense += amount;
        }
      }
    }

    for (const row of (summaryResult.data ?? []) as FinanceAnalyticsRow[]) {
      const amount = Number(row.amount);
      const isIncome = row.transaction_type === "income";
      transactionCount += 1;

      if (isIncome) {
        income += amount;
      } else {
        expense += amount;
      }

      if (
        !isFinanceTransactionType(row.transaction_type) ||
        !isFinanceCategory(row.category) ||
        !isCategoryForType(row.category, row.transaction_type)
      ) {
        continue;
      }

      const categoryKey = `${row.transaction_type}:${row.category}`;
      const currentCategory = categoryValues.get(categoryKey);

      categoryValues.set(categoryKey, {
        category: row.category,
        transactionType: row.transaction_type,
        amount: (currentCategory?.amount ?? 0) + amount,
      });
    }

    const overview: FinanceOverview = {
      summary: {
        income: Math.round(income * 100) / 100,
        expense: Math.round(expense * 100) / 100,
        balance: Math.round((income - expense) * 100) / 100,
        saving: Math.round((income - expense) * 100) / 100,
        savingRate:
          income > 0
            ? Math.round(((income - expense) / income) * 10_000) / 100
            : null,
        transactionCount,
        month: selectedMonth,
      },
      transactions: ((recentResult.data ?? []) as FinanceTransactionRow[]).map(
        mapRow
      ),
      categoryBreakdown: Array.from(categoryValues.values()).map((value) => ({
        ...value,
        amount: Math.round(value.amount * 100) / 100,
      })),
      trendPeriod,
      trend: trendRange.periods.map((periodValue) => {
        const value = trendValues.get(periodValue) ?? {
          income: 0,
          expense: 0,
        };

        return {
          period: periodValue,
          income: Math.round(value.income * 100) / 100,
          expense: Math.round(value.expense * 100) / 100,
        };
      }),
    };

    return Response.json(
      { data: overview },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected finance overview error", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถโหลดข้อมูลการเงินได้ กรุณาลองใหม่"
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
    return jsonError(400, "INVALID_REQUEST", "ข้อมูลรายการไม่ครบถ้วน");
  }

  const value = payload as Record<string, unknown>;
  const transactionType = value.transactionType;
  const category = value.category;
  const amount =
    typeof value.amount === "number"
      ? Math.round(value.amount * 100) / 100
      : Number.NaN;
  const description =
    typeof value.description === "string" ? value.description.trim() : "";
  const transactionDate =
    typeof value.transactionDate === "string" ? value.transactionDate : "";
  const sourceText =
    typeof value.sourceText === "string" ? value.sourceText.trim() : "";
  const clientRequestId =
    typeof value.clientRequestId === "string" ? value.clientRequestId : "";
  const confidence =
    typeof value.confidence === "number"
      ? Math.min(1, Math.max(0, value.confidence))
      : null;
  const transactionTime =
    typeof value.transactionTime === "string" && value.transactionTime.trim()
      ? value.transactionTime.trim()
      : null;
  const notes = typeof value.notes === "string" ? value.notes.trim() : "";
  const source = isFinanceSource(value.source) ? value.source : "chat";
  const accountId = value.accountId === null || value.accountId === undefined
    ? null
    : value.accountId;

  if (
    !isFinanceTransactionType(transactionType) ||
    !isFinanceCategory(category) ||
    !isCategoryForType(category, transactionType) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    amount > 999_999_999_999.99 ||
    !description ||
    description.length > 200 ||
    !sourceText ||
    sourceText.length > 1_000 ||
    !isValidTime(transactionTime) ||
    notes.length > 1_000 ||
    (accountId !== null && !isValidUuid(accountId)) ||
    !isValidIsoDate(transactionDate) ||
    !isValidUuid(clientRequestId)
  ) {
    return jsonError(
      400,
      "INVALID_TRANSACTION",
      "ข้อมูลไม่ถูกต้อง กรุณาให้ AI วิเคราะห์รายการใหม่"
    );
  }

  try {
    const { supabase, user, error: authError } =
      await getAuthenticatedUser();

    if (authError || !user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนบันทึกรายการ"
      );
    }

    const model =
      process.env.GEMINI_FINANCE_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      null;

    const knownCategory = [
      "seed", "fertilizer", "pesticide", "labor", "irrigation",
      "fuel_transport", "land_rent", "machinery", "other_farm_expense",
      "food", "coffee", "transport", "housing", "phone_internet",
      "utilities_water", "utilities_electricity", "health", "education",
      "shopping", "entertainment", "subscription", "debt", "family",
      "other_expense", "rice_sales", "farm_support", "other_farm_income",
      "salary", "wage", "side_income", "product_sales", "business", "bonus",
      "interest", "dividend", "cashback", "transfer", "other_income",
    ].includes(category);

    if (!knownCategory) {
      const customCategory = await supabase
        .from("finance_categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("category_key", category)
        .eq("transaction_type", transactionType)
        .eq("is_enabled", true)
        .maybeSingle();

      if (customCategory.error || !customCategory.data) {
        return jsonError(
          400,
          "INVALID_CATEGORY",
          "ไม่พบหมวดที่เลือก หรือหมวดนี้ถูกปิดใช้งานแล้ว"
        );
      }
    }

    const insertResult = await supabase
      .from("finance_transactions")
      .insert({
        user_id: user.id,
        client_request_id: clientRequestId,
        transaction_type: transactionType,
        category,
        amount,
        description,
        transaction_date: transactionDate,
        transaction_time: transactionTime,
        notes,
        source,
        account_id: accountId,
        source_text: sourceText,
        ai_model: model,
        ai_confidence: confidence,
      })
      .select(SELECT_FIELDS)
      .single();

    if (insertResult.error?.code === "23505") {
      const existingResult = await supabase
        .from("finance_transactions")
        .select(SELECT_FIELDS)
        .eq("user_id", user.id)
        .eq("client_request_id", clientRequestId)
        .single();

      if (existingResult.error) {
        return databaseErrorResponse(existingResult.error);
      }

      return Response.json({
        data: mapRow(existingResult.data as FinanceTransactionRow),
      });
    }

    if (insertResult.error) {
      return databaseErrorResponse(insertResult.error);
    }

    return Response.json(
      { data: mapRow(insertResult.data as FinanceTransactionRow) },
      {
        status: 201,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Unexpected finance save error", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่"
    );
  }
}
