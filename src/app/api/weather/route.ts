import {
  getWeatherForecast,
  WEATHER_CACHE_SECONDS,
  WeatherProviderError,
} from "@/lib/weather/open-meteo";
import type {
  WeatherApiError,
  WeatherApiSuccess,
} from "@/lib/weather/types";

function parseCoordinate(
  rawValue: string | null,
  minimum: number,
  maximum: number
): number | null {
  if (rawValue === null || rawValue.trim() === "") {
    return null;
  }

  const value = Number(rawValue);

  if (
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    return null;
  }

  return value;
}

function jsonError(
  status: number,
  code: WeatherApiError["error"]["code"],
  message: string
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    } satisfies WeatherApiError,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const latitude = parseCoordinate(
    url.searchParams.get("latitude") ??
      url.searchParams.get("lat"),
    -90,
    90
  );
  const longitude = parseCoordinate(
    url.searchParams.get("longitude") ??
      url.searchParams.get("lon"),
    -180,
    180
  );

  if (latitude === null || longitude === null) {
    return jsonError(
      400,
      "INVALID_COORDINATES",
      "กรุณาระบุ latitude และ longitude ที่ถูกต้อง"
    );
  }

  const requestedName =
    url.searchParams.get("name")?.trim() ||
    "ตำแหน่งที่เลือก";
  const safeName = requestedName.slice(0, 80);

  try {
    const data = await getWeatherForecast({
      latitude,
      longitude,
      name: safeName,
    });

    return Response.json(
      {
        data,
      } satisfies WeatherApiSuccess,
      {
        headers: {
          "Cache-Control": `public, s-maxage=${WEATHER_CACHE_SECONDS}, stale-while-revalidate=3600`,
          "X-Weather-Source": "Open-Meteo",
        },
      }
    );
  } catch (error) {
    if (error instanceof WeatherProviderError) {
      console.error("Weather provider error:", {
        message: error.message,
        status: error.status,
        latitude,
        longitude,
      });

      return jsonError(
        502,
        "WEATHER_UNAVAILABLE",
        "ไม่สามารถโหลดข้อมูลสภาพอากาศได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
      );
    }

    console.error("Unexpected weather API error:", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ระบบสภาพอากาศเกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
    );
  }
}
