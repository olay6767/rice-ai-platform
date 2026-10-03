"use client";

import {
  CloudRain,
  Funnel,
  Layers,
  SunMedium,
  Wind,
  X,
} from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";

import ThailandFrequencyMap from "@/components/drought/ThailandDroughtMap";
import DashboardMascotInsight from "@/components/insights/DashboardMascotInsight";
import {
  RiceErrorState,
  RiceLoadingState,
} from "@/components/rice-yield/RiceAnalyticsShell";
import {
  ALL,
  DEFAULT_OVERVIEW_FILTERS,
  THAI_SHORT_MONTHS,
  deriveDisasterOverview,
  historicalTrendRows,
  overviewScope,
  type ChartRow,
  type DisasterKey,
  type ImpactView,
  type OverviewFilters,
} from "@/lib/disaster-overview/selectors";
import {
  isDisasterOverviewData,
  type DisasterName,
  type DisasterOverviewData,
} from "@/lib/disaster-overview/types";
import { readJsonResponse } from "@/lib/http/json";

const DATA_URL = "/data/disasters/disaster_overview.json";
const FREQUENCY_LABEL = "ความถี่ที่พบบันทึกภัย";
const LINE_DEFAULT_FILTERS: OverviewFilters = {
  ...DEFAULT_OVERVIEW_FILTERS,
  disaster: "น้ำท่วม",
};

const DISASTER_CONFIG: Array<{
  name: DisasterName;
  key: DisasterKey;
  color: string;
  icon: typeof CloudRain;
}> = [
  { name: "น้ำท่วม", key: "flood", color: "#1E5A8A", icon: CloudRain },
  { name: "ภัยแล้ง", key: "drought", color: "#E87524", icon: SunMedium },
  { name: "พายุ", key: "storm", color: "#5F6B66", icon: Wind },
];

interface KpiLogoAsset {
  src: string;
  width: number;
  height: number;
  viewBox: string;
}

// Crop the transparent padding in the viewport only; keep the source PNGs intact.
const KPI_LOGOS: Record<DisasterKey | "province", KpiLogoAsset> = {
  flood: { src: "/images/9.png", width: 884, height: 434, viewBox: "5 4 845 383" },
  drought: { src: "/images/10.png", width: 435, height: 435, viewBox: "108 76 219 284" },
  storm: { src: "/images/11.png", width: 435, height: 434, viewBox: "97 64 242 307" },
  province: { src: "/images/12.png", width: 435, height: 435, viewBox: "101 21 233 392" },
};

function formatNumber(
  value: number | null,
  maximumFractionDigits = 1
): string {
  return value === null
    ? "—"
    : value.toLocaleString("th-TH", { maximumFractionDigits });
}


function Panel({
  title,
  action,
  children,
  className = "",
  tone = "light",
}: {
  title: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";

  return (
    <section
      className={
        `min-w-0 overflow-hidden rounded-2xl border p-4 shadow-[0_14px_38px_rgba(34,94,54,0.08)] sm:p-5 ${
          dark
            ? "border-[#ECF39E]/20 bg-[#244936] text-white"
            : "border-[#90A955]/20 bg-white text-[#315d42]"
        } ` + className
      }
    >
      <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-2.5">
        <h2
          className={`text-base font-bold leading-tight sm:text-lg ${
            dark ? "text-white" : "text-[#315d42]"
          }`}
        >
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled = false,
  tone = "light",
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  tone?: "light" | "dark";
  children: ReactNode;
}) {
  const dark = tone === "dark";

  return (
    <label className="grid min-w-0 gap-1.5">
      <span
        className={`text-[11px] font-medium ${
          dark ? "text-white/65" : "text-[#315d42]/75"
        }`}
      >
        {label}
      </span>
      <span className="relative min-w-0">
        <select
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className={`overview-light-select min-h-10 w-full appearance-none truncate rounded-lg border px-3 py-2 pr-8 text-xs font-medium outline-none transition focus:ring-2 disabled:cursor-not-allowed disabled:opacity-45 ${
            dark
              ? "border-white/15 bg-white/[0.08] text-white [color-scheme:dark] focus:ring-[#ECF39E]/35"
              : "border-[#40916C]/25 bg-white text-[#315d42] [color-scheme:light] focus:ring-[#40916C]/20"
          }`}
        >
          {children}
        </select>
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[9px] ${
            dark ? "text-white/55" : "text-[#40916C]/70"
          }`}
        >
          ▼
        </span>
      </span>
    </label>
  );
}

function GraphFilters({
  chartName,
  data,
  filters,
  onChange,
  resetFilters = DEFAULT_OVERVIEW_FILTERS,
  yearMode = "period",
  showMonth = true,
  showProvince = true,
  tone = "light",
}: {
  chartName: string;
  data: DisasterOverviewData;
  filters: OverviewFilters;
  onChange: (filters: OverviewFilters) => void;
  resetFilters?: OverviewFilters;
  yearMode?: "period" | "history";
  showMonth?: boolean;
  showProvince?: boolean;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const [open, setOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<OverviewFilters>({
    ...filters,
  });
  const years =
    yearMode === "history"
      ? data.comparison.yearly_all.map((item) => item.year)
      : data.filters.years;
  const summaryYearSelected =
    draftFilters.year === String(data.summary_2568.year);

  function updateDraft(change: Partial<OverviewFilters>) {
    setDraftFilters((current) => ({ ...current, ...change }));
  }

  return (
    <div className="mb-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`filters-${chartName.replaceAll(" ", "-")}`}
        onClick={() => {
          if (!open) setDraftFilters({ ...filters });
          setOpen((current) => !current);
        }}
        className={`inline-flex min-h-9 items-center gap-2 rounded-full px-4 text-xs font-medium transition ${
          dark
            ? "bg-white/[0.09] text-[#ECF39E] hover:bg-white/[0.14]"
            : "bg-[#f2f4ef] text-[#557060] hover:bg-[#e9eedf]"
        }`}
      >
        <Funnel aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={1.7} />
        เลือกปี
        <span
          aria-hidden="true"
          className={`ml-1 text-[9px] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        >
          ▼
        </span>
      </button>

      {open ? (
        <div
          id={`filters-${chartName.replaceAll(" ", "-")}`}
          role="group"
          aria-label={`ตัวกรอง${chartName}`}
          className={`mt-2 rounded-2xl border p-3 shadow-[0_12px_28px_rgba(47,79,58,0.12)] ${
            dark
              ? "border-[#ECF39E]/20 bg-[#315d42]"
              : "border-[#90A955]/20 bg-[#fbfdf5]"
          }`}
        >
          <div
            className="grid min-w-0 gap-2.5"
            style={{
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr))",
            }}
          >
            <FilterSelect
              label="ปี"
              value={draftFilters.year}
              tone={tone}
              onChange={(year) =>
                updateDraft({
                  year,
                  month:
                    year === String(data.summary_2568.year)
                      ? ALL
                      : draftFilters.month,
                })
              }
            >
              <option value={ALL}>ทั้งหมด</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </FilterSelect>

            {showMonth ? (
              <FilterSelect
                label="เดือน"
                value={draftFilters.month}
                tone={tone}
                disabled={summaryYearSelected}
                onChange={(month) => updateDraft({ month })}
              >
                <option value={ALL}>
                  {summaryYearSelected ? "ข้อมูลรายปี" : "ทุกเดือน"}
                </option>
                {data.filters.months.map((month) => (
                  <option key={month.month} value={month.month}>
                    {THAI_SHORT_MONTHS[month.month - 1]}
                  </option>
                ))}
              </FilterSelect>
            ) : null}

            {showProvince ? (
              <FilterSelect
                label="จังหวัด"
                value={draftFilters.province}
                tone={tone}
                onChange={(province) => updateDraft({ province })}
              >
                <option value={ALL}>ทุกจังหวัด</option>
                {data.filters.provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </FilterSelect>
            ) : null}

            <FilterSelect
              label="ประเภทภัย"
              value={draftFilters.disaster}
              tone={tone}
              onChange={(disaster) => updateDraft({ disaster })}
            >
              <option value={ALL}>ทุกประเภทภัย</option>
              {data.filters.disasters.map((disaster) => (
                <option key={disaster} value={disaster}>
                  {disaster}
                </option>
              ))}
            </FilterSelect>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDraftFilters({ ...resetFilters })}
              className={`min-h-9 rounded-full border px-5 text-xs font-medium transition ${
                dark
                  ? "border-white/20 bg-transparent text-white hover:bg-white/[0.08]"
                  : "border-[#40916C]/25 bg-white text-[#315d42] hover:bg-[#f4f8e9]"
              }`}
            >
              รีเซ็ต
            </button>
            <button
              type="button"
              onClick={() => {
                onChange({ ...draftFilters });
                setOpen(false);
              }}
              className="min-h-9 rounded-full bg-[#40916C] px-5 text-xs font-semibold text-white shadow-[0_6px_16px_rgba(64,145,108,0.25)] transition hover:bg-[#357b5b]"
            >
              แสดงข้อมูล
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function KpiCard({
  label,
  value,
  detail,
  logo,
}: {
  label: string;
  value: number | null;
  detail: string;
  logo: KpiLogoAsset;
}) {
  const logoFilterId = `overview-kpi-logo-${useId()}`;

  return (
    <article className="flex min-h-[108px] min-w-0 items-center rounded-xl bg-white px-4 py-4 text-[#23654C] shadow-[0_10px_28px_rgba(64,145,108,0.16)] sm:px-5">
      <div className="flex w-full items-center gap-3.5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-white shadow-[0_7px_20px_rgba(30,53,38,0.18)]">
          <svg
            aria-hidden="true"
            focusable="false"
            viewBox={logo.viewBox}
            preserveAspectRatio="xMidYMid meet"
            className="h-9 w-9 overflow-hidden"
          >
            <defs>
              <filter id={logoFilterId} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
                <feFlood floodColor="#171d19" />
                <feComposite in2="SourceAlpha" operator="in" />
              </filter>
            </defs>
            <image
              href={logo.src}
              width={logo.width}
              height={logo.height}
              filter={`url(#${logoFilterId})`}
            />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="break-words text-[23px] font-semibold leading-7 tracking-tight tabular-nums sm:text-2xl">
            {formatNumber(value)}
          </p>
          <p className="mt-0.5 text-xs font-medium leading-4">
            {label}
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-[#23654C]/75">
            {value === null ? "ไม่มีข้อมูล" : detail}
          </p>
        </div>
      </div>
    </article>
  );
}

type ComparisonTooltipProps = Partial<TooltipContentProps<number, string>>;

function ComparisonTooltip({
  active,
  payload,
  label,
}: ComparisonTooltipProps) {
  if (!active || !payload?.length) return null;

  const fullLabel = payload[0]?.payload?.fullLabel;

  return (
    <div className="min-w-36 rounded-xl border border-emerald-950/10 bg-white/95 px-3.5 py-3 text-xs shadow-[0_16px_36px_rgba(20,61,37,0.18)] backdrop-blur">
      <p className="font-bold text-[#173523]">
        {String(fullLabel ?? label ?? "")}
      </p>
      <div className="mt-2 space-y-1.5">
        {payload.map((item) => (
          <div
            key={String(item.dataKey)}
            className="flex items-center justify-between gap-5"
          >
            <span className="flex items-center gap-2 text-emerald-950/65">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              {item.name}
            </span>
            <strong className="tabular-nums text-[#173523]">
              {formatNumber(
                typeof item.value === "number" ? item.value : null
              )}
            </strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartLegend({
  visibleDisasters,
  tone = "light",
  showEndPoint = false,
}: {
  visibleDisasters: DisasterName[];
  tone?: "light" | "dark";
  showEndPoint?: boolean;
}) {
  const dark = tone === "dark";

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5">
      {DISASTER_CONFIG.filter((item) =>
        visibleDisasters.includes(item.name)
      ).map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            dark ? "text-white/65" : "text-emerald-950/60"
          }`}
        >
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.name}
        </span>
      ))}
      {showEndPoint ? (
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
            dark ? "text-white/65" : "text-emerald-950/60"
          }`}
        >
          <span className="h-2.5 w-2.5 rounded-full bg-white ring-2 ring-[#5F6B66]" />
          จุดล่าสุด
        </span>
      ) : null}
    </div>
  );
}

function EmptyState({
  message,
  tone = "light",
}: {
  message: string;
  tone?: "light" | "dark";
}) {
  return (
    <div
      className={`grid min-h-56 place-items-center rounded-xl px-5 text-center text-sm font-medium leading-6 ${
        tone === "dark"
          ? "bg-white/[0.04] text-white/55"
          : "bg-[#f4f8ec] text-emerald-950/70"
      }`}
    >
      {message}
    </div>
  );
}

function OverviewSnapshot({
  values,
}: {
  values: Record<DisasterKey, number | null>;
}) {
  const items = DISASTER_CONFIG.map((config) => ({
    ...config,
    rawValue: values[config.key],
    value: values[config.key] ?? 0,
  }));
  const total = items.reduce((sum, item) => sum + item.value, 0);
  const hasAvailableValue = items.some((item) => item.rawValue !== null);

  return (
    <div className="grid gap-4 sm:grid-cols-[160px_minmax(0,1fr)] xl:grid-cols-1">
      <div className="relative mx-auto h-40 w-40">
        {total > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={items}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={49}
                outerRadius={70}
                startAngle={90}
                endAngle={-270}
                stroke="#ffffff"
                strokeWidth={4}
                paddingAngle={1}
                isAnimationActive={false}
              >
                {items.map((item) => (
                  <Cell key={item.key} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={<ComparisonTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="absolute inset-3 rounded-full border-[20px] border-emerald-950/5" />
        )}
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <strong className="text-2xl font-bold tabular-nums text-[#173523]">
            {hasAvailableValue ? formatNumber(total, 0) : "—"}
          </strong>
          <span className="text-[10px] font-semibold text-emerald-950/45">
            บันทึก
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const percent = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={item.key}>
              <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                <span className="flex items-center gap-2 font-semibold text-emerald-950/65">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.name}
                </span>
                <strong className="tabular-nums text-[#173523]">
                  {formatNumber(item.rawValue, 0)}
                </strong>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-emerald-950/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${item.value > 0 ? Math.max(4, percent) : 0}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
          );
        })}

      </div>
    </div>
  );
}

function ImpactSummary({ items }: { items: ImpactView[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => {
        const config = DISASTER_CONFIG.find(
          (candidate) => candidate.name === item.disaster
        );
        const Icon = config?.icon ?? Layers;
        const color = config?.color ?? "#40916C";

        return (
          <article
            key={item.disaster}
            className="rounded-xl bg-[#f5f8ef] p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <strong className="text-sm text-[#173523]">
                {item.disaster}
              </strong>
              <span
                className="grid h-8 w-8 place-items-center rounded-lg"
                style={{ color, backgroundColor: color + "18" }}
              >
                <Icon aria-hidden="true" className="h-4 w-4" />
              </span>
            </div>
            <p className="mt-3 text-2xl font-bold tabular-nums text-[#173523]">
              {formatNumber(item.events, 0)}
              <span className="ml-1 text-[11px] font-semibold text-emerald-950/45">
                ครั้ง
              </span>
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-emerald-950/50">
              <span>
                ผู้ได้รับผลกระทบ
                <strong className="mt-0.5 block text-xs tabular-nums text-emerald-950/75">
                  {formatNumber(item.people, 0)}
                </strong>
              </span>
              <span>
                พื้นที่เกษตร
                <strong className="mt-0.5 block text-xs tabular-nums text-emerald-950/75">
                  {formatNumber(item.agriculture, 1)}
                </strong>
              </span>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ProvinceDetails({
  province,
  data,
  filters,
  view,
  onClose,
}: {
  province: string;
  data: DisasterOverviewData;
  filters: OverviewFilters;
  view: ReturnType<typeof deriveDisasterOverview>;
  onClose: () => void;
}) {
  const visibleDisasters = DISASTER_CONFIG.filter((config) =>
    view.visibleDisasters.includes(config.name)
  );
  const knownValues = visibleDisasters
    .map((config) => view.kpiValues[config.key])
    .filter((value): value is number => value !== null);
  const total = knownValues.length
    ? knownValues.reduce((sum, value) => sum + value, 0)
    : null;
  const annualRows = view.yearlyRows.filter((row) =>
    view.activeYears.includes(Number(row.label))
  );

  return (
    <Panel
      title={`รายละเอียดจังหวัด${province}`}
      action={
        <button
          type="button"
          onClick={onClose}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[#40916C]/25 px-3 text-xs font-semibold text-[#315d42] transition hover:bg-[#f4f8e9]"
        >
          <X aria-hidden="true" className="h-3.5 w-3.5" />
          ปิดรายละเอียด
        </button>
      }
    >
      <p className="mb-4 text-xs leading-5 text-emerald-950/65">
        {overviewScope(data, filters)} · {filters.disaster === ALL ? "ทุกประเภทภัย" : filters.disaster}
      </p>
      {view.mapUnavailableNote ? (
        <p className="mb-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {view.mapUnavailableNote}
        </p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-[#edf4e4] p-4">
          <p className="text-xs font-semibold text-[#315d42]/75">
            {view.isSummaryMode ? "รวมเหตุการณ์" : "รวมบันทึกภัย"}
          </p>
          <strong className="mt-2 block text-2xl font-bold tabular-nums text-[#173523]">
            {formatNumber(total, 0)} <span className="text-xs font-medium">ครั้ง</span>
          </strong>
        </div>
        {visibleDisasters.map((config) => {
          const Icon = config.icon;
          return (
            <div key={config.key} className="rounded-xl border border-[#90A955]/20 bg-[#fbfdf5] p-4">
              <p className="flex items-center gap-2 text-xs font-semibold text-[#315d42]">
                <Icon aria-hidden="true" className="h-4 w-4" style={{ color: config.color }} />
                {config.name}
              </p>
              <strong className="mt-2 block text-2xl font-bold tabular-nums text-[#173523]">
                {formatNumber(view.kpiValues[config.key], 0)} <span className="text-xs font-medium">ครั้ง</span>
              </strong>
            </div>
          );
        })}
      </div>

      {view.isSummaryMode ? (
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-bold text-[#173523]">ผลกระทบ พ.ศ. {view.summaryYear}</h3>
          <ImpactSummary items={view.summaryImpacts} />
        </div>
      ) : (
        <div className="mt-5">
          <h3 className="mb-3 text-sm font-bold text-[#173523]">รายละเอียดรายปี</h3>
          <div className="overflow-x-auto rounded-xl border border-[#90A955]/20">
            <table className="w-full min-w-[420px] text-left text-xs">
              <thead className="bg-[#edf4e4] text-[#315d42]">
                <tr>
                  <th scope="col" className="px-3 py-2.5">ปี พ.ศ.</th>
                  {visibleDisasters.map((config) => (
                    <th key={config.key} scope="col" className="px-3 py-2.5 text-right">{config.name}</th>
                  ))}
                  <th scope="col" className="px-3 py-2.5 text-right">รวม</th>
                </tr>
              </thead>
              <tbody>
                {annualRows.map((row) => {
                  const values = visibleDisasters
                    .map((config) => row[config.key])
                    .filter((value): value is number => value !== null);
                  const rowTotal = values.length
                    ? values.reduce((sum, value) => sum + value, 0)
                    : null;
                  return (
                    <tr key={row.label} className="border-t border-[#90A955]/15 text-[#315d42]">
                      <th scope="row" className="px-3 py-2.5 font-semibold">{row.label}</th>
                      {visibleDisasters.map((config) => (
                        <td key={config.key} className="px-3 py-2.5 text-right tabular-nums">
                          {formatNumber(row[config.key], 0)}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-right font-bold tabular-nums">{formatNumber(rowTotal, 0)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <p className="mt-4 text-[11px] leading-5 text-emerald-950/55">
        {view.isSummaryMode ? data.summary_2568.note : data.meta.metric_definition}
      </p>
    </Panel>
  );
}


function MonthlyChart({
  rows,
  visibleDisasters,
}: {
  rows: ChartRow[];
  visibleDisasters: DisasterName[];
}) {
  if (rows.length === 0) {
    return <EmptyState message="ไม่มีข้อมูลรายเดือนตามตัวกรองนี้" />;
  }

  return (
    <div
      className="h-[380px]"
      role="img"
      aria-label="กราฟแท่งเปรียบเทียบความถี่ที่พบบันทึกภัยรายเดือน"
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={rows}
          margin={{ top: 16, right: 8, left: -10, bottom: 2 }}
          barCategoryGap="24%"
          barGap={3}
        >
          <defs>
            {DISASTER_CONFIG.map((config) => (
              <linearGradient
                key={config.key}
                id={`overview-${config.key}-bar`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={config.color} stopOpacity={1} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0.82} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid
            strokeDasharray="4 5"
            vertical={false}
            stroke="rgba(32,94,54,0.10)"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fontSize: 14, fill: "#365b43", fontWeight: 700 }}
            tickMargin={13}
            height={40}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "#718477", fontWeight: 600 }}
            tickMargin={9}
          />
          <Tooltip
            cursor={{ fill: "rgba(220,235,209,0.34)" }}
            content={<ComparisonTooltip />}
          />
          {DISASTER_CONFIG.filter((config) =>
            visibleDisasters.includes(config.name)
          ).map((config) => (
            <Bar
              key={config.key}
              dataKey={config.key}
              name={config.name}
              fill={`url(#overview-${config.key}-bar)`}
              radius={[8, 8, 2, 2]}
              maxBarSize={26}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function YearlyChart({
  rows,
  visibleDisasters,
}: {
  rows: ChartRow[];
  visibleDisasters: DisasterName[];
}) {
  const series = DISASTER_CONFIG.filter((config) =>
    visibleDisasters.includes(config.name)
  );
  const values = rows.flatMap((row) =>
    series.flatMap((config) => {
      const value = row[config.key];
      return typeof value === "number" ? [value] : [];
    })
  );

  if (rows.length < 2 || values.length < 2) {
    return <EmptyState message="ข้อมูลยังไม่พอสำหรับแสดงแนวโน้ม" />;
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const spread = Math.max(1, maximum - minimum);
  const domain: [number, number] = [
    Math.max(0, Math.floor(minimum - spread * 0.14)),
    Math.ceil(maximum + spread * 0.14),
  ];
  const lastRow = rows[rows.length - 1];

  return (
    <div
      className="relative h-[380px] pt-5"
      role="img"
      aria-label="กราฟเส้นแนวโน้มความถี่ที่พบบันทึกภัยรายปี"
    >
      <span className="absolute left-1 top-0 text-xs font-semibold text-emerald-950/50">
        ครั้ง
      </span>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={rows}
          margin={{ top: 18, right: 16, left: -8, bottom: 4 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="rgba(49,93,66,0.13)"
          />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            interval={0}
            tick={{ fontSize: 13, fill: "#587061", fontWeight: 700 }}
            tickMargin={13}
            height={40}
          />
          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            domain={domain}
            tickCount={5}
            tick={{ fontSize: 12, fill: "#6D7F73", fontWeight: 600 }}
            tickMargin={10}
          />
          <ReferenceLine
            x={lastRow.label}
            stroke="#5F6B66"
            strokeWidth={30}
            strokeOpacity={0.07}
          />
          <Tooltip
            cursor={{ stroke: "rgba(49,93,66,0.18)", strokeWidth: 2 }}
            content={<ComparisonTooltip />}
          />
          {series.map((config) => {
            const color = config.color;
            return (
              <Line
                key={config.key}
                type="linear"
                dataKey={config.key}
                name={config.name}
                stroke={color}
                strokeWidth={4}
                connectNulls={false}
                dot={{
                  r: 4.5,
                  fill: color,
                  stroke: "#ffffff",
                  strokeWidth: 2,
                }}
                activeDot={{
                  r: 6,
                  fill: "#ffffff",
                  stroke: color,
                  strokeWidth: 3,
                }}
              />
            );
          })}
          {series.map((config) => {
            const value = lastRow[config.key];
            return typeof value === "number" ? (
              <ReferenceDot
                key={config.key}
                x={lastRow.label}
                y={value}
                r={7}
                fill="#ffffff"
                stroke={config.color}
                strokeWidth={3}
                ifOverflow="visible"
              />
            ) : null;
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function DisasterOverviewDashboard() {
  const [data, setData] = useState<DisasterOverviewData | null>(null);
  const [monthlyFilters, setMonthlyFilters] = useState<OverviewFilters>({
    ...DEFAULT_OVERVIEW_FILTERS,
  });
  const [lineFilters, setLineFilters] = useState<OverviewFilters>({
    ...LINE_DEFAULT_FILTERS,
  });
  const [mapFilters, setMapFilters] = useState<OverviewFilters>({
    ...DEFAULT_OVERVIEW_FILTERS,
  });
  const [snapshotFilters, setSnapshotFilters] = useState<OverviewFilters>({
    ...DEFAULT_OVERVIEW_FILTERS,
  });
  const [rankingFilters, setRankingFilters] = useState<OverviewFilters>({
    ...DEFAULT_OVERVIEW_FILTERS,
  });
  const [detailProvince, setDetailProvince] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(DATA_URL, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = await readJsonResponse<unknown>(response);

        if (!response.ok || !isDisasterOverviewData(payload)) {
          throw new Error("รูปแบบข้อมูลภาพรวมภัยพิบัติไม่ถูกต้องหรือไม่ครบถ้วน");
        }

        setData(payload);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "ไม่สามารถโหลดข้อมูลภาพรวมภัยพิบัติได้"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadData();
    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    if (!detailProvince) return;
    const frame = window.requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      detailRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [detailProvince]);

  const summary = useMemo(
    () => (data ? deriveDisasterOverview(data, DEFAULT_OVERVIEW_FILTERS) : null),
    [data]
  );
  const monthlyView = useMemo(
    () => (data ? deriveDisasterOverview(data, monthlyFilters) : null),
    [data, monthlyFilters]
  );
  const lineView = useMemo(
    () => (data ? deriveDisasterOverview(data, lineFilters) : null),
    [data, lineFilters]
  );
  const mapView = useMemo(
    () => (data ? deriveDisasterOverview(data, mapFilters) : null),
    [data, mapFilters]
  );
  const detailView = useMemo(
    () =>
      data && detailProvince
        ? deriveDisasterOverview(data, { ...mapFilters, province: detailProvince })
        : null,
    [data, detailProvince, mapFilters]
  );
  const snapshotView = useMemo(
    () => (data ? deriveDisasterOverview(data, snapshotFilters) : null),
    [data, snapshotFilters]
  );
  const rankingView = useMemo(
    () => (data ? deriveDisasterOverview(data, rankingFilters) : null),
    [data, rankingFilters]
  );
  const lineRows = useMemo(
    () =>
      lineView
        ? historicalTrendRows(lineView.yearlyRows, lineFilters.year)
        : [],
    [lineFilters.year, lineView]
  );

  if (loading) {
    return <RiceLoadingState label="กำลังโหลดข้อมูลภาพรวมภัยพิบัติ…" />;
  }

  if (
    error ||
    !data ||
    !summary ||
    !monthlyView ||
    !lineView ||
    !mapView ||
    !snapshotView ||
    !rankingView
  ) {
    return (
      <RiceErrorState
        message={error ?? "ไม่สามารถเตรียมข้อมูลภาพรวมภัยพิบัติได้"}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  const rankingMaximum = Math.max(
    ...rankingView.ranking.map((item) => item.total),
    1
  );
  const mapDisasterLabel =
    mapFilters.disaster === ALL ? "ทุกประเภทภัย" : mapFilters.disaster;
  const mapFrequencyLabel =
    mapFilters.disaster === ALL
      ? FREQUENCY_LABEL
      : `ความถี่ที่พบบันทึก${mapFilters.disaster}`;
  const overviewInsightItems = DISASTER_CONFIG.map((config) => ({
    ...config,
    value: summary.kpiValues[config.key] ?? 0,
  })).sort((first, second) => second.value - first.value);
  const dominantDisaster = overviewInsightItems[0];
  const overviewTotal = overviewInsightItems.reduce(
    (total, item) => total + item.value,
    0
  );
  const overviewTopProvince = summary.ranking[0];
  const overviewRecommendations: Record<DisasterName, string> = {
    น้ำท่วม:
      "ควรให้พื้นที่ที่พบถี่ตรวจทางระบายน้ำ จุดอพยพ และช่องทางแจ้งเตือน โดยยืนยันสถานการณ์กับประกาศทางการก่อนดำเนินการภาคสนาม",
    ภัยแล้ง:
      "ควรให้พื้นที่ที่พบถี่วางแผนสำรองน้ำ ตรวจความชื้นดิน และจัดลำดับการให้น้ำตามระยะการเจริญเติบโตของข้าว",
    พายุ:
      "ควรให้พื้นที่ที่พบถี่ตรวจความพร้อมของอาคาร พื้นที่เพาะปลูก และแผนสื่อสารฉุกเฉิน พร้อมติดตามประกาศเตือนภัยอย่างใกล้ชิด",
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-[#173523] sm:text-2xl">
            สรุปภาพรวม
          </h2>
        </div>
      </div>

      <DashboardMascotInsight
        dashboardName="ภาพรวมภัยพิบัติ"
        summary={
          overviewTotal > 0
            ? `พบข้อมูลรวม ${formatNumber(overviewTotal, 0)} บันทึก โดย${dominantDisaster.name}มีจำนวนมากที่สุด ${formatNumber(dominantDisaster.value, 0)} บันทึก${overviewTopProvince ? ` และ${overviewTopProvince.province}อยู่ในอันดับจังหวัดที่พบบ่อย` : ""}`
            : "ยังไม่พบบันทึกภัยในชุดข้อมูลภาพรวมที่กำลังแสดง"
        }
        recommendation={
          overviewTotal > 0
            ? overviewRecommendations[dominantDisaster.name]
            : "ควรตรวจความครบถ้วนและช่วงเวลาของข้อมูลก่อนใช้ประกอบการวางแผน"
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="บันทึกน้ำท่วม"
          value={summary.kpiValues.flood}
          detail={FREQUENCY_LABEL}
          logo={KPI_LOGOS.flood}
        />
        <KpiCard
          label="บันทึกภัยแล้ง"
          value={summary.kpiValues.drought}
          detail={FREQUENCY_LABEL}
          logo={KPI_LOGOS.drought}
        />
        <KpiCard
          label="บันทึกพายุ"
          value={summary.kpiValues.storm}
          detail={FREQUENCY_LABEL}
          logo={KPI_LOGOS.storm}
        />
        <KpiCard
          label="จังหวัดที่มีข้อมูล"
          value={summary.mapValues.size}
          detail={`จาก ${data.filters.provinces.length.toLocaleString("th-TH")} จังหวัด`}
          logo={KPI_LOGOS.province}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title={monthlyView.isSummaryMode ? `ผลกระทบ พ.ศ. ${monthlyView.summaryYear}` : "เปรียบเทียบรายเดือน"}
        >
          <GraphFilters
            chartName="กราฟรายเดือน"
            data={data}
            filters={monthlyFilters}
            onChange={setMonthlyFilters}
          />
          <div className="mb-2">
            <ChartLegend visibleDisasters={monthlyView.visibleDisasters} />
          </div>
          {monthlyView.isSummaryMode ? (
            <ImpactSummary items={monthlyView.summaryImpacts} />
          ) : (
            <MonthlyChart
              rows={monthlyView.monthRows}
              visibleDisasters={monthlyView.visibleDisasters}
            />
          )}
        </Panel>

        <Panel title="แนวโน้มรายปี">
          <GraphFilters
            chartName="กราฟแนวโน้ม"
            data={data}
            filters={lineFilters}
            resetFilters={LINE_DEFAULT_FILTERS}
            yearMode="history"
            onChange={setLineFilters}
          />
          <div className="mb-1">
            <ChartLegend
              visibleDisasters={lineView.visibleDisasters}
              showEndPoint
            />
          </div>
          <YearlyChart
            rows={lineRows}
            visibleDisasters={lineView.visibleDisasters}
          />
        </Panel>
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <Panel
          title="แผนที่ภาพรวมรายจังหวัด"
          className="h-full"
        >
          <GraphFilters
            chartName="แผนที่"
            data={data}
            filters={mapFilters}
            onChange={(filters) => {
              setMapFilters(filters);
              setDetailProvince(filters.province === ALL ? null : filters.province);
            }}
          />
          <ThailandFrequencyMap
            values={mapView.mapValues}
            selectedProvince={mapFilters.province === ALL ? null : mapFilters.province}
            onSelectProvince={(province) => {
              setMapFilters((current) => ({
                ...current,
                province: province ?? ALL,
              }));
              setDetailProvince(province);
            }}
            onOpenProvinceDetails={(province) => {
              setMapFilters((current) => ({ ...current, province }));
              setDetailProvince(province);
              if (detailProvince === province) {
                window.requestAnimationFrame(() =>
                  detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              }
            }}
            scopeLabel={overviewScope(data, mapFilters)}
            valueUnit="ครั้ง"
            frequencyLabel={mapFrequencyLabel}
            legendTitle={mapDisasterLabel}
            recordNoun="บันทึกภัย"
            unavailableNote={mapView.mapUnavailableNote}
            missingMeansNoData
            theme="green"
            compact
          />
        </Panel>

        <div className="grid gap-4 xl:h-full xl:grid-rows-[auto_minmax(0,1fr)]">
          <Panel title="สัดส่วนภาพรวม">
            <GraphFilters
              chartName="กราฟสัดส่วน"
              data={data}
              filters={snapshotFilters}
              onChange={setSnapshotFilters}
              showProvince={false}
            />
            <OverviewSnapshot
              values={snapshotView.kpiValues}
            />
          </Panel>

          <Panel title="จังหวัดที่พบบ่อย" className="h-full">
            <GraphFilters
              chartName="อันดับจังหวัด"
              data={data}
              filters={rankingFilters}
              onChange={setRankingFilters}
              showProvince={false}
            />
            {rankingView.ranking.length ? (
              <ol className="space-y-3.5">
                {rankingView.ranking.map((item, index) => (
                  <li key={item.province}>
                    <div className="flex items-start gap-3">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#edf4e4] text-[11px] font-bold text-emerald-800">
                        {(index + 1).toLocaleString("th-TH")}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <p className="truncate text-sm font-bold text-[#173523]">
                            {item.province}
                          </p>
                          <p className="shrink-0 text-xs font-bold tabular-nums text-emerald-700">
                            {formatNumber(item.total)} ครั้ง
                          </p>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="flex h-full overflow-hidden rounded-full"
                            style={{
                              width:
                                Math.max(
                                  4,
                                  (item.total / rankingMaximum) * 100
                                ) + "%",
                            }}
                          >
                            {DISASTER_CONFIG.map((config) => (
                              <span
                                key={config.key}
                                className="h-full"
                                style={{
                                  width: `${item.total > 0 ? ((item[config.key] ?? 0) / item.total) * 100 : 0}%`,
                                  backgroundColor: config.color,
                                }}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-semibold text-emerald-950/55">
                          {DISASTER_CONFIG.map((config) => (
                            <span key={config.key} className="inline-flex items-center gap-1">
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: config.color }}
                              />
                              {formatNumber(item[config.key])}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState message="ไม่มีข้อมูลจังหวัดตามตัวกรองนี้" />
            )}
          </Panel>
        </div>
      </div>
      {detailProvince && detailView ? (
        <div
          ref={detailRef}
          tabIndex={-1}
          aria-label={`รายละเอียดจังหวัด${detailProvince}`}
          className="scroll-mt-24 outline-none"
        >
          <ProvinceDetails
            province={detailProvince}
            data={data}
            filters={mapFilters}
            view={detailView}
            onClose={() => setDetailProvince(null)}
          />
        </div>
      ) : null}
    </div>
  );
}
