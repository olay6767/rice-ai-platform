"use client";

import { readJsonResponse } from "@/lib/http/json";

import {
  ArrowUpRight,
  BadgeDollarSign,
  BellRing,
  Bug,
  Check,
  CheckCheck,
  CloudRain,
  CloudSun,
  Droplets,
  Filter,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ThermometerSun,
  TriangleAlert,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import NotificationPreferencesPanel from "@/components/notifications/NotificationPreferencesPanel";
import { buildFertilizerNotifications } from "@/lib/notifications/farm-alerts";
import { buildWeatherNotifications } from "@/lib/notifications/weather-alerts";
import type {
  ManagementNotification,
  NotificationPreferences,
  NotificationSeverity,
  NotificationType,
} from "@/lib/notifications/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@/lib/notifications/types";
import { DEFAULT_WEATHER_LOCATION } from "@/lib/weather/locations";
import { applyKnownGpsLocationCorrection } from "@/lib/weather/location-corrections";
import type {
  WeatherApiError,
  WeatherApiSuccess,
  WeatherData,
} from "@/lib/weather/types";

interface NotificationCenterProps {
  alerts: ManagementNotification[];
  userId: string;
  loadError?: string | null;
}

type ReadFilter = "all" | "unread" | "read";
type TypeFilter = "all" | NotificationType;
type SeverityFilter = "all" | NotificationSeverity;

interface SavedWeatherLocation {
  name: string;
  district?: string;
  province?: string;
  latitude: number;
  longitude: number;
  custom?: boolean;
  source?: "preset" | "gps" | "search";
}

interface PrimaryFarmFieldLocation {
  id: string;
  name: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  latitude: number | null;
  longitude: number | null;
}

const ACTIVE_WEATHER_LOCATION_STORAGE_KEY = "rice-weather-active-location-v1";

const TYPE_OPTIONS: Array<{ value: TypeFilter; label: string }> = [
  { value: "all", label: "ทุกประเภท" },
  { value: "weather", label: "สภาพอากาศ" },
  { value: "disease", label: "โรคข้าว" },
  { value: "pest", label: "แมลงศัตรูพืช" },
  { value: "disaster", label: "ภัยพิบัติ" },
  { value: "price", label: "ราคาข้าว" },
  { value: "general", label: "ทั่วไป" },
];

const SEVERITY_OPTIONS: Array<{ value: SeverityFilter; label: string }> = [
  { value: "all", label: "ทุกระดับ" },
  { value: "high", label: "เร่งด่วน" },
  { value: "medium", label: "ควรติดตาม" },
  { value: "low", label: "ข้อมูลทั่วไป" },
];

function typeLabel(type: NotificationType): string {
  return TYPE_OPTIONS.find((option) => option.value === type)?.label ?? "ทั่วไป";
}

function typeIcon(type: NotificationType) {
  switch (type) {
    case "weather":
      return CloudRain;
    case "disease":
      return ShieldAlert;
    case "pest":
      return Bug;
    case "disaster":
      return TriangleAlert;
    case "price":
      return BadgeDollarSign;
    default:
      return BellRing;
  }
}

function severityLabel(severity: NotificationSeverity): string {
  switch (severity) {
    case "high":
      return "เร่งด่วน";
    case "medium":
      return "ควรติดตาม";
    default:
      return "ข้อมูลทั่วไป";
  }
}

function severityClasses(severity: NotificationSeverity): {
  border: string;
  icon: string;
  badge: string;
} {
  switch (severity) {
    case "high":
      return {
        border: "border-rose-200 dark:border-rose-400/20",
        icon: "bg-rose-600 text-white",
        badge: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200",
      };
    case "medium":
      return {
        border: "border-amber-200 dark:border-amber-400/20",
        icon: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
        badge: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
      };
    default:
      return {
        border: "border-sky-200 dark:border-sky-400/20",
        icon: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
        badge: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200",
      };
  }
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ระบุเวลา";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function readStorageKey(userId: string): string {
  return `rice-ai:notification-reads:${userId}`;
}

function getSavedWeatherLocation(): SavedWeatherLocation {
  try {
    const stored = window.localStorage.getItem(
      ACTIVE_WEATHER_LOCATION_STORAGE_KEY
    );
    const parsed: unknown = stored ? JSON.parse(stored) : null;

    if (
      parsed &&
      typeof parsed === "object" &&
      "name" in parsed &&
      typeof parsed.name === "string" &&
      "latitude" in parsed &&
      typeof parsed.latitude === "number" &&
      Number.isFinite(parsed.latitude) &&
      "longitude" in parsed &&
      typeof parsed.longitude === "number" &&
      Number.isFinite(parsed.longitude)
    ) {
      return applyKnownGpsLocationCorrection(
        parsed as SavedWeatherLocation
      );
    }
  } catch {
    // ใช้ตำแหน่งเริ่มต้นเมื่อข้อมูลที่บันทึกไว้ไม่สมบูรณ์
  }

  return DEFAULT_WEATHER_LOCATION;
}

async function getPreferredWeatherLocation(signal: AbortSignal): Promise<SavedWeatherLocation> {
  try {
    const response = await fetch("/api/farm-fields?primary=1", { cache: "no-store", signal });
    if (!response.ok) return getSavedWeatherLocation();
    const payload = await readJsonResponse<{ data?: { field?: PrimaryFarmFieldLocation | null } }>(response);
    const field = payload.data?.field;
    if (!field || field.latitude === null || field.longitude === null || !Number.isFinite(field.latitude) || !Number.isFinite(field.longitude)) return getSavedWeatherLocation();
    return {
      name: [field.subdistrict, field.district, field.province].filter(Boolean).join(" · ") || field.name,
      district: field.district ?? undefined,
      province: field.province,
      latitude: field.latitude,
      longitude: field.longitude,
      custom: true,
      source: "search",
    };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    return getSavedWeatherLocation();
  }
}

function weatherLocationLabel(location: SavedWeatherLocation): string {
  if (location.custom) {
    return location.name;
  }

  return [location.district, location.province]
    .filter(Boolean)
    .join(" · ") || location.name;
}

export default function NotificationCenter({
  alerts,
  userId,
  loadError = null,
}: NotificationCenterProps) {
  const [readIds, setReadIds] = useState<string[]>([]);
  const [readFilter, setReadFilter] = useState<ReadFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  const [weatherRefreshKey, setWeatherRefreshKey] = useState(0);
  const [notificationPreferences, setNotificationPreferences] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [primaryFarmName, setPrimaryFarmName] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) {
        return;
      }

      try {
        const stored = window.localStorage.getItem(readStorageKey(userId));
        const parsed: unknown = stored ? JSON.parse(stored) : [];

        if (Array.isArray(parsed)) {
          setReadIds(
            parsed.filter((value): value is string => typeof value === "string")
          );
        }
      } catch {
        setReadIds([]);
      }
    });

    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadPrimaryFarm(): Promise<void> {
      try {
        const response = await fetch("/api/farm-fields?primary=1", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const payload = await readJsonResponse<{
          data?: { field?: PrimaryFarmFieldLocation | null };
        }>(response);
        setPrimaryFarmName(payload.data?.field?.name ?? null);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setPrimaryFarmName(null);
      }
    }

    void loadPrimaryFarm();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadWeather(): Promise<void> {
      const location = await getPreferredWeatherLocation(controller.signal);
      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        name: weatherLocationLabel(location),
      });

      try {
        const response = await fetch(`/api/weather?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await readJsonResponse<
          | WeatherApiSuccess
          | WeatherApiError
        >(response);

        if (!response.ok || !("data" in payload)) {
          throw new Error(
            "error" in payload
              ? payload.error.message
              : "ไม่สามารถโหลดข้อมูลสภาพอากาศได้"
          );
        }

        setWeather(payload.data);
        setWeatherError(null);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setWeatherError(
          error instanceof Error
            ? error.message
            : "ไม่สามารถโหลดข้อมูลสภาพอากาศได้"
        );
      } finally {
        if (!controller.signal.aborted) {
          setWeatherLoading(false);
        }
      }
    }

    void loadWeather();

    return () => controller.abort();
  }, [weatherRefreshKey]);

  const weatherAlerts = useMemo(
    () =>
      weather ? buildWeatherNotifications(weather, notificationPreferences) : [],
    [notificationPreferences, weather]
  );
  const fertilizerAlerts = useMemo(
    () => buildFertilizerNotifications(notificationPreferences, primaryFarmName),
    [notificationPreferences, primaryFarmName]
  );
  const allAlerts = useMemo(
    () =>
      [...weatherAlerts, ...fertilizerAlerts, ...alerts].sort((left, right) => {
        const priority = { high: 3, medium: 2, low: 1 };
        const severityDifference =
          priority[right.severity] - priority[left.severity];

        return (
          severityDifference ||
          Date.parse(right.startsAt) - Date.parse(left.startsAt)
        );
      }),
    [alerts, fertilizerAlerts, weatherAlerts]
  );

  const readSet = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = allAlerts.filter((alert) => !readSet.has(alert.id)).length;
  const urgentCount = allAlerts.filter(
    (alert) => alert.severity === "high"
  ).length;
  const areaCount = new Set(allAlerts.map((alert) => alert.areaName)).size;

  const visibleAlerts = useMemo(
    () =>
      allAlerts.filter((alert) => {
        const isRead = readSet.has(alert.id);
        const matchesRead =
          readFilter === "all" ||
          (readFilter === "read" ? isRead : !isRead);
        const matchesType = typeFilter === "all" || alert.alertType === typeFilter;
        const matchesSeverity =
          severityFilter === "all" || alert.severity === severityFilter;

        return matchesRead && matchesType && matchesSeverity;
      }),
    [allAlerts, readFilter, readSet, severityFilter, typeFilter]
  );

  function saveReadIds(nextIds: string[]): void {
    const uniqueIds = Array.from(new Set(nextIds));
    setReadIds(uniqueIds);

    try {
      window.localStorage.setItem(readStorageKey(userId), JSON.stringify(uniqueIds));
    } catch {
      // เบราว์เซอร์อาจปิดการใช้งาน localStorage แต่หน้ายังใช้งานต่อได้
    }
  }

  function toggleRead(id: string): void {
    saveReadIds(
      readSet.has(id) ? readIds.filter((value) => value !== id) : [...readIds, id]
    );
  }

  function markAllAsRead(): void {
    saveReadIds([...readIds, ...allAlerts.map((alert) => alert.id)]);
  }

  function refreshWeather(): void {
    setWeatherLoading(true);
    setWeatherError(null);
    setWeatherRefreshKey((value) => value + 1);
  }

  return (
    <>
      <section className="mb-5 overflow-hidden rounded-[1.75rem] border border-sky-200/80 bg-gradient-to-br from-sky-50 via-white to-rice-mint/35 p-4 shadow-card sm:mb-6 sm:rounded-[2rem] sm:p-6 dark:border-sky-400/15 dark:from-sky-400/[0.07] dark:via-white/[0.035] dark:to-rice-leaf/[0.08]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
              <CloudSun className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-200">
                Weather Alert
              </p>
              <h2 className="mt-1 font-heading text-lg font-bold text-rice-forest dark:text-white">
                สภาพอากาศตำแหน่งที่เลือก
              </h2>
            </div>
          </div>

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
            <button
              type="button"
              onClick={refreshWeather}
              disabled={weatherLoading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sky-700/15 bg-white/70 px-3 py-2 text-xs font-bold text-rice-forest transition hover:bg-white disabled:cursor-wait disabled:opacity-55 sm:min-h-10 sm:px-4 dark:border-white/12 dark:bg-white/[0.06] dark:text-white"
            >
              <RefreshCw
                className={`h-4 w-4 ${weatherLoading ? "animate-spin" : ""}`}
              />
              อัปเดต
            </button>
            <Link
              href="/analytics/weather"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-rice-forest px-3 py-2 text-xs font-bold text-white transition hover:bg-rice-leaf sm:min-h-10 sm:px-4 dark:bg-rice-mint-light dark:text-rice-dark"
            >
              ดูพยากรณ์เต็ม
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {weatherLoading && !weather ? (
          <div className="mt-5 grid grid-cols-2 animate-pulse gap-2.5 sm:gap-3 lg:grid-cols-5">
            <div className="col-span-2 h-28 rounded-2xl bg-sky-200/45 dark:bg-white/[0.07]" />
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 rounded-2xl bg-sky-200/35 dark:bg-white/[0.055]"
              />
            ))}
          </div>
        ) : weather ? (
          <>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-5">
              <div className="col-span-2 rounded-2xl bg-rice-forest p-4 text-white sm:p-5 dark:bg-[#0a2a1a]">
                <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/60">
                  <MapPin className="h-3.5 w-3.5" />
                  {weather.location.name}
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <span className="font-heading text-4xl font-bold leading-none sm:text-5xl">
                    {weather.current.temperature.toLocaleString("th-TH")}°
                  </span>
                  <span className="pb-1 text-sm font-bold text-rice-mint-light">
                    {weather.current.condition.label}
                  </span>
                </div>
                <p className="mt-3 text-xs leading-5 text-white/60">
                  รู้สึกเหมือน {weather.current.apparentTemperature.toLocaleString("th-TH")}°C · ฝนวันนี้ {weather.agriculture.rainToday.toLocaleString("th-TH")} มม.
                </p>
              </div>

              {[
                {
                  label: "ความชื้น",
                  value: `${weather.current.relativeHumidity.toLocaleString("th-TH")}%`,
                  Icon: Droplets,
                  tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
                },
                {
                  label: "ลม",
                  value: `${weather.current.windSpeed.toLocaleString("th-TH")} กม./ชม.`,
                  Icon: Wind,
                  tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
                },
                {
                  label: "สูงสุดวันนี้",
                  value: `${weather.daily[0]?.temperatureMax.toLocaleString("th-TH") ?? "-"}°C`,
                  Icon: ThermometerSun,
                  tone: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
                },
              ].map(({ label, value, Icon, tone }, index) => (
                <div
                  key={label}
                  className={`rounded-2xl border border-rice-forest/8 bg-white/75 p-3.5 sm:p-4 dark:border-white/8 dark:bg-white/[0.045] ${
                    index === 2 ? "col-span-2 lg:col-span-1" : ""
                  }`}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}>
                    <Icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="mt-4 text-xs font-semibold text-rice-muted dark:text-white/45">
                    {label}
                  </p>
                  <p className="mt-1 font-heading text-lg font-bold text-rice-forest dark:text-white">
                    {value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-sky-700/10 bg-white/60 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between dark:border-white/8 dark:bg-white/[0.035]">
              <p className="font-semibold text-rice-forest dark:text-white/70">
                {weatherAlerts.length > 0
                  ? `พบความเสี่ยงจากอากาศ ${weatherAlerts.length.toLocaleString("th-TH")} รายการ และเพิ่มในรายการแจ้งเตือนแล้ว`
                  : "ยังไม่พบความเสี่ยงด้านอากาศที่เข้าเกณฑ์แจ้งเตือนวันนี้"}
              </p>
              <a
                href={weather.metadata.sourceUrl}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 font-bold text-sky-700 underline decoration-sky-700/25 underline-offset-4 dark:text-sky-200"
              >
                ข้อมูล Open-Meteo
              </a>
            </div>
          </>
        ) : (
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-100">
            <p className="font-bold">ยังโหลดข้อมูลสภาพอากาศไม่ได้</p>
            <p className="mt-1 text-xs leading-5 opacity-75">
              {weatherError ?? "กรุณากดอัปเดตอีกครั้ง"}
            </p>
          </div>
        )}

        {weather && weatherError && (
          <p className="mt-3 text-xs font-semibold text-amber-700 dark:text-amber-200">
            อัปเดตครั้งล่าสุดไม่สำเร็จ กำลังแสดงข้อมูลก่อนหน้า: {weatherError}
          </p>
        )}
      </section>

      <NotificationPreferencesPanel
        onPreferencesChange={setNotificationPreferences}
      />

      <section className="grid grid-cols-3 gap-2 sm:gap-4" aria-label="สรุปการแจ้งเตือน">
        {[
          {
            label: "ยังไม่ได้อ่าน",
            value: unreadCount,
            detail: "รายการที่ควรตรวจสอบ",
            tone: "bg-rice-mint/60 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light",
          },
          {
            label: "ระดับเร่งด่วน",
            value: urgentCount,
            detail: "ควรดำเนินการก่อน",
            tone: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
          },
          {
            label: "พื้นที่ที่เกี่ยวข้อง",
            value: areaCount,
            detail: "จากการแจ้งเตือนที่ทำงาน",
            tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
          },
        ].map((item) => (
          <article
            key={item.label}
            className="min-w-0 rounded-2xl border border-rice-forest/10 bg-white/75 p-3 shadow-sm backdrop-blur sm:rounded-3xl sm:p-5 dark:border-white/10 dark:bg-white/[0.04]"
          >
            <span className={`inline-flex max-w-full rounded-lg px-2 py-1 text-[9px] font-bold leading-4 sm:rounded-xl sm:px-3 sm:py-1.5 sm:text-xs ${item.tone}`}>
              {item.label}
            </span>
            <p className="mt-3 font-heading text-2xl font-bold text-rice-forest sm:mt-4 sm:text-3xl dark:text-white">
              {item.value.toLocaleString("th-TH")}
            </p>
            <p className="mt-1 hidden text-xs text-rice-muted sm:block dark:text-white/45">
              {item.detail}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-5 rounded-[1.75rem] border border-rice-forest/10 bg-white/75 p-3.5 shadow-card backdrop-blur sm:mt-6 sm:rounded-[2rem] sm:p-6 dark:border-white/10 dark:bg-white/[0.04]">
        <div className="flex flex-col gap-4 border-b border-rice-forest/10 pb-5 dark:border-white/10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {([
              ["all", "ทั้งหมด"],
              ["unread", `ยังไม่อ่าน ${unreadCount}`],
              ["read", "อ่านแล้ว"],
            ] as Array<[ReadFilter, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setReadFilter(value)}
                className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition ${
                  readFilter === value
                    ? "bg-rice-forest text-white dark:bg-rice-mint-light dark:text-rice-dark"
                    : "border border-rice-forest/10 bg-white/70 text-rice-forest hover:bg-rice-mint/25 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={markAllAsRead}
            disabled={!unreadCount}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 self-start rounded-full border border-rice-forest/15 px-4 py-2 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/25 disabled:cursor-not-allowed disabled:opacity-45 sm:w-auto lg:min-h-10 lg:self-auto dark:border-white/15 dark:text-white"
          >
            <CheckCheck className="h-4 w-4" />
            อ่านทั้งหมดแล้ว
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2.5 sm:gap-3">
          <label className="text-xs font-bold text-rice-muted dark:text-white/55">
            <span className="inline-flex items-center gap-1.5">
              <Filter className="h-3.5 w-3.5" /> ประเภท
            </span>
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="mt-2 min-h-11 w-full rounded-2xl border border-rice-forest/10 bg-rice-background px-3 py-2.5 text-xs font-semibold text-rice-forest outline-none focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/25 sm:px-4 sm:text-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-white"
            >
              {TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-rice-muted dark:text-white/55">
            ระดับความสำคัญ
            <select
              value={severityFilter}
              onChange={(event) =>
                setSeverityFilter(event.target.value as SeverityFilter)
              }
              className="mt-2 min-h-11 w-full rounded-2xl border border-rice-forest/10 bg-rice-background px-3 py-2.5 text-xs font-semibold text-rice-forest outline-none focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/25 sm:px-4 sm:text-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-white"
            >
              {SEVERITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {loadError && (
        <div
          role="alert"
          className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
        >
          {loadError}
        </div>
      )}

      <section className="mt-5 space-y-4" aria-label="รายการแจ้งเตือน">
        {visibleAlerts.map((alert) => {
          const Icon = typeIcon(alert.alertType);
          const styles = severityClasses(alert.severity);
          const isRead = readSet.has(alert.id);

          return (
            <article
              key={alert.id}
              className={`relative overflow-hidden rounded-[1.5rem] border bg-white/80 p-4 shadow-sm transition sm:rounded-3xl sm:p-6 dark:bg-white/[0.045] ${styles.border} ${
                isRead ? "opacity-70" : "shadow-[0_12px_35px_rgba(11,46,28,0.08)]"
              }`}
            >
              {!isRead && (
                <span
                  aria-label="ยังไม่ได้อ่าน"
                  className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-rice-leaf ring-4 ring-rice-mint/40 dark:bg-rice-mint-light"
                />
              )}

              <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 sm:flex sm:gap-4">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl ${styles.icon}`}>
                  <Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden="true" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 pr-5">
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${styles.badge}`}>
                      {severityLabel(alert.severity)}
                    </span>
                    <span className="rounded-full bg-rice-surface-soft px-2.5 py-1 text-[10px] font-bold text-rice-muted dark:bg-white/[0.07] dark:text-white/55">
                      {typeLabel(alert.alertType)}
                    </span>
                    {alert.source === "weather" && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-bold text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">
                        อัตโนมัติจาก Open-Meteo
                      </span>
                    )}
                    {alert.source === "farm" && (
                      <span className="rounded-full bg-rice-mint/65 px-2.5 py-1 text-[10px] font-bold text-rice-forest dark:bg-rice-leaf/30 dark:text-rice-mint-light">
                        แผนแปลงนา
                      </span>
                    )}
                  </div>

                  <h2 className="mt-3 font-heading text-lg font-bold leading-7 text-rice-forest dark:text-white">
                    {alert.title}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-rice-muted dark:text-white/60">
                    {alert.description}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-rice-muted dark:text-white/45">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {alert.areaName}
                    </span>
                    <span>เริ่ม {formatDateTime(alert.startsAt)}</span>
                    {alert.expiresAt && (
                      <span>สิ้นสุด {formatDateTime(alert.expiresAt)}</span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => toggleRead(alert.id)}
                  className="col-span-2 inline-flex min-h-11 w-full shrink-0 items-center justify-center gap-2 rounded-full border border-rice-forest/12 px-4 py-2 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/30 sm:min-h-10 sm:w-auto dark:border-white/12 dark:text-white"
                >
                  <Check className="h-4 w-4" />
                  {isRead ? "ทำเป็นยังไม่อ่าน" : "อ่านแล้ว"}
                </button>
              </div>
            </article>
          );
        })}

        {!visibleAlerts.length && (
          <div className="rounded-[2rem] border border-dashed border-rice-forest/20 bg-white/55 p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light">
              <BellRing className="h-7 w-7" />
            </span>
            <h2 className="mt-4 font-heading text-lg font-bold text-rice-forest dark:text-white">
              ไม่มีการแจ้งเตือนในตัวกรองนี้
            </h2>
            <p className="mt-2 text-sm text-rice-muted dark:text-white/50">
              ลองเปลี่ยนประเภท ระดับความสำคัญ หรือสถานะการอ่าน
            </p>
          </div>
        )}
      </section>

      <p className="mt-5 text-center text-xs leading-5 text-rice-muted dark:text-white/40">
        สถานะอ่านและยังไม่อ่านเก็บแยกตามบัญชีในอุปกรณ์นี้
      </p>
    </>
  );
}
