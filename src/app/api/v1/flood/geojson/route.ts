import { readFile } from "node:fs/promises";
import { join } from "node:path";

import type { RiceGeometry, RicePosition } from "@/lib/rice-yield/types";

export const runtime = "nodejs";
export const dynamic = "force-static";

interface SourceFeature {
  type: "Feature";
  properties: {
    province_id: number;
    province_th: string;
    province_en: string;
    region: string;
  };
  geometry: RiceGeometry;
}

interface SourceGeoJson {
  type: "FeatureCollection";
  features: SourceFeature[];
}

function squaredDistance(first: RicePosition, second: RicePosition): number {
  const x = first[0] - second[0];
  const y = first[1] - second[1];
  return x * x + y * y;
}

function squaredSegmentDistance(
  point: RicePosition,
  start: RicePosition,
  end: RicePosition
): number {
  let x = start[0];
  let y = start[1];
  let dx = end[0] - x;
  let dy = end[1] - y;

  if (dx !== 0 || dy !== 0) {
    const position = ((point[0] - x) * dx + (point[1] - y) * dy) / (dx * dx + dy * dy);
    if (position > 1) {
      x = end[0];
      y = end[1];
    } else if (position > 0) {
      x += dx * position;
      y += dy * position;
    }
  }

  dx = point[0] - x;
  dy = point[1] - y;
  return dx * dx + dy * dy;
}

function simplifyRadial(points: RicePosition[], toleranceSquared: number): RicePosition[] {
  let previous = points[0];
  const simplified = [previous];
  for (let index = 1; index < points.length; index += 1) {
    const point = points[index];
    if (squaredDistance(point, previous) > toleranceSquared) {
      simplified.push(point);
      previous = point;
    }
  }
  const last = points.at(-1);
  if (last && previous !== last) simplified.push(last);
  return simplified;
}

function simplifyDouglasPeuckerStep(
  points: RicePosition[],
  first: number,
  last: number,
  toleranceSquared: number,
  result: RicePosition[]
) {
  let maximumDistance = toleranceSquared;
  let selectedIndex = 0;
  for (let index = first + 1; index < last; index += 1) {
    const distance = squaredSegmentDistance(points[index], points[first], points[last]);
    if (distance > maximumDistance) {
      selectedIndex = index;
      maximumDistance = distance;
    }
  }
  if (maximumDistance <= toleranceSquared) return;
  if (selectedIndex - first > 1) {
    simplifyDouglasPeuckerStep(points, first, selectedIndex, toleranceSquared, result);
  }
  result.push(points[selectedIndex]);
  if (last - selectedIndex > 1) {
    simplifyDouglasPeuckerStep(points, selectedIndex, last, toleranceSquared, result);
  }
}

function simplifyDouglasPeucker(
  points: RicePosition[],
  toleranceSquared: number
): RicePosition[] {
  const last = points.length - 1;
  const result = [points[0]];
  simplifyDouglasPeuckerStep(points, 0, last, toleranceSquared, result);
  result.push(points[last]);
  return result;
}

function simplifyRing(ring: RicePosition[], tolerance = 0.0025): RicePosition[] {
  if (ring.length <= 6) return ring;
  const last = ring.at(-1);
  const closed = Boolean(last && squaredDistance(ring[0], last) < Number.EPSILON);
  const points = closed ? ring.slice(0, -1) : [...ring];
  const toleranceSquared = tolerance * tolerance;
  const radial = simplifyRadial(points, toleranceSquared);
  let simplified = simplifyDouglasPeucker(radial, toleranceSquared);
  if (simplified.length < 3) simplified = points.slice(0, 3);
  if (closed) simplified.push([...simplified[0]]);
  return simplified;
}

function simplifyGeometry(geometry: RiceGeometry): RiceGeometry {
  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: geometry.coordinates.map((ring) => simplifyRing(ring)),
    };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) =>
      polygon.map((ring) => simplifyRing(ring))
    ),
  };
}

let geometryPromise: Promise<{
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: number;
    properties: {
      provinceId: number;
      provinceTh: string;
      provinceEn: string;
      region: string;
    };
    geometry: RiceGeometry;
  }>;
}> | null = null;

function getGeometry() {
  if (!geometryPromise) {
    geometryPromise = (async () => {
      const filePath = join(
        process.cwd(),
        "datarice",
        "Rice_Yield_Thailand_Handoff_v1",
        "05_Map",
        "thailand_provinces.geojson"
      );
      const source = JSON.parse(await readFile(filePath, "utf8")) as SourceGeoJson;
      if (source.type !== "FeatureCollection" || source.features.length !== 77) {
        throw new Error("Thailand GeoJSON is invalid or incomplete");
      }
      return {
        type: "FeatureCollection" as const,
        features: source.features.map((feature) => ({
          type: "Feature" as const,
          id: Number(feature.properties.province_id),
          properties: {
            provinceId: Number(feature.properties.province_id),
            provinceTh: feature.properties.province_th,
            provinceEn: feature.properties.province_en,
            region: feature.properties.region,
          },
          geometry: simplifyGeometry(feature.geometry),
        })),
      };
    })();
  }
  return geometryPromise;
}

export async function GET(): Promise<Response> {
  try {
    const data = await getGeometry();
    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    geometryPromise = null;
    console.error("Unable to load Thailand flood geometry", error);
    return Response.json(
      { error: { message: "ไม่สามารถโหลดขอบเขตแผนที่ประเทศไทยได้" } },
      { status: 500 }
    );
  }
}
