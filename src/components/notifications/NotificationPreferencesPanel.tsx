"use client";

import { readJsonResponse } from "@/lib/http/json";

import {
  CalendarDays,
  Check,
  CloudRain,
  Droplets,
  LoaderCircle,
  Save,
  Sprout,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type NotificationPreferences,
} from "@/lib/notifications/types";

interface NotificationPreferencesPanelProps {
  onPreferencesChange: (preferences: NotificationPreferences) => void;
}

function samePreferences(
  left: NotificationPreferences,
  right: NotificationPreferences
): boolean {
  return (
    left.heavyRainEnabled === right.heavyRainEnabled &&
    left.heavyRainThresholdMm === right.heavyRainThresholdMm &&
    left.highHumidityDiseaseEnabled === right.highHumidityDiseaseEnabled &&
    left.highHumidityThresholdPercent === right.highHumidityThresholdPercent &&
    left.fertilizerReminderEnabled === right.fertilizerReminderEnabled &&
    left.nextFertilizerDate === right.nextFertilizerDate &&
    left.fertilizerReminderDaysBefore === right.fertilizerReminderDaysBefore
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="inline-flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border border-rice-forest/12 bg-white/70 px-3 py-1.5 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/30 dark:border-white/12 dark:bg-white/[0.045] dark:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span className="relative h-5 w-9 rounded-full bg-rice-muted/30 transition peer-focus-visible:ring-4 peer-focus-visible:ring-rice-mint peer-checked:bg-rice-leaf dark:bg-white/20 dark:peer-checked:bg-rice-mint-light">
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-4" />
      </span>
      {label}
    </label>
  );
}

export default function NotificationPreferencesPanel({
  onPreferencesChange,
}: NotificationPreferencesPanelProps) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );
  const [savedPreferences, setSavedPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function load(): Promise<void> {
      try {
        const response = await fetch("/api/notification-settings", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJsonResponse<{
          data?: { preferences?: NotificationPreferences };
          error?: { message?: string };
        }>(response);

        if (!response.ok || !payload.data?.preferences) {
          throw new Error(
            payload.error?.message ?? "ไม่สามารถโหลดการตั้งค่าได้"
          );
        }

        setPreferences(payload.data.preferences);
        setSavedPreferences(payload.data.preferences);
        onPreferencesChange(payload.data.preferences);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setMessage(
          cause instanceof Error
            ? cause.message
            : "ไม่สามารถโหลดการตั้งค่าได้"
        );
        onPreferencesChange(DEFAULT_NOTIFICATION_PREFERENCES);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void load();
    return () => controller.abort();
  }, [onPreferencesChange]);

  const hasUnsavedChanges = useMemo(
    () => !samePreferences(preferences, savedPreferences),
    [preferences, savedPreferences]
  );

  function update(
    patch: Partial<NotificationPreferences>
  ): void {
    setMessage(null);
    setPreferences((current) => {
      const next = { ...current, ...patch };
      onPreferencesChange(next);
      return next;
    });
  }

  async function save(): Promise<void> {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch("/api/notification-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });
      const payload = await readJsonResponse<{
        data?: { preferences?: NotificationPreferences };
        error?: { message?: string };
      }>(response);

      if (!response.ok || !payload.data?.preferences) {
        throw new Error(
          payload.error?.message ?? "ไม่สามารถบันทึกการตั้งค่าได้"
        );
      }

      setPreferences(payload.data.preferences);
      setSavedPreferences(payload.data.preferences);
      onPreferencesChange(payload.data.preferences);
      setMessage("บันทึกการตั้งค่าแล้ว");
    } catch (cause) {
      setMessage(
        cause instanceof Error
          ? cause.message
          : "ไม่สามารถบันทึกการตั้งค่าได้"
      );
    } finally {
      setSaving(false);
    }
  }

  const fieldClassName =
    "mt-2 min-h-11 w-full rounded-2xl border border-rice-forest/10 bg-rice-background px-3 py-2.5 text-sm font-semibold text-rice-forest outline-none transition focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/25 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-white/[0.055] dark:text-white";

  return (
    <section
      id="notification-preferences"
      className="mb-5 scroll-mt-24 rounded-[1.75rem] border border-rice-forest/10 bg-white/90 p-4 shadow-card backdrop-blur sm:mb-6 sm:rounded-[2rem] sm:p-6 dark:border-white/10 dark:bg-white/[0.04]"
      aria-label="ตั้งค่าการแจ้งเตือนอัตโนมัติ"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-mint/65 text-rice-forest dark:bg-rice-leaf/25 dark:text-rice-mint-light">
            <SlidersHorizontal className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">
              ตั้งค่าการแจ้งเตือนของฉัน
            </h2>
            <p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/55">
              เปิด–ปิดและปรับเกณฑ์ของแจ้งเตือนอัตโนมัติสำหรับแปลงหลักได้
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void save()}
          disabled={loading || saving || !hasUnsavedChanges}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-rice-forest px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-rice-leaf disabled:cursor-not-allowed disabled:bg-rice-surface-soft disabled:text-rice-muted disabled:shadow-none sm:w-auto dark:bg-rice-mint-light dark:text-rice-dark"
        >
          {saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : hasUnsavedChanges ? <Save className="h-4 w-4" /> : <Check className="h-4 w-4" />}
          {saving ? "กำลังบันทึก" : hasUnsavedChanges ? "บันทึกการตั้งค่า" : "บันทึกแล้ว"}
        </button>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <article data-enabled={preferences.heavyRainEnabled} className={`rounded-2xl border p-4 transition ${preferences.heavyRainEnabled ? "border-sky-300/70 bg-sky-50/70 shadow-sm" : "border-rice-forest/10 bg-rice-surface-soft/55 opacity-75"}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-white"><CloudRain className="h-5 w-5" /></span>
            <Toggle checked={preferences.heavyRainEnabled} label={preferences.heavyRainEnabled ? "เปิด" : "ปิด"} onChange={(heavyRainEnabled) => update({ heavyRainEnabled })} />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-rice-forest dark:text-white">ฝนหนักและน้ำขัง</h3>
          <label className="mt-3 block text-xs font-bold text-rice-muted dark:text-white/55">
            แจ้งเมื่อคาดว่าฝนตั้งแต่ (มม.)
            <input type="number" min="5" max="250" step="1" value={preferences.heavyRainThresholdMm} disabled={!preferences.heavyRainEnabled || loading} onChange={(event) => update({ heavyRainThresholdMm: Number(event.target.value) })} className={fieldClassName} />
          </label>
        </article>

        <article data-enabled={preferences.highHumidityDiseaseEnabled} className={`rounded-2xl border p-4 transition ${preferences.highHumidityDiseaseEnabled ? "border-amber-300/70 bg-amber-50/70 shadow-sm" : "border-rice-forest/10 bg-rice-surface-soft/55 opacity-75"}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white"><Droplets className="h-5 w-5" /></span>
            <Toggle checked={preferences.highHumidityDiseaseEnabled} label={preferences.highHumidityDiseaseEnabled ? "เปิด" : "ปิด"} onChange={(highHumidityDiseaseEnabled) => update({ highHumidityDiseaseEnabled })} />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-rice-forest dark:text-white">ความชื้นเสี่ยงโรคใบข้าว</h3>
          <label className="mt-3 block text-xs font-bold text-rice-muted dark:text-white/55">
            แจ้งเมื่อความชื้นตั้งแต่ (%)
            <input type="number" min="50" max="100" step="1" value={preferences.highHumidityThresholdPercent} disabled={!preferences.highHumidityDiseaseEnabled || loading} onChange={(event) => update({ highHumidityThresholdPercent: Number(event.target.value) })} className={fieldClassName} />
          </label>
        </article>

        <article data-enabled={preferences.fertilizerReminderEnabled} className={`rounded-2xl border p-4 transition ${preferences.fertilizerReminderEnabled ? "border-rice-leaf/25 bg-rice-mint/30 shadow-sm" : "border-rice-forest/10 bg-rice-surface-soft/55 opacity-75"}`}>
          <div className="flex items-start justify-between gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rice-leaf text-white"><Sprout className="h-5 w-5" /></span>
            <Toggle checked={preferences.fertilizerReminderEnabled} label={preferences.fertilizerReminderEnabled ? "เปิด" : "ปิด"} onChange={(fertilizerReminderEnabled) => update({ fertilizerReminderEnabled })} />
          </div>
          <h3 className="mt-4 font-heading text-base font-bold text-rice-forest dark:text-white">ใกล้ถึงช่วงใส่ปุ๋ย</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_6.5rem] sm:gap-2">
            <label className="min-w-0 text-xs font-bold text-rice-muted dark:text-white/55">
              วันที่ครั้งถัดไป
              <input type="date" value={preferences.nextFertilizerDate ?? ""} disabled={!preferences.fertilizerReminderEnabled || loading} onChange={(event) => update({ nextFertilizerDate: event.target.value || null })} className={fieldClassName} />
            </label>
            <label className="text-xs font-bold text-rice-muted dark:text-white/55">
              ล่วงหน้า
              <input type="number" min="0" max="30" step="1" value={preferences.fertilizerReminderDaysBefore} disabled={!preferences.fertilizerReminderEnabled || loading} onChange={(event) => update({ fertilizerReminderDaysBefore: Number(event.target.value) })} className={fieldClassName} />
            </label>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-xs leading-5 text-rice-muted dark:text-white/55"><CalendarDays className="h-3.5 w-3.5" /> ระบุวันที่ตามแผนของคุณ ระบบไม่กำหนดสูตรใส่ปุ๋ยแทน</p>
        </article>
      </div>

      <div className="mt-4 flex min-h-6 items-center gap-2 text-xs font-semibold" aria-live="polite">
        {message && <><Check className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" /><span className={message === "บันทึกการตั้งค่าแล้ว" ? "text-rice-leaf dark:text-rice-mint-light" : "text-rose-700 dark:text-rose-200"}>{message}</span></>}
        {!message && !loading && hasUnsavedChanges && <span className="text-amber-700 dark:text-amber-200">มีการเปลี่ยนแปลงที่ยังไม่ได้บันทึก</span>}
      </div>
    </section>
  );
}
