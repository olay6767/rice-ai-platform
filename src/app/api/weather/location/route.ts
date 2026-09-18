import type { WeatherApiError } from "@/lib/weather/types";

export const runtime = "nodejs";

interface NominatimAddress {
  hamlet?: string;
  neighbourhood?: string;
  suburb?: string;
  quarter?: string;
  borough?: string;
  village?: string;
  town?: string;
  city?: string;
  city_district?: string;
  district?: string;
  municipality?: string;
  county?: string;
  state_district?: string;
  province?: string;
  state?: string;
}

interface NominatimResponse {
  address?: NominatimAddress;
}

interface NominatimSearchResult extends NominatimResponse {
  place_id: number;
  display_name?: string;
  lat: string;
  lon: string;
}

function parseCoordinate(
  value: string | null,
  min: number,
  max: number
): number | null {
  if (!value || value.trim() === "") return null;

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max
    ? parsed
    : null;
}

function jsonError(
  status: number,
  code: WeatherApiError["error"]["code"],
  message: string
): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function firstValue(...values: Array<string | undefined>): string | null {
  return values.find((value) => Boolean(value?.trim()))?.trim() ?? null;
}

function resolveAddressParts(address: NominatimAddress): {
  locality: string | null;
  district: string | null;
  province: string | null;
} {
  return {
    locality: firstValue(
      address.neighbourhood,
      address.suburb,
      address.quarter,
      address.village,
      address.hamlet,
      address.borough,
      address.city_district,
      address.town,
      address.city,
      address.municipality
    ),
    district: firstValue(
      address.district,
      address.city_district,
      address.municipality,
      address.county,
      address.state_district,
      address.city,
      address.town,
      address.village
    ),
    province: firstValue(address.province, address.state),
  };
}

function buildLocationLabel(
  parts: ReturnType<typeof resolveAddressParts>,
  fallback?: string
): string {
  return (
    [parts.locality, parts.district, parts.province]
      .filter(
        (value, index, items) => value && items.indexOf(value) === index
      )
      .join(" · ") ||
    fallback?.trim() ||
    "ไม่ทราบชื่อพื้นที่"
  );
}

async function searchLocations(query: string): Promise<Response> {
  if (query.length < 2 || query.length > 80) {
    return jsonError(
      400,
      "INVALID_QUERY",
      "กรุณาพิมพ์ชื่อพื้นที่อย่างน้อย 2 ตัวอักษร"
    );
  }

  const searchParams = new URLSearchParams({
    format: "jsonv2",
    q: query,
    addressdetails: "1",
    limit: "6",
    countrycodes: "th",
    "accept-language": "th",
  });
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?${searchParams.toString()}`,
    {
      headers: {
        "Accept-Language": "th,en;q=0.8",
        "User-Agent": "Rice-AI-Platform weather-location/1.0",
      },
      signal: AbortSignal.timeout(8_000),
    }
  );

  if (!response.ok) {
    throw new Error(`location search returned ${response.status}`);
  }

  const results = (await response.json()) as NominatimSearchResult[];
  const locations = results
    .map((result) => {
      const latitude = Number(result.lat);
      const longitude = Number(result.lon);
      const parts = resolveAddressParts(result.address ?? {});

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        id: String(result.place_id),
        label: buildLocationLabel(parts, result.display_name).slice(0, 160),
        locality: parts.locality,
        district: parts.district,
        province: parts.province,
        latitude,
        longitude,
        provider: "OpenStreetMap" as const,
      };
    })
    .filter((location) => location !== null);

  return Response.json(
    { data: locations },
    {
      headers: {
        "Cache-Control":
          "public, s-maxage=86400, stale-while-revalidate=604800",
        "X-Location-Source": "OpenStreetMap Nominatim",
      },
    }
  );
}

/**
 * Resolves a user-triggered GPS lookup to a readable Thai area. The result is
 * cacheable to avoid repeatedly sending the same coordinate to the provider.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const query = url.searchParams.get("query")?.trim();

  if (query !== undefined) {
    try {
      return await searchLocations(query);
    } catch (error) {
      console.error("Location search failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });

      return jsonError(
        502,
        "WEATHER_UNAVAILABLE",
        "ไม่สามารถค้นหาพื้นที่ได้ในขณะนี้"
      );
    }
  }

  const latitude = parseCoordinate(url.searchParams.get("latitude"), -90, 90);
  const longitude = parseCoordinate(url.searchParams.get("longitude"), -180, 180);

  if (latitude === null || longitude === null) {
    return jsonError(400, "INVALID_COORDINATES", "พิกัดตำแหน่งไม่ถูกต้อง");
  }

  const searchParams = new URLSearchParams({
    format: "jsonv2",
    lat: latitude.toString(),
    lon: longitude.toString(),
    addressdetails: "1",
    zoom: "18",
    layer: "address",
    "accept-language": "th",
  });

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?${searchParams.toString()}`,
      {
        headers: {
          "Accept-Language": "th,en;q=0.8",
          "User-Agent": "Rice-AI-Platform weather-location/1.0",
        },
        signal: AbortSignal.timeout(8_000),
      }
    );

    if (!response.ok) {
      throw new Error(`reverse geocoding returned ${response.status}`);
    }

    const result = (await response.json()) as NominatimResponse;
    const address = result.address ?? {};
    const parts = resolveAddressParts(address);
    const label = buildLocationLabel(parts, "ตำแหน่งจาก GPS");

    return Response.json(
      {
        data: {
          label: label.slice(0, 120),
          locality: parts.locality,
          district: parts.district,
          province: parts.province,
          provider: "OpenStreetMap",
        },
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=604800, stale-while-revalidate=2592000",
          "X-Location-Source": "OpenStreetMap Nominatim",
        },
      }
    );
  } catch (error) {
    console.error("Location reverse geocoding failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    });

    return jsonError(
      502,
      "WEATHER_UNAVAILABLE",
      "ไม่สามารถแปลงพิกัดเป็นชื่อพื้นที่ได้ในขณะนี้"
    );
  }
}
