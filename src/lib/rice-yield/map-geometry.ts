import type {
  RicePosition,
  RiceProvinceFeature,
  RiceProvinceGeometry,
} from "./static-dashboard-types";

type Projector = (position: RicePosition) => RicePosition;

function visitPositions(
  geometry: RiceProvinceGeometry,
  visit: (position: RicePosition) => void
) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  for (const polygon of polygons) {
    for (const ring of polygon) {
      for (const position of ring) visit(position);
    }
  }
}

export function createRiceYieldProjector(
  features: RiceProvinceFeature[],
  width: number,
  height: number,
  padding = 24
): Projector | null {
  let minLongitude = Infinity;
  let maxLongitude = -Infinity;
  let minLatitude = Infinity;
  let maxLatitude = -Infinity;

  // Detailed GeoJSON can exceed JavaScript's argument limit. Scan in constant
  // extra space instead of flattening coordinates and calling Math.min(...all).
  for (const feature of features) {
    visitPositions(feature.geometry, ([longitude, latitude]) => {
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
      if (longitude < minLongitude) minLongitude = longitude;
      if (longitude > maxLongitude) maxLongitude = longitude;
      if (latitude < minLatitude) minLatitude = latitude;
      if (latitude > maxLatitude) maxLatitude = latitude;
    });
  }

  if (!Number.isFinite(minLongitude)) return null;

  const scale = Math.min(
    (width - padding * 2) / Math.max(0.01, maxLongitude - minLongitude),
    (height - padding * 2) / Math.max(0.01, maxLatitude - minLatitude)
  );
  const offsetX = (width - (maxLongitude - minLongitude) * scale) / 2;
  const offsetY = (height - (maxLatitude - minLatitude) * scale) / 2;

  return ([longitude, latitude]) => [
    offsetX + (longitude - minLongitude) * scale,
    offsetY + (maxLatitude - latitude) * scale,
  ];
}

function geometryPath(geometry: RiceProvinceGeometry, project: Projector) {
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  const paths: string[] = [];
  for (const polygon of polygons) {
    for (const ring of polygon) {
      const commands: string[] = [];
      for (const position of ring) {
        if (!Number.isFinite(position[0]) || !Number.isFinite(position[1])) continue;
        const [x, y] = project(position);
        commands.push(`${commands.length === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
      }
      if (commands.length >= 3) paths.push(`${commands.join(" ")} Z`);
    }
  }
  return paths.join(" ");
}

export function buildRiceYieldMapPaths(
  features: RiceProvinceFeature[],
  width: number,
  height: number
) {
  const project = createRiceYieldProjector(features, width, height);
  if (!project) return [];
  return features.map((feature) => ({
    feature,
    path: geometryPath(feature.geometry, project),
  }));
}
