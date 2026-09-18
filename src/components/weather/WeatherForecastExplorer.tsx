"use client";

import {
  ChartNoAxesCombined,
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSun,
  Droplets,
  LayoutDashboard,
  Sun,
  SunMedium,
  ThermometerSun,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";

import type {
  HourlyWeather,
  WeatherData,
  WeatherIconKey,
} from "@/lib/weather/types";

type WeatherMetric =
  | "overview"
  | "rain"
  | "temperature"
  | "humidity"
  | "soil"
  | "et0";

interface MetricDefinition {
  id: WeatherMetric;
  label: string;
  chartTitle: string;
  unit: string;
  icon: LucideIcon;
  color: string;
  fill: string;
}

const METRICS: MetricDefinition[] = [
  {
    id: "overview",
    label: "ภาพรวม",
    chartTitle: "อุณหภูมิและปริมาณฝน",
    unit: "°C",
    icon: LayoutDashboard,
    color: "#22c55e",
    fill: "rgba(34, 197, 94, 0.14)",
  },
  {
    id: "rain",
    label: "ปริมาณฝน",
    chartTitle: "ปริมาณฝนรายชั่วโมง",
    unit: "มม.",
    icon: CloudRain,
    color: "#38bdf8",
    fill: "rgba(56, 189, 248, 0.17)",
  },
  {
    id: "temperature",
    label: "อุณหภูมิ",
    chartTitle: "อุณหภูมิรายชั่วโมง",
    unit: "°C",
    icon: ThermometerSun,
    color: "#f6c344",
    fill: "rgba(246, 195, 68, 0.16)",
  },
  {
    id: "humidity",
    label: "ความชื้น",
    chartTitle: "ความชื้นสัมพัทธ์รายชั่วโมง",
    unit: "%",
    icon: Droplets,
    color: "#2dd4bf",
    fill: "rgba(45, 212, 191, 0.15)",
  },
  {
    id: "soil",
    label: "ความชื้นดิน",
    chartTitle: "ความชื้นผิวดินรายชั่วโมง",
    unit: "%",
    icon: Waves,
    color: "#84cc16",
    fill: "rgba(132, 204, 22, 0.15)",
  },
  {
    id: "et0",
    label: "การคายระเหย ET₀",
    chartTitle: "การคายระเหยอ้างอิงรายชั่วโมง",
    unit: "มม.",
    icon: SunMedium,
    color: "#fb923c",
    fill: "rgba(251, 146, 60, 0.15)",
  },
];

const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  clear: Sun,
  "partly-cloudy": CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  storm: CloudLightning,
};

const CHART_WIDTH = 1100;
const CHART_HEIGHT = 420;
const CHART_MARGIN = { top: 58, right: 28, bottom: 62, left: 62 };

function formatHour(value: string) {
  return value.slice(11, 16);
}

function formatDay(date: string) {
  const value = new Date(`${date}T12:00:00+07:00`);
  return {
    day: new Intl.DateTimeFormat("th-TH", { day: "numeric" }).format(value),
    weekday: new Intl.DateTimeFormat("th-TH", { weekday: "short" }).format(value),
  };
}

function formatValue(value: number | null, maximumFractionDigits = 1) {
  return value === null || !Number.isFinite(value)
    ? "—"
    : value.toLocaleString("th-TH", { maximumFractionDigits });
}

function valueForMetric(hour: HourlyWeather, metric: WeatherMetric) {
  switch (metric) {
    case "rain":
      return hour.precipitation;
    case "humidity":
      return hour.relativeHumidity;
    case "soil":
      return hour.soilMoisture === null ? null : hour.soilMoisture * 100;
    case "et0":
      return hour.evapotranspiration;
    default:
      return hour.temperature;
  }
}

function linePath(
  values: Array<number | null>,
  xAt: (index: number) => number,
  yAt: (value: number) => number
) {
  let path = "";
  let drawing = false;
  values.forEach((value, index) => {
    if (value === null) {
      drawing = false;
      return;
    }
    path += `${drawing ? " L" : "M"}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)}`;
    drawing = true;
  });
  return path;
}

export default function WeatherForecastExplorer({
  weather,
  locationToolbar,
}: {
  weather: WeatherData;
  locationToolbar?: ReactNode;
}) {
  const [metric, setMetric] = useState<WeatherMetric>("rain");
  const [range, setRange] = useState<4 | 24>(24);
  const [showCumulative, setShowCumulative] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const gradientId = useId().replace(/:/g, "");
  const metricDefinition = METRICS.find((item) => item.id === metric) ?? METRICS[0];
  const hours = useMemo(() => weather.hourly.slice(0, range), [range, weather.hourly]);
  const rainValues = hours.map((hour) => hour.precipitation);
  const rainTotal = rainValues.reduce((sum, value) => sum + value, 0);
  let runningRain = 0;
  const cumulativeRain = rainValues.map((value) => {
    runningRain += value;
    return runningRain;
  });
  const values = metric === "rain" && showCumulative
    ? cumulativeRain
    : hours.map((hour) => valueForMetric(hour, metric));
  const finiteValues = values.filter((value): value is number => value !== null && Number.isFinite(value));
  const rawMinimum = finiteValues.length ? Math.min(...finiteValues) : 0;
  const rawMaximum = finiteValues.length ? Math.max(...finiteValues) : 1;
  const valueSpan = Math.max(1, rawMaximum - rawMinimum);
  const baselineMinimum = metric === "rain" ? 0 : rawMinimum - valueSpan * 0.16;
  const minimum = metric === "humidity" || metric === "soil"
    ? Math.max(0, baselineMinimum)
    : baselineMinimum;
  const maximum = metric === "humidity" || metric === "soil"
    ? Math.min(100, rawMaximum + valueSpan * 0.16)
    : rawMaximum + valueSpan * 0.16;
  const chartWidth = CHART_WIDTH - CHART_MARGIN.left - CHART_MARGIN.right;
  const chartHeight = CHART_HEIGHT - CHART_MARGIN.top - CHART_MARGIN.bottom;
  const xAt = (index: number) =>
    CHART_MARGIN.left + (index / Math.max(1, hours.length - 1)) * chartWidth;
  const yAt = (value: number) =>
    CHART_MARGIN.top + ((maximum - value) / Math.max(0.01, maximum - minimum)) * chartHeight;
  const path = linePath(values, xAt, yAt);
  const areaPath = path
    ? `${path} L${xAt(hours.length - 1)},${CHART_MARGIN.top + chartHeight} L${xAt(0)},${CHART_MARGIN.top + chartHeight} Z`
    : "";
  const ticks = Array.from({ length: 4 }, (_, index) =>
    maximum - ((maximum - minimum) / 3) * index
  );
  const maximumRain = Math.max(0.1, ...rainValues);
  const hoveredHour = hoveredIndex === null ? null : hours[hoveredIndex] ?? null;

  return (
    <section className="overflow-hidden rounded-[2rem] border border-rice-forest/10 bg-white/90 shadow-glass dark:border-white/10 dark:bg-[#0b1d12]">
      {locationToolbar ? (
        <div className="border-b border-rice-forest/10 bg-rice-background/60 px-4 py-4 dark:border-white/10 dark:bg-white/[0.025] sm:px-6">
          {locationToolbar}
        </div>
      ) : null}
      <div className="border-b border-rice-forest/10 px-4 pt-5 dark:border-white/10 sm:px-6 sm:pt-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-rice-forest text-rice-mint dark:bg-rice-mint dark:text-rice-dark">
              <ChartNoAxesCombined className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-heading text-xl font-bold text-rice-dark dark:text-white">รายชั่วโมง</p>
              <p className="text-xs text-rice-muted dark:text-white/45">เลือกตัวชี้วัดเพื่อดูแนวโน้มจาก API</p>
            </div>
          </div>

          <nav aria-label="เลือกตัวชี้วัดสภาพอากาศ" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-3 [scrollbar-width:thin] xl:pb-0">
            {METRICS.map((item) => {
              const Icon = item.icon;
              const selected = item.id === metric;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setMetric(item.id);
                    setHoveredIndex(null);
                  }}
                  className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf/50 ${
                    selected
                      ? "bg-rice-gold text-rice-dark shadow-sm"
                      : "bg-rice-background text-rice-muted hover:bg-rice-mint/50 hover:text-rice-forest dark:bg-white/[0.06] dark:text-white/60 dark:hover:bg-white/10 dark:hover:text-white"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div aria-label="พยากรณ์รายวัน" className="mt-5 flex snap-x gap-3 overflow-x-auto pb-5 [scrollbar-width:thin]">
          {weather.daily.map((day, index) => {
            const dayLabel = formatDay(day.date);
            const DayIcon = WEATHER_ICONS[day.condition.icon];
            return (
              <article
                key={day.date}
                className={`relative w-[170px] shrink-0 snap-start overflow-hidden rounded-2xl border p-4 transition sm:w-[182px] ${
                  index === 0
                    ? "border-rice-forest bg-rice-mint/25 shadow-[0_10px_30px_rgba(13,70,42,0.10)] dark:border-rice-gold/80 dark:bg-rice-gold/[0.08]"
                    : "border-rice-forest/10 bg-rice-background/60 dark:border-white/10 dark:bg-white/[0.035]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-heading text-xl font-bold text-rice-dark dark:text-white">{dayLabel.day}</p>
                    <p className="mt-0.5 text-xs text-rice-muted dark:text-white/45">{index === 0 ? "วันนี้" : dayLabel.weekday}</p>
                  </div>
                  <span className={`grid h-9 w-9 place-items-center rounded-xl ${index === 0 ? "bg-rice-forest text-rice-mint dark:bg-rice-gold dark:text-rice-dark" : "bg-white text-rice-leaf dark:bg-white/10 dark:text-rice-mint"}`}>
                    <DayIcon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <p className="mt-4 font-heading text-2xl font-bold text-rice-dark dark:text-white">
                  {formatValue(day.temperatureMax)}°
                  <span className="ml-1 text-sm font-medium text-rice-muted dark:text-white/40">/{formatValue(day.temperatureMin)}°</span>
                </p>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <span className="text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                    {formatValue(day.precipitationSum)} มม. · {day.precipitationProbabilityMax}%
                  </span>
                  <span className="flex h-10 w-2 items-end overflow-hidden rounded-full bg-sky-100 dark:bg-white/10">
                    <span className="w-full rounded-full bg-sky-500" style={{ height: `${Math.max(5, day.precipitationProbabilityMax)}%` }} />
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-rice-leaf dark:text-rice-mint">แนวโน้ม {range} ชั่วโมงข้างหน้า</p>
            <h2 className="mt-1 font-heading text-xl font-bold text-rice-dark dark:text-white sm:text-2xl">{metricDefinition.chartTitle}</h2>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl bg-rice-background p-1 dark:bg-white/[0.06]">
              {([4, 24] as const).map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={range === item}
                  onClick={() => {
                    setRange(item);
                    setHoveredIndex(null);
                  }}
                  className={`min-h-9 rounded-lg px-3 text-xs font-semibold transition ${range === item ? "bg-rice-forest text-white dark:bg-rice-mint dark:text-rice-dark" : "text-rice-muted dark:text-white/55"}`}
                >
                  {item} ชั่วโมง
                </button>
              ))}
            </div>
            {metric === "rain" ? (
              <button
                type="button"
                role="switch"
                aria-checked={showCumulative}
                onClick={() => setShowCumulative((value) => !value)}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rice-forest/10 px-3 text-xs font-semibold text-rice-muted dark:border-white/10 dark:text-white/60"
              >
                <span className={`relative h-5 w-9 rounded-full transition ${showCumulative ? "bg-rice-leaf" : "bg-rice-forest/15 dark:bg-white/15"}`}>
                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition ${showCumulative ? "left-[18px]" : "left-0.5"}`} />
                </span>
                สะสม
              </button>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Summary label="ค่าปัจจุบัน" value={`${formatValue(values[0] ?? null)} ${metricDefinition.unit}`} />
          <Summary label="ค่าสูงสุดในช่วง" value={`${formatValue(rawMaximum)} ${metricDefinition.unit}`} />
          <Summary label={`ฝนรวม ${range} ชั่วโมง`} value={`${formatValue(rainTotal, 2)} มม.`} />
        </div>

        {finiteValues.length ? (
          <div className="relative mt-5 overflow-hidden rounded-2xl border border-rice-forest/10 bg-[linear-gradient(180deg,rgba(236,248,241,0.7),rgba(248,251,247,0.95))] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(19,49,31,0.96),rgba(8,25,15,0.98))]">
            {hoveredHour && hoveredIndex !== null ? (
              <div className="pointer-events-none absolute right-3 top-3 z-10 min-w-40 rounded-xl border border-rice-forest/10 bg-white/95 p-3 text-xs shadow-xl backdrop-blur dark:border-white/10 dark:bg-[#14291b]/95">
                <p className="font-bold text-rice-dark dark:text-white">{formatHour(hoveredHour.time)} น.</p>
                <p className="mt-1 text-rice-muted dark:text-white/55">
                  {formatValue(values[hoveredIndex] ?? null)} {metricDefinition.unit}
                </p>
                <p className="mt-1 text-sky-700 dark:text-sky-300">ฝน {formatValue(hoveredHour.precipitation, 2)} มม. · {hoveredHour.precipitationProbability}%</p>
              </div>
            ) : null}
            <div className="overflow-x-auto pb-1">
              <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} role="img" aria-label={`${metricDefinition.chartTitle} ${range} ชั่วโมง`} className="h-auto min-w-[760px] w-full">
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={metricDefinition.color} stopOpacity="0.28" />
                    <stop offset="100%" stopColor={metricDefinition.color} stopOpacity="0.01" />
                  </linearGradient>
                </defs>
                {ticks.map((tick) => {
                  const y = yAt(tick);
                  return (
                    <g key={tick}>
                      <line x1={CHART_MARGIN.left} x2={CHART_WIDTH - CHART_MARGIN.right} y1={y} y2={y} stroke="currentColor" opacity="0.09" strokeDasharray="3 5" />
                      <text x={CHART_MARGIN.left - 12} y={y + 4} textAnchor="end" fill="currentColor" opacity="0.48" fontSize="12">{formatValue(tick)}</text>
                    </g>
                  );
                })}
                <text x={CHART_MARGIN.left} y="25" fill="currentColor" opacity="0.5" fontSize="12">{metricDefinition.unit}</text>
                {hours.map((hour, index) => {
                  const x = xAt(index);
                  const Icon = WEATHER_ICONS[hour.condition.icon];
                  const barWidth = Math.max(8, Math.min(24, chartWidth / Math.max(1, hours.length) - 8));
                  const barHeight = (hour.precipitation / maximumRain) * chartHeight * 0.38;
                  return (
                    <g key={hour.time} onPointerEnter={() => setHoveredIndex(index)} onPointerLeave={() => setHoveredIndex(null)} onFocus={() => setHoveredIndex(index)} onBlur={() => setHoveredIndex(null)} tabIndex={0} role="button" aria-label={`${formatHour(hour.time)} ${formatValue(values[index] ?? null)} ${metricDefinition.unit}`} className="cursor-pointer outline-none">
                      <rect x={x - Math.max(12, chartWidth / Math.max(1, hours.length) / 2)} y={CHART_MARGIN.top - 34} width={Math.max(24, chartWidth / Math.max(1, hours.length))} height={chartHeight + 62} fill="transparent" />
                      <Icon x={x - 8} y={CHART_MARGIN.top - 34} width="16" height="16" color={hour.precipitationProbability >= 60 ? "#38bdf8" : metricDefinition.color} />
                      {metric === "rain" || metric === "overview" ? (
                        <rect x={x - barWidth / 2} y={CHART_MARGIN.top + chartHeight - barHeight} width={barWidth} height={Math.max(hour.precipitation > 0 ? 3 : 0, barHeight)} rx={barWidth / 2} fill="#38bdf8" opacity={hoveredIndex === null || hoveredIndex === index ? 0.82 : 0.38} />
                      ) : null}
                      {(index % (range === 24 ? 2 : 1) === 0 || index === hours.length - 1) ? (
                        <text x={x} y={CHART_HEIGHT - 24} textAnchor="middle" fill="currentColor" opacity="0.5" fontSize="11">{formatHour(hour.time)}</text>
                      ) : null}
                    </g>
                  );
                })}
                {areaPath ? <path d={areaPath} fill={`url(#${gradientId})`} pointerEvents="none" /> : null}
                {path ? <path d={path} fill="none" stroke={metricDefinition.color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" pointerEvents="none" /> : null}
                {values.map((value, index) => value === null ? null : (
                  <circle key={hours[index].time} cx={xAt(index)} cy={yAt(value)} r={hoveredIndex === index ? 5.5 : 3.5} fill={metricDefinition.color} stroke="white" strokeWidth="1.5" pointerEvents="none" />
                ))}
              </svg>
            </div>
            <div className="flex flex-wrap items-center gap-4 border-t border-rice-forest/8 px-4 py-3 text-[11px] text-rice-muted dark:border-white/8 dark:text-white/45">
              <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 rounded-full" style={{ backgroundColor: metricDefinition.color }} />{showCumulative && metric === "rain" ? "ฝนสะสม" : metricDefinition.label}</span>
              {(metric === "rain" || metric === "overview") ? <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded bg-sky-400" />ฝนรายชั่วโมง</span> : null}
              <span className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-rice-gold" />ข้อมูลพยากรณ์จาก Open-Meteo</span>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid min-h-64 place-items-center rounded-2xl border border-dashed border-rice-forest/15 bg-rice-background/60 px-6 text-center text-sm text-rice-muted dark:border-white/15 dark:bg-white/[0.03] dark:text-white/50">
            API ไม่มีข้อมูล {metricDefinition.label} สำหรับช่วงเวลานี้
          </div>
        )}
      </div>
    </section>
  );
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-rice-forest/8 bg-rice-background/55 px-4 py-3 dark:border-white/8 dark:bg-white/[0.035]">
      <p className="text-[11px] text-rice-muted dark:text-white/45">{label}</p>
      <p className="mt-1 font-heading text-base font-bold text-rice-dark dark:text-white">{value}</p>
    </div>
  );
}
