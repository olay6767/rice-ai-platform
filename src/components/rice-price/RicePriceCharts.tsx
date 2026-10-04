"use client";

import { useId, useState, type ReactNode } from "react";

import type {
  RiceForecastRecord,
  RicePriceDataType,
  RicePriceRecord,
} from "@/lib/rice-price/types";

const MONTH_SHORT = [
  "ม.ค.",
  "ก.พ.",
  "มี.ค.",
  "เม.ย.",
  "พ.ค.",
  "มิ.ย.",
  "ก.ค.",
  "ส.ค.",
  "ก.ย.",
  "ต.ค.",
  "พ.ย.",
  "ธ.ค.",
];

const ACTUAL_COLOR = "#d6a72b";
const FORECAST_COLOR = "#e07a18";
const FORECAST_BAND_COLOR = "#64748b";
const FORECAST_LABEL_COLOR = "#475569";

const FORECAST_RICE_VARIETY_COLORS: Record<string, string> = {
  "ข้าวขาว": "#b78312",
  "ข้าวนึ่ง": "#d06a27",
  "ข้าวหอมปทุมธานี": "#bd4e3b",
  "ข้าวหอมมะลิ": "#99455d",
  "ข้าวเหนียว": "#72543a",
};

const RICE_BAR_FILLS: Record<string, string> = {
  "ข้าวขาว": "#fde7c2",
  "ข้าวนึ่ง": "#fbd8ae",
  "ข้าวหอมปทุมธานี": "#f8c999",
  "ข้าวหอมมะลิ": "#f4b982",
  "ข้าวเหนียว": "#efa96e",
};

const RICE_BAR_BORDERS: Record<string, string> = {
  "ข้าวขาว": "#c66a16",
  "ข้าวนึ่ง": "#b85d12",
  "ข้าวหอมปทุมธานี": "#aa500f",
  "ข้าวหอมมะลิ": "#9b440e",
  "ข้าวเหนียว": "#8d380c",
};

function forecastRiceVarietyColor(riceType: string): string {
  return FORECAST_RICE_VARIETY_COLORS[riceType] ?? FORECAST_COLOR;
}

function riceBarFill(riceType: string): string {
  return RICE_BAR_FILLS[riceType] ?? "#fbd8ae";
}

function riceBarBorder(riceType: string): string {
  return RICE_BAR_BORDERS[riceType] ?? "#b85d12";
}

const TYPE_META: Record<
  RicePriceDataType,
  { label: string; color: string }
> = {
  observed: {
    label: "ข้าวจริง",
    color: ACTUAL_COLOR,
  },
  imputed: {
    label: "ข้าวจริง",
    color: ACTUAL_COLOR,
  },
  forecast: {
    label: "พยากรณ์",
    color: FORECAST_COLOR,
  },
};

export function formatPrice(value: number, digits = 0): string {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function paddedExtent(values: number[]): [number, number] {
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, Math.abs(maximum) * 0.08, 1);
  return [Math.max(0, minimum - range * 0.12), maximum + range * 0.12];
}

function ChartLegend({ children }: { children: ReactNode }) {
  return <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">{children}</div>;
}

function LegendItem({
  color,
  label,
  dashed = false,
  shape = "line",
}: {
  color: string;
  label: string;
  dashed?: boolean;
  shape?: "line" | "dot";
}) {
  return (
    <span className="inline-flex items-center gap-2 text-emerald-950/70 dark:text-white/70">
      {shape === "dot" ? (
        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      ) : (
        <span
          className={`h-0 w-6 border-t-2 ${dashed ? "border-dashed" : "border-solid"}`}
          style={{ borderColor: color }}
        />
      )}
      {label}
    </span>
  );
}

export function PriceTimelineChart({
  records,
  selectedDate,
}: {
  records: RicePriceRecord[];
  selectedDate: string;
}) {
  const id = useId();
  const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) return <ChartEmpty />;

  const width = 980;
  const height = 350;
  const padding = { left: 76, right: 28, top: 30, bottom: 58 };
  const [minY, maxY] = paddedExtent(sorted.map((record) => record.price));
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index: number) =>
    padding.left + (index / Math.max(1, sorted.length - 1)) * plotWidth;
  const y = (value: number) =>
    padding.top + ((maxY - value) / Math.max(1, maxY - minY)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) * index) / 4);
  const yearTicks = sorted
    .map((record, index) => ({ record, index }))
    .filter(({ record }) => record.month === 1);
  const forecastIndex = sorted.findIndex((record) => record.dataType === "forecast");
  const forecastX = forecastIndex >= 0 ? x(Math.max(0, forecastIndex - 0.5)) : width;
  const forecastYears = new Set(
    sorted.filter((record) => record.dataType === "forecast").map((record) => record.yearBe)
  );
  const forecastYearLabel = [...forecastYears].sort((a, b) => a - b).join(", ");

  return (
    <div>
      <ChartLegend>
        <LegendItem color={ACTUAL_COLOR} label="ข้าวจริง" shape="dot" />
        <LegendItem color={FORECAST_COLOR} label="พยากรณ์" dashed />
      </ChartLegend>
      <ScrollableChart>
        <svg
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[820px] text-emerald-950 dark:text-white"
        >
          <title id={`${id}-title`}>ราคาข้าวย้อนหลังและค่าพยากรณ์</title>
          <desc id={`${id}-desc`}>
            เส้นเวลาราคาข้าวรายเดือน แยกข้าวจริงและพยากรณ์{forecastYearLabel ? `ปี ${forecastYearLabel}` : ""}
          </desc>
          {forecastIndex >= 0 ? (
            <g>
              <rect
                x={forecastX}
                y={padding.top}
                width={width - padding.right - forecastX}
                height={plotHeight}
                rx="10"
                fill={FORECAST_BAND_COLOR}
                opacity="0.07"
              />
              <text
                x={(forecastX + width - padding.right) / 2}
                y={padding.top + 17}
                textAnchor="middle"
                fill={FORECAST_LABEL_COLOR}
                fontSize="12"
                fontWeight="700"
              >
                พยากรณ์ {forecastYearLabel}
              </text>
            </g>
          ) : null}
          {yTicks.map((tick) => {
            const tickY = y(tick);
            return (
              <g key={tick}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={tickY}
                  y2={tickY}
                  stroke="currentColor"
                  opacity="0.09"
                />
                <text
                  x={padding.left - 12}
                  y={tickY + 4}
                  textAnchor="end"
                  fill="currentColor"
                  opacity="0.55"
                  fontSize="11"
                >
                  {formatPrice(tick)}
                </text>
              </g>
            );
          })}
          {yearTicks.map(({ record, index }) => (
            <g key={record.yearBe}>
              <line
                x1={x(index)}
                x2={x(index)}
                y1={padding.top}
                y2={height - padding.bottom}
                stroke="currentColor"
                opacity="0.045"
              />
              <text
                x={x(index)}
                y={height - 26}
                textAnchor="middle"
                fill={forecastYears.has(record.yearBe) ? FORECAST_LABEL_COLOR : "currentColor"}
                opacity={forecastYears.has(record.yearBe) ? 1 : 0.58}
                fontSize="11"
                fontWeight={forecastYears.has(record.yearBe) ? 700 : 400}
              >
                {record.yearBe}
              </text>
            </g>
          ))}
          <text x={padding.left} y="15" fill="currentColor" opacity="0.65" fontSize="11">
            บาท / 100 กก.
          </text>
          {sorted.slice(1).map((record, index) => {
            const from = sorted[index];
            const meta = TYPE_META[record.dataType];
            return (
              <line
                key={`${from.date}-${record.date}`}
                x1={x(index)}
                x2={x(index + 1)}
                y1={y(from.price)}
                y2={y(record.price)}
                stroke={meta.color}
                strokeWidth={record.dataType === "forecast" ? 3 : 2.5}
                strokeDasharray={record.dataType === "forecast" ? "6 4" : undefined}
                strokeLinecap="round"
              />
            );
          })}
          {sorted.map((record, index) => {
            const meta = TYPE_META[record.dataType];
            const isSelected = record.date === selectedDate;
            const isForecastEndpoint =
              record.dataType === "forecast" && index === sorted.length - 1;
            const title = `${record.monthNameTh} ${record.yearBe}: ${formatPrice(record.price, 2)} บาท / 100 กก. · ${meta.label}`;

            if (!isSelected && !isForecastEndpoint) return null;

            return (
              <g key={record.date}>
                {isSelected || isForecastEndpoint ? (
                  <circle
                    cx={x(index)}
                    cy={y(record.price)}
                    r={isForecastEndpoint ? 9 : 8}
                    fill={isForecastEndpoint ? "#fff1df" : "white"}
                    stroke={meta.color}
                    strokeWidth="3"
                  />
                ) : null}
                <circle
                  cx={x(index)}
                  cy={y(record.price)}
                  r={isForecastEndpoint ? 4.5 : record.dataType === "forecast" ? 3.2 : 2.4}
                  fill={meta.color}
                >
                  <title>{title}</title>
                </circle>
              </g>
            );
          })}
        </svg>
      </ScrollableChart>
    </div>
  );
}

export function PriceHeatmap({
  records,
  selectedYear,
  selectedMonth,
}: {
  records: RicePriceRecord[];
  selectedYear: number;
  selectedMonth: number;
}) {
  const years = [...new Set(records.map((record) => record.yearBe))].sort((a, b) => a - b);
  const prices = records.map((record) => record.price);
  const minimum = Math.min(...prices);
  const maximum = Math.max(...prices);
  const byKey = new Map(records.map((record) => [`${record.yearBe}-${record.month}`, record]));
  const forecastYears = new Set(
    records.filter((record) => record.dataType === "forecast").map((record) => record.yearBe)
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs">
        <ChartLegend>
          <LegendItem color={ACTUAL_COLOR} label="ข้าวจริง" shape="dot" />
          <LegendItem color={FORECAST_COLOR} label="พยากรณ์" shape="dot" />
        </ChartLegend>
        <span className="text-emerald-950/55 dark:text-white/55">
          ต่ำ {formatPrice(minimum)} — สูง {formatPrice(maximum)} บาท
        </span>
      </div>
      <div className="overflow-x-auto pb-2 [scrollbar-width:thin]">
        <div
          role="img"
          aria-label="Heatmap ราคาข้าวรายเดือน แยกตามปีและสถานะข้อมูล"
          className="grid min-w-[880px] grid-cols-[92px_repeat(12,minmax(54px,1fr))] gap-1.5"
        >
          <span />
          {MONTH_SHORT.map((month) => (
            <span key={month} className="pb-1 text-center text-[11px] font-semibold text-emerald-950/55 dark:text-white/55">
              {month}
            </span>
          ))}
          {years.flatMap((year) => {
            const cells: ReactNode[] = [
              <div key={`${year}-label`} className="flex items-center gap-1.5 pr-1 text-xs font-bold">
                <span className={forecastYears.has(year) ? "text-amber-600 dark:text-amber-300" : ""}>{year}</span>
                {forecastYears.has(year) ? (
                  <span className="rounded bg-amber-100 px-1 py-0.5 text-[8px] text-amber-700 dark:bg-amber-300/15 dark:text-amber-200">
                    พยากรณ์
                  </span>
                ) : null}
              </div>,
            ];

            for (let month = 1; month <= 12; month += 1) {
              const record = byKey.get(`${year}-${month}`);
              if (!record) {
                cells.push(<span key={`${year}-${month}`} className="h-9 rounded-lg bg-emerald-950/5 dark:bg-white/5" />);
                continue;
              }

              const ratio = (record.price - minimum) / Math.max(1, maximum - minimum);
              const lightness = 91 - ratio * 53;
              const isSelected = year === selectedYear && month === selectedMonth;
              const isForecast = record.dataType === "forecast";
              const hue = isForecast ? 28 : 43;
              const saturation = isForecast ? 70 : 46;
              const statusClass = isForecast
                ? "border-2 border-dashed border-amber-400"
                : "border border-transparent";

              cells.push(
                <span
                  key={`${year}-${month}`}
                  className={`grid h-9 place-items-center rounded-lg text-[10px] font-bold tabular-nums ${statusClass} ${isSelected ? "outline-2 outline-offset-2 outline-emerald-950 dark:outline-white" : ""}`}
                  style={{
                    backgroundColor: `hsl(${hue} ${saturation}% ${lightness}%)`,
                    color: ratio > 0.58 ? "white" : "#123020",
                  }}
                  title={`${record.monthNameTh} ${year}: ${formatPrice(record.price, 2)} บาท · ${TYPE_META[record.dataType].label}`}
                >
                  {formatPrice(record.price)}
                </span>
              );
            }
            return cells;
          })}
        </div>
      </div>
    </div>
  );
}

interface LineSeries {
  id: string;
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
  muted?: boolean;
  highlightLast?: boolean;
}

function MonthLineChart({
  title,
  description,
  series,
  selectedMonth,
  toggleable = false,
}: {
  title: string;
  description: string;
  series: LineSeries[];
  selectedMonth?: number;
  toggleable?: boolean;
}) {
  const id = useId();
  const [hiddenSeriesIds, setHiddenSeriesIds] = useState<string[]>([]);
  const values = series.flatMap((item) => item.values).filter(Number.isFinite);
  if (values.length === 0) return <ChartEmpty />;
  const visibleSeries = series.filter((item) => !hiddenSeriesIds.includes(item.id));

  const width = 800;
  const height = 315;
  const padding = { left: 72, right: 25, top: 24, bottom: 55 };
  const [minY, maxY] = paddedExtent(values);
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const x = (index: number) => padding.left + (index / 11) * plotWidth;
  const y = (value: number) => padding.top + ((maxY - value) / (maxY - minY)) * plotHeight;
  const yTicks = Array.from({ length: 5 }, (_, index) => minY + ((maxY - minY) * index) / 4);

  return (
    <div>
      <ChartLegend>
        {series.map((item) => {
          const visible = !hiddenSeriesIds.includes(item.id);

          return toggleable ? (
            <label
              key={item.id}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-full px-2.5 py-1.5 transition-[background-color,box-shadow,opacity] focus-within:ring-2 focus-within:ring-amber-500/30 ${visible ? "text-emerald-950/80 dark:text-white/80" : "bg-slate-100/80 text-slate-500 opacity-60 shadow-[inset_0_1px_3px_rgba(15,23,42,0.08)] dark:bg-white/[0.06] dark:text-white/50"}`}
              style={visible ? {
                backgroundColor: `${item.color}${item.highlightLast ? "20" : "0d"}`,
                boxShadow: item.highlightLast
                  ? `0 6px 18px ${item.color}2e, inset 0 0 0 1px ${item.color}55`
                  : `0 4px 14px ${item.color}1c, inset 0 0 0 1px ${item.color}38`,
              } : undefined}
            >
              <input
                type="checkbox"
                checked={visible}
                className="h-3.5 w-3.5"
                style={{ accentColor: item.color }}
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
                style={{ backgroundColor: item.color }}
              />
              <span className="text-[11px] font-medium">{item.label}</span>
            </label>
          ) : (
            <LegendItem key={item.id} color={item.color} label={item.label} dashed={item.dashed} />
          );
        })}
      </ChartLegend>
      <ScrollableChart>
        <svg
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px] text-emerald-950 dark:text-white"
        >
          <title id={`${id}-title`}>{title}</title>
          <desc id={`${id}-desc`}>{description}</desc>
          {selectedMonth ? (
            <rect
              x={x(selectedMonth - 1) - 19}
              y={padding.top}
              width="38"
              height={plotHeight}
              rx="9"
              fill="currentColor"
              opacity="0.045"
            />
          ) : null}
          {yTicks.map((tick) => {
            const tickY = y(tick);
            return (
              <g key={tick}>
                <line x1={padding.left} x2={width - padding.right} y1={tickY} y2={tickY} stroke="currentColor" opacity="0.09" />
                <text x={padding.left - 10} y={tickY + 4} textAnchor="end" fill="currentColor" opacity="0.55" fontSize="11">
                  {formatPrice(tick)}
                </text>
              </g>
            );
          })}
          {MONTH_SHORT.map((month, index) => (
            <text
              key={month}
              x={x(index)}
              y={height - 24}
              textAnchor="middle"
              fill="currentColor"
              opacity={selectedMonth === index + 1 ? 0.95 : 0.55}
              fontSize="11"
              fontWeight={selectedMonth === index + 1 ? 700 : 400}
            >
              {month}
            </text>
          ))}
          <text x={padding.left} y="13" fill="currentColor" opacity="0.65" fontSize="11">บาท / 100 กก.</text>
          {visibleSeries.map((item) => (
            <g key={item.id} opacity={item.muted ? 0.86 : 1}>
              <polyline
                points={item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ")}
                fill="none"
                stroke={item.color}
                strokeWidth={item.muted ? 2.2 : 3.6}
                strokeDasharray={item.dashed ? "7 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {item.values.map((value, index) => {
                const isHighlightedEndpoint =
                  item.highlightLast && index === item.values.length - 1;

                return (
                  <g key={`${item.id}-${index}`}>
                    {isHighlightedEndpoint ? (
                      <circle
                        cx={x(index)}
                        cy={y(value)}
                        r="8"
                        fill="#fff8ed"
                        stroke={item.color}
                        strokeWidth="2.8"
                      />
                    ) : null}
                    <circle
                      cx={x(index)}
                      cy={y(value)}
                      r={isHighlightedEndpoint ? 4.25 : item.muted ? 2 : 3.5}
                      fill={item.color}
                    >
                      <title>{`${item.label} · ${MONTH_SHORT[index]}: ${formatPrice(value, 2)} บาท / 100 กก.`}</title>
                    </circle>
                  </g>
                );
              })}
            </g>
          ))}
          {visibleSeries.length === 0 ? (
            <text
              x={padding.left + plotWidth / 2}
              y={padding.top + plotHeight / 2}
              textAnchor="middle"
              fill="currentColor"
              opacity="0.48"
              fontSize="13"
            >
              เลือกชนิดข้าวจากรายการด้านบนเพื่อแสดงกราฟ
            </text>
          ) : null}
        </svg>
      </ScrollableChart>
    </div>
  );
}

export function SeasonalChart({
  records,
  selectedYear,
  selectedMonth,
}: {
  records: RicePriceRecord[];
  selectedYear: number;
  selectedMonth: number;
}) {
  const historical = records.filter((record) => record.dataType !== "forecast");
  const historicalYears = [...new Set(historical.map((record) => record.yearBe))].sort((a, b) => a - b);
  const historicalYearLabel = historicalYears.length > 0
    ? `${historicalYears[0]}${historicalYears.length > 1 ? `–${historicalYears.at(-1)}` : ""}`
    : "ไม่มีข้อมูลย้อนหลัง";
  const selectedIsForecast = records.some(
    (record) => record.yearBe === selectedYear && record.dataType === "forecast"
  );
  const historicalAverage = Array.from({ length: 12 }, (_, index) => {
    const monthRecords = historical.filter((record) => record.month === index + 1);
    return monthRecords.reduce((total, record) => total + record.price, 0) / monthRecords.length;
  });
  const selected = records
    .filter((record) => record.yearBe === selectedYear)
    .sort((a, b) => a.month - b.month)
    .map((record) => record.price);

  return (
    <MonthLineChart
      title="รูปแบบราคาตามฤดูกาล"
      description={`เปรียบเทียบค่าเฉลี่ยรายเดือน พ.ศ. ${historicalYearLabel} กับปี ${selectedYear}`}
      selectedMonth={selectedMonth}
      series={[
        {
          id: "history-average",
          label: `เฉลี่ยย้อนหลัง ${historicalYearLabel}`,
          values: historicalAverage,
          color: ACTUAL_COLOR,
          dashed: true,
        },
        {
          id: "selected-year",
          label: selectedIsForecast ? `พยากรณ์ปี ${selectedYear}` : `ข้าวจริง ปี ${selectedYear}`,
          values: selected,
          color: selectedIsForecast ? FORECAST_COLOR : ACTUAL_COLOR,
          dashed: selectedIsForecast,
          highlightLast: selectedIsForecast,
        },
      ]}
    />
  );
}

export function CompareRiceChart({
  records,
  riceTypes,
  selectedRiceType,
}: {
  records: RicePriceRecord[];
  riceTypes: string[];
  selectedRiceType: string;
}) {
  const byType = new Map(records.map((record) => [record.riceType, record]));
  const maximum = Math.max(...records.map((record) => record.price), 1);

  return (
    <div role="img" aria-label={`กราฟเปรียบเทียบราคาข้าว ${riceTypes.length} ชนิด`} className="space-y-4 py-1">
      {riceTypes.map((riceType) => {
        const record = byType.get(riceType);
        if (!record) return null;
        const selected = riceType === selectedRiceType;
        const width = `${Math.max(4, (record.price / maximum) * 100)}%`;

        return (
          <div
            key={riceType}
            className={selected
              ? "rounded-xl bg-[#fff5e4] p-2.5 shadow-[inset_0_0_0_2px_#e28a24,0_7px_20px_rgba(179,91,17,0.12)] dark:bg-orange-300/[0.08]"
              : "px-2.5"}
          >
            <div className="mb-1.5 text-xs sm:text-sm">
              <span className={selected ? "font-bold" : "font-medium"}>{riceType}</span>
            </div>
            <div className="h-8 overflow-hidden rounded-lg border border-[#f3d6b3] bg-white dark:border-orange-200/15 dark:bg-white/[0.04]">
              <div
                className="flex h-full min-w-[7rem] items-center rounded-md px-2"
                style={{
                  width,
                  borderColor: riceBarBorder(riceType),
                  borderStyle: "solid",
                  borderWidth: 2,
                  backgroundColor: riceBarFill(riceType),
                }}
              >
                <span className="truncate text-[10px] font-bold text-[#3f2b10] tabular-nums sm:text-xs">
                  {formatPrice(record.price, 2)} บาท
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MomentumChart({
  records,
  previousDecember,
  selectedMonth,
}: {
  records: RicePriceRecord[];
  previousDecember?: RicePriceRecord;
  selectedMonth: number;
}) {
  const id = useId();
  const sorted = [...records].sort((a, b) => a.month - b.month);
  const changes = sorted.map((record, index) => {
    const previous = index === 0 ? previousDecember : sorted[index - 1];
    return previous ? ((record.price - previous.price) / previous.price) * 100 : 0;
  });
  const maxMagnitude = Math.max(...changes.map(Math.abs), 1);
  const width = 800;
  const height = 300;
  const padding = { left: 44, right: 24, top: 30, bottom: 55 };
  const plotHeight = height - padding.top - padding.bottom;
  const baseline = padding.top + plotHeight / 2;
  const slot = (width - padding.left - padding.right) / 12;
  const barWidth = Math.min(38, slot * 0.66);
  const scale = plotHeight / 2 / maxMagnitude;

  return (
    <div>
      <ChartLegend>
        <LegendItem color={ACTUAL_COLOR} label="ข้าวจริง" shape="dot" />
        <LegendItem color={FORECAST_COLOR} label="พยากรณ์" dashed />
      </ChartLegend>
      <ScrollableChart>
        <svg
          role="img"
          aria-labelledby={`${id}-title ${id}-desc`}
          viewBox={`0 0 ${width} ${height}`}
          className="min-w-[700px] text-emerald-950 dark:text-white"
        >
          <title id={`${id}-title`}>การเปลี่ยนแปลงราคาเทียบเดือนก่อน</title>
          <desc id={`${id}-desc`}>อัตราการเปลี่ยนแปลงราคารายเดือนเป็นร้อยละ</desc>
          <line x1={padding.left} x2={width - padding.right} y1={baseline} y2={baseline} stroke="currentColor" opacity="0.3" />
          <text x={padding.left} y="15" fill="currentColor" opacity="0.65" fontSize="11">MoM (%)</text>
          {changes.map((change, index) => {
            const center = padding.left + slot * index + slot / 2;
            const magnitude = Math.abs(change) * scale;
            const barY = change >= 0 ? baseline - magnitude : baseline;
            const color = sorted[index]?.dataType === "forecast" ? FORECAST_COLOR : ACTUAL_COLOR;
            const isSelected = index + 1 === selectedMonth;
            return (
              <g key={MONTH_SHORT[index]}>
                {isSelected ? (
                  <rect
                    x={center - slot / 2 + 3}
                    y={padding.top - 5}
                    width={slot - 6}
                    height={plotHeight + 10}
                    rx="9"
                    fill="currentColor"
                    opacity="0.05"
                  />
                ) : null}
                <rect
                  x={center - barWidth / 2}
                  y={barY}
                  width={barWidth}
                  height={Math.max(1.5, magnitude)}
                  rx="5"
                  fill={color}
                  opacity={sorted[index]?.dataType === "forecast" ? 0.8 : 1}
                  stroke={isSelected ? "currentColor" : "none"}
                  strokeWidth="2"
                  strokeDasharray={sorted[index]?.dataType === "forecast" ? "4 2" : undefined}
                >
                  <title>{`${MONTH_SHORT[index]}: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%`}</title>
                </rect>
                <text x={center} y={height - 24} textAnchor="middle" fill="currentColor" opacity={isSelected ? 0.95 : 0.58} fontSize="11" fontWeight={isSelected ? 700 : 400}>
                  {MONTH_SHORT[index]}
                </text>
                <text
                  x={center}
                  y={change >= 0 ? Math.max(16, barY - 7) : Math.min(height - padding.bottom + 16, barY + magnitude + 14)}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9.5"
                  fontWeight="700"
                >
                  {change >= 0 ? "+" : ""}{change.toFixed(1)}
                </text>
              </g>
            );
          })}
        </svg>
      </ScrollableChart>
    </div>
  );
}

export function ForecastChart({
  records,
  riceTypes,
  selectedRiceType,
  selectedMonth,
  forecastYear,
}: {
  records: RiceForecastRecord[];
  riceTypes: string[];
  selectedRiceType: string;
  selectedMonth: number;
  forecastYear: number;
}) {
  const series = riceTypes.map((riceType) => ({
    id: riceType,
    label: riceType === selectedRiceType ? `${riceType} · เลือกอยู่` : riceType,
    values: records
      .filter((record) => record.riceType === riceType)
      .sort((a, b) => a.month - b.month)
      .map((record) => record.forecastPrice),
    color: forecastRiceVarietyColor(riceType),
    dashed: riceType === selectedRiceType,
    muted: riceType !== selectedRiceType,
    highlightLast: riceType === selectedRiceType,
  }));

  return (
    <MonthLineChart
      title={`พยากรณ์ราคาข้าวปี ${forecastYear}`}
      description={`ค่าพยากรณ์รายเดือนของข้าวทั้ง ${riceTypes.length} ชนิด โดยเน้นชนิดข้าวที่เลือก`}
      series={series}
      selectedMonth={selectedMonth}
      toggleable
    />
  );
}

function ScrollableChart({ children }: { children: ReactNode }) {
  return (
    <div className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:thin]">
      {children}
    </div>
  );
}

function ChartEmpty() {
  return (
    <p className="grid min-h-56 place-items-center text-sm text-emerald-950/50 dark:text-white/50">
      ไม่มีข้อมูลสำหรับกราฟนี้
    </p>
  );
}
