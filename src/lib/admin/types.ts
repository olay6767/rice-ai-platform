export const ADMIN_RESOURCES = [
  "posts",
  "alerts",
  "prices",
  "recommendations",
] as const;

export type AdminResource = (typeof ADMIN_RESOURCES)[number];

export interface AdminNewsPost {
  id: string;
  title: string;
  summary: string;
  body: string;
  category: "weather" | "disease" | "pest" | "price" | "knowledge" | "disaster";
  source_name: string;
  image_url: string | null;
  image_alt: string;
  is_featured: boolean;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAlert {
  id: string;
  title: string;
  description: string;
  alert_type: "weather" | "disease" | "pest" | "disaster" | "price" | "general";
  severity: "low" | "medium" | "high";
  area_name: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminRicePrice {
  id: string;
  rice_type: string;
  price_per_ton: number;
  trend: "up" | "down" | "steady";
  change_percent: number;
  market_name: string;
  observed_at: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminRecommendation {
  id: string;
  title: string;
  description: string;
  category: "water" | "fertilizer" | "disease" | "harvest" | "cost" | "general";
  priority: "normal" | "important";
  is_active: boolean;
  starts_at: string;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminActivityLog {
  id: string;
  action: "create" | "update" | "delete" | "role_update" | "upload";
  resource_type: string;
  resource_id: string | null;
  summary: string;
  created_at: string;
}

export interface AdminOverview {
  counts: {
    users: number;
    diseaseChecks: number;
    assistantUses: number;
    content: number;
    posts: number;
    publishedPosts: number;
    activeAlerts: number;
    prices: number;
    recommendations: number;
  };
  dailyUsage: Array<{
    date: string;
    diseaseChecks: number;
    assistantUses: number;
  }>;
  recentActivity: AdminActivityLog[];
}

export type AdminRole = "user" | "admin" | "superadmin";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  disabled: boolean;
  createdAt: string;
  lastSignInAt: string | null;
}

export interface AdminUserFarmField {
  id: string;
  name: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  areaRai: number;
  riceVariety: string;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}

export interface AdminUserDetails extends AdminUser {
  fullName: string | null;
  phone: string | null;
  province: string | null;
  district: string | null;
  farmName: string | null;
  emailConfirmedAt: string | null;
  updatedAt: string;
  farmFields: AdminUserFarmField[];
}

export interface AdminAiModel {
  model_version: string;
  model_name: string;
  target: string;
  test_metrics: Record<string, number | string | null>;
  is_active: boolean;
  is_visible: boolean;
  updated_at: string;
}

export interface AdminDisease {
  id: string;
  disease_code: string;
  name_th: string;
  name_en: string;
  image_url: string | null;
  symptoms: string;
  causes: string;
  prevention: string;
  treatment: string;
  detection_count: number;
  is_active: boolean;
  updated_at: string;
}

export function isAdminResource(value: string): value is AdminResource {
  return (ADMIN_RESOURCES as readonly string[]).includes(value);
}
