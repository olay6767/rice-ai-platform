import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };

interface NotificationPreferenceRow {
  heavy_rain_enabled: boolean;
  heavy_rain_threshold_mm: number | string;
  high_humidity_disease_enabled: boolean;
  high_humidity_threshold_percent: number;
  fertilizer_reminder_enabled: boolean;
  next_fertilizer_date: string | null;
  fertilizer_reminder_days_before: number;
}

function response(data: unknown, status = 200): Response {
  return Response.json({ data }, { status, headers: HEADERS });
}

function error(status: number, code: string, message: string): Response {
  return Response.json({ error: { code, message } }, { status, headers: HEADERS });
}

function map(row: NotificationPreferenceRow): NotificationPreferences {
  return {
    heavyRainEnabled: row.heavy_rain_enabled,
    heavyRainThresholdMm: Number(row.heavy_rain_threshold_mm),
    highHumidityDiseaseEnabled: row.high_humidity_disease_enabled,
    highHumidityThresholdPercent: row.high_humidity_threshold_percent,
    fertilizerReminderEnabled: row.fertilizer_reminder_enabled,
    nextFertilizerDate: row.next_fertilizer_date,
    fertilizerReminderDaysBefore: row.fertilizer_reminder_days_before,
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boolean(value: unknown, label: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`${label}ไม่ถูกต้อง`);
  }

  return value;
}

function numberInRange(
  value: unknown,
  label: string,
  minimum: number,
  maximum: number,
  integer = false
): number {
  const parsed = typeof value === "number" ? value : Number.NaN;
  if (
    !Number.isFinite(parsed) ||
    parsed < minimum ||
    parsed > maximum ||
    (integer && !Number.isInteger(parsed))
  ) {
    throw new Error(`${label}ต้องอยู่ระหว่าง ${minimum}–${maximum}`);
  }

  return parsed;
}

function date(value: unknown): string | null {
  if (value === null || value === "" || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("วันที่ใส่ปุ๋ยครั้งถัดไปไม่ถูกต้อง");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("วันที่ใส่ปุ๋ยครั้งถัดไปไม่ถูกต้อง");
  }

  return value;
}

function parse(payload: Record<string, unknown>): NotificationPreferences {
  const fertilizerReminderEnabled = boolean(
    payload.fertilizerReminderEnabled,
    "การเตือนใส่ปุ๋ย"
  );
  const nextFertilizerDate = date(payload.nextFertilizerDate);

  if (fertilizerReminderEnabled && !nextFertilizerDate) {
    throw new Error("กรุณาระบุวันที่ใส่ปุ๋ยครั้งถัดไปก่อนเปิดการแจ้งเตือน");
  }

  return {
    heavyRainEnabled: boolean(payload.heavyRainEnabled, "การแจ้งเตือนฝนหนัก"),
    heavyRainThresholdMm: numberInRange(
      payload.heavyRainThresholdMm,
      "เกณฑ์ฝนหนัก",
      5,
      250
    ),
    highHumidityDiseaseEnabled: boolean(
      payload.highHumidityDiseaseEnabled,
      "การแจ้งเตือนความชื้น"
    ),
    highHumidityThresholdPercent: numberInRange(
      payload.highHumidityThresholdPercent,
      "เกณฑ์ความชื้น",
      50,
      100,
      true
    ),
    fertilizerReminderEnabled,
    nextFertilizerDate,
    fertilizerReminderDaysBefore: numberInRange(
      payload.fertilizerReminderDaysBefore,
      "จำนวนวันแจ้งล่วงหน้า",
      0,
      30,
      true
    ),
  };
}

async function authenticated() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  return { supabase, user, authError };
}

export async function GET(): Promise<Response> {
  try {
    const { supabase, user, authError } = await authenticated();
    if (authError || !user) {
      return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนตั้งค่าการแจ้งเตือน");
    }

    const result = await supabase
      .from("user_notification_preferences")
      .select(
        "heavy_rain_enabled,heavy_rain_threshold_mm,high_humidity_disease_enabled,high_humidity_threshold_percent,fertilizer_reminder_enabled,next_fertilizer_date,fertilizer_reminder_days_before"
      )
      .eq("user_id", user.id)
      .maybeSingle();

    if (result.error) {
      throw result.error;
    }

    return response({
      preferences: result.data
        ? map(result.data as NotificationPreferenceRow)
        : DEFAULT_NOTIFICATION_PREFERENCES,
    });
  } catch (cause) {
    console.error("Unable to load notification settings", cause);
    return error(
      500,
      "NOTIFICATION_SETTINGS_READ_FAILED",
      "ไม่สามารถโหลดการตั้งค่าการแจ้งเตือนได้"
    );
  }
}

export async function PATCH(request: Request): Promise<Response> {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return error(400, "INVALID_JSON", "รูปแบบการตั้งค่าการแจ้งเตือนไม่ถูกต้อง");
  }

  if (!isObject(payload)) {
    return error(400, "INVALID_SETTINGS", "รูปแบบการตั้งค่าการแจ้งเตือนไม่ถูกต้อง");
  }

  let preferences: NotificationPreferences;
  try {
    preferences = parse(payload);
  } catch (cause) {
    return error(
      400,
      "INVALID_SETTINGS",
      cause instanceof Error ? cause.message : "การตั้งค่าการแจ้งเตือนไม่ถูกต้อง"
    );
  }

  try {
    const { supabase, user, authError } = await authenticated();
    if (authError || !user) {
      return error(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนตั้งค่าการแจ้งเตือน");
    }

    const result = await supabase
      .from("user_notification_preferences")
      .upsert(
        {
          user_id: user.id,
          heavy_rain_enabled: preferences.heavyRainEnabled,
          heavy_rain_threshold_mm: preferences.heavyRainThresholdMm,
          high_humidity_disease_enabled: preferences.highHumidityDiseaseEnabled,
          high_humidity_threshold_percent: preferences.highHumidityThresholdPercent,
          fertilizer_reminder_enabled: preferences.fertilizerReminderEnabled,
          next_fertilizer_date: preferences.nextFertilizerDate,
          fertilizer_reminder_days_before: preferences.fertilizerReminderDaysBefore,
        },
        { onConflict: "user_id" }
      )
      .select(
        "heavy_rain_enabled,heavy_rain_threshold_mm,high_humidity_disease_enabled,high_humidity_threshold_percent,fertilizer_reminder_enabled,next_fertilizer_date,fertilizer_reminder_days_before"
      )
      .single();

    if (result.error) {
      throw result.error;
    }

    return response({ preferences: map(result.data as NotificationPreferenceRow) });
  } catch (cause) {
    console.error("Unable to save notification settings", cause);
    return error(
      500,
      "NOTIFICATION_SETTINGS_SAVE_FAILED",
      "ไม่สามารถบันทึกการตั้งค่าการแจ้งเตือนได้"
    );
  }
}
