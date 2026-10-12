"use client";

import { MapPin, Minus, Plus, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { readJsonResponse } from "@/lib/http/json";
import type { RiceGeometry, RicePosition } from "@/lib/rice-yield/types";
import { RiceErrorState, RiceLoadingState } from "@/components/rice-yield/RiceAnalyticsShell";

const WIDTH = 820;
const HEIGHT = 620;
const MOBILE_VIEW_BOX = { x: 200, y: 0, width: 420, height: HEIGHT };
const DESKTOP_VIEW_BOX = { x: 0, y: 0, width: WIDTH, height: HEIGHT };

interface FloodMapFeature {
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
    features: FloodMapFeature[];
  };
  error?: { message?: string };
}

function collectPositions(geometry: RiceGeometry): RicePosition[] {
  return geometry.type === "Polygon" ? geometry.coordinates.flat() : geometry.coordinates.flat(2);
}

function createProjector(features: FloodMapFeature[]) {
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
  return (
    ring
      .map((position, index) => {
        const [x, y] = project(position);
        return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ") + " Z"
  );
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
  return (
    ring.reduce((area, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return area + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2
  );
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

function geometryCenter(
  geometry: RiceGeometry,
  project: (position: RicePosition) => RicePosition
): RicePosition {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const outerRings = polygons.map((polygon) => polygon[0]).filter(Boolean);
  const largestRing = outerRings.reduce(
    (largest, ring) =>
      Math.abs(ringArea(ring)) > Math.abs(ringArea(largest)) ? ring : largest,
    outerRings[0]
  );
  return project(ringCentroid(largestRing));
}

function mapColor(value: number, maximum: number): string {
  if (value <= 0 || maximum <= 0) return "#d9e2de";
  const strength = Math.sqrt(value / maximum);
  const hue = 205 - strength * 13;
  const saturation = 70 + strength * 18;
  const lightness = 91 - strength * 55;
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}

export default function ThailandFloodMap({
  values,
  selectedProvince,
  onSelectProvince,
}: {
  values: Map<string, number>;
  selectedProvince: string | null;
  onSelectProvince: (province: string | null) => void;
}) {
  const [features, setFeatures] = useState<FloodMapFeature[]>([]);
  const [hovered, setHovered] = useState<FloodMapFeature | null>(null);
  const [viewBox, setViewBox] = useState(DESKTOP_VIEW_BOX);
  const [isMobileMap, setIsMobileMap] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const syncViewport = () => {
      setIsMobileMap(media.matches);
      setViewBox(media.matches ? MOBILE_VIEW_BOX : DESKTOP_VIEW_BOX);
    };

    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/v1/flood/geojson", {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        const payload = await readJsonResponse<GeometryResponse>(response);
        if (!response.ok || !payload.data) {
          throw new Error(payload.error?.message ?? "ไม่สามารถโหลดขอบเขตแผนที่ได้");
        }
        setFeatures(payload.data.features);
      } catch (loadError) {
        if (loadError instanceof DOMException && loadError.name === "AbortError") return;
        setError(
          loadError instanceof Error ? loadError.message : "ไม่สามารถโหลดขอบเขตแผนที่ได้"
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reloadKey]);

  const pathFeatures = useMemo(() => {
    if (!features.length) return [];
    const project = createProjector(features);
    return features.map((feature) => ({
      feature,
      path: geometryPath(feature.geometry, project),
      center: geometryCenter(feature.geometry, project),
    }));
  }, [features]);
  const selected = features.find(
    (feature) => feature.properties.provinceTh === selectedProvince
  );
  const active = hovered ?? selected ?? null;
  const activePathFeature = active
    ? pathFeatures.find(({ feature }) => feature.id === active.id)
    : null;
  const maximum = Math.max(0, ...values.values());
  const zoomLevel = WIDTH / viewBox.width;
  const connectorEnd: RicePosition = [
    viewBox.x + viewBox.width * 0.69,
    viewBox.y + viewBox.height * 0.73,
  ];

  function zoom(factor: number) {
    setViewBox((current) => {
      const nextWidth = Math.max(
        220,
        Math.min(isMobileMap ? MOBILE_VIEW_BOX.width : WIDTH, current.width * factor)
      );
      const nextHeight = (nextWidth / current.width) * current.height;
      return {
        x: Math.max(0, Math.min(WIDTH - nextWidth, current.x + (current.width - nextWidth) / 2)),
        y: Math.max(0, Math.min(HEIGHT - nextHeight, current.y + (current.height - nextHeight) / 2)),
        width: nextWidth,
        height: nextHeight,
      };
    });
  }

  if (loading) return <RiceLoadingState label="กำลังเตรียมแผนที่ 77 จังหวัด…" />;
  if (error) {
    return <RiceErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />;
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-white shadow-[inset_0_0_0_1px_rgba(11,46,28,0.08)] dark:bg-white dark:shadow-[inset_0_0_0_1px_rgba(11,46,28,0.16)]">
      <svg
        role="img"
        aria-label="แผนที่ประเทศไทยแสดงจำนวนเหตุการณ์น้ำท่วมรายจังหวัด"
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
        onDoubleClick={() => zoom(0.78)}
        className="aspect-[3/4] w-full select-none sm:aspect-[4/3]"
      >
        <title>แผนที่ความถี่เหตุการณ์น้ำท่วม 77 จังหวัด</title>
        {pathFeatures.map(({ feature, path }) => {
          const province = feature.properties.provinceTh;
          const value = values.get(province) ?? 0;
          const isActive = active?.id === feature.id;
          const isSelected = selectedProvince === province;
          return (
            <path
              key={feature.id}
              d={path}
              fill={mapColor(value, maximum)}
              stroke={isActive || isSelected ? "#f59e0b" : "#17211b"}
              strokeWidth={isActive || isSelected ? 2.3 : 0.8}
              vectorEffect="non-scaling-stroke"
              fillRule="evenodd"
              tabIndex={0}
              aria-label={`${province}: ${value.toLocaleString("th-TH")} ครั้ง`}
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
              className="cursor-pointer outline-none transition-opacity hover:opacity-85 focus:opacity-85"
            />
          );
        })}
        {activePathFeature ? (
          <g aria-hidden="true" pointerEvents="none" className="max-sm:hidden">
            <path
              d={`M ${activePathFeature.center[0]} ${activePathFeature.center[1]} C ${(activePathFeature.center[0] + connectorEnd[0]) / 2} ${activePathFeature.center[1]}, ${(activePathFeature.center[0] + connectorEnd[0]) / 2} ${connectorEnd[1]}, ${connectorEnd[0]} ${connectorEnd[1]}`}
              fill="none"
              stroke="#d8edf5"
              strokeWidth="7"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
              opacity="0.9"
            />
            <path
              d={`M ${activePathFeature.center[0]} ${activePathFeature.center[1]} C ${(activePathFeature.center[0] + connectorEnd[0]) / 2} ${activePathFeature.center[1]}, ${(activePathFeature.center[0] + connectorEnd[0]) / 2} ${connectorEnd[1]}, ${connectorEnd[0]} ${connectorEnd[1]}`}
              fill="none"
              stroke="#0b78b5"
              strokeWidth="2.5"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            <circle
              cx={activePathFeature.center[0]}
              cy={activePathFeature.center[1]}
              r={7 / zoomLevel}
              fill="white"
              stroke="#0b78b5"
              strokeWidth={3 / zoomLevel}
            />
          </g>
        ) : null}
      </svg>

      <div className="absolute left-3 top-3 z-10 flex flex-col gap-2">
        <MapButton label="ขยายแผนที่" onClick={() => zoom(0.78)}>
          <Plus aria-hidden="true" className="h-4 w-4" />
        </MapButton>
        <MapButton label="ย่อแผนที่" onClick={() => zoom(1.28)}>
          <Minus aria-hidden="true" className="h-4 w-4" />
        </MapButton>
        <MapButton
          label="รีเซ็ตแผนที่"
          onClick={() => setViewBox(isMobileMap ? MOBILE_VIEW_BOX : DESKTOP_VIEW_BOX)}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
        </MapButton>
      </div>

      <div className="relative z-10 mx-3 mb-3 rounded-xl bg-white/95 p-3 text-[10px] shadow-[0_10px_30px_rgba(11,46,28,0.14)] backdrop-blur sm:absolute sm:bottom-3 sm:left-3 sm:mx-0 sm:mb-0 dark:bg-[#0d2014]/95">
        <p className="mb-2 font-bold text-emerald-950/75 dark:text-white/75">ระดับเหตุการณ์</p>
        <MapLegendItem color={mapColor(maximum, maximum)} label="เหตุการณ์สูง" />
        <MapLegendItem color={mapColor(Math.max(1, maximum * 0.25), maximum)} label="เหตุการณ์ต่ำ" />
        <MapLegendItem color={mapColor(0, maximum)} label="ไม่มีเหตุการณ์" />
      </div>

      <aside
        aria-live="polite"
        className={`relative z-10 mx-3 mb-3 rounded-2xl bg-white/95 p-4 shadow-[0_16px_40px_rgba(11,46,28,0.18)] backdrop-blur sm:absolute sm:bottom-3 sm:right-3 sm:mx-0 sm:mb-0 sm:w-[min(15.5rem,calc(100%-1.5rem))] dark:bg-[#0d2014]/95 ${active ? "" : "hidden sm:block"}`}
      >
        {active ? (
          <>
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-700 dark:text-sky-300">
              <MapPin aria-hidden="true" className="h-4 w-4" />
              จังหวัด
            </div>
            <h3 className="mt-1 text-xl font-bold">{active.properties.provinceTh}</h3>
            <p className="text-xs text-emerald-950/50 dark:text-white/50">
              {active.properties.provinceEn} · {active.properties.region}
            </p>
            <p className="mt-4 text-xs text-emerald-950/50 dark:text-white/50">เหตุการณ์ตามตัวกรอง</p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums text-sky-700 dark:text-sky-300">
              {(values.get(active.properties.provinceTh) ?? 0).toLocaleString("th-TH")}
              <span className="ml-1 text-xs font-medium">ครั้ง</span>
            </p>
            <button
              type="button"
              onClick={() =>
                onSelectProvince(
                  selectedProvince === active.properties.provinceTh
                    ? null
                    : active.properties.provinceTh
                )
              }
              className="mt-4 min-h-10 w-full rounded-xl bg-[#0b2e1c] px-3 text-xs font-semibold text-white transition hover:bg-[#164d32] dark:bg-emerald-200 dark:text-emerald-950"
            >
              {selectedProvince === active.properties.provinceTh
                ? "แสดงทุกจังหวัด"
                : "กรองจังหวัดนี้"}
            </button>
          </>
        ) : (
          <p className="py-2 text-center text-xs leading-5 text-emerald-950/50 dark:text-white/50">
            วางเมาส์หรือแตะจังหวัดเพื่อดูรายละเอียด
          </p>
        )}
      </aside>
    </div>
  );
}

function MapLegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="h-4 w-4 rounded-[3px]" style={{ backgroundColor: color }} />
      <span className="text-emerald-950/65 dark:text-white/65">{label}</span>
    </div>
  );
}

function MapButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-xl bg-white/95 shadow-[0_7px_18px_rgba(11,46,28,0.16)] backdrop-blur transition hover:bg-emerald-50 active:scale-95 dark:bg-[#0d2014]/95 dark:hover:bg-[#173522]"
    >
      {children}
    </button>
  );
}
