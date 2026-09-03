import type { User } from "@supabase/supabase-js";

import {
  isAdminResource,
  type AdminResource,
} from "@/lib/admin/types";

export const ADMIN_RESOURCE_CONFIG: Record<
  AdminResource,
  {
    table: string;
    select: string;
    orderColumn: string;
    label: string;
  }
> = {
  posts: {
    table: "news_posts",
    select:
      "id, title, summary, body, category, source_name, image_url, image_alt, is_featured, status, published_at, created_at, updated_at",
    orderColumn: "updated_at",
    label: "ข่าวหรืออินโฟกราฟิก",
  },
  alerts: {
    table: "management_alerts",
    select:
      "id, title, description, alert_type, severity, area_name, is_active, starts_at, expires_at, created_at, updated_at",
    orderColumn: "updated_at",
    label: "การแจ้งเตือน",
  },
  prices: {
    table: "rice_price_updates",
    select:
      "id, rice_type, price_per_ton, trend, change_percent, market_name, observed_at, is_published, created_at, updated_at",
    orderColumn: "observed_at",
    label: "ราคาข้าว",
  },
  recommendations: {
    table: "farmer_recommendations",
    select:
      "id, title, description, category, priority, is_active, starts_at, expires_at, created_at, updated_at",
    orderColumn: "updated_at",
    label: "คำแนะนำเกษตรกร",
  },
};

export interface AdminDatabaseError {
  code?: string;
  message?: string;
}

export type AdminDatabaseRecord = Record<string, unknown> & { id: string };

interface AdminDatabaseQuery {
  select(columns: string): AdminDatabaseQuery;
  order(column: string, options: { ascending: boolean }): AdminDatabaseQuery;
  limit(count: number): AdminDatabaseQuery;
  insert(value: unknown): AdminDatabaseQuery;
  update(value: unknown): AdminDatabaseQuery;
  delete(): AdminDatabaseQuery;
  eq(column: string, value: string): AdminDatabaseQuery;
  single(): Promise<{ data: AdminDatabaseRecord | null; error: AdminDatabaseError | null }>;
  maybeSingle(): Promise<{ data: AdminDatabaseRecord | null; error: AdminDatabaseError | null }>;
  then<TResult1 = { data: AdminDatabaseRecord[] | null; error: AdminDatabaseError | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: AdminDatabaseRecord[] | null; error: AdminDatabaseError | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>;
}

interface AdminDatabaseClient {
  from(table: string): AdminDatabaseQuery;
}

/**
 * ตารางที่จัดการถูกเลือกจาก URL แบบ dynamic จึงใช้ type แคบเฉพาะคำสั่ง PostgREST
 * ส่วน schema และ validation ถูกกำหนดไว้ใน ADMIN_RESOURCE_CONFIG และ parseAdminContent.
 */
export function asAdminDatabaseClient(client: unknown): AdminDatabaseClient {
  return client as AdminDatabaseClient;
}

const POST_CATEGORIES = [
  "weather",
  "disease",
  "pest",
  "price",
  "knowledge",
  "disaster",
] as const;
const ALERT_TYPES = [
  "weather",
  "disease",
  "pest",
  "disaster",
  "price",
  "general",
] as const;
const RECOMMENDATION_CATEGORIES = [
  "water",
  "fertilizer",
  "disease",
  "harvest",
  "cost",
  "general",
] as const;

type InputRecord = Record<string, unknown>;

export function getResource(value: string | null): AdminResource | null {
  return value && isAdminResource(value) ? value : null;
}

function optionalText(value: unknown, maxLength = 2_000): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("รูปแบบข้อความไม่ถูกต้อง");
  }

  const text = value.trim();

  if (text.length > maxLength) {
    throw new Error("ข้อความยาวเกินกว่าที่ระบบรองรับ");
  }

  return text || null;
}

function requiredText(value: unknown, fieldName: string, maxLength: number): string {
  const text = optionalText(value, maxLength);

  if (!text || text.length < 2) {
    throw new Error(`กรุณาระบุ${fieldName}`);
  }

  return text;
}

function imageUrl(value: unknown): string | null {
  const url = optionalText(value, 2_000);

  if (!url) {
    return null;
  }

  if (url.startsWith("/") && !url.startsWith("//")) {
    return url;
  }

  const configuredSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!configuredSupabaseUrl) {
    throw new Error("กรุณาอัปโหลดรูปภาพหรือใช้รูปภาพภายในระบบ");
  }

  try {
    const candidate = new URL(url);
    const supabase = new URL(configuredSupabaseUrl);

    if (
      candidate.protocol !== "https:" ||
      candidate.origin !== supabase.origin ||
      !candidate.pathname.startsWith("/storage/v1/object/public/admin-media/")
    ) {
      throw new Error();
    }

    return candidate.href;
  } catch {
    throw new Error("กรุณาใช้รูปที่อัปโหลดจากหลังบ้านหรือพาธรูปภาพภายในระบบ");
  }
}

function enumValue<T extends readonly string[]>(
  value: unknown,
  accepted: T,
  fieldName: string
): T[number] {
  if (typeof value !== "string" || !accepted.includes(value)) {
    throw new Error(`${fieldName}ไม่ถูกต้อง`);
  }

  return value as T[number];
}

function boolValue(value: unknown, defaultValue: boolean): boolean {
  return typeof value === "boolean" ? value : defaultValue;
}

function numericValue(
  value: unknown,
  fieldName: string,
  min: number,
  max: number,
  defaultValue?: number
): number {
  if (value === null || value === undefined || value === "") {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new Error(`กรุณาระบุ${fieldName}`);
  }

  const numberValue = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new Error(`${fieldName}ไม่ถูกต้อง`);
  }

  return Math.round(numberValue * 100) / 100;
}

function dateValue(
  value: unknown,
  fieldName: string,
  defaultValue?: string
): string | null {
  if (value === null || value === undefined || value === "") {
    return defaultValue ?? null;
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new Error(`${fieldName}ไม่ถูกต้อง`);
  }

  return new Date(value).toISOString();
}

function validateTimeRange(startsAt: string, expiresAt: string | null): void {
  if (expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error("วันสิ้นสุดต้องอยู่หลังวันเริ่มต้น");
  }
}

function parsePost(value: InputRecord, user: User, isUpdate: boolean) {
  const status = enumValue(value.status ?? "draft", ["draft", "published"] as const, "สถานะ");
  const publishedAt = dateValue(
    value.publishedAt,
    "วันเผยแพร่",
    status === "published" ? new Date().toISOString() : undefined
  );

  if (status === "published" && !publishedAt) {
    throw new Error("กรุณาระบุวันเผยแพร่");
  }

  return {
    title: requiredText(value.title, "หัวข้อ", 180),
    summary: requiredText(value.summary, "สรุปข่าว", 600),
    body: optionalText(value.body, 20_000) ?? "",
    category: enumValue(value.category, POST_CATEGORIES, "หมวดข่าว"),
    source_name: optionalText(value.sourceName, 120) ?? "Rice AI",
    image_url: imageUrl(value.imageUrl),
    image_alt: optionalText(value.imageAlt, 300) ?? "",
    is_featured: boolValue(value.isFeatured, false),
    status,
    published_at: status === "published" ? publishedAt : null,
    ...(isUpdate ? {} : { created_by: user.id }),
  };
}

function parseAlert(value: InputRecord, user: User, isUpdate: boolean) {
  const startsAt = dateValue(value.startsAt, "วันเริ่มต้น", new Date().toISOString());

  if (!startsAt) {
    throw new Error("กรุณาระบุวันเริ่มต้น");
  }

  const expiresAt = dateValue(value.expiresAt, "วันสิ้นสุด");
  validateTimeRange(startsAt, expiresAt);
  const isActive = boolValue(value.isActive, true);

  if (
    isActive &&
    expiresAt &&
    new Date(expiresAt).getTime() <= Date.now()
  ) {
    throw new Error(
      "เวลาสิ้นสุดผ่านไปแล้ว กรุณาเลือกเวลาในอนาคตหรือเว้นว่างเพื่อแสดงต่อเนื่อง"
    );
  }

  return {
    title: requiredText(value.title, "หัวข้อ", 180),
    description: requiredText(value.description, "รายละเอียด", 600),
    alert_type: enumValue(value.alertType, ALERT_TYPES, "ประเภทการแจ้งเตือน"),
    severity: enumValue(value.severity ?? "medium", ["low", "medium", "high"] as const, "ระดับความรุนแรง"),
    area_name: optionalText(value.areaName, 120) ?? "ประเทศไทย",
    is_active: isActive,
    starts_at: startsAt,
    expires_at: expiresAt,
    ...(isUpdate ? {} : { created_by: user.id }),
  };
}

function parsePrice(value: InputRecord, user: User, isUpdate: boolean) {
  return {
    rice_type: requiredText(value.riceType, "ชนิดข้าว", 100),
    price_per_ton: numericValue(value.pricePerTon, "ราคา", 0.01, 999_999_999_999.99),
    trend: enumValue(value.trend ?? "steady", ["up", "down", "steady"] as const, "แนวโน้มราคา"),
    change_percent: numericValue(value.changePercent, "อัตราการเปลี่ยนแปลง", -100, 100, 0),
    market_name: optionalText(value.marketName, 160) ?? "ราคาอ้างอิง Rice AI",
    observed_at: dateValue(value.observedAt, "วันอ้างอิง", new Date().toISOString()),
    is_published: boolValue(value.isPublished, true),
    ...(isUpdate ? {} : { created_by: user.id }),
  };
}

function parseRecommendation(value: InputRecord, user: User, isUpdate: boolean) {
  const startsAt = dateValue(value.startsAt, "วันเริ่มต้น", new Date().toISOString());

  if (!startsAt) {
    throw new Error("กรุณาระบุวันเริ่มต้น");
  }

  const expiresAt = dateValue(value.expiresAt, "วันสิ้นสุด");
  validateTimeRange(startsAt, expiresAt);

  return {
    title: requiredText(value.title, "หัวข้อ", 180),
    description: requiredText(value.description, "รายละเอียด", 1_200),
    category: enumValue(value.category, RECOMMENDATION_CATEGORIES, "หมวดคำแนะนำ"),
    priority: enumValue(value.priority ?? "normal", ["normal", "important"] as const, "ระดับความสำคัญ"),
    is_active: boolValue(value.isActive, true),
    starts_at: startsAt,
    expires_at: expiresAt,
    ...(isUpdate ? {} : { created_by: user.id }),
  };
}

export function parseAdminContent(
  resource: AdminResource,
  payload: unknown,
  user: User,
  isUpdate: boolean
) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("รูปแบบข้อมูลไม่ถูกต้อง");
  }

  const value = payload as InputRecord;

  switch (resource) {
    case "posts":
      return parsePost(value, user, isUpdate);
    case "alerts":
      return parseAlert(value, user, isUpdate);
    case "prices":
      return parsePrice(value, user, isUpdate);
    case "recommendations":
      return parseRecommendation(value, user, isUpdate);
  }
}

export async function logAdminActivity(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>,
  input: {
    actorId: string;
    action: "create" | "update" | "delete" | "role_update" | "upload";
    resourceType: string;
    resourceId?: string | null;
    summary: string;
    details?: Record<string, unknown>;
  }
): Promise<void> {
  const { error } = await supabase.from("admin_activity_logs").insert({
    actor_id: input.actorId,
    action: input.action,
    resource_type: input.resourceType,
    resource_id: input.resourceId ?? null,
    summary: input.summary,
    details: input.details ?? {},
  });

  if (error) {
    console.error("Unable to write admin activity log", error);
  }
}
