import "server-only";

import {
  getWeatherCondition,
  getWindDirectionLabel,
} from "./conditions";
import type {
  AgriculturalWeather,
  DailyWeather,
  HourlyWeather,
  WeatherData,
  WeatherActivity,
  WeatherInsight,
} from "./types";

const OPEN_METEO_ENDPOINT =
  "https://api.open-meteo.com/v1/forecast";

export const WEATHER_CACHE_SECONDS = 1800;

interface OpenMeteoCurrent {
  time?: string;
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  precipitation?: number;
  cloud_cover?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  weather_code?: number;
}

interface OpenMeteoHourly {
  time?: string[];
  temperature_2m?: number[];
  relative_humidity_2m?: number[];
  precipitation_probability?: number[];
  precipitation?: number[];
  weather_code?: number[];
  soil_moisture_0_to_1cm?: Array<number | null>;
  et0_fao_evapotranspiration?: Array<number | null>;
}

interface OpenMeteoDaily {
  time?: string[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_sum?: number[];
  precipitation_probability_max?: number[];
  weather_code?: number[];
  et0_fao_evapotranspiration?: Array<number | null>;
}

interface OpenMeteoResponse {
  latitude?: number;
  longitude?: number;
  elevation?: number;
  timezone?: string;
  current?: OpenMeteoCurrent;
  hourly?: OpenMeteoHourly;
  daily?: OpenMeteoDaily;
  error?: boolean;
  reason?: string;
}

export class WeatherProviderError extends Error {
  constructor(
    message: string,
    public readonly status: number | null = null
  ) {
    super(message);
    this.name = "WeatherProviderError";
  }
}

function requiredNumber(
  value: number | undefined,
  field: string
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new WeatherProviderError(
      `Weather provider returned an invalid ${field}`
    );
  }

  return value;
}

function requiredString(
  value: string | undefined,
  field: string
): string {
  if (!value) {
    throw new WeatherProviderError(
      `Weather provider returned an invalid ${field}`
    );
  }

  return value;
}

function arrayValue(
  values: number[] | undefined,
  index: number,
  fallback = 0
): number {
  const value = values?.[index];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback;
}

function nullableArrayValue(
  values: Array<number | null> | undefined,
  index: number
): number | null {
  const value = values?.[index];

  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function round(value: number, digits = 1): number {
  const multiplier = 10 ** digits;

  return Math.round(value * multiplier) / multiplier;
}

function buildHourlyForecast(
  hourly: OpenMeteoHourly,
  currentTime: string
): HourlyWeather[] {
  const times = hourly.time ?? [];
  const currentHour = `${currentTime.slice(0, 13)}:00`;
  const matchingIndex = times.findIndex(
    (time) => time >= currentHour
  );
  const startIndex = matchingIndex >= 0 ? matchingIndex : 0;

  return times
    .slice(startIndex, startIndex + 24)
    .map((time, offset) => {
      const index = startIndex + offset;
      const weatherCode = arrayValue(
        hourly.weather_code,
        index
      );

      return {
        time,
        temperature: round(
          arrayValue(hourly.temperature_2m, index)
        ),
        relativeHumidity: Math.round(
          arrayValue(hourly.relative_humidity_2m, index)
        ),
        precipitationProbability: Math.round(
          arrayValue(
            hourly.precipitation_probability,
            index
          )
        ),
        precipitation: round(
          arrayValue(hourly.precipitation, index)
        ),
        soilMoisture: nullableArrayValue(
          hourly.soil_moisture_0_to_1cm,
          index
        ),
        evapotranspiration: nullableArrayValue(
          hourly.et0_fao_evapotranspiration,
          index
        ),
        condition: getWeatherCondition(weatherCode),
      };
    });
}

function buildDailyForecast(
  daily: OpenMeteoDaily
): DailyWeather[] {
  return (daily.time ?? []).slice(0, 7).map((date, index) => {
    const weatherCode = arrayValue(
      daily.weather_code,
      index
    );

    return {
      date,
      temperatureMax: round(
        arrayValue(daily.temperature_2m_max, index)
      ),
      temperatureMin: round(
        arrayValue(daily.temperature_2m_min, index)
      ),
      precipitationSum: round(
        arrayValue(daily.precipitation_sum, index)
      ),
      precipitationProbabilityMax: Math.round(
        arrayValue(
          daily.precipitation_probability_max,
          index
        )
      ),
      evapotranspiration: nullableArrayValue(
        daily.et0_fao_evapotranspiration,
        index
      ),
      condition: getWeatherCondition(weatherCode),
    };
  });
}

function buildAgriculturalSummary(
  currentHumidity: number,
  currentTemperature: number,
  currentWindSpeed: number,
  hourly: HourlyWeather[],
  daily: DailyWeather[]
): AgriculturalWeather {
  const soilMoisture =
    hourly.find((item) => item.soilMoisture !== null)
      ?.soilMoisture ?? null;

  const today = daily[0];
  const rainToday = today?.precipitationSum ?? 0;
  const rainProbability =
    today?.precipitationProbabilityMax ?? 0;
  const evapotranspirationToday =
    today?.evapotranspiration ?? null;

  const rainNextSevenDays = round(
    daily.reduce(
      (sum, item) => sum + item.precipitationSum,
      0
    )
  );

  const waterBalanceToday =
    evapotranspirationToday === null
      ? null
      : round(rainToday - evapotranspirationToday);

  const insights: WeatherInsight[] = [];

  if (rainToday >= 10 || rainProbability >= 70) {
    insights.push({
      id: "irrigation",
      level: "good",
      title: "พักการให้น้ำและติดตามฝน",
      message:
        "วันนี้มีแนวโน้มฝนสูง ควรตรวจสภาพน้ำในแปลงก่อนเปิดระบบให้น้ำ",
    });
  } else if (
    (soilMoisture !== null && soilMoisture < 0.2) ||
    (evapotranspirationToday !== null &&
      evapotranspirationToday >= 5 &&
      rainToday < 3)
  ) {
    insights.push({
      id: "irrigation",
      level: "warning",
      title: "ควรตรวจความชื้นในแปลง",
      message:
        "การสูญเสียน้ำมีแนวโน้มสูงและฝนน้อย ควรตรวจระดับน้ำจริงก่อนวางแผนให้น้ำ",
    });
  } else {
    insights.push({
      id: "irrigation",
      level: "watch",
      title: "ติดตามสมดุลน้ำรายวัน",
      message:
        "ปริมาณฝนยังไม่สูง ควรใช้ข้อมูลร่วมกับระดับน้ำและความชื้นที่ตรวจในแปลง",
    });
  }

  const diseaseRiskIsHigh =
    currentHumidity >= 85 &&
    currentTemperature >= 24 &&
    currentTemperature <= 32;
  const diseaseRiskIsModerate =
    currentHumidity >= 75 || rainProbability >= 60;

  insights.push({
    id: "disease",
    level: diseaseRiskIsHigh
      ? "warning"
      : diseaseRiskIsModerate
        ? "watch"
        : "good",
    title: diseaseRiskIsHigh
      ? "สภาพแวดล้อมเอื้อต่อโรคข้าว"
      : diseaseRiskIsModerate
        ? "ควรเฝ้าระวังความชื้นสะสม"
        : "ความเสี่ยงจากสภาพอากาศยังต่ำ",
    message: diseaseRiskIsHigh
      ? "อากาศอุ่นและความชื้นสูง ควรสำรวจใบและกาบข้าว โดยเฉพาะแปลงที่ปลูกหนาแน่น"
      : diseaseRiskIsModerate
        ? "ตรวจแปลงหลังฝนและหลีกเลี่ยงความชื้นค้างบนใบเป็นเวลานาน"
        : "ติดตามความชื้นและสำรวจอาการผิดปกติตามรอบปกติ",
  });

  const fieldWorkIsUnsafe =
    rainProbability >= 60 || rainToday >= 5;

  insights.push({
    id: "field-work",
    level: fieldWorkIsUnsafe ? "warning" : "good",
    title: fieldWorkIsUnsafe
      ? "เลื่อนงานพ่นสารหรือใส่ปุ๋ย"
      : "เหมาะสำหรับวางแผนงานในแปลง",
    message: fieldWorkIsUnsafe
      ? "ฝนอาจชะล้างปุ๋ยหรือสารที่พ่น ควรเลือกช่วงที่ฝนลดลงและลมไม่แรง"
      : "โอกาสฝนยังไม่สูง แต่ควรตรวจพยากรณ์รายชั่วโมงก่อนเริ่มงาน",
  });

  const rainLikely = rainProbability >= 60 || rainToday >= 5;
  const humidityIsHigh = currentHumidity >= 85;
  const windIsStrong = currentWindSpeed >= 20;
  const activities: WeatherActivity[] = [
    {
      id: "water-management",
      level: rainLikely ? "recommended" : "caution",
      title: rainLikely
        ? "ตรวจระดับน้ำและทางระบายน้ำ"
        : "ตรวจระดับน้ำก่อนให้น้ำ",
      message: rainLikely
        ? "เหมาะกับการเปิดทางระบายน้ำ ตรวจคันนา และพักระบบให้น้ำก่อนฝนตก"
        : "ใช้ความชื้นดินและระดับน้ำจริงประกอบการตัดสินใจก่อนเปิดระบบให้น้ำ",
    },
    {
      id: "field-inspection",
      level: humidityIsHigh || rainLikely ? "recommended" : "caution",
      title: humidityIsHigh || rainLikely
        ? "สำรวจโรคและแมลงหลังฝน"
        : "เดินสำรวจความสมบูรณ์ของต้นข้าว",
      message: humidityIsHigh || rainLikely
        ? "ความชื้นสูงเอื้อต่อโรคใบและกาบ ควรสำรวจจุดอับชื้นหรือแปลงที่ปลูกหนาแน่น"
        : "เหมาะกับการตรวจวัชพืช แมลง และการเจริญเติบโตตามรอบปกติ",
    },
    {
      id: "crop-inputs",
      level: rainLikely || windIsStrong ? "avoid" : "recommended",
      title: rainLikely || windIsStrong
        ? "เลี่ยงพ่นสารและหว่านปุ๋ย"
        : "เหมาะกับใส่ปุ๋ยหรือพ่นสาร",
      message: rainLikely
        ? "ฝนอาจชะล้างปุ๋ยหรือสารที่พ่น ควรรอช่วงฝนลดลง"
        : windIsStrong
          ? "ลมค่อนข้างแรง เสี่ยงต่อการฟุ้งกระจายของสาร ควรรอให้ลมอ่อนลง"
          : "ตรวจพยากรณ์รายชั่วโมงและปฏิบัติตามฉลากผลิตภัณฑ์ทุกครั้ง",
    },
    {
      id: "harvest",
      level: rainLikely || humidityIsHigh ? "avoid" : "recommended",
      title: rainLikely || humidityIsHigh
        ? "เลี่ยงเก็บเกี่ยวและตากผลผลิตกลางแจ้ง"
        : "เหมาะกับเก็บเกี่ยวหรือตากผลผลิต",
      message: rainLikely || humidityIsHigh
        ? "ความชื้นและฝนเพิ่มความเสี่ยงต่อเมล็ดเปียก ควรเตรียมพื้นที่เก็บในร่ม"
        : "หากข้าวอยู่ในระยะพร้อมเก็บเกี่ยว สามารถวางแผนงานกลางแจ้งได้",
    },
  ];

  return {
    soilMoisture:
      soilMoisture === null ? null : round(soilMoisture, 2),
    evapotranspirationToday:
      evapotranspirationToday === null
        ? null
        : round(evapotranspirationToday),
    rainToday,
    rainNextSevenDays,
    waterBalanceToday,
    insights,
    activities,
  };
}

export interface WeatherRequest {
  latitude: number;
  longitude: number;
  name?: string;
}

export async function getWeatherForecast({
  latitude,
  longitude,
  name = "ตำแหน่งที่เลือก",
}: WeatherRequest): Promise<WeatherData> {
  const searchParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      "temperature_2m",
      "apparent_temperature",
      "relative_humidity_2m",
      "precipitation",
      "cloud_cover",
      "wind_speed_10m",
      "wind_direction_10m",
      "weather_code",
    ].join(","),
    hourly: [
      "temperature_2m",
      "relative_humidity_2m",
      "precipitation_probability",
      "precipitation",
      "weather_code",
      "soil_moisture_0_to_1cm",
      "et0_fao_evapotranspiration",
    ].join(","),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "precipitation_probability_max",
      "et0_fao_evapotranspiration",
    ].join(","),
    timezone: "Asia/Bangkok",
    forecast_days: "7",
  });

  const sourceUrl = `${OPEN_METEO_ENDPOINT}?${searchParams.toString()}`;

  let response: Response;

  try {
    response = await fetch(sourceUrl, {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: WEATHER_CACHE_SECONDS,
        tags: ["weather"],
      },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new WeatherProviderError(
      error instanceof Error && error.name === "TimeoutError"
        ? "Weather provider request timed out"
        : "Unable to connect to weather provider"
    );
  }

  if (!response.ok) {
    throw new WeatherProviderError(
      `Weather provider returned status ${response.status}`,
      response.status
    );
  }

  const payload =
    (await response.json()) as OpenMeteoResponse;

  if (payload.error) {
    throw new WeatherProviderError(
      payload.reason || "Weather provider rejected the request"
    );
  }

  const current = payload.current;
  const hourlyPayload = payload.hourly;
  const dailyPayload = payload.daily;

  if (!current || !hourlyPayload || !dailyPayload) {
    throw new WeatherProviderError(
      "Weather provider response is incomplete"
    );
  }

  const currentTime = requiredString(current.time, "current time");
  const currentTemperature = requiredNumber(
    current.temperature_2m,
    "temperature"
  );
  const currentHumidity = requiredNumber(
    current.relative_humidity_2m,
    "relative humidity"
  );
  const weatherCode = requiredNumber(
    current.weather_code,
    "weather code"
  );
  const hourly = buildHourlyForecast(
    hourlyPayload,
    currentTime
  );
  const daily = buildDailyForecast(dailyPayload);

  if (hourly.length === 0 || daily.length === 0) {
    throw new WeatherProviderError(
      "Weather provider returned no forecast data"
    );
  }

  return {
    location: {
      name,
      latitude,
      longitude,
      resolvedLatitude: requiredNumber(
        payload.latitude,
        "resolved latitude"
      ),
      resolvedLongitude: requiredNumber(
        payload.longitude,
        "resolved longitude"
      ),
      elevation:
        typeof payload.elevation === "number"
          ? payload.elevation
          : null,
      timezone: payload.timezone || "Asia/Bangkok",
    },
    current: {
      time: currentTime,
      temperature: round(currentTemperature),
      apparentTemperature: round(
        requiredNumber(
          current.apparent_temperature,
          "apparent temperature"
        )
      ),
      relativeHumidity: Math.round(currentHumidity),
      precipitation: round(
        requiredNumber(
          current.precipitation,
          "precipitation"
        )
      ),
      cloudCover: Math.round(
        requiredNumber(current.cloud_cover, "cloud cover")
      ),
      windSpeed: round(
        requiredNumber(current.wind_speed_10m, "wind speed")
      ),
      windDirection: Math.round(
        requiredNumber(
          current.wind_direction_10m,
          "wind direction"
        )
      ),
      windDirectionLabel: getWindDirectionLabel(
        requiredNumber(
          current.wind_direction_10m,
          "wind direction"
        )
      ),
      condition: getWeatherCondition(weatherCode),
    },
    hourly,
    daily,
    agriculture: buildAgriculturalSummary(
      currentHumidity,
      currentTemperature,
      requiredNumber(current.wind_speed_10m, "wind speed"),
      hourly,
      daily
    ),
    metadata: {
      source: "Open-Meteo",
      sourceUrl: "https://open-meteo.com/",
      fetchedAt: new Date().toISOString(),
      cacheSeconds: WEATHER_CACHE_SECONDS,
      attributionRequired: true,
    },
  };
}
