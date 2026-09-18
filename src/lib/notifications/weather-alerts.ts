import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type ManagementNotification,
  type NotificationPreferences,
} from "@/lib/notifications/types";
import type { WeatherData } from "@/lib/weather/types";

const SEVERITY_PRIORITY = { high: 3, medium: 2, low: 1 } as const;

function alertId(weather: WeatherData, kind: string, date: string): string {
  const latitude = weather.location.resolvedLatitude.toFixed(3);
  const longitude = weather.location.resolvedLongitude.toFixed(3);

  return `weather:${latitude}:${longitude}:${date}:${kind}`;
}

function endOfWeatherDay(date: string): string | null {
  const value = new Date(`${date}T23:59:59+07:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

export function buildWeatherNotifications(
  weather: WeatherData,
  preferences: NotificationPreferences = DEFAULT_NOTIFICATION_PREFERENCES
): ManagementNotification[] {
  const today = weather.daily[0];

  if (!today) {
    return [];
  }

  const alerts: ManagementNotification[] = [];
  const common = {
    alertType: "weather" as const,
    areaName: weather.location.name,
    startsAt: weather.metadata.fetchedAt,
    expiresAt: endOfWeatherDay(today.date),
    source: "weather" as const,
  };
  const rain = today.precipitationSum;
  const rainChance = today.precipitationProbabilityMax;
  const humidity = weather.current.relativeHumidity;
  const wind = weather.current.windSpeed;
  const maximumTemperature = today.temperatureMax;
  const soilMoisture = weather.agriculture.soilMoisture;

  if (
    preferences.heavyRainEnabled &&
    (rain >= preferences.heavyRainThresholdMm || rainChance >= 90)
  ) {
    const severity =
      rain >= Math.max(35, preferences.heavyRainThresholdMm * 1.5) ||
      rainChance >= 95
        ? "high"
        : "medium";
    alerts.push({
      ...common,
      id: alertId(weather, "rain", today.date),
      severity,
      title:
        severity === "high"
          ? "เสี่ยงฝนหนักและน้ำขังในแปลง"
          : "มีโอกาสฝน ควรเตรียมทางระบายน้ำ",
      description: `วันนี้คาดว่าฝน ${rain.toLocaleString("th-TH")} มม. โอกาสฝนสูงสุด ${rainChance.toLocaleString("th-TH")}% (เกณฑ์ที่ตั้งไว้ ${preferences.heavyRainThresholdMm.toLocaleString("th-TH")} มม.) ควรตรวจคันนา เปิดทางระบายน้ำ และพักการให้น้ำก่อนฝนตก`,
    });
  }

  if (
    preferences.highHumidityDiseaseEnabled &&
    humidity >= preferences.highHumidityThresholdPercent &&
    weather.current.temperature >= 24 &&
    weather.current.temperature <= 32
  ) {
    alerts.push({
      ...common,
      id: alertId(weather, "humidity", today.date),
      severity: humidity >= 95 && rainChance >= 60 ? "high" : "medium",
      title: "ความชื้นสูง เสี่ยงโรคข้าว",
      description: `ความชื้นปัจจุบัน ${humidity.toLocaleString("th-TH")}% (เกณฑ์ที่ตั้งไว้ ${preferences.highHumidityThresholdPercent.toLocaleString("th-TH")}%) และอุณหภูมิ ${weather.current.temperature.toLocaleString("th-TH")}°C เอื้อต่อโรคใบและกาบ ควรสำรวจจุดอับชื้นและแปลงที่ปลูกหนาแน่น`,
    });
  }

  if (wind >= 20) {
    alerts.push({
      ...common,
      id: alertId(weather, "wind", today.date),
      severity: wind >= 30 ? "high" : "medium",
      title: "ลมแรง ควรเลื่อนงานพ่นสาร",
      description: `ความเร็วลมปัจจุบัน ${wind.toLocaleString("th-TH")} กม./ชม. เสี่ยงต่อการฟุ้งกระจายของสาร ควรรอให้ลมอ่อนลงก่อนพ่นสารหรือหว่านปุ๋ย`,
    });
  }

  if (maximumTemperature >= 35) {
    alerts.push({
      ...common,
      id: alertId(weather, "heat", today.date),
      severity: maximumTemperature >= 38 ? "high" : "medium",
      title: "อากาศร้อน ควรเฝ้าระวังข้าวขาดน้ำ",
      description: `อุณหภูมิสูงสุดวันนี้ประมาณ ${maximumTemperature.toLocaleString("th-TH")}°C ควรตรวจระดับน้ำและความชื้นในแปลงช่วงเช้า หลีกเลี่ยงงานกลางแจ้งในช่วงแดดจัด`,
    });
  }

  if (soilMoisture !== null && soilMoisture < 0.2 && rain < 3) {
    const soilMoisturePercent = Math.round(soilMoisture * 100);
    alerts.push({
      ...common,
      id: alertId(weather, "dry-soil", today.date),
      severity: soilMoisture < 0.12 ? "high" : "medium",
      title: "ความชื้นผิวดินต่ำ ควรตรวจระดับน้ำ",
      description: `ความชื้นผิวดินโดยประมาณ ${soilMoisturePercent.toLocaleString("th-TH")}% และฝนวันนี้ต่ำ ควรตรวจสภาพแปลงจริงก่อนวางแผนให้น้ำ`,
    });
  }

  return alerts.sort(
    (left, right) =>
      SEVERITY_PRIORITY[right.severity] - SEVERITY_PRIORITY[left.severity]
  );
}
