import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  INCOME_CATEGORIES,
  type FinanceSettings,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function mapSettings(row: {
  onboarding_completed_at: string | null;
  budget_cycle_start_day: number;
} | null): FinanceSettings {
  return {
    onboardingCompleted: Boolean(row?.onboarding_completed_at),
    budgetCycleStartDay: row?.budget_cycle_start_day ?? 1,
  };
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  return { supabase, user, error };
}

function databaseError(error: { code?: string; message?: string }): Response {
  console.error("Finance settings request failed", error);

  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(503, "FINANCE_WORKSPACE_SCHEMA_NOT_READY", "ระบบการเงินแบบเต็มยังไม่พร้อม กรุณาติดตั้ง migration 202608200001 ก่อน");
  }

  return jsonError(500, "DATABASE_ERROR", "ไม่สามารถบันทึกการตั้งค่าการเงินได้");
}

export async function GET(): Promise<Response> {
  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
    }

    const result = await supabase
      .from("finance_user_settings")
      .select("onboarding_completed_at, budget_cycle_start_day")
      .eq("user_id", user.id)
      .maybeSingle();

    if (result.error) {
      return databaseError(result.error);
    }

    return Response.json({ data: mapSettings(result.data) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unexpected finance settings error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดการตั้งค่าได้");
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: Record<string, unknown>;

  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง");
  }

  const onboardingCompleted = payload.onboardingCompleted === true;
  const budgetCycleStartDay = payload.budgetCycleStartDay;
  const rawSelectedCategoryKeys = payload.selectedCategoryKeys;
  const hasSelectedCategoryKeys = Array.isArray(rawSelectedCategoryKeys);
  const selectedCategoryKeys: string[] = hasSelectedCategoryKeys
    ? rawSelectedCategoryKeys.filter(
        (value: unknown): value is string => typeof value === "string"
      )
    : [];
  const knownCategoryKeys = new Set<string>([...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES]);

  if (
    budgetCycleStartDay !== undefined &&
    (typeof budgetCycleStartDay !== "number" || !Number.isInteger(budgetCycleStartDay) || budgetCycleStartDay < 1 || budgetCycleStartDay > 28)
  ) {
    return jsonError(400, "INVALID_BUDGET_CYCLE", "วันเริ่มรอบงบต้องอยู่ระหว่างวันที่ 1 ถึง 28");
  }

  if (selectedCategoryKeys.some((key) => !knownCategoryKeys.has(key))) {
    return jsonError(400, "INVALID_CATEGORY", "พบหมวดเริ่มต้นที่ไม่ถูกต้อง");
  }

  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
    }

    const result = await supabase
      .from("finance_user_settings")
      .upsert({
        user_id: user.id,
        onboarding_completed_at: onboardingCompleted ? new Date().toISOString() : null,
        ...(budgetCycleStartDay !== undefined ? { budget_cycle_start_day: budgetCycleStartDay } : {}),
      }, { onConflict: "user_id" })
      .select("onboarding_completed_at, budget_cycle_start_day")
      .single();

    if (result.error) {
      return databaseError(result.error);
    }

    if (hasSelectedCategoryKeys) {
      const existingResult = await supabase
        .from("finance_categories")
        .select("category_key, name, icon, sort_order")
        .eq("user_id", user.id)
        .eq("is_custom", false);

      if (existingResult.error) {
        return databaseError(existingResult.error);
      }

      const existingByKey = new Map(
        (existingResult.data ?? []).map((category) => [
          category.category_key as string,
          category,
        ])
      );
      const categoryRows = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((categoryKey, index) => {
        const existing = existingByKey.get(categoryKey);

        return {
          user_id: user.id,
          category_key: categoryKey,
          name:
            (existing?.name as string | undefined) ??
            FINANCE_CATEGORY_LABELS[
              categoryKey as keyof typeof FINANCE_CATEGORY_LABELS
            ],
          transaction_type: (EXPENSE_CATEGORIES as readonly string[]).includes(categoryKey)
            ? "expense"
            : "income",
          is_custom: false,
          is_enabled: selectedCategoryKeys.includes(categoryKey),
          icon: (existing?.icon as string | undefined) ?? "receipt",
          sort_order:
            (existing?.sort_order as number | undefined) ?? index,
        };
      });

      if (categoryRows.length > 0) {
        const categoriesResult = await supabase
          .from("finance_categories")
          .upsert(categoryRows, { onConflict: "user_id,category_key" });

        if (categoriesResult.error) {
          return databaseError(categoriesResult.error);
        }
      }
    }

    return Response.json({ data: mapSettings(result.data) }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Unexpected finance settings save error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถบันทึกการตั้งค่าได้");
  }
}
