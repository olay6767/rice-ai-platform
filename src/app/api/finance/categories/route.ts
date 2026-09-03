import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  INCOME_CATEGORIES,
  isFinanceTransactionType,
  type FinanceCategoryOption,
  type FinanceTransactionType,
  type KnownFinanceCategory,
} from "@/lib/finance/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface CategoryRow {
  id: string;
  category_key: string;
  name: string;
  transaction_type: FinanceTransactionType;
  icon: string;
  is_custom: boolean;
  is_enabled: boolean;
  sort_order: number;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: { "Cache-Control": "no-store" } });
}

function mapRow(row: CategoryRow): FinanceCategoryOption {
  return {
    id: row.id,
    key: row.category_key,
    name: row.name,
    transactionType: row.transaction_type,
    icon: row.icon,
    isCustom: row.is_custom,
    isEnabled: row.is_enabled,
    sortOrder: row.sort_order,
  };
}

function defaultOptions(): FinanceCategoryOption[] {
  return [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].map((key, index) => ({
    key,
    name: FINANCE_CATEGORY_LABELS[key as KnownFinanceCategory],
    transactionType: (EXPENSE_CATEGORIES as readonly string[]).includes(key) ? "expense" : "income",
    icon: "receipt",
    isCustom: false,
    isEnabled: true,
    sortOrder: index,
  }));
}

function defaultOptionForKey(
  key: string
): FinanceCategoryOption | undefined {
  return defaultOptions().find((option) => option.key === key);
}

async function getUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return { supabase, user, error };
}

function databaseError(error: { code?: string; message?: string }): Response {
  console.error("Finance categories request failed", error);
  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(503, "FINANCE_WORKSPACE_SCHEMA_NOT_READY", "ระบบจัดการหมวดยังไม่พร้อม กรุณาติดตั้ง migration 202608200001 ก่อน");
  }
  return jsonError(500, "DATABASE_ERROR", "ไม่สามารถจัดการหมวดการเงินได้");
}

export async function GET(): Promise<Response> {
  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");

    const result = await supabase
      .from("finance_categories")
      .select("id, category_key, name, transaction_type, icon, is_custom, is_enabled, sort_order")
      .eq("user_id", user.id)
      .order("sort_order");
    if (result.error) return databaseError(result.error);

    const overrides = new Map((result.data as CategoryRow[]).map((row) => [row.category_key, mapRow(row)]));
    const builtIns = defaultOptions().map((option) => overrides.get(option.key) ?? option);
    const custom = (result.data as CategoryRow[])
      .map(mapRow)
      .filter((option) => option.isCustom);

    return Response.json({ data: [...builtIns, ...custom] }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unexpected finance categories error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดหมวดการเงินได้");
  }
}

export async function POST(request: Request): Promise<Response> {
  let payload: Record<string, unknown>;
  try { payload = (await request.json()) as Record<string, unknown>; } catch { return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const transactionType = payload.transactionType;
  const icon = typeof payload.icon === "string" ? payload.icon.trim().slice(0, 40) : "receipt";

  if (!name || name.length > 80 || !isFinanceTransactionType(transactionType)) {
    return jsonError(400, "INVALID_CATEGORY", "กรุณาระบุชื่อหมวดและประเภทรายการให้ถูกต้อง");
  }

  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
    const categoryKey = `custom_${crypto.randomUUID().replaceAll("-", "")}`;
    const result = await supabase
      .from("finance_categories")
      .insert({ user_id: user.id, category_key: categoryKey, name, transaction_type: transactionType, icon: icon || "receipt", is_custom: true })
      .select("id, category_key, name, transaction_type, icon, is_custom, is_enabled, sort_order")
      .single();
    if (result.error) return databaseError(result.error);
    return Response.json({ data: mapRow(result.data as CategoryRow) }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unexpected finance category create error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถเพิ่มหมวดได้");
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: Record<string, unknown>;
  try { payload = (await request.json()) as Record<string, unknown>; } catch { return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง"); }
  const id = typeof payload.id === "string" ? payload.id : "";
  const categoryKey =
    typeof payload.categoryKey === "string"
      ? payload.categoryKey.trim()
      : "";
  const updates: Record<string, unknown> = {};
  if (typeof payload.name === "string" && payload.name.trim() && payload.name.trim().length <= 80) updates.name = payload.name.trim();
  if (typeof payload.isEnabled === "boolean") updates.is_enabled = payload.isEnabled;
  if (Number.isInteger(payload.sortOrder)) updates.sort_order = payload.sortOrder;
  if (
    Object.keys(updates).length === 0 ||
    (!id && !defaultOptionForKey(categoryKey))
  ) {
    return jsonError(400, "INVALID_CATEGORY", "ไม่มีข้อมูลหมวดที่ต้องการแก้ไข");
  }

  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
    if (!id) {
      const existing = await supabase
        .from("finance_categories")
        .select("id")
        .eq("user_id", user.id)
        .eq("category_key", categoryKey)
        .maybeSingle();

      if (existing.error) return databaseError(existing.error);

      if (existing.data?.id) {
        const result = await supabase
          .from("finance_categories")
          .update(updates)
          .eq("id", existing.data.id)
          .eq("user_id", user.id)
          .select("id, category_key, name, transaction_type, icon, is_custom, is_enabled, sort_order")
          .single();

        if (result.error) return databaseError(result.error);

        return Response.json(
          { data: mapRow(result.data as CategoryRow) },
          { headers: { "Cache-Control": "no-store" } }
        );
      }

      const defaultOption = defaultOptionForKey(categoryKey);

      if (!defaultOption) {
        return jsonError(400, "INVALID_CATEGORY", "ไม่พบหมวดมาตรฐานที่เลือก");
      }

      const created = await supabase
        .from("finance_categories")
        .insert({
          user_id: user.id,
          category_key: defaultOption.key,
          name: updates.name ?? defaultOption.name,
          transaction_type: defaultOption.transactionType,
          icon: defaultOption.icon,
          is_custom: false,
          is_enabled: updates.is_enabled ?? defaultOption.isEnabled,
          sort_order: updates.sort_order ?? defaultOption.sortOrder,
        })
        .select("id, category_key, name, transaction_type, icon, is_custom, is_enabled, sort_order")
        .single();

      if (created.error) return databaseError(created.error);

      return Response.json(
        { data: mapRow(created.data as CategoryRow) },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const result = await supabase.from("finance_categories").update(updates).eq("id", id).eq("user_id", user.id)
      .select("id, category_key, name, transaction_type, icon, is_custom, is_enabled, sort_order").single();
    if (result.error) return databaseError(result.error);
    return Response.json({ data: mapRow(result.data as CategoryRow) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unexpected finance category update error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถแก้ไขหมวดได้");
  }
}

export async function DELETE(request: Request): Promise<Response> {
  const id = new URL(request.url).searchParams.get("id")?.trim();
  if (!id) return jsonError(400, "INVALID_CATEGORY", "ไม่พบหมวดที่ต้องการลบ");
  try {
    const { supabase, user, error } = await getUser();
    if (error || !user) return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนใช้งาน");
    const result = await supabase.from("finance_categories").delete().eq("id", id).eq("user_id", user.id).eq("is_custom", true);
    if (result.error) return databaseError(result.error);
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected finance category delete error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถลบหมวดได้");
  }
}
