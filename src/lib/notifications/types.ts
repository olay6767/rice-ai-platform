export type NotificationType =
  | "weather"
  | "disease"
  | "pest"
  | "disaster"
  | "price"
  | "general";

export type NotificationSeverity = "low" | "medium" | "high";

export interface ManagementNotification {
  id: string;
  title: string;
  description: string;
  alertType: NotificationType;
  severity: NotificationSeverity;
  areaName: string;
  startsAt: string;
  expiresAt: string | null;
  source?: "admin" | "weather" | "farm";
}

export interface NotificationPreferences {
  heavyRainEnabled: boolean;
  heavyRainThresholdMm: number;
  highHumidityDiseaseEnabled: boolean;
  highHumidityThresholdPercent: number;
  fertilizerReminderEnabled: boolean;
  nextFertilizerDate: string | null;
  fertilizerReminderDaysBefore: number;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  heavyRainEnabled: true,
  heavyRainThresholdMm: 35,
  highHumidityDiseaseEnabled: true,
  highHumidityThresholdPercent: 85,
  fertilizerReminderEnabled: false,
  nextFertilizerDate: null,
  fertilizerReminderDaysBefore: 3,
};
