"use client";

import { MapPin, Minus, Plus, RotateCcw, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { buildRiceYieldMapPaths } from "@/lib/rice-yield/map-geometry";
import type {
  RiceProvinceGeoJson,
  RiceYieldRecord,
} from "@/lib/rice-yield/static-dashboard-types";
import { RiceEmptyState } from "./RiceAnalyticsShell";

const MAP_WIDTH = 720;
const MAP_HEIGHT = 760;

function formatNumber(value: number | null, digits = 1) {
  if (value === null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function signedNumber(value: number | null, suffix = "") {
  if (value === null || !Number.isFinite(value)) return "—";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, 2)}${suffix}`;
}

function isForecastRecord(record: RiceYieldRecord) {
  return record.is_forecast || record.crop_year === "2568/69";
}

function yieldColor(value: number | null, minimum: number, maximum: number) {
  if (value === null) return "#d7dbd4";
  const ratio = (value - minimum) / Math.max(1, maximum - minimum);
  return ratio < 0.5 ? "#f3df89" : "#b78312";
}

interface YieldMapConnector {
  province: string;
  width: number;
  height: number;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export function ThailandYieldChoropleth({
  geoJson,
  records,
  selectedProvince,
  onSelectProvince,
}: {
  geoJson: RiceProvinceGeoJson;
  records: RiceYieldRecord[];
  selectedProvince: string;
  onSelectProvince: (province: string) => void;
}) {
  const [hoveredProvince, setHoveredProvince] = useState<string | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT });
  const [connector, setConnector] = useState<YieldMapConnector | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const detailCardRef = useRef<HTMLElement>(null);
  const provincePathRefs = useRef(new Map<string, SVGPathElement>());
  const projectedFeatures = useMemo(
    () => buildRiceYieldMapPaths(geoJson.features, MAP_WIDTH, MAP_HEIGHT),
    [geoJson.features]
  );
  const recordByProvince = useMemo(
    () => new Map(records.map((record) => [record.province, record])),
    [records]
  );
  const values = records.map((record) => record.yield_kg_rai);
  const minimum = values.length ? Math.min(...values) : 0;
  const maximum = values.length ? Math.max(...values) : 1;
  const activeProvince = hoveredProvince ?? selectedProvince;
  const activeRecord = recordByProvince.get(activeProvince) ?? null;
  const matchedCount = geoJson.features.filter((feature) =>
    recordByProvince.has(feature.properties.province_th)
  ).length;

  useEffect(() => {
    let animationFrame = 0;

    const updateConnector = () => {
      const container = containerRef.current;
      const card = detailCardRef.current;
      const provincePath = provincePathRefs.current.get(activeProvince);
      if (!container || !card || !provincePath) return;

      const containerRect = container.getBoundingClientRect();
      const pathRect = provincePath.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      if (containerRect.width <= 0 || containerRect.height <= 0) return;

      const startX = pathRect.left - containerRect.left + pathRect.width / 2;
      const startY = pathRect.top - containerRect.top + pathRect.height / 2;
      const endX = cardRect.left - containerRect.left + 1;
      const endY = cardRect.top - containerRect.top + 46;
      const direction = endX >= startX ? 1 : -1;
      const distance = Math.abs(endX - startX);
      const firstBend = Math.max(38, distance * 0.4);
      const secondBend = Math.min(64, Math.max(28, distance * 0.2));
      const path = [
        `M ${startX.toFixed(1)} ${startY.toFixed(1)}`,
        `C ${(startX + direction * firstBend).toFixed(1)} ${startY.toFixed(1)},`,
        `${(endX - direction * secondBend).toFixed(1)} ${endY.toFixed(1)},`,
        `${endX.toFixed(1)} ${endY.toFixed(1)}`,
      ].join(" ");

      const next = {
        province: activeProvince,
        width: containerRect.width,
        height: containerRect.height,
        path,
        startX,
        startY,
        endX,
        endY,
      };
      setConnector((current) =>
        current &&
        current.province === next.province &&
        current.path === next.path &&
        current.width === next.width &&
        current.height === next.height
          ? current
          : next
      );
    };

    const scheduleUpdate = () => {
      cancelAnimationFrame(animationFrame);
      animationFrame = requestAnimationFrame(updateConnector);
    };

    scheduleUpdate();
    const resizeObserver = new ResizeObserver(scheduleUpdate);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    if (detailCardRef.current) resizeObserver.observe(detailCardRef.current);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeProvince, viewBox.height, viewBox.width, viewBox.x, viewBox.y]);

  const visibleConnector =
    connector?.province === activeProvince ? connector : null;

  function zoom(factor: number) {
    setViewBox((current) => {
      const nextWidth = Math.max(250, Math.min(MAP_WIDTH, current.width * factor));
      const nextHeight = (nextWidth / MAP_WIDTH) * MAP_HEIGHT;
      return {
        x: Math.max(0, Math.min(MAP_WIDTH - nextWidth, current.x + (current.width - nextWidth) / 2)),
        y: Math.max(0, Math.min(MAP_HEIGHT - nextHeight, current.y + (current.height - nextHeight) / 2)),
        width: nextWidth,
        height: nextHeight,
      };
    });
  }

  if (projectedFeatures.length === 0 || records.length === 0) {
    return <RiceEmptyState message="ไม่มีข้อมูลเพียงพอสำหรับแสดงแผนที่ในปีที่เลือก" />;
  }

  return (
    <div
      ref={containerRef}
      className="relative min-w-0 overflow-hidden rounded-xl bg-[#f4f6ed] shadow-[0_12px_32px_rgba(40,79,51,0.12)] dark:bg-[#091a10]"
    >
        <svg
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          aria-label="แผนที่ผลผลิตข้าวรายจังหวัดของประเทศไทย"
          className="block h-[560px] w-full touch-manipulation sm:h-[640px]"
          onDoubleClick={() => zoom(0.78)}
        >
          {projectedFeatures.map(({ feature, path }) => {
            const province = feature.properties.province_th;
            const record = recordByProvince.get(province) ?? null;
            const isSelected = province === selectedProvince;
            const isHovered = province === hoveredProvince;
            return (
              <path
                key={feature.properties.gid_1}
                ref={(node) => {
                  if (node) provincePathRefs.current.set(province, node);
                  else provincePathRefs.current.delete(province);
                }}
                d={path}
                fill={yieldColor(record?.yield_kg_rai ?? null, minimum, maximum)}
                fillRule="evenodd"
                stroke="#1d241f"
                strokeWidth={isSelected ? 3.2 : isHovered ? 2.5 : 0.9}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`จังหวัด${province} ผลผลิต ${formatNumber(record?.yield_kg_rai ?? null)} กิโลกรัมต่อไร่`}
                className={`cursor-pointer outline-none transition-[filter,opacity] duration-200 hover:brightness-105 focus:brightness-105 ${
                  isSelected || isHovered
                    ? "drop-shadow-[0_0_7px_rgba(181,122,5,0.72)]"
                    : ""
                }`}
                onPointerEnter={() => setHoveredProvince(province)}
                onPointerLeave={() => setHoveredProvince(null)}
                onFocus={() => setHoveredProvince(province)}
                onBlur={() => setHoveredProvince(null)}
                onClick={() => onSelectProvince(province)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectProvince(province);
                  }
                }}
              >
                <title>
                  {`${province}: ${formatNumber(record?.yield_kg_rai ?? null)} kg/ไร่, ปีก่อน ${formatNumber(record?.previous_yield_kg_rai ?? null)} kg/ไร่, เปลี่ยนแปลง ${signedNumber(record?.change_percent ?? null, "%")}`}
                </title>
              </path>
            );
          })}
        </svg>

        <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
          {[
            { label: "ขยายแผนที่", icon: Plus, action: () => zoom(0.78) },
            { label: "ย่อแผนที่", icon: Minus, action: () => zoom(1.28) },
            {
              label: "รีเซ็ตแผนที่",
              icon: RotateCcw,
              action: () => setViewBox({ x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT }),
            },
          ].map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={action}
              className="grid h-10 w-10 place-items-center rounded-lg bg-white text-[#171d19] shadow-[0_6px_18px_rgba(24,48,33,0.18)] transition hover:bg-[#fff9e8] active:scale-95"
            >
              <Icon aria-hidden="true" className="h-4 w-4" />
            </button>
          ))}
        </div>

        <div className="absolute bottom-3 left-3 z-10 hidden w-36 gap-2 rounded-xl bg-white/95 p-3 text-[#28362e] shadow-[0_12px_30px_rgba(39,77,53,0.2)] backdrop-blur md:grid">
          <p className="text-xs font-bold">ระดับผลผลิต</p>
          {[
            { label: "ผลผลิตสูง", color: "#b78312" },
            { label: "ผลผลิตต่ำ", color: "#f3df89" },
            { label: "ไม่มีข้อมูล", color: "#d7dbd4" },
          ].map((entry) => (
            <span key={entry.label} className="flex items-center gap-2 text-[10px] font-semibold">
              <span
                aria-hidden="true"
                style={{ backgroundColor: entry.color }}
                className="h-5 w-5 shrink-0 shadow-[0_2px_5px_rgba(36,55,43,0.24)]"
              />
              {entry.label}
            </span>
          ))}
        </div>

        {visibleConnector ? (
          <svg
            key={`connector-${activeProvince}`}
            aria-hidden="true"
            viewBox={`0 0 ${visibleConnector.width} ${visibleConnector.height}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          >
            <path d={visibleConnector.path} pathLength="1" className="dashboard-map-connector-halo fill-none stroke-[#d6a72b]/25 stroke-[10] [stroke-linecap:round]" />
            <path d={visibleConnector.path} pathLength="1" className="dashboard-map-connector-line fill-none stroke-[#b57a05] stroke-[3] [stroke-linecap:round]" />
            <circle cx={visibleConnector.startX} cy={visibleConnector.startY} r="12" className="dashboard-map-connector-dot fill-[#e4b83f]/30" />
            <circle cx={visibleConnector.startX} cy={visibleConnector.startY} r="5" className="fill-[#b57a05] stroke-white stroke-[3]" />
            <circle cx={visibleConnector.endX} cy={visibleConnector.endY} r="5" className="fill-white stroke-[#b57a05] stroke-[3]" />
          </svg>
        ) : null}

        <aside
          key={`detail-${activeProvince}`}
          ref={detailCardRef}
          aria-live="polite"
          className="dashboard-map-detail-card absolute bottom-3 right-3 z-30 w-[min(230px,calc(100%-1.5rem))] rounded-xl bg-white/95 p-4 shadow-[0_20px_48px_rgba(17,53,35,0.26)] backdrop-blur"
        >
          <span aria-hidden="true" className="absolute -left-1 top-7 h-9 w-2 rounded-full bg-[#b57a05] shadow-[0_0_18px_rgba(181,122,5,0.62)]" />
          <div className="flex items-center gap-2 text-xs font-semibold text-[#171d19]">
            <MapPin aria-hidden="true" className="h-4 w-4" /> จังหวัด
          </div>
          <p className="mt-2 text-xl font-bold text-[#173523]">{activeProvince}</p>
          {activeRecord ? (
            <>
              <p className="mt-5 text-xs font-medium text-emerald-950/60">ผลผลิต</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-[#8b6208]">
                {formatNumber(activeRecord.yield_kg_rai)}
                <span className="ml-1.5 text-xs font-semibold text-emerald-950/60">kg/ไร่</span>
              </p>
              <p className="mt-2 text-xs leading-5 text-emerald-950/60">
                ปีก่อน {formatNumber(activeRecord.previous_yield_kg_rai)} kg/ไร่ · เปลี่ยนแปลง {signedNumber(activeRecord.change_percent, "%")}
              </p>
              <button
                type="button"
                onClick={() => onSelectProvince(activeProvince)}
                className="mt-5 min-h-10 w-full rounded-lg bg-[#23654C] px-3 text-xs font-semibold text-white shadow-[0_7px_18px_rgba(35,101,76,0.22)] transition hover:bg-[#174d39]"
              >
                เลือกจังหวัดนี้
              </button>
            </>
          ) : (
            <p className="mt-3 text-sm text-emerald-950/55">จังหวัดนี้ไม่มีข้อมูลในปีที่เลือก</p>
          )}
        </aside>

        <span className="sr-only">
          จับคู่ข้อมูลได้ {matchedCount} จาก {geoJson.features.length} จังหวัด
        </span>
    </div>
  );
}

type ChangeMode = "increase" | "decrease";

export function TopForecastChangeChart({ records }: { records: RiceYieldRecord[] }) {
  const [mode, setMode] = useState<ChangeMode>("increase");
  const [hovered, setHovered] = useState<RiceYieldRecord | null>(null);
  const ranked = useMemo(() => {
    const eligible = records.filter((record) =>
      mode === "increase"
        ? (record.change_percent ?? 0) > 0
        : (record.change_percent ?? 0) < 0
    );
    return eligible
      .sort((first, second) =>
        mode === "increase"
          ? (second.change_percent ?? 0) - (first.change_percent ?? 0)
          : (first.change_percent ?? 0) - (second.change_percent ?? 0)
      )
      .slice(0, 10);
  }, [mode, records]);
  const maximum = Math.max(1, ...ranked.map((record) => Math.abs(record.change_percent ?? 0)));

  return (
    <div className="relative flex min-h-[520px] flex-col xl:min-h-[590px]">
      <div className="relative isolate mb-5 grid w-fit self-start grid-cols-2 gap-2">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-[calc(50%-0.25rem)] rounded-lg bg-gradient-to-r from-[#f7dfa0] via-[#fff2bd] to-[#f4ce68] shadow-[0_8px_22px_rgba(183,131,18,0.2)] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:from-[#76590f] dark:via-[#94711a] dark:to-[#76590f]"
          style={{
            transform:
              mode === "decrease" ? "translateX(calc(100% + 0.5rem))" : "translateX(0)",
          }}
        />
        <button
          type="button"
          aria-pressed={mode === "increase"}
          onClick={() => setMode("increase")}
          className={`relative min-h-11 whitespace-nowrap rounded-lg px-4 text-xs font-semibold transition-[color,background-color,box-shadow,transform] duration-300 sm:px-5 sm:text-sm ${
            mode === "increase"
              ? "text-[#5f4608]"
              : "bg-white text-emerald-950/65 shadow-[0_3px_10px_rgba(22,61,39,0.1)] hover:-translate-y-0.5 hover:text-emerald-900 dark:bg-white/[0.08] dark:text-white/65 dark:hover:text-white"
          }`}
        >
          เพิ่มขึ้นมากที่สุด
        </button>
        <button
          type="button"
          aria-pressed={mode === "decrease"}
          onClick={() => setMode("decrease")}
          className={`relative min-h-11 whitespace-nowrap rounded-lg px-4 text-xs font-semibold transition-[color,background-color,box-shadow,transform] duration-300 sm:px-5 sm:text-sm ${
            mode === "decrease"
              ? "text-[#5f4608] dark:text-amber-50"
              : "bg-white text-emerald-950/65 shadow-[0_3px_10px_rgba(22,61,39,0.1)] hover:-translate-y-0.5 hover:text-emerald-900 dark:bg-white/[0.08] dark:text-white/65 dark:hover:text-white"
          }`}
        >
          ลดลงมากที่สุด
        </button>
      </div>

      {hovered ? (
        <div className="absolute right-0 top-12 z-10 max-w-[230px] rounded-lg bg-white px-3 py-2 text-xs shadow-[0_14px_34px_rgba(22,61,39,0.2)] dark:bg-[#14291b]">
          <p className="font-bold">{hovered.province}</p>
          <p className="mt-1 text-emerald-950/60 dark:text-white/60">
            {signedNumber(hovered.change_percent, "%")} · {signedNumber(hovered.change_kg_rai, " kg/ไร่")}
          </p>
        </div>
      ) : null}

      {ranked.length ? (
        <ol className="grid flex-1 auto-rows-fr gap-2.5">
          {ranked.map((record, index) => (
            <li
              key={record.province}
              tabIndex={0}
              onPointerEnter={() => setHovered(record)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(record)}
              onBlur={() => setHovered(null)}
              className="grid grid-cols-[minmax(88px,0.75fr)_minmax(120px,2fr)_auto] items-center gap-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <span className="truncate text-xs font-semibold sm:text-sm">
                <span className="mr-2 text-emerald-950/35 dark:text-white/35">{index + 1}</span>
                {record.province}
              </span>
              <span className="h-5 overflow-hidden rounded-full bg-[#f3eedb] dark:bg-white/[0.08]">
                <span
                  className={`block h-full min-w-1 rounded-full ${
                    mode === "increase"
                      ? "bg-gradient-to-r from-[#e3bd42] to-[#9a6d08]"
                      : "bg-gradient-to-r from-[#f0d675] to-[#b78312]"
                  }`}
                  style={{ width: `${(Math.abs(record.change_percent ?? 0) / maximum) * 100}%` }}
                />
              </span>
              <span className={`min-w-16 text-right text-sm font-bold tabular-nums ${
                mode === "increase"
                  ? "text-[#8b6208] dark:text-[#f1d77a]"
                  : "text-amber-700 dark:text-amber-300"
              }`}>
                {signedNumber(record.change_percent, "%")}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <RiceEmptyState message="ปีที่เลือกไม่มีจังหวัดในกลุ่มการเปลี่ยนแปลงนี้" />
      )}
    </div>
  );
}

function linePath(
  records: RiceYieldRecord[],
  xForRecord: (record: RiceYieldRecord) => number,
  yForValue: (value: number) => number
) {
  return records
    .map((record, index) =>
      `${index === 0 ? "M" : "L"}${xForRecord(record).toFixed(2)},${yForValue(record.yield_kg_rai).toFixed(2)}`
    )
    .join(" ");
}

export function HistoricalYieldForecastChart({
  history,
  selectedYear,
}: {
  history: RiceYieldRecord[];
  selectedYear: string;
}) {
  const [hovered, setHovered] = useState<RiceYieldRecord | null>(null);
  const width = 940;
  const height = 390;
  const margin = { top: 34, right: 28, bottom: 62, left: 70 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  if (history.length === 0) {
    return <RiceEmptyState message="ไม่มีประวัติผลผลิตของจังหวัดที่เลือก" />;
  }

  const values = history.map((record) => record.yield_kg_rai);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const padding = Math.max(20, (rawMax - rawMin) * 0.16);
  const minimum = Math.max(0, rawMin - padding);
  const maximum = rawMax + padding;
  const xForRecord = (record: RiceYieldRecord) => {
    const index = history.findIndex((item) => item.crop_year === record.crop_year);
    return margin.left + (index / Math.max(1, history.length - 1)) * chartWidth;
  };
  const yForValue = (value: number) =>
    margin.top + ((maximum - value) / Math.max(1, maximum - minimum)) * chartHeight;
  const actual = history.filter((record) => !isForecastRecord(record));
  const forecastOnly = history.filter(isForecastRecord);
  const forecast = forecastOnly.length && actual.length
    ? [actual[actual.length - 1], ...forecastOnly]
    : forecastOnly;
  const ticks = Array.from({ length: 5 }, (_, index) =>
    minimum + ((maximum - minimum) / 4) * index
  ).reverse();
  const forecastStart = forecastOnly[0] ? xForRecord(forecastOnly[0]) : null;

  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-emerald-950/60 dark:text-white/60 sm:text-sm">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-7 bg-[#d6a72b]" /> Actual</span>
        <span className="inline-flex items-center gap-2"><span className="w-7 border-t-2 border-dashed border-amber-400" /> Forecast 2568/69</span>
      </div>
      {hovered ? (
        <div className="absolute right-2 top-9 z-10 rounded-lg bg-white px-3 py-2 text-xs shadow-[0_14px_34px_rgba(22,61,39,0.2)] dark:bg-[#14291b]">
          <p className="font-bold">ปี {hovered.crop_year} · {isForecastRecord(hovered) ? "Forecast" : "Actual"}</p>
          <dl className="mt-1 grid grid-cols-[auto_auto] gap-x-3 gap-y-1 text-emerald-950/60 dark:text-white/60">
            <dt>ผลผลิต</dt><dd className="text-right font-semibold text-current">{formatNumber(hovered.yield_kg_rai)} kg/ไร่</dd>
            <dt>เปลี่ยนแปลง</dt><dd className="text-right font-semibold text-current">{signedNumber(hovered.change_kg_rai)} kg/ไร่</dd>
            <dt>เปลี่ยนแปลง</dt><dd className="text-right font-semibold text-current">{signedNumber(hovered.change_percent, "%")}</dd>
          </dl>
        </div>
      ) : null}
      <div className="overflow-x-auto pb-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="กราฟเส้นผลผลิตย้อนหลังและค่าพยากรณ์"
          className="h-auto min-w-[720px] w-full"
        >
          {forecastStart !== null ? (
            <rect
              x={forecastStart - 18}
              y={margin.top}
              width={width - margin.right - forecastStart + 18}
              height={chartHeight}
              rx="14"
              fill="rgba(250, 204, 21, 0.07)"
            />
          ) : null}
          {ticks.map((tick) => {
            const y = yForValue(tick);
            return (
              <g key={tick}>
                <line x1={margin.left} x2={width - margin.right} y1={y} y2={y} stroke="currentColor" opacity="0.1" />
                <text x={margin.left - 12} y={y + 4} textAnchor="end" fill="currentColor" opacity="0.52" fontSize="12">
                  {formatNumber(tick, 0)}
                </text>
              </g>
            );
          })}
          <text x={margin.left} y="16" fill="currentColor" opacity="0.55" fontSize="12">kg/ไร่</text>
          {actual.length > 1 ? (
            <path d={linePath(actual, xForRecord, yForValue)} fill="none" stroke="#d6a72b" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {forecast.length > 1 ? (
            <path d={linePath(forecast, xForRecord, yForValue)} fill="none" stroke="#b57a05" strokeWidth="4" strokeDasharray="9 7" strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {history.map((record) => {
            const forecastPoint = isForecastRecord(record);
            const selected = record.crop_year === selectedYear;
            return (
              <g key={record.crop_year}>
                <circle
                  cx={xForRecord(record)}
                  cy={yForValue(record.yield_kg_rai)}
                  r={selected ? 7 : 5}
                  fill={forecastPoint ? "#b57a05" : "#d6a72b"}
                  stroke={selected ? "#fff4ae" : "#6f5105"}
                  strokeWidth={selected ? 4 : 2}
                  tabIndex={0}
                  role="button"
                  aria-label={`ปี ${record.crop_year} ผลผลิต ${formatNumber(record.yield_kg_rai)} กิโลกรัมต่อไร่`}
                  className="cursor-pointer outline-none"
                  onPointerEnter={() => setHovered(record)}
                  onPointerLeave={() => setHovered(null)}
                  onFocus={() => setHovered(record)}
                  onBlur={() => setHovered(null)}
                >
                  <title>{`${record.crop_year}: ${formatNumber(record.yield_kg_rai)} kg/ไร่`}</title>
                </circle>
                <text
                  x={xForRecord(record)}
                  y={height - 30}
                  textAnchor="middle"
                  fill="currentColor"
                  opacity={selected ? 0.95 : 0.5}
                  fontSize="11"
                  fontWeight={selected ? 700 : 500}
                >
                  {record.crop_year}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function ProvinceComparisonChart({
  records,
  provinces,
  selectedProvinces,
  onChange,
}: {
  records: RiceYieldRecord[];
  provinces: string[];
  selectedProvinces: string[];
  onChange: (provinces: string[]) => void;
}) {
  const [hovered, setHovered] = useState<RiceYieldRecord | null>(null);
  const selectedRecords = records
    .filter((record) => selectedProvinces.includes(record.province))
    .sort((first, second) => second.yield_kg_rai - first.yield_kg_rai);
  const maximum = Math.max(1, ...selectedRecords.map((record) => record.yield_kg_rai));

  function toggleProvince(province: string) {
    onChange(
      selectedProvinces.includes(province)
        ? selectedProvinces.filter((item) => item !== province)
        : [...selectedProvinces, province]
    );
  }

  function selectHighestFive() {
    onChange(
      [...records]
        .sort((first, second) => second.yield_kg_rai - first.yield_kg_rai)
        .slice(0, 5)
        .map((record) => record.province)
    );
  }

  return (
    <div className="relative">
      <details className="mb-5 rounded-2xl border border-emerald-950/10 bg-emerald-50/40 dark:border-white/10 dark:bg-white/[0.03]">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold marker:text-emerald-600">
          เลือกจังหวัดเปรียบเทียบ ({selectedProvinces.length})
        </summary>
        <div className="border-t border-emerald-950/10 p-4 dark:border-white/10">
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" onClick={selectHighestFive} className="min-h-9 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white">
              เลือก 5 จังหวัดสูงสุด
            </button>
            <button type="button" onClick={() => onChange([])} className="min-h-9 rounded-lg border border-emerald-950/15 px-3 text-xs font-semibold dark:border-white/15">
              ล้างทั้งหมด
            </button>
          </div>
          <div className="grid max-h-64 gap-2 overflow-y-auto pr-2 sm:grid-cols-2 lg:grid-cols-3">
            {provinces.map((province) => (
              <label key={province} className="flex min-h-9 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm hover:bg-emerald-100/60 dark:hover:bg-white/[0.05]">
                <input
                  type="checkbox"
                  checked={selectedProvinces.includes(province)}
                  onChange={() => toggleProvince(province)}
                  className="h-4 w-4 accent-emerald-600"
                />
                <span>{province}</span>
              </label>
            ))}
          </div>
        </div>
      </details>

      {hovered ? (
        <div className="absolute right-0 top-14 z-10 rounded-xl border border-emerald-950/10 bg-white px-3 py-2 text-xs shadow-xl dark:border-white/10 dark:bg-[#14291b]">
          <p className="font-bold">{hovered.province}</p>
          <p className="mt-1 text-emerald-950/60 dark:text-white/60">{formatNumber(hovered.yield_kg_rai)} kg/ไร่</p>
        </div>
      ) : null}

      {selectedRecords.length ? (
        <div className="space-y-3">
          {selectedRecords.map((record, index) => (
            <div
              key={record.province}
              tabIndex={0}
              onPointerEnter={() => setHovered(record)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(record)}
              onBlur={() => setHovered(null)}
              className="grid grid-cols-[minmax(92px,0.8fr)_minmax(120px,2fr)_auto] items-center gap-3 rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/40"
            >
              <span className="truncate text-xs font-semibold sm:text-sm">{record.province}</span>
              <span className="h-7 overflow-hidden rounded-lg bg-emerald-950/[0.06] dark:bg-white/[0.06]">
                <span
                  className={`block h-full rounded-lg ${
                    index % 2 === 0
                      ? "bg-gradient-to-r from-yellow-300 via-lime-400 to-emerald-600"
                      : "bg-gradient-to-r from-emerald-300 to-emerald-700"
                  }`}
                  style={{ width: `${(record.yield_kg_rai / maximum) * 100}%` }}
                />
              </span>
              <span className="min-w-24 text-right text-sm font-bold tabular-nums">
                {formatNumber(record.yield_kg_rai)} <span className="text-[10px] font-normal text-emerald-950/50 dark:text-white/50">kg/ไร่</span>
              </span>
            </div>
          ))}
        </div>
      ) : (
        <RiceEmptyState message="เลือกอย่างน้อย 1 จังหวัดเพื่อเริ่มเปรียบเทียบผลผลิต" />
      )}
    </div>
  );
}

export function ForecastBadge({ isForecast }: { isForecast: boolean }) {
  return (
    <span className={`inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
      isForecast
        ? "bg-amber-300/20 text-amber-800 shadow-sm dark:text-amber-200"
        : "bg-emerald-500/10 text-emerald-800 shadow-sm dark:text-emerald-200"
    }`}>
      {isForecast ? <Sparkles className="h-3.5 w-3.5" /> : <TrendingUp className="h-3.5 w-3.5" />}
      {isForecast ? "Forecast" : "Actual"}
    </span>
  );
}

export function ChangeIcon({ value }: { value: number | null }) {
  return (value ?? 0) >= 0
    ? <TrendingUp className="h-5 w-5" />
    : <TrendingDown className="h-5 w-5" />;
}
