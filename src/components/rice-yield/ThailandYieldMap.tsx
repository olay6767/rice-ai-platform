"use client";

import { Expand, Minus, Plus, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type {
  RiceGeometry,
  RiceMapFeature,
  RiceMapMetric,
  RicePosition,
  RiceRegion,
} from "@/lib/rice-yield/types";
import { RiceErrorState, RiceLoadingState } from "./RiceAnalyticsShell";

const WIDTH = 820;
const HEIGHT = 620;

const METRICS: Array<{ value: RiceMapMetric; label: string; unit: string; yearly: boolean }> = [
  { value: "actual_yield", label: "ผลผลิตจริง", unit: "กก./ไร่", yearly: true },
  { value: "predicted_yield", label: "ผลผลิตพยากรณ์", unit: "กก./ไร่", yearly: true },
  { value: "absolute_error", label: "ค่าคลาดเคลื่อนสัมบูรณ์", unit: "กก./ไร่", yearly: true },
  { value: "residual", label: "Residual (จริง − พยากรณ์)", unit: "กก./ไร่", yearly: true },
  { value: "rainfall", label: "ปริมาณฝน", unit: "มม.", yearly: false },
  { value: "temperature", label: "อุณหภูมิเฉลี่ย", unit: "°C", yearly: false },
  { value: "ndvi", label: "NDVI เฉลี่ย", unit: "", yearly: false },
  { value: "soil_moisture", label: "ความชื้นในดิน", unit: "", yearly: false },
];

interface MapResponse {
  data?: { type: "FeatureCollection"; features: RiceMapFeature[] };
  error?: { message?: string };
}

function collectPositions(geometry: RiceGeometry): RicePosition[] {
  return geometry.type === "Polygon"
    ? geometry.coordinates.flat()
    : geometry.coordinates.flat(2);
}

function createProjector(features: RiceMapFeature[]) {
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

function ringPath(ring: RicePosition[], project: (position: RicePosition) => RicePosition): string {
  return ring
    .map((position, index) => {
      const [x, y] = project(position);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ") + " Z";
}

function geometryPath(
  geometry: RiceGeometry,
  project: (position: RicePosition) => RicePosition
): string {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons
    .flatMap((polygon) => polygon.map((ring) => ringPath(ring, project)))
    .join(" ");
}

function ringArea(ring: RicePosition[]): number {
  return ring.reduce((area, point, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + point[0] * next[1] - next[0] * point[1];
  }, 0) / 2;
}

function ringCentroid(ring: RicePosition[]): RicePosition {
  let areaTwice = 0;
  let centerX = 0;
  let centerY = 0;

  ring.forEach((point, index) => {
    const next = ring[(index + 1) % ring.length];
    const cross = point[0] * next[1] - next[0] * point[1];
    areaTwice += cross;
    centerX += (point[0] + next[0]) * cross;
    centerY += (point[1] + next[1]) * cross;
  });

  if (Math.abs(areaTwice) < 0.001) {
    const total = Math.max(1, ring.length);
    return [
      ring.reduce((sum, point) => sum + point[0], 0) / total,
      ring.reduce((sum, point) => sum + point[1], 0) / total,
    ];
  }

  return [centerX / (3 * areaTwice), centerY / (3 * areaTwice)];
}

function geometryLabelPosition(
  geometry: RiceGeometry,
  project: (position: RicePosition) => RicePosition
): RicePosition {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const outerRings = polygons
    .map((polygon) => polygon[0]?.map(project) ?? [])
    .filter((ring) => ring.length >= 3);
  const largestRing = outerRings.sort(
    (first, second) => Math.abs(ringArea(second)) - Math.abs(ringArea(first))
  )[0];

  return largestRing ? ringCentroid(largestRing) : [WIDTH / 2, HEIGHT / 2];
}

function mixColor(start: [number, number, number], end: [number, number, number], ratio: number) {
  const value = Math.max(0, Math.min(1, ratio));
  const channels = start.map((channel, index) =>
    Math.round(channel + (end[index] - channel) * value)
  );
  return `rgb(${channels.join(",")})`;
}

function colorFor(metric: RiceMapMetric, value: number | null, minimum: number, maximum: number) {
  if (value === null) return "#cbd1c9";
  if (metric === "residual") {
    const magnitude = Math.max(Math.abs(minimum), Math.abs(maximum), 1);
    if (value < 0) return mixColor([246, 242, 220], [43, 104, 155], Math.abs(value) / magnitude);
    return mixColor([246, 242, 220], [191, 63, 63], value / magnitude);
  }
  const ratio = (value - minimum) / Math.max(1e-9, maximum - minimum);
  if (metric === "actual_yield" || metric === "predicted_yield" || metric === "ndvi") {
    return mixColor([231, 246, 226], [11, 102, 59], ratio);
  }
  if (metric === "rainfall") return mixColor([232, 246, 252], [27, 103, 166], ratio);
  if (metric === "temperature") return mixColor([255, 244, 203], [197, 72, 40], ratio);
  if (metric === "soil_moisture") return mixColor([227, 245, 237], [15, 118, 110], ratio);
  return mixColor([255, 247, 194], [204, 65, 43], ratio);
}

function metricDomain(metric: RiceMapMetric, features: RiceMapFeature[]): [number, number] {
  if (metric === "actual_yield" || metric === "predicted_yield") return [150, 850];
  if (metric === "absolute_error") return [0, 250];
  if (metric === "residual") return [-250, 250];
  const values = features.flatMap((feature) =>
    typeof feature.properties.value === "number" ? [feature.properties.value] : []
  );
  if (values.length === 0) return [0, 1];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  return minimum === maximum ? [minimum - 1, maximum + 1] : [minimum, maximum];
}

function formatValue(value: number | null, metric: RiceMapMetric): string {
  if (value === null) return "ไม่มีข้อมูล";
  return value.toLocaleString("th-TH", {
    maximumFractionDigits: ["ndvi", "soil_moisture"].includes(metric) ? 3 : 1,
  });
}

export default function ThailandYieldMap({
  cropYear,
  environmentYear,
  month,
  region,
  versionKey,
}: {
  cropYear: number;
  environmentYear: number;
  month: number;
  region: RiceRegion | null;
  versionKey: string;
}) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    startX: number;
    startY: number;
    moved: boolean;
    featureId: number | null;
  } | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const pinchRef = useRef<{
    distance: number;
    viewBox: { x: number; y: number; width: number; height: number };
  } | null>(null);
  const [metric, setMetric] = useState<RiceMapMetric>("actual_yield");
  const [features, setFeatures] = useState<RiceMapFeature[]>([]);
  const [selected, setSelected] = useState<RiceMapFeature | null>(null);
  const [hovered, setHovered] = useState<RiceMapFeature | null>(null);
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const metricDefinition = METRICS.find((item) => item.value === metric) ?? METRICS[0];

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      const mapYear = metricDefinition.yearly ? cropYear : environmentYear;
      const query = new URLSearchParams({ metric, year: String(mapYear), month: String(month) });
      if (region) query.set("region", region);
      query.set("version", versionKey);
      try {
        const response = await fetch(`/api/v1/map?${query}`, {
          signal: controller.signal,
          cache: "no-store",
          headers: { Accept: "application/json" },
        });
        const payload = (await response.json()) as MapResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "ไม่สามารถโหลดแผนที่ได้");
        }
        setFeatures(payload.data.features);
        setSelected(null);
        setViewBox({ x: 0, y: 0, width: WIDTH, height: HEIGHT });
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดแผนที่ได้");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [cropYear, environmentYear, metric, metricDefinition.yearly, month, region, versionKey]);

  const pathFeatures = useMemo(() => {
    if (features.length === 0) return [];
    const project = createProjector(features);
    return features.map((feature) => ({
      feature,
      path: geometryPath(feature.geometry, project),
      labelPosition: geometryLabelPosition(feature.geometry, project),
    }));
  }, [features]);
  const [minimum, maximum] = useMemo(() => metricDomain(metric, features), [features, metric]);
  const legendValues = Array.from({ length: 5 }, (_, index) => minimum + ((maximum - minimum) * index) / 4);
  const active = hovered ?? selected;
  const zoomLevel = WIDTH / viewBox.width;
  const provinceLabelSize = Math.max(3, 7.5 / Math.sqrt(zoomLevel));
  const provinceLabelStroke = Math.max(0.65, 1.8 / Math.sqrt(zoomLevel));

  const zoom = useCallback((factor: number) => {
    setViewBox((current) => {
      const nextWidth = Math.max(160, Math.min(WIDTH, current.width * factor));
      const nextHeight = (nextWidth / WIDTH) * HEIGHT;
      return {
        x: Math.max(0, Math.min(WIDTH - nextWidth, current.x + (current.width - nextWidth) / 2)),
        y: Math.max(0, Math.min(HEIGHT - nextHeight, current.y + (current.height - nextHeight) / 2)),
        width: nextWidth,
        height: nextHeight,
      };
    });
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom(event.deltaY > 0 ? 1.18 : 0.84);
    };

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [error, loading, zoom]);

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size === 1) {
      const target = event.target as SVGElement;
      const rawFeatureId = target.dataset.featureId;
      const featureId = rawFeatureId ? Number(rawFeatureId) : null;

      dragRef.current = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startX: event.clientX,
        startY: event.clientY,
        moved: false,
        featureId: Number.isFinite(featureId) ? featureId : null,
      };
      pinchRef.current = null;
      return;
    }

    if (pointersRef.current.size === 2) {
      const [first, second] = [...pointersRef.current.values()];
      pinchRef.current = {
        distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
        viewBox,
      };
      dragRef.current = null;
    }
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    if (!pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = [...pointersRef.current.values()];
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y));
      const start = pinchRef.current.viewBox;
      const nextWidth = Math.max(
        160,
        Math.min(WIDTH, start.width * (pinchRef.current.distance / distance))
      );
      const nextHeight = (nextWidth / WIDTH) * HEIGHT;
      const centerX = start.x + start.width / 2;
      const centerY = start.y + start.height / 2;
      setViewBox({
        x: Math.max(0, Math.min(WIDTH - nextWidth, centerX - nextWidth / 2)),
        y: Math.max(0, Math.min(HEIGHT - nextHeight, centerY - nextHeight / 2)),
        width: nextWidth,
        height: nextHeight,
      });
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !svgRef.current) return;
    const moved =
      drag.moved ||
      Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5;

    if (!moved) return;

    const bounds = svgRef.current.getBoundingClientRect();
    const dx = ((event.clientX - drag.x) / Math.max(1, bounds.width)) * viewBox.width;
    const dy = ((event.clientY - drag.y) / Math.max(1, bounds.height)) * viewBox.height;
    setViewBox((current) => ({
      ...current,
      x: Math.max(0, Math.min(WIDTH - current.width, current.x - dx)),
      y: Math.max(0, Math.min(HEIGHT - current.height, current.y - dy)),
    }));
    dragRef.current = {
      ...drag,
      x: event.clientX,
      y: event.clientY,
      moved: true,
    };
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    const completedDrag = dragRef.current;
    const wasSinglePointer = pointersRef.current.size === 1;

    if (
      wasSinglePointer &&
      completedDrag?.pointerId === event.pointerId &&
      !completedDrag.moved &&
      completedDrag.featureId !== null
    ) {
      const selectedFeature = features.find(
        (feature) => feature.id === completedDrag.featureId
      );

      if (selectedFeature) setSelected(selectedFeature);
    }

    pointersRef.current.delete(event.pointerId);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pinchRef.current = null;

    const remaining = [...pointersRef.current.entries()][0];
    dragRef.current = remaining
      ? {
          pointerId: remaining[0],
          x: remaining[1].x,
          y: remaining[1].y,
          startX: remaining[1].x,
          startY: remaining[1].y,
          moved: true,
          featureId: null,
        }
      : null;
  }

  async function enterFullscreen() {
    if (wrapperRef.current?.requestFullscreen) await wrapperRef.current.requestFullscreen();
  }

  return (
    <div ref={wrapperRef} className="min-w-0 rounded-2xl bg-[#edf3e9] p-2.5 dark:bg-[#071a0f] sm:p-4">
      <div className="mb-3">
        <label className="grid w-full gap-1 text-xs font-semibold sm:w-auto sm:text-sm">
          ชั้นข้อมูลบนแผนที่
          <select
            value={metric}
            onChange={(event) => setMetric(event.target.value as RiceMapMetric)}
            className="min-h-11 w-full min-w-0 rounded-xl border border-emerald-950/15 bg-white px-3 text-sm sm:min-w-64 dark:border-white/15 dark:bg-[#0d2014]"
          >
            {METRICS.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
      </div>

      {loading ? <RiceLoadingState label="กำลังวาดแผนที่ 77 จังหวัด…" /> : null}
      {error ? <RiceErrorState message={error} /> : null}
      {!loading && !error ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="relative overflow-hidden rounded-2xl border border-emerald-950/10 bg-[#f8faf5] dark:border-white/10 dark:bg-[#0b2013]">
            <svg
              ref={svgRef}
              role="img"
              aria-label={`แผนที่ประเทศไทยแสดง${metricDefinition.label}`}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={() => zoom(0.78)}
              className="h-[300px] w-full touch-none select-none cursor-grab active:cursor-grabbing sm:h-auto sm:aspect-[4/3]"
            >
              <title>แผนที่ประเทศไทย 77 จังหวัด</title>
              {pathFeatures.map(({ feature, path }) => {
                const isActive = active?.id === feature.id;
                return (
                  <path
                    key={feature.id}
                    data-feature-id={feature.id}
                    d={path}
                    fill={colorFor(metric, feature.properties.value, minimum, maximum)}
                    stroke={isActive ? "#f2b536" : "#ffffff"}
                    strokeWidth={isActive ? 2.4 : 0.8}
                    vectorEffect="non-scaling-stroke"
                    fillRule="evenodd"
                    tabIndex={0}
                    aria-label={`${feature.properties.provinceTh}: ${formatValue(feature.properties.value, metric)} ${metricDefinition.unit}`}
                    onMouseEnter={() => setHovered(feature)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(feature)}
                    onBlur={() => setHovered(null)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelected(feature);
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== "Enter" && event.key !== " ") return;
                      event.preventDefault();
                      setSelected(feature);
                    }}
                    className="cursor-pointer"
                  />
                );
              })}
              {pathFeatures.map(({ feature, labelPosition }) => {
                const isActive = active?.id === feature.id;
                return (
                  <text
                    key={`label-${feature.id}`}
                    x={labelPosition[0]}
                    y={labelPosition[1]}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={isActive ? "#8a4d00" : "#073b2a"}
                    stroke={isActive ? "#fff4cb" : "rgba(255,255,255,0.96)"}
                    strokeWidth={isActive ? provinceLabelStroke * 1.3 : provinceLabelStroke}
                    paintOrder="stroke fill"
                    fontSize={isActive ? provinceLabelSize * 1.25 : provinceLabelSize}
                    fontWeight={isActive ? 800 : 700}
                    className="pointer-events-none select-none"
                    aria-hidden="true"
                  >
                    {feature.properties.provinceTh}
                  </text>
                );
              })}
            </svg>
            <div aria-label="เครื่องมือควบคุมแผนที่" className="absolute left-2 top-2 z-10 flex flex-col gap-2 sm:left-3 sm:top-3">
              <button type="button" onClick={() => zoom(0.78)} aria-label="ขยายแผนที่" className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-950/15 bg-white/95 shadow-sm backdrop-blur transition active:scale-95 sm:h-11 sm:w-11 dark:border-white/15 dark:bg-[#0d2014]/95"><Plus aria-hidden="true" className="h-4 w-4" /></button>
              <button type="button" onClick={() => zoom(1.28)} aria-label="ย่อแผนที่" className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-950/15 bg-white/95 shadow-sm backdrop-blur transition active:scale-95 sm:h-11 sm:w-11 dark:border-white/15 dark:bg-[#0d2014]/95"><Minus aria-hidden="true" className="h-4 w-4" /></button>
              <button type="button" onClick={() => setViewBox({ x: 0, y: 0, width: WIDTH, height: HEIGHT })} aria-label="รีเซ็ตแผนที่" className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-950/15 bg-white/95 shadow-sm backdrop-blur transition active:scale-95 sm:h-11 sm:w-11 dark:border-white/15 dark:bg-[#0d2014]/95"><RotateCcw aria-hidden="true" className="h-4 w-4" /></button>
              <button type="button" onClick={() => void enterFullscreen()} aria-label="เปิดแผนที่เต็มจอ" className="grid h-10 w-10 place-items-center rounded-xl border border-emerald-950/15 bg-white/95 shadow-sm backdrop-blur transition active:scale-95 sm:h-11 sm:w-11 dark:border-white/15 dark:bg-[#0d2014]/95"><Expand aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <p className="pointer-events-none absolute bottom-2 left-2 right-2 rounded-lg bg-white/85 px-2 py-1 text-center text-[10px] text-emerald-950/60 backdrop-blur sm:left-3 sm:right-auto sm:text-left sm:text-[11px] dark:bg-black/50 dark:text-white/60">
              <span className="sm:hidden">แตะจังหวัดเพื่อดูข้อมูล · บีบสองนิ้วหรือใช้ปุ่มด้านข้างเพื่อซูม</span>
              <span className="hidden sm:inline">ลากเพื่อเลื่อน · เลื่อนเมาส์เพื่อซูม · แตะจังหวัดเพื่อดูข้อมูล</span>
            </p>
          </div>

          <aside aria-live="polite" className="rounded-2xl border border-emerald-950/10 bg-white p-4 dark:border-white/10 dark:bg-white/5">
            {active ? (
              <>
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">จังหวัดที่เลือก</p>
                <h3 className="mt-1 text-xl font-bold">{active.properties.provinceTh}</h3>
                <p className="text-xs text-emerald-950/50 dark:text-white/50">{active.properties.provinceEn} · {active.properties.region}</p>
                <dl className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between gap-3"><dt>{metricDefinition.label}</dt><dd className="font-bold tabular-nums">{formatValue(active.properties.value, metric)} {metricDefinition.unit}</dd></div>
                  {metricDefinition.yearly ? (
                    <>
                      <div className="flex justify-between gap-3"><dt>ผลผลิตจริง</dt><dd>{formatValue(active.properties.actualYield, metric)} กก./ไร่</dd></div>
                      <div className="flex justify-between gap-3"><dt>ผลผลิตพยากรณ์</dt><dd>{formatValue(active.properties.predictedYield, metric)} กก./ไร่</dd></div>
                      <div className="flex justify-between gap-3"><dt>ค่าคลาดเคลื่อน</dt><dd>{formatValue(active.properties.absoluteError, metric)} กก./ไร่</dd></div>
                    </>
                  ) : null}
                </dl>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      `/analytics/yield/province/${active.properties.provinceId}?version=${encodeURIComponent(versionKey)}`
                    )
                  }
                  className="mt-6 min-h-11 w-full rounded-xl bg-[#0b2e1c] px-4 text-sm font-semibold text-white hover:bg-[#164d32] dark:bg-emerald-200 dark:text-emerald-950"
                >
                  ดูข้อมูลจังหวัด
                </button>
              </>
            ) : (
              <div className="grid min-h-28 place-items-center text-center text-sm text-emerald-950/50 sm:min-h-52 dark:text-white/50">
                เลือกจังหวัดบนแผนที่เพื่อดูรายละเอียด
              </div>
            )}
          </aside>
        </div>
      ) : null}

      {!loading && !error ? (
        <div className="mt-4">
          <div className="h-3 overflow-hidden rounded-full" style={{ background: `linear-gradient(90deg, ${legendValues.map((value) => colorFor(metric, value, minimum, maximum)).join(",")})` }} />
          <div className="mt-1 flex justify-between text-[11px] text-emerald-950/55 dark:text-white/55">
            {legendValues.map((value) => <span key={value}>{formatValue(value, metric)}</span>)}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-950/55 dark:text-white/55">
            <span>{metricDefinition.unit ? `หน่วย: ${metricDefinition.unit}` : "ดัชนีจากชุดข้อมูล"}</span>
            <span>{metricDefinition.yearly ? `ปีเพาะปลูกเริ่ม ${cropYear}` : `เดือน ${month}/${environmentYear}`}</span>
            <span className="inline-flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-[#cbd1c9]" /> ไม่มีข้อมูล</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
