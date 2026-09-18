"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  LocateFixed,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sprout,
  Sun,
  Waves,
  Wind,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

import Button from "@/components/ui/Button";
import WeatherForecastExplorer from "@/components/weather/WeatherForecastExplorer";
import {
  DEFAULT_WEATHER_LOCATION,
  WEATHER_LOCATIONS,
  type WeatherLocationOption,
} from "@/lib/weather/locations";
import { applyKnownGpsLocationCorrection } from "@/lib/weather/location-corrections";
import type {
  WeatherApiError,
  WeatherApiSuccess,
  WeatherData,
  WeatherActivity,
  WeatherIconKey,
} from "@/lib/weather/types";

interface ActiveLocation extends WeatherLocationOption {
  custom?: boolean;
  source?: "preset" | "gps" | "search";
  accuracy?: number;
  labelSource?: "openstreetmap" | "user-corrected" | "coordinates";
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

interface ResolvedLocationName {
  label: string;
  locality: string | null;
  district: string | null;
  province: string | null;
  provider: "OpenStreetMap";
}

const LOCATION_CACHE_PREFIX = "rice-weather-location-name-v2";
const LOCATION_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1_000;
const ACTIVE_LOCATION_STORAGE_KEY = "rice-weather-active-location-v1";

const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
};

const ACTIVITY_ICONS: Record<WeatherActivity["id"], LucideIcon> = {
  "water-management": Waves,
  "field-inspection": Sprout,
  "crop-inputs": ShieldAlert,
  harvest: Sun,
};

const ACTIVITY_STYLES: Record<WeatherActivity["level"], string> = {
  recommended:
    "border-emerald-200 bg-emerald-50/75 dark:border-emerald-400/20 dark:bg-emerald-400/10",
  caution:
    "border-amber-200 bg-amber-50/75 dark:border-amber-400/20 dark:bg-amber-400/10",
  avoid:
    "border-rose-200 bg-rose-50/75 dark:border-rose-400/20 dark:bg-rose-400/10",
};

const ACTIVITY_LABELS: Record<WeatherActivity["level"], string> = {
  recommended: "เหมาะทำวันนี้",
  caution: "ทำได้ แต่ควรตรวจแปลง",
  avoid: "ควรเลี่ยงวันนี้",
};

function WeatherGlyph({
  icon,
  className = "h-6 w-6",
}: {
  icon: WeatherIconKey;
  className?: string;
}) {
  const Icon = WEATHER_ICONS[icon];

  return <Icon aria-hidden="true" className={className} />;
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function getLocationLabel(location: ActiveLocation): string {
  if (location.custom) {
    return location.name;
  }

  return [location.district, location.province]
    .filter(Boolean)
    .join(" · ") || location.name;
}

function getLocationSelectLabel(location: ActiveLocation): string {
  const label = getLocationLabel(location);

  return `${label} · ${location.region}`;
}

async function requestLocationName(
  latitude: number,
  longitude: number,
  signal: AbortSignal
): Promise<ResolvedLocationName> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    version: "2",
  });
  const response = await fetch(
    `/api/weather/location?${params.toString()}`,
    { cache: "no-store", signal }
  );
  const payload = await readJsonResponse<
    | { data: ResolvedLocationName }
    | WeatherApiError
  >(response);

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error.message
        : "ไม่สามารถระบุชื่อพื้นที่ได้"
    );
  }

  return payload.data;
}

function getLocationCacheKey(latitude: number, longitude: number): string {
  return `${LOCATION_CACHE_PREFIX}:${latitude.toFixed(3)}:${longitude.toFixed(3)}`;
}

function readCachedLocationName(
  latitude: number,
  longitude: number
): ResolvedLocationName | null {
  try {
    const rawValue = window.localStorage.getItem(
      getLocationCacheKey(latitude, longitude)
    );

    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as {
      expiresAt?: unknown;
      data?: ResolvedLocationName;
    };

    if (
      typeof value.expiresAt !== "number" ||
      value.expiresAt < Date.now() ||
      !value.data?.label
    ) {
      return null;
    }

    return value.data;
  } catch {
    return null;
  }
}

function cacheLocationName(
  latitude: number,
  longitude: number,
  data: ResolvedLocationName
): void {
  try {
    window.localStorage.setItem(
      getLocationCacheKey(latitude, longitude),
      JSON.stringify({
        expiresAt: Date.now() + LOCATION_CACHE_TTL_MS,
        data,
      })
    );
  } catch {
    // Location lookup still works when browser storage is unavailable.
  }
}

function readSavedActiveLocation(): ActiveLocation | null {
  try {
    const rawValue = window.localStorage.getItem(
      ACTIVE_LOCATION_STORAGE_KEY
    );

    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as Partial<ActiveLocation>;

    if (
      typeof value.id !== "string" ||
      typeof value.name !== "string" ||
      typeof value.region !== "string" ||
      typeof value.latitude !== "number" ||
      typeof value.longitude !== "number" ||
      value.latitude < -90 ||
      value.latitude > 90 ||
      value.longitude < -180 ||
      value.longitude > 180
    ) {
      return null;
    }

    return {
      id: value.id,
      name: value.name,
      region: value.region,
      district: value.district,
      province: value.province,
      latitude: value.latitude,
      longitude: value.longitude,
      custom: value.custom === true,
      source:
        value.source === "gps" || value.source === "search"
          ? value.source
          : "preset",
      accuracy:
        typeof value.accuracy === "number" && value.accuracy >= 0
          ? value.accuracy
          : undefined,
      labelSource:
        value.labelSource === "user-corrected" ||
        value.labelSource === "coordinates" ||
        value.labelSource === "openstreetmap"
          ? value.labelSource
          : undefined,
    };
  } catch {
    return null;
  }
}

function saveActiveLocation(location: ActiveLocation): void {
  try {
    window.localStorage.setItem(
      ACTIVE_LOCATION_STORAGE_KEY,
      JSON.stringify(location)
    );
  } catch {
    // The selected location still applies for this visit without storage.
  }
}

async function requestPrimaryFarmLocation(signal: AbortSignal): Promise<ActiveLocation | null> {
  const response = await fetch("/api/farm-fields?primary=1", { cache: "no-store", signal });
  if (!response.ok) return null;
  const payload = await readJsonResponse<{ data?: { field?: PrimaryFarmFieldLocation | null } }>(response);
  const field = payload.data?.field;
  if (!field || field.latitude === null || field.longitude === null || !Number.isFinite(field.latitude) || !Number.isFinite(field.longitude)) return null;
  return {
    id: `farm:${field.id}`,
    name: [field.subdistrict, field.district, field.province].filter(Boolean).join(" · ") || field.name,
    region: "แปลงหลักของคุณ",
    district: field.district ?? undefined,
    province: field.province,
    latitude: field.latitude,
    longitude: field.longitude,
    custom: true,
    source: "search",
    labelSource: "user-corrected",
  };
}

async function requestWeather(
  location: ActiveLocation,
  signal: AbortSignal
): Promise<WeatherData> {
  const searchParams = new URLSearchParams({
    latitude: location.latitude.toString(),
    longitude: location.longitude.toString(),
    name: getLocationLabel(location),
  });

  const response = await fetch(
    `/api/weather?${searchParams.toString()}`,
    {
      cache: "no-store",
      signal,
    }
  );

  const payload = await readJsonResponse<
    | WeatherApiSuccess
    | WeatherApiError
  >(response);

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error.message
        : "ไม่สามารถโหลดข้อมูลสภาพอากาศได้"
    );
  }

  return payload.data;
}

function WeatherSkeleton() {
  return (
    <div
      aria-label="กำลังโหลดข้อมูลสภาพอากาศ"
      className="space-y-6"
    >
      <div className="h-72 animate-pulse rounded-[2rem] bg-rice-forest/10 dark:bg-white/10" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-36 animate-pulse rounded-3xl bg-rice-forest/[0.07] dark:bg-white/[0.07]"
          />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-[2rem] bg-rice-forest/[0.07] dark:bg-white/[0.07]" />
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  helper,
  className = "",
}: {
  icon: { src: string; width: number; height: number };
  label: string;
  value: string;
  helper: string;
  className?: string;
}) {
  return (
    <article className={`flex min-h-[118px] min-w-0 items-center rounded-xl bg-white px-4 py-4 text-[#23654c] shadow-[0_10px_28px_rgba(64,145,108,0.16)] dark:bg-white/[0.07] dark:text-rice-mint-light ${className}`}>
      <div className="flex w-full items-center gap-3.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white shadow-[0_7px_20px_rgba(30,53,38,0.18)] dark:bg-white/10">
          <Image
            src={icon.src}
            alt=""
            width={icon.width}
            height={icon.height}
            className="h-9 w-10 object-contain"
          />
        </span>
        <div className="min-w-0">
          <p className="break-words font-heading text-[23px] font-semibold leading-7 tracking-tight tabular-nums sm:text-2xl">
            {value}
          </p>
          <p className="mt-0.5 text-xs font-medium leading-4">{label}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#23654c]/75 dark:text-white/55">
            {helper}
          </p>
        </div>
      </div>
    </article>
  );
}

function WeatherActivityCard({
  activity,
  className = "",
}: {
  activity: WeatherActivity;
  className?: string;
}) {
  const Icon = ACTIVITY_ICONS[activity.id];

  return (
    <article
      className={`rounded-3xl border p-5 ${ACTIVITY_STYLES[activity.level]} ${className}`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-rice-forest dark:bg-white/10 dark:text-rice-mint-light">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-rice-leaf dark:text-rice-mint-light">
            {ACTIVITY_LABELS[activity.level]}
          </span>
          <h3 className="mt-1 font-heading text-base font-semibold text-rice-dark dark:text-white">
            {activity.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-rice-muted dark:text-white/60">
            {activity.message}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function WeatherDashboard() {
  const [location, setLocation] =
    useState<ActiveLocation>(DEFAULT_WEATHER_LOCATION);
  const [weather, setWeather] =
    useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const locationRequestIdRef = useRef(0);

  const updateLocation = (nextLocation: ActiveLocation) => {
    saveActiveLocation(nextLocation);
    setLocation(nextLocation);
  };

  useEffect(() => {
    const controller = new AbortController();
    async function loadInitialLocation() {
      let primaryFarm: ActiveLocation | null = null;
      try {
        primaryFarm = await requestPrimaryFarmLocation(controller.signal);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
      if (controller.signal.aborted) return;
      const savedLocation = readSavedActiveLocation();
      if (primaryFarm) {
        saveActiveLocation(primaryFarm);
        setLocation(primaryFarm);
      } else if (savedLocation) {
        const correctedLocation =
          applyKnownGpsLocationCorrection(savedLocation);
        const normalizedLocation: ActiveLocation = {
          ...correctedLocation,
          labelSource:
            correctedLocation.labelSource ??
            (correctedLocation.source === "gps" &&
            correctedLocation.name.includes("สุรนารี")
              ? "user-corrected"
              : correctedLocation.source === "gps"
                ? "openstreetmap"
                : undefined),
        };
        saveActiveLocation(normalizedLocation);
        setLocation(normalizedLocation);
      }
    }

    void loadInitialLocation();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void requestWeather(location, controller.signal)
      .then((nextWeather) => {
        setWeather(nextWeather);
      })
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        ) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "ไม่สามารถโหลดข้อมูลสภาพอากาศได้"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      });

    return () => controller.abort();
  }, [location, refreshKey]);

  const selectedLocationId = location.custom
    ? "current-location"
    : location.id;

  const soilMoisturePercent = useMemo(() => {
    const value = weather?.agriculture.soilMoisture;

    return value === null || value === undefined
      ? null
      : Math.round(value * 100);
  }, [weather]);

  const handleLocationChange = (
    event: ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedLocation = WEATHER_LOCATIONS.find(
      (item) => item.id === event.target.value
    );

    if (selectedLocation) {
      locationRequestIdRef.current += 1;
      setError(null);
      setWeather(null);
      setIsLoading(true);
      updateLocation({ ...selectedLocation, source: "preset" });
    }
  };

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง");
      return;
    }

    const requestId = locationRequestIdRef.current + 1;
    locationRequestIdRef.current = requestId;
    setIsLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        void (async () => {
          try {
            const cachedName = readCachedLocationName(
              latitude,
              longitude
            );
            const locationName =
              cachedName ??
              (await requestLocationName(
                latitude,
                longitude,
                AbortSignal.timeout(10_000)
              ));

            if (!cachedName) {
              cacheLocationName(latitude, longitude, locationName);
            }

            if (locationRequestIdRef.current !== requestId) {
              return;
            }

            setWeather(null);
            setIsLoading(true);
            const resolvedLocation: ActiveLocation = {
              id: "current-location",
              name: locationName.label,
              region: "ระบุด้วย GPS",
              district: locationName.district ?? undefined,
              province: locationName.province ?? undefined,
              latitude,
              longitude,
              custom: true,
              source: "gps",
              accuracy,
              labelSource: "openstreetmap",
            };
            const correctedLocation =
              applyKnownGpsLocationCorrection(resolvedLocation);

            updateLocation({
              ...correctedLocation,
              labelSource:
                correctedLocation.name === resolvedLocation.name
                  ? "openstreetmap"
                  : "user-corrected",
            });
          } catch {
            if (locationRequestIdRef.current !== requestId) {
              return;
            }

            setWeather(null);
            setIsLoading(true);
            updateLocation({
              id: "current-location",
              name: "ตำแหน่งจาก GPS",
              region: "ไม่พบชื่อพื้นที่",
              latitude,
              longitude,
              custom: true,
              source: "gps",
              accuracy,
              labelSource: "coordinates",
            });
          } finally {
            if (locationRequestIdRef.current === requestId) {
              setIsLocating(false);
            }
          }
        })();
      },
      (locationError) => {
        const message =
          locationError.code ===
          locationError.PERMISSION_DENIED
            ? "กรุณาอนุญาตให้เว็บเข้าถึงตำแหน่ง แล้วลองใหม่อีกครั้ง"
            : "ไม่สามารถอ่านตำแหน่งปัจจุบันได้ กรุณาเลือกจังหวัดแทน";

        setError(message);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      }
    );
  };

  const handleRefresh = () => {
    setError(null);
    setIsRefreshing(true);
    setRefreshKey((value) => value + 1);
  };

  const locationToolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">เลือกพื้นที่พยากรณ์อากาศ</span>
        <MapPin
          aria-hidden="true"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-leaf"
        />
        <select
          value={selectedLocationId}
          onChange={handleLocationChange}
          className="h-12 w-full appearance-none rounded-xl border border-rice-forest/15 bg-white pl-10 pr-9 text-sm font-semibold text-rice-forest outline-none transition focus:border-rice-leaf focus:ring-2 focus:ring-rice-mint dark:border-white/15 dark:bg-white/[0.07] dark:text-white"
        >
          {location.custom && (
            <option value="current-location">
              {getLocationSelectLabel(location)}
            </option>
          )}
          {WEATHER_LOCATIONS.map((item) => (
            <option key={item.id} value={item.id}>
              {getLocationSelectLabel(item)}
            </option>
          ))}
        </select>
      </label>

      <Button
        type="button"
        variant="secondary"
        size="lg"
        loading={isLocating}
        onClick={handleUseCurrentLocation}
        startIcon={<LocateFixed className="h-4 w-4" />}
      >
        ตำแหน่งฉัน
      </Button>

      <Button
        type="button"
        variant="outline"
        size="icon"
        loading={isRefreshing}
        onClick={handleRefresh}
        aria-label="อัปเดตข้อมูลสภาพอากาศ"
        title="อัปเดตข้อมูล"
      >
        <RefreshCw className="h-5 w-5" />
      </Button>
    </div>
  );

  return (
    <main className="min-h-dvh bg-rice-background px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-[#07140c]">
      <div className="mx-auto w-full max-w-screen-2xl">
        <header>
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rice-leaf/20 bg-rice-mint/35 px-3 py-1.5 text-xs font-semibold text-rice-forest dark:border-rice-mint/20 dark:bg-rice-mint/10 dark:text-rice-mint">
              <Sprout aria-hidden="true" className="h-4 w-4" />
              Weather Intelligence
            </div>
            <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-rice-dark sm:text-4xl dark:text-white">
              สภาพอากาศเพื่อการเกษตร
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-rice-muted sm:text-base dark:text-white/60">
              ติดตามฝน ความชื้น และสมดุลน้ำ เพื่อช่วยวางแผนดูแลแปลงนาอย่างเหมาะสม
            </p>
          </div>
        </header>

        {error && (
          <div
            role="alert"
            className="mt-6 flex flex-col gap-4 rounded-3xl border border-red-200 bg-red-50 p-5 text-red-900 sm:flex-row sm:items-center sm:justify-between dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                aria-hidden="true"
                className="mt-0.5 h-5 w-5 shrink-0"
              />
              <div>
                <p className="font-semibold">โหลดข้อมูลไม่สำเร็จ</p>
                <p className="mt-1 text-sm opacity-80">{error}</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
            >
              ลองใหม่
            </Button>
          </div>
        )}

        <div className="mt-8">
          {isLoading && !weather ? (
            <WeatherSkeleton />
          ) : weather ? (
            <div className="space-y-6">
              <WeatherForecastExplorer
                weather={weather}
                locationToolbar={locationToolbar}
              />

              <section className="relative overflow-hidden rounded-[2rem] bg-[#c69216] p-6 text-white shadow-[0_20px_50px_rgba(180,125,8,0.20)] sm:p-8 lg:p-10">
                <Image
                  src="/images/42.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 1536px) 100vw, 1536px"
                  className="object-cover object-center opacity-85 saturate-125 contrast-110"
                  aria-hidden="true"
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(90deg,rgba(132,82,0,0.82)_0%,rgba(181,119,0,0.60)_42%,rgba(224,169,38,0.34)_100%)]"
                />

                <div className="relative z-10 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-white/65">
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                      <span className="font-semibold text-white/85">
                        {getLocationLabel(location)}
                      </span>
                    </div>

                    <div className="mt-7 flex items-center gap-5">
                      <span className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/16 text-amber-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] sm:h-24 sm:w-24">
                        <WeatherGlyph
                          icon={weather.current.condition.icon}
                          className="h-10 w-10 sm:h-12 sm:w-12"
                        />
                      </span>
                      <div>
                        <p className="font-heading text-6xl font-bold tracking-[-0.06em] sm:text-7xl">
                          {weather.current.temperature}°
                        </p>
                        <p className="mt-2 text-base font-semibold text-amber-50">
                          {weather.current.condition.label}
                        </p>
                      </div>
                    </div>

                    <p className="mt-6 max-w-xl text-sm leading-6 text-white/60">
                      {weather.current.condition.description} อุณหภูมิที่รู้สึกได้ {weather.current.apparentTemperature}°C
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
                    {[
                      {
                        label: "ความชื้น",
                        value: `${weather.current.relativeHumidity}%`,
                        icon: Droplets,
                      },
                      {
                        label: "ลม",
                        value: `${weather.current.windSpeed} กม./ชม.`,
                        icon: Wind,
                      },
                      {
                        label: "เมฆ",
                        value: `${weather.current.cloudCover}%`,
                        icon: Cloud,
                      },
                      {
                        label: "ฝนขณะนี้",
                        value: `${weather.current.precipitation} มม.`,
                        icon: CloudRain,
                      },
                    ].map((item) => {
                      const Icon = item.icon;

                      return (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-white/20 bg-black/[0.10] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-4 w-4 text-amber-50"
                          />
                          <p className="mt-3 text-[11px] text-white/45">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-semibold">
                            {item.value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section aria-labelledby="weather-metrics-title">
                <h2 id="weather-metrics-title" className="sr-only">
                  ตัวชี้วัดสภาพอากาศ
                </h2>
                <div
                  aria-label="ตัวชี้วัดสภาพอากาศ เลื่อนแนวนอนได้"
                  className="-mx-1 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] sm:mx-0 sm:grid sm:touch-auto sm:snap-none sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 xl:grid-cols-4"
                >
                  <MetricCard
                    icon={{ src: "/images/38.png", width: 434, height: 434 }}
                    label="ความชื้นสัมพัทธ์"
                    value={`${weather.current.relativeHumidity}%`}
                    helper="ความชื้นในอากาศ ณ เวลาปัจจุบัน"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={{ src: "/images/39.png", width: 435, height: 435 }}
                    label="ฝนวันนี้"
                    value={`${weather.agriculture.rainToday} มม.`}
                    helper={`โอกาสฝนสูงสุด ${weather.daily[0]?.precipitationProbabilityMax ?? 0}%`}
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={{ src: "/images/40.png", width: 871, height: 435 }}
                    label="ความชื้นผิวดิน"
                    value={
                      soilMoisturePercent === null
                        ? "ไม่มีข้อมูล"
                        : `${soilMoisturePercent}%`
                    }
                    helper="ค่าประมาณจากแบบจำลองที่ระดับผิวดิน 0–1 ซม."
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={{ src: "/images/41.png", width: 435, height: 435 }}
                    label="การคายระเหย ET₀"
                    value={
                      weather.agriculture.evapotranspirationToday === null
                        ? "ไม่มีข้อมูล"
                        : `${weather.agriculture.evapotranspirationToday} มม.`
                    }
                    helper="ค่าประมาณการสูญเสียน้ำอ้างอิงของวันนี้"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                </div>
              </section>

              <section
                aria-labelledby="weather-activity-title"
                className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]"
              >
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint">
                    Today&apos;s field plan
                  </p>
                  <h2
                    id="weather-activity-title"
                    className="mt-2 font-heading text-2xl font-bold text-rice-dark dark:text-white"
                  >
                    สภาพอากาศแบบนี้เหมาะกับทำอะไร
                  </h2>
                </div>
                <p className="mt-4 text-[11px] text-rice-muted sm:hidden dark:text-white/45">
                  ปัดไปทางซ้ายเพื่อดูคำแนะนำถัดไป →
                </p>

                <div
                  aria-label="คำแนะนำกิจกรรมในแปลง เลื่อนแนวนอนได้"
                  className="-mx-1 mt-3 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] md:mx-0 md:grid md:touch-auto md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0"
                >
                  {weather.agriculture.activities.slice(0, 4).map((activity) => (
                    <WeatherActivityCard
                      key={activity.id}
                      activity={activity}
                      className="w-[76vw] max-w-[280px] shrink-0 snap-start md:w-auto md:max-w-none md:shrink"
                    />
                  ))}
                </div>
              </section>


              <footer className="flex flex-col gap-4 rounded-3xl border border-rice-forest/10 bg-white/55 px-5 py-4 text-xs text-rice-muted sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:bg-white/[0.035] dark:text-white/45">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0 text-rice-leaf dark:text-rice-mint"
                  />
                  <p className="leading-5">
                    อัปเดตล่าสุด {formatUpdatedAt(weather.metadata.fetchedAt)} · Cache {Math.round(weather.metadata.cacheSeconds / 60)} นาที
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Compass aria-hidden="true" className="h-3.5 w-3.5" />
                    ลมจากทิศ{weather.current.windDirectionLabel}
                  </span>
                  <a
                    href={weather.metadata.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-rice-forest underline decoration-rice-leaf/40 underline-offset-4 hover:text-rice-leaf dark:text-rice-mint"
                  >
                    Weather data by Open-Meteo.com
                  </a>
                </div>
              </footer>

              <p className="px-2 text-center text-[11px] leading-5 text-rice-muted/70 dark:text-white/35">
                ข้อมูลนี้เป็นผลจากแบบจำลองพยากรณ์ ใช้เพื่อประกอบการวางแผนเท่านั้น ไม่ใช่ประกาศเตือนภัยอย่างเป็นทางการ และควรตรวจสภาพจริงในแปลงก่อนตัดสินใจ
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
