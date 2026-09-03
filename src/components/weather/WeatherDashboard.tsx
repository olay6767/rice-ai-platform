"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Compass,
  Droplets,
  Gauge,
  LocateFixed,
  LoaderCircle,
  MapPin,
  MapPinned,
  RefreshCw,
  Search,
  ShieldAlert,
  Sprout,
  Sun,
  ThermometerSun,
  Waves,
  Wind,
  PencilLine,
  Save,
  type LucideIcon,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Button from "@/components/ui/Button";
import {
  DEFAULT_WEATHER_LOCATION,
  WEATHER_LOCATIONS,
  type WeatherLocationOption,
} from "@/lib/weather/locations";
import { applyKnownGpsLocationCorrection } from "@/lib/weather/location-corrections";
import type {
  DailyWeather,
  WeatherApiError,
  WeatherApiSuccess,
  WeatherData,
  WeatherActivity,
  WeatherIconKey,
  WeatherInsight,
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

interface LocationSearchResult {
  id: string;
  label: string;
  locality: string | null;
  district: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
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

const INSIGHT_ICONS: Record<
  WeatherInsight["id"],
  LucideIcon
> = {
  irrigation: Droplets,
  disease: ShieldAlert,
  "field-work": CalendarClock,
};

const INSIGHT_STYLES: Record<
  WeatherInsight["level"],
  string
> = {
  good:
    "border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-50",
  watch:
    "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-50",
  warning:
    "border-orange-200 bg-orange-50 text-orange-950 dark:border-orange-400/20 dark:bg-orange-400/10 dark:text-orange-50",
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

function formatHour(time: string): string {
  return time.slice(11, 16);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(`${date}T12:00:00+07:00`));
}

function formatUpdatedAt(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(new Date(value));
}

function formatCoordinate(value: number): string {
  return value.toFixed(4);
}

function formatGpsAccuracy(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) {
    return "ไม่ทราบความแม่นยำ";
  }

  if (value >= 1_000) {
    return `±${(value / 1_000).toLocaleString("th-TH", {
      maximumFractionDigits: 1,
    })} กม.`;
  }

  return `±${Math.max(1, Math.round(value)).toLocaleString("th-TH")} ม.`;
}

function locationLabelSource(location: ActiveLocation): string {
  switch (location.labelSource) {
    case "user-corrected":
      return "ชื่อพื้นที่ที่ผู้ใช้ยืนยัน";
    case "coordinates":
      return "แสดงจากพิกัด GPS";
    default:
      return "ชื่อพื้นที่จาก OpenStreetMap";
  }
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
  const payload = (await response.json()) as
    | { data: ResolvedLocationName }
    | WeatherApiError;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error.message
        : "ไม่สามารถระบุชื่อพื้นที่ได้"
    );
  }

  return payload.data;
}

async function requestLocationSearch(
  query: string,
  signal: AbortSignal
): Promise<LocationSearchResult[]> {
  const params = new URLSearchParams({ query });
  const response = await fetch(
    `/api/weather/location?${params.toString()}`,
    { cache: "no-store", signal }
  );
  const payload = (await response.json()) as
    | { data: LocationSearchResult[] }
    | WeatherApiError;

  if (!response.ok || "error" in payload) {
    throw new Error(
      "error" in payload
        ? payload.error.message
        : "ไม่สามารถค้นหาพื้นที่ได้"
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
  const payload = await response.json() as { data?: { field?: PrimaryFarmFieldLocation | null } };
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

  const payload = (await response.json()) as
    | WeatherApiSuccess
    | WeatherApiError;

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
  icon: Icon,
  label,
  value,
  helper,
  accent,
  className = "",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  helper: string;
  accent: "mint" | "blue" | "gold" | "green";
  className?: string;
}) {
  const accentClasses = {
    mint: "bg-rice-mint/55 text-rice-forest",
    blue: "bg-sky-100 text-sky-700",
    gold: "bg-amber-100 text-amber-700",
    green: "bg-emerald-100 text-emerald-700",
  }[accent];

  return (
    <article className={`rounded-3xl border border-rice-forest/10 bg-white/80 p-5 shadow-glass backdrop-blur-sm dark:border-white/10 dark:bg-white/[0.055] ${className}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-rice-muted dark:text-white/55">
            {label}
          </p>
          <p className="mt-3 font-heading text-3xl font-bold tracking-tight text-rice-dark dark:text-white">
            {value}
          </p>
        </div>
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${accentClasses}`}
        >
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-3 text-xs leading-5 text-rice-muted/80 dark:text-white/45">
        {helper}
      </p>
    </article>
  );
}

function RainForecastChart({
  days,
}: {
  days: DailyWeather[];
}) {
  const maximumRain = Math.max(
    ...days.map((day) => day.precipitationSum),
    1
  );

  return (
    <div className="mt-6 h-48 rounded-3xl border border-rice-forest/10 bg-rice-background/70 px-4 pb-4 pt-6 dark:border-white/10 dark:bg-black/10">
      <div className="flex h-full items-end gap-2 sm:gap-4">
        {days.map((day) => {
          const barHeight = Math.max(
            4,
            (day.precipitationSum / maximumRain) * 100
          );

          return (
            <div
              key={day.date}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end"
            >
              <span className="mb-2 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {day.precipitationSum} มม.
              </span>
              <div className="flex h-28 w-full items-end justify-center">
                <div
                  role="img"
                  aria-label={`${formatDate(day.date)} ปริมาณฝน ${day.precipitationSum} มิลลิเมตร`}
                  className="w-full max-w-10 rounded-t-xl bg-sky-400 transition-[height] duration-500 dark:bg-sky-500"
                  style={{ height: `${barHeight}%` }}
                />
              </div>
              <span className="mt-2 truncate text-[10px] font-medium text-rice-muted dark:text-white/50 sm:text-xs">
                {formatDate(day.date).split(" ")[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeatherInsightCard({
  insight,
}: {
  insight: WeatherInsight;
}) {
  const Icon = INSIGHT_ICONS[insight.id];

  return (
    <article
      className={`rounded-3xl border p-5 ${INSIGHT_STYLES[insight.level]}`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/65 dark:bg-white/10">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-heading text-base font-semibold">
            {insight.title}
          </h3>
          <p className="mt-2 text-sm leading-6 opacity-75">
            {insight.message}
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
  const [isEditingLocationName, setIsEditingLocationName] = useState(false);
  const [locationNameDraft, setLocationNameDraft] = useState("");
  const [locationSearchResults, setLocationSearchResults] = useState<
    LocationSearchResult[]
  >([]);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [locationSearchError, setLocationSearchError] = useState<
    string | null
  >(null);
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

  useEffect(() => {
    const query = locationNameDraft.trim();

    if (!isEditingLocationName || query.length < 2) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setIsSearchingLocation(true);
      setLocationSearchError(null);

      void requestLocationSearch(query, controller.signal)
        .then((results) => {
          setLocationSearchResults(results);

          if (!results.length) {
            setLocationSearchError("ไม่พบพื้นที่ ลองพิมพ์ตำบล อำเภอ หรือจังหวัด");
          }
        })
        .catch((searchError: unknown) => {
          if (
            searchError instanceof DOMException &&
            searchError.name === "AbortError"
          ) {
            return;
          }

          setLocationSearchResults([]);
          setLocationSearchError(
            searchError instanceof Error
              ? searchError.message
              : "ไม่สามารถค้นหาพื้นที่ได้"
          );
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsSearchingLocation(false);
          }
        });
    }, 450);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [isEditingLocationName, locationNameDraft]);

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
      setIsEditingLocationName(false);
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

  const handleEditLocationName = () => {
    setLocationNameDraft("");
    setLocationSearchResults([]);
    setLocationSearchError(null);
    setIsEditingLocationName(true);
  };

  const handleLocationSearchChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setLocationNameDraft(value);

    if (value.trim().length < 2) {
      setLocationSearchResults([]);
      setLocationSearchError(null);
      setIsSearchingLocation(false);
    }
  };

  const handleSelectSearchResult = (result: LocationSearchResult) => {
    locationRequestIdRef.current += 1;
    setError(null);
    setWeather(null);
    setIsLoading(true);
    setLocationSearchResults([]);
    setLocationSearchError(null);
    setIsEditingLocationName(false);
    updateLocation({
      id: `search-${result.id}`,
      name: result.label,
      region: "ค้นหาจากแผนที่",
      district: result.district ?? undefined,
      province: result.province ?? undefined,
      latitude: result.latitude,
      longitude: result.longitude,
      custom: true,
      source: "search",
      labelSource: "openstreetmap",
    });
  };

  const handleSaveLocationName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextName = locationNameDraft.trim();

    if (!nextName) {
      return;
    }

    updateLocation({
      ...location,
      name: nextName.slice(0, 120),
      custom: true,
      source: location.source === "gps" ? "gps" : "search",
      labelSource: "user-corrected",
    });
    setIsEditingLocationName(false);
  };

  return (
    <main className="min-h-dvh bg-rice-background px-4 py-8 sm:px-6 lg:px-8 lg:py-12 dark:bg-[#07140c]">
      <div className="mx-auto w-full max-w-screen-2xl">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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

          <div className="w-full space-y-2 lg:w-auto">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="relative min-w-0 sm:min-w-64">
              <span className="sr-only">เลือกพื้นที่พยากรณ์อากาศ</span>
              <MapPin
                aria-hidden="true"
                className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-leaf"
              />
              <select
                value={selectedLocationId}
                onChange={handleLocationChange}
                className="h-12 w-full appearance-none rounded-2xl border border-rice-forest/15 bg-white pl-10 pr-9 text-sm font-semibold text-rice-forest outline-none transition focus:border-rice-leaf focus:ring-2 focus:ring-rice-mint dark:border-white/15 dark:bg-white/[0.07] dark:text-white"
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
          <p
            aria-live="polite"
            className="flex flex-wrap items-center gap-1.5 px-1 text-xs text-rice-muted dark:text-white/50"
          >
            <MapPin aria-hidden="true" className="h-3.5 w-3.5 text-rice-leaf" />
            กำลังดู: <span className="font-semibold text-rice-forest dark:text-white">{getLocationLabel(location)}</span>
            <span aria-hidden="true">·</span>
            {location.source === "gps" ? "GPS ของอุปกรณ์" : "พื้นที่ที่เลือก"}
            <span className="hidden sm:inline">· จดจำพื้นที่ล่าสุดในอุปกรณ์นี้</span>
          </p>

          {location.source === "gps" && (
            <div
              aria-label="แหล่งข้อมูลตำแหน่งและสภาพอากาศ"
              className="flex flex-wrap gap-2 px-1 text-[11px] font-semibold"
            >
              <span className="rounded-full bg-rice-mint/35 px-2.5 py-1 text-rice-forest dark:bg-rice-mint/10 dark:text-rice-mint">
                GPS {formatGpsAccuracy(location.accuracy)}
              </span>
              <span className="rounded-full bg-sky-100 px-2.5 py-1 text-sky-800 dark:bg-sky-400/10 dark:text-sky-200">
                อากาศจาก Open-Meteo ตามพิกัด
              </span>
              <span className="rounded-full bg-white/80 px-2.5 py-1 text-rice-muted dark:bg-white/[0.06] dark:text-white/55">
                {locationLabelSource(location)}
              </span>
            </div>
          )}

          {!isEditingLocationName && (
            <button
              type="button"
              onClick={handleEditLocationName}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold text-rice-leaf transition hover:bg-rice-mint/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf/40 dark:text-rice-mint"
            >
              <PencilLine className="h-3.5 w-3.5" aria-hidden="true" />
              {location.custom
                ? "ชื่อพื้นที่ไม่ถูกต้อง? ค้นหาหรือแก้ไข"
                : "ค้นหาพื้นที่อื่น"}
            </button>
          )}

          {isEditingLocationName && (
            <form
              onSubmit={handleSaveLocationName}
              className="rounded-2xl border border-rice-leaf/15 bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/[0.045]"
            >
              <div className="flex items-center gap-2 text-xs font-bold text-rice-forest dark:text-white">
                <MapPinned className="h-4 w-4 text-rice-leaf dark:text-rice-mint" />
                ค้นหาตำบล อำเภอ หรือจังหวัด
              </div>

              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <label className="relative min-w-0 flex-1">
                <span className="sr-only">ค้นหาชื่อพื้นที่</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-muted"
                />
                <input
                  value={locationNameDraft}
                  onChange={handleLocationSearchChange}
                  maxLength={120}
                  autoFocus
                  autoComplete="off"
                  placeholder="เช่น สุรนารี นครราชสีมา"
                  className="h-11 w-full rounded-xl border border-rice-forest/15 bg-white pl-10 pr-10 text-sm font-semibold text-rice-forest outline-none focus:border-rice-leaf focus:ring-2 focus:ring-rice-mint dark:border-white/15 dark:bg-white/[0.07] dark:text-white"
                />
                {isSearchingLocation && (
                  <LoaderCircle
                    aria-label="กำลังค้นหาพื้นที่"
                    className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-rice-leaf"
                  />
                )}
              </label>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button
                  type="submit"
                  disabled={!locationNameDraft.trim()}
                  className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white transition hover:bg-rice-leaf disabled:cursor-not-allowed disabled:opacity-45 dark:bg-rice-mint dark:text-rice-dark"
                >
                  <Save className="h-3.5 w-3.5" aria-hidden="true" />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingLocationName(false);
                    setLocationSearchResults([]);
                    setLocationSearchError(null);
                  }}
                  className="min-h-11 rounded-xl border border-rice-forest/15 px-4 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/30 dark:border-white/15 dark:text-white"
                >
                  ยกเลิก
                </button>
              </div>
              </div>

              <p className="mt-2 text-[11px] leading-5 text-rice-muted dark:text-white/45">
                เลือกผลค้นหาเพื่อเปลี่ยนทั้งพิกัดและข้อมูลอากาศ หรือกดบันทึกเพื่อแก้เฉพาะชื่อที่แสดง
              </p>

              {(locationSearchResults.length > 0 || locationSearchError) && (
                <div
                  aria-live="polite"
                  className="mt-3 overflow-hidden rounded-xl border border-rice-forest/10 bg-white dark:border-white/10 dark:bg-[#0b1d12]"
                >
                  {locationSearchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectSearchResult(result)}
                      className="flex min-h-14 w-full items-start gap-3 border-b border-rice-forest/8 px-3 py-3 text-left transition last:border-b-0 hover:bg-rice-mint/25 dark:border-white/8 dark:hover:bg-white/[0.055]"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-rice-mint/45 text-rice-forest dark:bg-rice-mint/10 dark:text-rice-mint">
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-bold leading-5 text-rice-forest dark:text-white">
                          {result.label}
                        </span>
                        <span className="mt-0.5 block text-[10px] text-rice-muted dark:text-white/40">
                          {formatCoordinate(result.latitude)}, {formatCoordinate(result.longitude)} · OpenStreetMap
                        </span>
                      </span>
                    </button>
                  ))}

                  {locationSearchError && (
                    <p className="px-3 py-3 text-xs text-amber-700 dark:text-amber-200">
                      {locationSearchError}
                    </p>
                  )}
                </div>
              )}
            </form>
          )}
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
              <section className="relative overflow-hidden rounded-[2rem] bg-rice-forest p-6 text-white sm:p-8 lg:p-10">
                <div
                  aria-hidden="true"
                  className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rice-mint/10"
                />
                <div
                  aria-hidden="true"
                  className="absolute -bottom-24 right-1/4 h-52 w-52 rounded-full bg-rice-gold/10"
                />

                <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
                  <div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-white/65">
                      <MapPin aria-hidden="true" className="h-4 w-4" />
                      <span className="font-semibold text-white/85">
                        {getLocationLabel(location)}
                      </span>
                      <span aria-hidden="true">•</span>
                      <span>
                        {location.source === "gps" ? "GPS ของอุปกรณ์" : location.region}
                      </span>
                    </div>

                    <p className="mt-2 text-xs text-white/45">
                      พิกัด {formatCoordinate(weather.location.latitude)}, {formatCoordinate(weather.location.longitude)}
                      {location.source === "gps" &&
                        ` · GPS ${formatGpsAccuracy(location.accuracy)} · ${locationLabelSource(location)}`}
                    </p>

                    <div className="mt-7 flex items-center gap-5">
                      <span className="flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-white/10 text-rice-mint sm:h-24 sm:w-24">
                        <WeatherGlyph
                          icon={weather.current.condition.icon}
                          className="h-10 w-10 sm:h-12 sm:w-12"
                        />
                      </span>
                      <div>
                        <p className="font-heading text-6xl font-bold tracking-[-0.06em] sm:text-7xl">
                          {weather.current.temperature}°
                        </p>
                        <p className="mt-2 text-base font-semibold text-rice-mint">
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
                          className="rounded-2xl border border-white/10 bg-white/[0.07] p-4"
                        >
                          <Icon
                            aria-hidden="true"
                            className="h-4 w-4 text-rice-mint"
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
                    icon={Droplets}
                    label="ความชื้นสัมพัทธ์"
                    value={`${weather.current.relativeHumidity}%`}
                    helper="ความชื้นในอากาศ ณ เวลาปัจจุบัน"
                    accent="mint"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={CloudRain}
                    label="ฝนวันนี้"
                    value={`${weather.agriculture.rainToday} มม.`}
                    helper={`โอกาสฝนสูงสุด ${weather.daily[0]?.precipitationProbabilityMax ?? 0}%`}
                    accent="blue"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={Waves}
                    label="ความชื้นผิวดิน"
                    value={
                      soilMoisturePercent === null
                        ? "ไม่มีข้อมูล"
                        : `${soilMoisturePercent}%`
                    }
                    helper="ค่าประมาณจากแบบจำลองที่ระดับผิวดิน 0–1 ซม."
                    accent="green"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                  <MetricCard
                    icon={ThermometerSun}
                    label="การคายระเหย ET₀"
                    value={
                      weather.agriculture.evapotranspirationToday === null
                        ? "ไม่มีข้อมูล"
                        : `${weather.agriculture.evapotranspirationToday} มม.`
                    }
                    helper="ค่าประมาณการสูญเสียน้ำอ้างอิงของวันนี้"
                    accent="gold"
                    className="w-[76vw] max-w-[260px] shrink-0 snap-start sm:w-auto sm:max-w-none sm:shrink"
                  />
                </div>
              </section>

              <section
                aria-labelledby="weather-activity-title"
                className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
                  <p className="text-xs leading-5 text-rice-muted dark:text-white/45">
                    ประเมินจากฝน ความชื้น และลมเท่านั้น ควรตรวจสภาพจริงก่อนเริ่มงาน
                  </p>
                </div>
                <p className="mt-4 text-[11px] text-rice-muted sm:hidden dark:text-white/45">
                  ปัดไปทางซ้ายเพื่อดูคำแนะนำถัดไป →
                </p>

                <div
                  aria-label="คำแนะนำกิจกรรมในแปลง เลื่อนแนวนอนได้"
                  className="-mx-1 mt-3 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] md:mx-0 md:grid md:touch-auto md:snap-none md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0"
                >
                  {weather.agriculture.activities.map((activity) => (
                    <WeatherActivityCard
                      key={activity.id}
                      activity={activity}
                      className="w-[76vw] max-w-[280px] shrink-0 snap-start md:w-auto md:max-w-none md:shrink"
                    />
                  ))}
                </div>
              </section>

              <section className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint">
                      Next 24 hours
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-rice-dark dark:text-white">
                      พยากรณ์รายชั่วโมง
                    </h2>
                  </div>
                  <p className="text-xs text-rice-muted dark:text-white/45">
                    เลื่อนเพื่อดูข้อมูลครบ 24 ชั่วโมง
                  </p>
                </div>

                <div className="mt-6 flex gap-3 overflow-x-auto pb-3 [scrollbar-width:thin]">
                  {weather.hourly.map((hour, index) => (
                    <article
                      key={hour.time}
                      className="min-w-32 rounded-3xl border border-rice-forest/10 bg-rice-background/65 p-4 text-center dark:border-white/10 dark:bg-black/10"
                    >
                      <p className="text-xs font-semibold text-rice-muted dark:text-white/50">
                        {index === 0 ? "ตอนนี้" : formatHour(hour.time)}
                      </p>
                      <span className="mx-auto mt-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-rice-mint/35 text-rice-forest dark:bg-rice-mint/10 dark:text-rice-mint">
                        <WeatherGlyph
                          icon={hour.condition.icon}
                          className="h-5 w-5"
                        />
                      </span>
                      <p className="mt-3 text-xl font-bold text-rice-dark dark:text-white">
                        {hour.temperature}°
                      </p>
                      <div className="mt-3 flex items-center justify-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        <Droplets aria-hidden="true" className="h-3 w-3" />
                        {hour.precipitationProbability}%
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
                <div className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">
                        Rain outlook
                      </p>
                      <h2 className="mt-2 font-heading text-2xl font-bold text-rice-dark dark:text-white">
                        แนวโน้มฝน 7 วัน
                      </h2>
                    </div>
                    <div className="rounded-2xl bg-sky-50 px-4 py-3 text-right dark:bg-sky-400/10">
                      <p className="text-[10px] font-medium text-sky-700 dark:text-sky-300">
                        ฝนรวม
                      </p>
                      <p className="mt-1 text-lg font-bold text-sky-900 dark:text-sky-100">
                        {weather.agriculture.rainNextSevenDays} มม.
                      </p>
                    </div>
                  </div>
                  <RainForecastChart days={weather.daily} />
                </div>

                <div className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rice-mint/40 text-rice-forest dark:bg-rice-mint/10 dark:text-rice-mint">
                      <Gauge aria-hidden="true" className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-xs text-rice-muted dark:text-white/45">
                        สมดุลน้ำวันนี้
                      </p>
                      <h2 className="font-heading text-xl font-bold text-rice-dark dark:text-white">
                        ฝน − ET₀
                      </h2>
                    </div>
                  </div>
                  <p className="mt-7 font-heading text-5xl font-bold tracking-tight text-rice-forest dark:text-rice-mint">
                    {weather.agriculture.waterBalanceToday === null
                      ? "—"
                      : `${weather.agriculture.waterBalanceToday > 0 ? "+" : ""}${weather.agriculture.waterBalanceToday}`}
                    <span className="ml-2 text-base font-semibold text-rice-muted dark:text-white/50">
                      มม.
                    </span>
                  </p>
                  <p className="mt-4 text-sm leading-6 text-rice-muted dark:text-white/55">
                    ค่าบวกหมายถึงฝนมากกว่าการคายระเหย ค่าลบหมายถึงควรตรวจน้ำในแปลงเพิ่มเติม
                  </p>
                </div>
              </section>

              <section className="rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-glass sm:p-7 dark:border-white/10 dark:bg-white/[0.055]">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint">
                      7-day forecast
                    </p>
                    <h2 className="mt-2 font-heading text-2xl font-bold text-rice-dark dark:text-white">
                      พยากรณ์รายวัน
                    </h2>
                  </div>
                  <p className="shrink-0 text-[11px] text-rice-muted sm:hidden dark:text-white/45">
                    ปัดเพื่อดูวันถัดไป →
                  </p>
                </div>

                <div
                  aria-label="พยากรณ์อากาศรายวัน เลื่อนแนวนอนได้"
                  className="-mx-1 mt-6 flex touch-pan-x snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-1 pb-3 [scrollbar-width:thin] sm:mx-0 sm:grid sm:touch-auto sm:snap-none sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 xl:grid-cols-7"
                >
                  {weather.daily.map((day, index) => (
                    <article
                      key={day.date}
                      className={`w-[76vw] max-w-[260px] shrink-0 snap-start rounded-3xl border p-4 sm:w-auto sm:max-w-none sm:shrink ${
                        index === 0
                          ? "border-rice-leaf/30 bg-rice-mint/20 dark:border-rice-mint/20 dark:bg-rice-mint/10"
                          : "border-rice-forest/10 bg-rice-background/55 dark:border-white/10 dark:bg-black/10"
                      }`}
                    >
                      <p className="text-xs font-semibold text-rice-muted dark:text-white/50">
                        {index === 0 ? "วันนี้" : formatDate(day.date)}
                      </p>
                      <span className="mt-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-rice-forest dark:bg-white/10 dark:text-rice-mint">
                        <WeatherGlyph
                          icon={day.condition.icon}
                          className="h-5 w-5"
                        />
                      </span>
                      <p className="mt-4 font-heading text-lg font-bold text-rice-dark dark:text-white">
                        {day.temperatureMax}°
                        <span className="ml-1 text-sm font-medium text-rice-muted dark:text-white/45">
                          / {day.temperatureMin}°
                        </span>
                      </p>
                      <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-sky-700 dark:text-sky-300">
                        <CloudRain aria-hidden="true" className="h-3 w-3" />
                        {day.precipitationProbabilityMax}% · {day.precipitationSum} มม.
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <section aria-labelledby="farm-advice-title">
                <div className="mb-5 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rice-forest text-rice-mint dark:bg-rice-mint dark:text-rice-dark">
                    <Sprout aria-hidden="true" className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint">
                      Smart farming advice
                    </p>
                    <h2
                      id="farm-advice-title"
                      className="mt-1 font-heading text-2xl font-bold text-rice-dark dark:text-white"
                    >
                      คำแนะนำสำหรับแปลงนา
                    </h2>
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-3">
                  {weather.agriculture.insights.map((insight) => (
                    <WeatherInsightCard
                      key={insight.id}
                      insight={insight}
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
