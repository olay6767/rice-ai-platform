export type WeatherIconKey =
  | "clear"
  | "partly-cloudy"
  | "cloudy"
  | "fog"
  | "drizzle"
  | "rain"
  | "storm";

export type WeatherInsightLevel =
  | "good"
  | "watch"
  | "warning";

export interface WeatherCondition {
  code: number;
  label: string;
  description: string;
  icon: WeatherIconKey;
}

export interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
  resolvedLatitude: number;
  resolvedLongitude: number;
  elevation: number | null;
  timezone: string;
}

export interface CurrentWeather {
  time: string;
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  windDirectionLabel: string;
  condition: WeatherCondition;
}

export interface HourlyWeather {
  time: string;
  temperature: number;
  relativeHumidity: number;
  precipitationProbability: number;
  precipitation: number;
  soilMoisture: number | null;
  evapotranspiration: number | null;
  condition: WeatherCondition;
}

export interface DailyWeather {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  evapotranspiration: number | null;
  condition: WeatherCondition;
}

export interface WeatherInsight {
  id: "irrigation" | "disease" | "field-work";
  level: WeatherInsightLevel;
  title: string;
  message: string;
}

export type WeatherActivityId =
  | "water-management"
  | "field-inspection"
  | "crop-inputs"
  | "harvest";

export type WeatherActivityLevel = "recommended" | "caution" | "avoid";

export interface WeatherActivity {
  id: WeatherActivityId;
  level: WeatherActivityLevel;
  title: string;
  message: string;
}

export interface AgriculturalWeather {
  soilMoisture: number | null;
  evapotranspirationToday: number | null;
  rainToday: number;
  rainNextSevenDays: number;
  waterBalanceToday: number | null;
  insights: WeatherInsight[];
  activities: WeatherActivity[];
}

export interface WeatherMetadata {
  source: "Open-Meteo";
  sourceUrl: string;
  fetchedAt: string;
  cacheSeconds: number;
  attributionRequired: true;
}

export interface WeatherData {
  location: WeatherLocation;
  current: CurrentWeather;
  hourly: HourlyWeather[];
  daily: DailyWeather[];
  agriculture: AgriculturalWeather;
  metadata: WeatherMetadata;
}

export interface WeatherApiSuccess {
  data: WeatherData;
}

export interface WeatherApiError {
  error: {
    code:
      | "INVALID_COORDINATES"
      | "INVALID_QUERY"
      | "WEATHER_UNAVAILABLE"
      | "INTERNAL_ERROR";
    message: string;
  };
}
