import { GoogleGenAI } from "@google/genai";

import type { FarmField } from "@/lib/farms/types";
import type {
  BehaviorFeature,
  PersonalizedRecommendationData,
  RecommendationApiError,
  RecommendationApiSuccess,
} from "@/lib/recommendations/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gemini-3.6-flash";
const HEADERS = { "Cache-Control": "no-store" };
const BEHAVIOR_WINDOW_DAYS = 90;

interface FarmFieldRow {
  id: string;
  name: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  area_rai: number | string;
  rice_variety: string;
  planting_date: string | null;
  expected_harvest_date: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
interface BehaviorRow {
  feature: BehaviorFeature;
  event_type: "view" | "chat";
  created_at: string;
}

interface ProfileContext {
  fullName: string;
  province: string;
  district: string;
  farmName: string;
}

interface BehaviorSummary {
  counts: Record<BehaviorFeature, number>;
  latestFeature: BehaviorFeature | null;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } } satisfies RecommendationApiError,
    { status, headers: HEADERS }
  );
}

function metadataText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, 120) : "";
}

function mapFarmField(row: FarmFieldRow): FarmField {
  return {
    id: row.id,
    name: row.name,
    province: row.province,
    district: row.district,
    subdistrict: row.subdistrict,
    areaRai: Number(row.area_rai),
    riceVariety: row.rice_variety,
    plantingDate: row.planting_date,
    expectedHarvestDate: row.expected_harvest_date,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    isPrimary: row.is_primary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function summarizeBehavior(rows: BehaviorRow[]): BehaviorSummary {
  const counts: Record<BehaviorFeature, number> = {
    weather: 0,
    disease: 0,
    yield: 0,
    chat: 0,
  };

  for (const row of rows) counts[row.feature] += 1;

  return {
    counts,
    latestFeature: rows[0]?.feature ?? null,
  };
}

function fallbackRecommendations(
  field: FarmField,
  profile: ProfileContext,
  behavior: BehaviorSummary
): string[] {
  const location =
    [field.subdistrict, field.district, field.province]
      .filter(Boolean)
      .join(" ") ||
    [profile.district, profile.province].filter(Boolean).join(" ") ||
    "พื้นที่แปลงของฉัน";
  const crop = field.riceVariety || "ข้าวในแปลง";
  const fieldName = field.name || profile.farmName || "แปลงหลัก";

  const questions: Record<BehaviorFeature, string> = {
    weather: `สภาพอากาศช่วง 7 วันของ${fieldName}ที่${location} กระทบงานในแปลงอย่างไรบ้าง?`,
    disease: `${crop}ในพื้นที่${location}ช่วงนี้ควรเฝ้าระวังโรคอะไร และสังเกตอาการอย่างไร?`,
    yield: `จากข้อมูล${fieldName} ควรวางแผนดูแลอย่างไรเพื่อเพิ่มผลผลิตก่อนถึงวันเก็บเกี่ยว?`,
    chat: `ช่วยสรุปแผนดูแล${fieldName}ตามข้อมูลแปลงของฉันเป็นขั้นตอนให้หน่อย`,
  };

  return (Object.keys(questions) as BehaviorFeature[])
    .sort((first, second) => {
      const countDifference = behavior.counts[second] - behavior.counts[first];
      if (countDifference !== 0) return countDifference;
      if (first === behavior.latestFeature) return -1;
      if (second === behavior.latestFeature) return 1;
      return 0;
    })
    .map((feature) => questions[feature]);
}

function parseRecommendations(value: string | undefined): string[] | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as { recommendations?: unknown };
    if (!Array.isArray(parsed.recommendations)) return null;

    const recommendations = parsed.recommendations
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim().slice(0, 180))
      .filter((item) => item.length >= 10);

    if (recommendations.length !== 4 || new Set(recommendations).size !== 4) {
      return null;
    }

    return recommendations;
  } catch {
    return null;
  }
}

async function generateAiRecommendations(
  profile: ProfileContext,
  fields: FarmField[],
  behavior: BehaviorSummary
): Promise<string[] | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const ai = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const safeFields = fields.slice(0, 5).map((field) => ({
    name: field.name,
    province: field.province,
    district: field.district,
    subdistrict: field.subdistrict,
    areaRai: field.areaRai,
    riceVariety: field.riceVariety,
    plantingDate: field.plantingDate,
    expectedHarvestDate: field.expectedHarvestDate,
    isPrimary: field.isPrimary,
  }));

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        "สร้างคำถามภาษาไทย 4 ข้อที่ผู้ใช้น่าจะต้องการถามผู้ช่วยเกษตรเรื่องแปลงนาของตน",
        "ใช้ข้อมูลโปรไฟล์ แปลงนา และจำนวนพฤติกรรมที่ผ่านมาเพื่อจัดลำดับความสนใจ",
        "คำถามต้องสั้น ชัดเจน ใช้ข้อมูลที่ให้มาเท่านั้น ห้ามแต่งตัวเลขหรือข้อเท็จจริงใหม่",
        "แต่ละข้อควรครอบคลุมมุมที่ต่างกัน เช่น อากาศ โรค ผลผลิต หรือแผนดูแล",
        `โปรไฟล์: ${JSON.stringify(profile)}`,
        `แปลงนา: ${JSON.stringify(safeFields)}`,
        `พฤติกรรม 90 วัน: ${JSON.stringify(behavior)}`,
      ].join("\n"),
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: {
          type: "object",
          additionalProperties: false,
          properties: {
            recommendations: {
              type: "array",
              minItems: 4,
              maxItems: 4,
              items: { type: "string" },
            },
          },
          required: ["recommendations"],
        },
        maxOutputTokens: 500,
        temperature: 0.35,
      },
    });

    return parseRecommendations(response.text);
  } catch (error) {
    console.error("Unable to generate personalized recommendations:", error);
    return null;
  }
}

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนดูคำแนะนำ");
    }

    const fieldsResult = await supabase
      .from("rice_farm_fields")
      .select(
        "id,name,province,district,subdistrict,area_rai,rice_variety,planting_date,expected_harvest_date,latitude,longitude,is_primary,created_at,updated_at"
      )
      .eq("user_id", user.id)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false });

    if (fieldsResult.error) {
      console.error("Unable to load recommendation farm fields:", {
        code: fieldsResult.error.code,
        message: fieldsResult.error.message,
      });
      return jsonError(500, "DATABASE_ERROR", "ไม่สามารถโหลดข้อมูลแปลงนาได้");
    }

    const fields = (fieldsResult.data as FarmFieldRow[]).map(mapFarmField);

    if (fields.length === 0) {
      const data: PersonalizedRecommendationData = {
        recommendations: [],
        suggestedQuestions: [],
        needsFarmField: true,
        message: "ยังไม่มีข้อมูลแปลงนา กรุณาเพิ่มข้อมูลแปลงในหน้าโปรไฟล์เพื่อรับคำแนะนำเฉพาะคุณ",
        source: "rules",
      };
      return Response.json(
        { data } satisfies RecommendationApiSuccess,
        { headers: HEADERS }
      );
    }

    const since = new Date(
      Date.now() - BEHAVIOR_WINDOW_DAYS * 24 * 60 * 60 * 1_000
    ).toISOString();
    const behaviorResult = await supabase
      .from("user_behavior_events")
      .select("feature,event_type,created_at")
      .eq("user_id", user.id)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500);

    if (behaviorResult.error) {
      console.error("Unable to load recommendation behavior:", {
        code: behaviorResult.error.code,
        message: behaviorResult.error.message,
      });
      return jsonError(
        503,
        "RECOMMENDATIONS_NOT_READY",
        "ระบบคำแนะนำยังไม่พร้อม กรุณาให้ผู้ดูแลติดตั้งฐานข้อมูลล่าสุด"
      );
    }

    const profile: ProfileContext = {
      fullName: metadataText(user.user_metadata?.full_name),
      province: metadataText(user.user_metadata?.province),
      district: metadataText(user.user_metadata?.district),
      farmName: metadataText(user.user_metadata?.farm_name),
    };
    const behavior = summarizeBehavior(behaviorResult.data as BehaviorRow[]);
    const primaryField = fields.find((field) => field.isPrimary) ?? fields[0];
    const fallback = fallbackRecommendations(primaryField, profile, behavior);
    const generated = await generateAiRecommendations(profile, fields, behavior);
    const recommendations = generated ?? fallback;
    const data: PersonalizedRecommendationData = {
      recommendations,
      suggestedQuestions: recommendations.slice(0, 3),
      needsFarmField: false,
      message: null,
      source: generated ? "ai" : "rules",
    };

    return Response.json(
      { data } satisfies RecommendationApiSuccess,
      { headers: HEADERS }
    );
  } catch (error) {
    console.error("Recommendation API failed:", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถสร้างคำแนะนำได้");
  }
}
