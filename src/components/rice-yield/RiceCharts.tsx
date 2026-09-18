"use client";

import { useId, useState } from "react";

export interface ChartPoint {
  x: number;
  value: number | null;
  label?: string;
}

export interface ChartSeries {
  id: string;
  label: string;
  points: ChartPoint[];
  color?: string;
  dashed?: boolean;
}

const SERIES_COLORS = ["#147d55", "#d39b28", "#3b82a0", "#9a5fd0", "#d75b5b"];

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("th-TH", { maximumFractionDigits: digits });
}

function extent(values: number[]): [number, number] {
  if (values.length === 0) return [0, 1];
  let minimum = Math.min(...values);
  let maximum = Math.max(...values);
  if (minimum === maximum) {
    minimum -= Math.max(1, Math.abs(minimum) * 0.1);
    maximum += Math.max(1, Math.abs(maximum) * 0.1);
  }
  const padding = (maximum - minimum) * 0.12;
  return [Math.min(0, minimum - padding), maximum + padding];
}

function topRoundedBarPath(
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): string {
  const corner = Math.max(0, Math.min(radius, width / 2, height));
  return [
    `M ${x} ${y + corner}`,
    `Q ${x} ${y} ${x + corner} ${y}`,
    `H ${x + width - corner}`,
    `Q ${x + width} ${y} ${x + width} ${y + corner}`,
    `V ${y + height}`,
    `H ${x}`,
    "Z",
  ].join(" ");
}

function createXAxisTicks(values: number[], label: string): number[] {
  if (label.includes("เดือน")) {
    return Array.from({ length: 12 }, (_, index) => index + 1);
  }

  if (label.includes("ปี")) {
    const minimum = Math.min(...values);
    const maximum = Math.max(...values);
    const length = Math.floor(maximum) - Math.ceil(minimum) + 1;

    if (length > 0 && length <= 50) {
      return Array.from({ length }, (_, index) => Math.ceil(minimum) + index);
    }
  }

  return values;
}

export function RiceLineChart({
  series,
  title,
  yLabel,
  xLabel,
  digits = 0,
  height = 310,
  toggleable = false,
  fitWidth = false,
}: {
  series: ChartSeries[];
  title: string;
  yLabel: string;
  xLabel: string;
  digits?: number;
  height?: number;
  toggleable?: boolean;
  fitWidth?: boolean;
}) {
  const id = useId();
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<string[]>([]);
  const visibleSeries = series.filter((item) => !hiddenSeriesIds.includes(item.id));
  const width = 760;
  const padding = { left: 72, right: 24, top: 24, bottom: 54 };
  const allPoints = series.flatMap((item) => item.points);
  const validValues = allPoints.flatMap((point) =>
    typeof point.value === "number" ? [point.value] : []
  );
  const xValues = [...new Set(allPoints.map((point) => point.x))].sort((a, b) => a - b);

  if (validValues.length === 0 || xValues.length === 0) {
    return <p className="py-16 text-center text-sm text-emerald-950/50 dark:text-white/50">ไม่มีข้อมูลสำหรับกราฟนี้</p>;
  }

  const [minY, maxY] = extent(validValues);
  const shownX = createXAxisTicks(xValues, xLabel);
  const minX = Math.min(...shownX);
  const maxX = Math.max(...shownX);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const xPosition = (x: number) =>
    padding.left + ((x - minX) / Math.max(1, maxX - minX)) * innerWidth;
  const yPosition = (value: number) =>
    padding.top + ((maxY - value) / Math.max(1e-9, maxY - minY)) * innerHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) * index) / 4);
  const minimumChartWidth = Math.max(
    620,
    padding.left + padding.right + Math.max(1, shownX.length - 1) * 52
  );

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        {series.map((item, index) => {
          const color = item.color ?? SERIES_COLORS[index % SERIES_COLORS.length];
          const visible = !hiddenSeriesIds.includes(item.id);

          return toggleable ? (
            <label
              key={item.id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 shadow-[0_4px_14px_rgba(31,78,102,0.12)] transition-opacity ${visible ? "bg-white text-emerald-950/75" : "bg-slate-100 text-slate-500 opacity-55"} dark:bg-white/[0.08] dark:text-white/75`}
            >
              <input
                type="checkbox"
                checked={visible}
                className="h-3.5 w-3.5"
                style={{ accentColor: color }}
                onChange={() => {
                  setHiddenSeriesIds((current) =>
                    current.includes(item.id)
                      ? current.filter((seriesId) => seriesId !== item.id)
                      : [...current, item.id]
                  );
                }}
              />
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {item.label}
            </label>
          ) : (
            <span key={item.id} className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="h-0.5 w-5 rounded-full"
                style={{ backgroundColor: color }}
              />
              {item.label}
            </span>
          );
        })}
      </div>
      <p className="mb-2 text-[11px] text-emerald-950/45 sm:hidden dark:text-white/45">
        เลื่อนกราฟไปทางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด
      </p>
      <div className="-mx-1 w-[calc(100%+0.5rem)] overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:thin]">
        <div
          className={fitWidth ? "min-w-[560px] sm:min-w-0" : ""}
          style={{
            minWidth: fitWidth ? undefined : `${minimumChartWidth}px`,
            aspectRatio: `${width} / ${height}`,
          }}
        >
        <svg
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          viewBox={`0 0 ${width} ${height}`}
          className="block h-full w-full text-emerald-950 dark:text-white"
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{`${xLabel} เทียบกับ ${yLabel}`}</desc>
          {yTicks.map((tick) => {
            const y = yPosition(tick);
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="currentColor" opacity="0.1" />
                <text x={padding.left - 12} y={y + 4} textAnchor="end" fill="currentColor" opacity="0.6" fontSize="12">
                  {formatNumber(tick, digits)}
                </text>
              </g>
            );
          })}
          {shownX.map((tick) => (
            <text
              key={tick}
              x={xPosition(tick)}
              y={height - 25}
              textAnchor="middle"
              fill="currentColor"
              opacity="0.6"
              fontSize="12"
            >
              {tick}
            </text>
          ))}
          <text x={padding.left} y={14} fill="currentColor" opacity="0.7" fontSize="12">{yLabel}</text>
          <text x={width - padding.right} y={height - 5} textAnchor="end" fill="currentColor" opacity="0.7" fontSize="12">{xLabel}</text>
          {visibleSeries.map((item, seriesIndex) => {
            const chunks: ChartPoint[][] = [];
            let chunk: ChartPoint[] = [];
            for (const point of item.points) {
              if (point.value === null) {
                if (chunk.length) chunks.push(chunk);
                chunk = [];
              } else {
                chunk.push(point);
              }
            }
            if (chunk.length) chunks.push(chunk);
            const originalIndex = series.findIndex((seriesItem) => seriesItem.id === item.id);
            const color = item.color ?? SERIES_COLORS[(originalIndex >= 0 ? originalIndex : seriesIndex) % SERIES_COLORS.length];
            return (
              <g key={item.id}>
                {chunks.map((points, chunkIndex) => (
                  <polyline
                    key={chunkIndex}
                    points={points.map((point) => `${xPosition(point.x)},${yPosition(point.value ?? 0)}`).join(" ")}
                    fill="none"
                    stroke={color}
                    strokeWidth="3"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    strokeDasharray={item.dashed ? "8 6" : undefined}
                  />
                ))}
                {item.points.map((point) =>
                  point.value === null ? null : (
                    <circle
                      key={`${point.x}-${point.value}`}
                      cx={xPosition(point.x)}
                      cy={yPosition(point.value)}
                      r="4"
                      fill={color}
                      stroke="white"
                      strokeWidth="1.5"
                    >
                      <title>{`${item.label} · ${point.label ?? point.x}: ${formatNumber(point.value, digits)} ${yLabel}`}</title>
                    </circle>
                  )
                )}
              </g>
            );
          })}
          {visibleSeries.length === 0 ? (
            <text
              x={padding.left + innerWidth / 2}
              y={padding.top + innerHeight / 2}
              textAnchor="middle"
              fill="currentColor"
              opacity="0.48"
              fontSize="13"
            >
              เลือกปีจากรายการด้านบนเพื่อแสดงกราฟ
            </text>
          ) : null}
        </svg>
        </div>
      </div>
    </div>
  );
}

export function RiceBarChart({
  items,
  title,
  unit,
  digits = 0,
  height = 300,
  fitWidth = false,
  alignmentLegendLabels = [],
}: {
  items: Array<{ label: string; value: number | null; color?: string }>;
  title: string;
  unit: string;
  digits?: number;
  height?: number;
  fitWidth?: boolean;
  alignmentLegendLabels?: string[];
}) {
  const id = useId();
  const valid = items.filter((item): item is { label: string; value: number; color?: string } =>
    typeof item.value === "number"
  );
  if (valid.length === 0) {
    return <p className="py-16 text-center text-sm text-emerald-950/50 dark:text-white/50">ไม่มีข้อมูลสำหรับกราฟนี้</p>;
  }
  const width = 860;
  const padding = { left: 32, right: 12, top: 20, bottom: 54 };
  const maxValue = Math.max(...valid.map((item) => item.value)) * 1.08;
  const slot = (width - padding.left - padding.right) / Math.max(1, items.length);
  const barWidth = Math.min(64, slot * 0.72);
  const y = (value: number) => padding.top + ((maxValue - value) / Math.max(1e-9, maxValue)) * (height - padding.top - padding.bottom);

  return (
    <div>
      {alignmentLegendLabels.length ? (
        <div
          aria-hidden="true"
          className="invisible mb-3 hidden flex-wrap gap-x-5 gap-y-2 text-xs xl:flex"
        >
          {alignmentLegendLabels.map((label) => (
            <span
              key={label}
              className="inline-flex items-center gap-2 rounded-full px-2.5 py-1.5"
            >
              <span className="h-3.5 w-3.5 shrink-0" />
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" />
              {label}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mb-2 text-[11px] text-emerald-950/45 sm:hidden dark:text-white/45">
        เลื่อนกราฟไปทางซ้าย–ขวาเพื่อดูข้อมูลทั้งหมด
      </p>
      <div className="-mx-1 w-[calc(100%+0.5rem)] overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:thin]">
      <div
        className={fitWidth ? "min-w-[560px] sm:min-w-0" : "min-w-[620px] sm:min-w-[700px]"}
        style={{ aspectRatio: `${width} / ${height}` }}
      >
      <svg role="img" aria-labelledby={`${id}-title`} viewBox={`0 0 ${width} ${height}`} className="block h-full w-full text-emerald-950 dark:text-white">
        <title id={`${id}-title`}>{title}</title>
        <line x1={padding.left} x2={width - padding.right} y1={height - padding.bottom} y2={height - padding.bottom} stroke="currentColor" opacity="0.2" />
        {items.map((item, index) => {
          const center = padding.left + slot * index + slot / 2;
          const value = item.value;
          const top = value === null ? height - padding.bottom : y(value);
          return (
            <g key={`${item.label}-${index}`}>
              {value !== null ? (
                <path
                  d={topRoundedBarPath(
                    center - barWidth / 2,
                    top,
                    barWidth,
                    height - padding.bottom - top,
                    barWidth / 2
                  )}
                  fill={item.color ?? SERIES_COLORS[index % SERIES_COLORS.length]}
                >
                  <title>{`${item.label}: ${formatNumber(value, digits)} ${unit}`}</title>
                </path>
              ) : null}
              <text x={center} y={height - 20} textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="11">{item.label}</text>
              <text x={center} y={value === null ? height - padding.bottom - 8 : Math.max(14, top - 8)} textAnchor="middle" fill="currentColor" fontSize="12" fontWeight="600">
                {value === null ? "ไม่มีข้อมูล" : formatNumber(value, digits)}
              </text>
            </g>
          );
        })}
      </svg>
      </div>
      </div>
    </div>
  );
}

export function RiceHorizontalBars({
  items,
  title,
  unit = "%",
  digits = 1,
  barRadius = 999,
  fillHeight = false,
}: {
  items: Array<{ label: string; value: number; color?: string }>;
  title: string;
  unit?: string;
  digits?: number;
  barRadius?: number;
  fillHeight?: boolean;
}) {
  const maximum = Math.max(...items.map((item) => item.value), 1);
  return (
    <div
      role="img"
      aria-label={title}
      className={fillHeight ? "grid h-full min-h-[38rem] flex-1 auto-rows-fr gap-2" : "space-y-4"}
    >
      {items.map((item, index) => (
        <div
          key={item.label}
          className={fillHeight ? "flex min-h-0 flex-col justify-center" : undefined}
        >
          <div className="mb-1.5 flex items-end justify-between gap-3 text-sm">
            <span className="font-medium">{item.label}</span>
            <span className="font-semibold tabular-nums">{formatNumber(item.value, digits)}{unit}</span>
          </div>
          <div
            className="h-2.5 overflow-hidden bg-emerald-950/10 dark:bg-white/10"
            style={{ borderRadius: `${barRadius}px` }}
          >
            <div
              className="h-full"
              style={{
                width: `${Math.max(1, (item.value / maximum) * 100)}%`,
                borderRadius: `${barRadius}px`,
                backgroundColor: item.color ?? SERIES_COLORS[index % SERIES_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function RiceScatterPlot({
  points,
  title,
}: {
  points: Array<{ actual: number; predicted: number; label: string }>;
  title: string;
}) {
  const id = useId();
  if (points.length === 0) return null;
  const width = 620;
  const height = 420;
  const padding = { left: 72, right: 28, top: 24, bottom: 58 };
  const values = points.flatMap((point) => [point.actual, point.predicted]);
  const [minimum, maximum] = extent(values);
  const positionX = (value: number) => padding.left + ((value - minimum) / (maximum - minimum)) * (width - padding.left - padding.right);
  const positionY = (value: number) => padding.top + ((maximum - value) / (maximum - minimum)) * (height - padding.top - padding.bottom);
  return (
    <div className="w-full overflow-x-auto">
      <svg role="img" aria-labelledby={`${id}-title`} viewBox={`0 0 ${width} ${height}`} className="min-w-[520px] text-emerald-950 dark:text-white">
        <title id={`${id}-title`}>{title}</title>
        <line x1={positionX(minimum)} y1={positionY(minimum)} x2={positionX(maximum)} y2={positionY(maximum)} stroke="currentColor" opacity="0.35" strokeDasharray="7 5" />
        <text x={width / 2} y={height - 12} textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="12">ผลผลิตจริง (กก./ไร่)</text>
        <text x="18" y={height / 2} transform={`rotate(-90 18 ${height / 2})`} textAnchor="middle" fill="currentColor" opacity="0.7" fontSize="12">ผลผลิตพยากรณ์ (กก./ไร่)</text>
        {points.map((point) => (
          <circle key={point.label} cx={positionX(point.actual)} cy={positionY(point.predicted)} r="5" fill="#147d55" opacity="0.72">
            <title>{`${point.label} · จริง ${formatNumber(point.actual)} · พยากรณ์ ${formatNumber(point.predicted)} กก./ไร่`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
