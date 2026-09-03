import type {
  ManagementNotification,
  NotificationPreferences,
} from "@/lib/notifications/types";

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateInput(value: string): Date | null {
  const [year, month, day] = value.split("-").map(Number);
  const result = new Date(year, month - 1, day);

  if (
    !Number.isFinite(result.getTime()) ||
    result.getFullYear() !== year ||
    result.getMonth() !== month - 1 ||
    result.getDate() !== day
  ) {
    return null;
  }

  return result;
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function dayLabel(daysUntil: number): string {
  if (daysUntil === 0) return "วันนี้";
  if (daysUntil === 1) return "พรุ่งนี้";
  return `อีก ${daysUntil.toLocaleString("th-TH")} วัน`;
}

export function buildFertilizerNotifications(
  preferences: NotificationPreferences,
  farmName: string | null,
  now = new Date()
): ManagementNotification[] {
  if (
    !preferences.fertilizerReminderEnabled ||
    !preferences.nextFertilizerDate ||
    !farmName
  ) {
    return [];
  }

  const target = parseDateInput(preferences.nextFertilizerDate);
  if (!target) return [];

  const daysUntil = Math.round(
    (startOfDay(target).getTime() - startOfDay(now).getTime()) / DAY_MS
  );

  if (
    daysUntil < 0 ||
    daysUntil > preferences.fertilizerReminderDaysBefore
  ) {
    return [];
  }

  const formattedDate = new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(target);
  const expiresAt = new Date(
    target.getFullYear(),
    target.getMonth(),
    target.getDate(),
    23,
    59,
    59
  ).toISOString();

  return [
    {
      id: `farm:fertilizer:${preferences.nextFertilizerDate}`,
      title:
        daysUntil === 0
          ? "ถึงกำหนดใส่ปุ๋ยสำหรับแปลงหลัก"
          : "ใกล้ถึงกำหนดใส่ปุ๋ย",
      description: `กำหนดใส่ปุ๋ย ${formattedDate} (${dayLabel(daysUntil)}) สำหรับ ${farmName} ควรตรวจระดับน้ำและสภาพต้นข้าวจริงก่อนดำเนินการ`,
      alertType: "general",
      severity: daysUntil <= 1 ? "medium" : "low",
      areaName: farmName,
      startsAt: now.toISOString(),
      expiresAt,
      source: "farm",
    },
  ];
}
