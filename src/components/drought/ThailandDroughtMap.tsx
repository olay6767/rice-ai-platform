"use client";

import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { RiceErrorState, RiceLoadingState } from "@/components/rice-yield/RiceAnalyticsShell";
import { readJsonResponse } from "@/lib/http/json";
import type { RiceGeometry, RicePosition } from "@/lib/rice-yield/types";

const WIDTH = 820;
const HEIGHT = 640;

interface ProvinceFeature {
  type: "Feature";
  id: number;
  properties: {
    provinceId: number;
    provinceTh: string;
    provinceEn: string;
    region: string;
  };
  geometry: RiceGeometry;
}

interface GeometryResponse {
  data?: {
    type: "FeatureCollection";
    features: ProvinceFeature[];
  };
  error?: { message?: string };
}

interface ConnectorGeometry {
  width: number;
  height: number;
  path: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

const ORANGE_FILL_CLASSES = [
  "fill-slate-200 dark:fill-slate-700",
  "fill-orange-100 dark:fill-orange-950",
  "fill-orange-300 dark:fill-orange-800",
  "fill-orange-500 dark:fill-orange-600",
  "fill-orange-700 dark:fill-orange-400",
] as const;

const GREEN_FILL_CLASSES = [
  "fill-[#e8ece6]",
  "fill-[#ECF39E]",
  "fill-[#c8d979]",
  "fill-[#90A955]",
  "fill-[#40916C]",
] as const;

const LEGEND_LABELS = [
  "ไม่มีบันทึก",
  "พบน้อย",
  "พบปานกลาง",
  "พบบ่อย",
  "พบบ่อยมาก",
] as const;

const COMPACT_GREEN_BANDS = [
  { label: "ไม่มีบันทึก", color: "#e8ece6" },
  { label: "พบน้อย", color: "#ECF39E" },
  { label: "พบปานกลาง", color: "#90A955" },
  { label: "พบบ่อย", color: "#40916C" },
] as const;

const ORANGE_LEGEND_COLORS = [
  "#e2e8f0", "#ffedd5", "#fdba74", "#f97316", "#c2410c",
] as const;

function collectPositions(geometry: RiceGeometry): RicePosition[] {
  return geometry.type === "Polygon"
    ? geometry.coordinates.flat()
    : geometry.coordinates.flat(2);
}

function createProjector(features: ProvinceFeature[]) {
  const positions = features.flatMap((feature) => collectPositions(feature.geometry));
  const longitudes = positions.map((position) => position[0]);
  const latitudes = positions.map((position) => position[1]);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const padding = 28;
  const scale = Math.min(
    (WIDTH - padding * 2) / Math.max(0.01, maxLongitude - minLongitude),
    (HEIGHT - padding * 2) / Math.max(0.01, maxLatitude - minLatitude)
  );
  const geometryWidth = (maxLongitude - minLongitude) * scale;
  const geometryHeight = (maxLatitude - minLatitude) * scale;
  const offsetX = (WIDTH - geometryWidth) / 2;
  const offsetY = (HEIGHT - geometryHeight) / 2;

  return ([longitude, latitude]: RicePosition): RicePosition => [
    offsetX + (longitude - minLongitude) * scale,
    offsetY + (maxLatitude - latitude) * scale,
  ];
}

function ringPath(
  ring: RicePosition[],
  project: (position: RicePosition) => RicePosition
): string {
  return `${ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ")} Z`;
}

function geometryPath(
  geometry: RiceGeometry,
  project: (position: RicePosition) => RicePosition
): string {
  const polygons =
    geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;

  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringPath(ring, project)))
    .join(" ");
}

function frequencyBand(
  value: number,
  maximum: number,
  positiveBandCount = 4
): number {
  if (value <= 0 || maximum <= 0) return 0;
  return Math.min(
    positiveBandCount,
    Math.ceil((value / maximum) * positiveBandCount)
  );
}

export default function ThailandDroughtMap({
  values,
  selectedProvince,
  onSelectProvince,
  onOpenProvinceDetails,
  scopeLabel,
  valueUnit,
  frequencyLabel = "ความถี่ที่พบบันทึกภัยแล้ง",
  legendTitle,
  recordNoun = "บันทึกภัยแล้ง",
  unavailableNote,
  missingMeansNoData = false,
  theme = "orange",
  compact = false,
}: {
  values: Map<string, number>;
  selectedProvince: string | null;
  onSelectProvince: (province: string | null) => void;
  onOpenProvinceDetails?: (province: string) => void;
  scopeLabel: string;
  valueUnit: "ครั้ง" | "เดือน";
  frequencyLabel?: string;
  legendTitle?: string;
  recordNoun?: string;
  unavailableNote?: string;
  missingMeansNoData?: boolean;
  theme?: "orange" | "green";
  compact?: boolean;
}) {
  const [features, setFeatures] = useState<ProvinceFeature[]>([]);
  const [hovered, setHovered] = useState<ProvinceFeature | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [connector, setConnector] = useState<ConnectorGeometry | null>(null);
  const interactionLayerRef = useRef<HTMLDivElement>(null);
  const detailCardRef = useRef<HTMLElement>(null);
  const provincePathRefs = useRef(new Map<number, SVGPathElement>());

  useEffect(() => {
    const controller = new AbortController();

    async function loadGeometry() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/v1/flood/geojson", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = await readJsonResponse<GeometryResponse>(response);

        if (!response.ok || !payload.data || payload.data.features.length === 0) {
          throw new Error(
            payload.error?.message ?? "ไม่สามารถโหลดขอบเขตจังหวัดประเทศไทยได้"
          );
        }

        setFeatures(payload.data.features);
      } catch (cause) {
        if (cause instanceof DOMException && cause.name === "AbortError") return;
        setError(
          cause instanceof Error
            ? cause.message
            : "ไม่สามารถโหลดขอบเขตจังหวัดประเทศไทยได้"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadGeometry();
    return () => controller.abort();
  }, [reloadKey]);

  const pathFeatures = useMemo(() => {
    if (features.length === 0) return [];
    const project = createProjector(features);

    return features.map((feature) => ({
      feature,
      path: geometryPath(feature.geometry, project),
    }));
  }, [features]);

  const selected = features.find(
    (feature) => feature.properties.provinceTh === selectedProvince
  );
  const active = hovered ?? selected ?? null;
  const activeValue = active
    ? values.get(active.properties.provinceTh)
    : undefined;
  const activeHasNoData =
    Boolean(unavailableNote) ||
    (missingMeansNoData && activeValue === undefined);
  const maximum = unavailableNote ? 0 : Math.max(0, ...values.values());
  const fillClasses =
    theme === "green" ? GREEN_FILL_CLASSES : ORANGE_FILL_CLASSES;
  const isGreen = theme === "green";
  const usesCompactGreenBands = compact && isGreen;
  const compactLegendBands = isGreen
    ? COMPACT_GREEN_BANDS
    : LEGEND_LABELS.map((label, index) => ({
        label,
        color: ORANGE_LEGEND_COLORS[index],
      }));
  const activeId = active?.id ?? null;

  useEffect(() => {
    if (!compact || activeId === null) return;

    let animationFrame = 0;

    const updateConnector = () => {
      const container = interactionLayerRef.current;
      const card = detailCardRef.current;
      const provincePath = provincePathRefs.current.get(activeId);
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
    if (interactionLayerRef.current) resizeObserver.observe(interactionLayerRef.current);
    if (detailCardRef.current) resizeObserver.observe(detailCardRef.current);
    window.addEventListener("resize", scheduleUpdate);

    return () => {
      cancelAnimationFrame(animationFrame);
      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleUpdate);
    };
  }, [activeId, compact, viewBox.height, viewBox.width, viewBox.x, viewBox.y]);

  function zoom(factor: number) {
    setViewBox((current) => {
      const nextWidth = Math.max(220, Math.min(WIDTH, current.width * factor));
      const nextHeight = (nextWidth / WIDTH) * HEIGHT;

      return {
        x: Math.max(
          0,
          Math.min(WIDTH - nextWidth, current.x + (current.width - nextWidth) / 2)
        ),
        y: Math.max(
          0,
          Math.min(HEIGHT - nextHeight, current.y + (current.height - nextHeight) / 2)
        ),
        width: nextWidth,
        height: nextHeight,
      };
    });
  }

  if (loading) {
    return <RiceLoadingState label="กำลังเตรียมแผนที่ประเทศไทย…" />;
  }

  if (error) {
    return (
      <RiceErrorState
        message={error}
        onRetry={() => setReloadKey((current) => current + 1)}
      />
    );
  }

  return (
    <div>
      <div
        ref={interactionLayerRef}
        className={
          compact
            ? "relative"
            : "grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]"
        }
      >
        <div
          className={`relative overflow-hidden rounded-lg ${
            isGreen
              ? "bg-white"
              : compact
                ? "bg-white"
                : "border border-orange-950/10 bg-white dark:border-orange-950/20 dark:bg-white"
          }`}
        >
          <svg
            role="img"
            aria-label={`แผนที่ประเทศไทยแสดง${frequencyLabel} ${scopeLabel}`}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
            className="aspect-[4/3] w-full select-none"
            onDoubleClick={() => zoom(0.78)}
          >
            <title>{`แผนที่${frequencyLabel}รายจังหวัด`}</title>
            <desc>{`จังหวัดที่มีข้อมูลใช้เฉดสี${
              isGreen ? "เขียว" : "ส้ม"
            }ตาม${frequencyLabel} จังหวัดที่ไม่มีข้อมูลใช้สีเทา`}</desc>
            {pathFeatures.map(({ feature, path }) => {
              const province = feature.properties.provinceTh;
              const value = unavailableNote ? 0 : values.get(province) ?? 0;
              const band = frequencyBand(
                value,
                maximum,
                usesCompactGreenBands ? 3 : 4
              );
              const isHovered = hovered?.id === feature.id;
              const isSelected = selectedProvince === province;
              const isDimmed = Boolean(selectedProvince && !isSelected && !isHovered);

              return (
                <path
                  key={feature.id}
                  ref={(node) => {
                    if (node) provincePathRefs.current.set(feature.id, node);
                    else provincePathRefs.current.delete(feature.id);
                  }}
                  d={path}
                  style={
                    usesCompactGreenBands
                      ? { fill: COMPACT_GREEN_BANDS[band].color }
                      : undefined
                  }
                  fillRule="evenodd"
                  stroke={isHovered || isSelected ? "#b57a05" : "#17211b"}
                  vectorEffect="non-scaling-stroke"
                  tabIndex={0}
                  aria-label={
                    unavailableNote
                      ? `${province}: ไม่มีข้อมูลตามตัวกรองนี้`
                      : missingMeansNoData && !values.has(province)
                        ? `${province}: ไม่มีข้อมูล`
                      : `${province}: ${frequencyLabel} ${value.toLocaleString("th-TH")} ${valueUnit}`
                  }
                  onMouseEnter={() => setHovered(feature)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(feature)}
                  onBlur={() => setHovered(null)}
                  onClick={() => onSelectProvince(isSelected ? null : province)}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onSelectProvince(isSelected ? null : province);
                  }}
                  className={`cursor-pointer transition-[opacity,filter,stroke,stroke-width] duration-300 focus:outline-none ${usesCompactGreenBands ? "" : fillClasses[band]} ${
                    isHovered || isSelected
                      ? "stroke-[3.5] drop-shadow-[0_0_7px_rgba(181,122,5,0.58)]"
                      : "stroke-[0.8]"
                  } ${isDimmed ? "opacity-35" : "opacity-100"}`}
                />
              );
            })}
          </svg>

          <div className="absolute left-2 top-2 z-10 flex flex-col gap-2 sm:left-3 sm:top-3">
            <MapButton theme={theme} label="ขยายแผนที่" onClick={() => zoom(0.78)}>
              <Plus aria-hidden="true" className="h-4 w-4" />
            </MapButton>
            <MapButton theme={theme} label="ย่อแผนที่" onClick={() => zoom(1.28)}>
              <Minus aria-hidden="true" className="h-4 w-4" />
            </MapButton>
            <MapButton
              theme={theme}
              label="รีเซ็ตแผนที่"
              onClick={() => setViewBox({ x: 0, y: 0, width: WIDTH, height: HEIGHT })}
            >
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
            </MapButton>
          </div>

          {compact ? (
            <div
              aria-label="คำอธิบายระดับความถี่"
              className={`absolute bottom-3 left-3 z-10 w-36 gap-2 rounded-xl border p-3 backdrop-blur ${
                isGreen
                  ? "border-[#40916C]/15 bg-[#fffdf5]/95 shadow-[0_12px_30px_rgba(39,77,53,0.22)]"
                  : "border-orange-700/10 bg-white/95 shadow-[0_12px_30px_rgba(124,45,18,0.18)]"
              } ${
                active ? "hidden sm:grid" : "grid"
              }`}
            >
              {legendTitle ? (
                <p className={`truncate border-b pb-2 text-xs font-bold ${isGreen ? "border-[#90A955]/25 text-[#315d42]" : "border-orange-700/15 text-orange-950"}`}>
                  {legendTitle}
                </p>
              ) : null}
              {[...compactLegendBands].reverse().map((entry) => (
                <span
                  key={entry.label}
                    className={`flex items-center gap-2.5 text-[10px] font-semibold ${isGreen ? "text-[#315d42]" : "text-orange-950/75"}`}
                >
                  <span
                    aria-hidden="true"
                    style={{ backgroundColor: entry.color }}
                    className={`h-5 w-5 shrink-0 border shadow-[0_2px_5px_rgba(36,73,54,0.2),inset_0_0_0_1px_rgba(255,255,255,0.75)] ${isGreen ? "border-[#315d42]/45" : "border-orange-950/35"}`}
                  />
                  {entry.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {compact && activeId !== null && connector ? (
          <svg
            key={activeId}
            aria-hidden="true"
            viewBox={`0 0 ${connector.width} ${connector.height}`}
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible"
          >
            <path
              d={connector.path}
              pathLength="1"
              className="dashboard-map-connector-halo fill-none stroke-[#d6a72b]/25 stroke-[10] [stroke-linecap:round]"
            />
            <path
              d={connector.path}
              pathLength="1"
              className="dashboard-map-connector-line fill-none stroke-[#b57a05] stroke-[3] [stroke-linecap:round]"
            />
            <circle
              cx={connector.startX}
              cy={connector.startY}
              r="12"
              className="dashboard-map-connector-dot fill-[#e4b83f]/30"
            />
            <circle
              cx={connector.startX}
              cy={connector.startY}
              r="5"
              className="fill-[#b57a05] stroke-[#fff8d8] stroke-[3]"
            />
            <circle
              cx={connector.endX}
              cy={connector.endY}
              r="5"
              className="fill-[#fff8d8] stroke-[#b57a05] stroke-[3]"
            />
          </svg>
        ) : null}

        <aside
          ref={detailCardRef}
          aria-live="polite"
          className={`rounded-lg p-4 ${
            compact
              ? active
                ? "dashboard-map-detail-card absolute bottom-3 right-3 z-30 w-[min(240px,calc(100%-1.5rem))] bg-white/95 shadow-[0_20px_48px_rgba(17,53,35,0.26)] backdrop-blur"
                : "hidden"
              : ""
          } ${
            isGreen
              ? compact
                ? ""
                : "bg-[#f2f7e9]"
              : compact
                ? ""
                : "border border-orange-950/10 bg-orange-50/60 dark:border-orange-200/15 dark:bg-orange-300/[0.06]"
          }`}
        >
          {active ? (
            <>
              {compact ? (
                <span
                  aria-hidden="true"
                  className="absolute -left-1 top-7 h-9 w-2 rounded-full bg-[#b57a05] shadow-[0_0_18px_rgba(181,122,5,0.62)]"
                />
              ) : null}
              <div className={`flex items-center gap-2 text-xs font-semibold ${isGreen ? "text-emerald-700" : "text-orange-700 dark:text-orange-300"}`}>
                <MapPin aria-hidden="true" className="h-4 w-4" /> จังหวัด
              </div>
              <h3 className={isGreen ? "mt-2 text-xl font-bold text-[#173523]" : "mt-2 text-xl font-bold"}>{active.properties.provinceTh}</h3>
              <p className={`mt-0.5 text-xs font-medium ${isGreen ? "text-emerald-950/65" : "text-emerald-950/50 dark:text-white/50"}`}>
                {active.properties.provinceEn} · {active.properties.region}
              </p>
              <p className={`mt-6 text-xs font-medium ${isGreen ? "text-emerald-950/70" : "text-emerald-950/55 dark:text-white/55"}`}>
                {frequencyLabel}
              </p>
              <p className={`mt-1 text-3xl font-bold tabular-nums ${isGreen ? "text-emerald-700" : "text-orange-700 dark:text-orange-300"}`}>
                {activeHasNoData
                  ? "—"
                  : (activeValue ?? 0).toLocaleString("th-TH")}
                {activeHasNoData ? null : (
                  <span className="ml-1.5 text-sm font-semibold">{valueUnit}</span>
                )}
              </p>
              <p className={`mt-2 text-xs font-medium leading-5 ${isGreen ? "text-emerald-950/70" : "text-emerald-950/55 dark:text-white/55"}`}>
                {unavailableNote
                  ? unavailableNote
                  : missingMeansNoData && activeValue === undefined
                    ? `ไม่มีข้อมูลในมุมมอง ${scopeLabel}`
                    : (activeValue ?? 0) > 0
                    ? `พบ${recordNoun}ในมุมมอง ${scopeLabel}`
                    : `ไม่พบ${recordNoun}ในมุมมอง ${scopeLabel}`}
              </p>
              <button
                type="button"
                aria-haspopup={onOpenProvinceDetails ? "dialog" : undefined}
                aria-label={
                  onOpenProvinceDetails
                    ? `ดูรายละเอียดจังหวัด${active.properties.provinceTh}`
                    : undefined
                }
                onClick={() => {
                  const province = active.properties.provinceTh;
                  if (onOpenProvinceDetails) {
                    onOpenProvinceDetails(province);
                  } else {
                    onSelectProvince(selectedProvince === province ? null : province);
                  }
                }}
                className={`mt-5 min-h-10 w-full rounded-md px-3 text-xs font-semibold text-white transition ${
                  isGreen
                    ? "bg-emerald-700 hover:bg-emerald-800"
                    : "bg-orange-700 hover:bg-orange-800 dark:bg-orange-300 dark:text-orange-950 dark:hover:bg-orange-200"
                }`}
              >
                {onOpenProvinceDetails
                  ? "ดูรายละเอียดจังหวัดนี้"
                  : selectedProvince === active.properties.provinceTh
                    ? "แสดงทุกจังหวัด"
                    : "กรองจังหวัดนี้"}
              </button>
            </>
          ) : (
            <div className={`grid min-h-36 place-items-center text-center text-sm font-medium leading-6 xl:min-h-full ${isGreen ? "text-emerald-950/70" : "text-emerald-950/50 dark:text-white/50"}`}>
              วางเมาส์ แตะ หรือกด Enter ที่จังหวัดเพื่อดูชื่อจังหวัดและ{frequencyLabel}
            </div>
          )}
        </aside>
      </div>

      {unavailableNote ? (
        <div className={`mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900 ${isGreen ? "shadow-sm" : "border border-amber-300/60 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"}`}>
          {unavailableNote}
        </div>
      ) : null}

      {!compact ? (
        <div className="mt-5" aria-label={`คำอธิบายระดับ${frequencyLabel}`}>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <p className={`font-semibold ${isGreen ? "text-emerald-950/80" : "text-emerald-950/65 dark:text-white/65"}`}>
              ระดับ{frequencyLabel}
            </p>
            <p className={isGreen ? "font-medium text-emerald-950/65" : "text-emerald-950/45 dark:text-white/45"}>
              ขอบเขต {features.length.toLocaleString("th-TH")} จังหวัด
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {LEGEND_LABELS.map((label, index) => (
              <span key={label} className={`inline-flex items-center gap-2 text-xs ${isGreen ? "font-medium text-emerald-950/75" : "text-emerald-950/60 dark:text-white/60"}`}>
                <span
                  aria-hidden="true"
                  className={`h-3.5 w-6 rounded ${fillClasses[index]}`}
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
  theme = "orange",
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  theme?: "orange" | "green";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-10 w-10 place-items-center rounded-md bg-white/95 shadow-md backdrop-blur transition active:scale-95 ${
        theme === "green"
          ? "text-emerald-900 hover:bg-emerald-50"
          : "text-orange-900 hover:bg-orange-50 dark:bg-[#24170f]/95 dark:text-orange-200 dark:hover:bg-[#302015]"
      }`}
    >
      {children}
    </button>
  );
}
