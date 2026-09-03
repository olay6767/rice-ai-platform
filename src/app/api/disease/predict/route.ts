import { createClient } from "@/lib/supabase/server";
import type {
  DiseaseApiError,
  DiseaseHistoryApiSuccess,
  DiseaseHistoryEntry,
  DiseasePrediction,
  DiseasePredictionApiSuccess,
  DiseasePredictionDetail,
  DiseasePredictionStatus,
} from "@/lib/disease/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const REQUEST_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 8;
const SERVICE_TIMEOUT_MS = 25_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface OptionalUser {
  id: string;
  supabase: Awaited<ReturnType<typeof createClient>>;
}

interface DiseasePredictionRow {
  id: string;
  prediction_status: string;
  rice_probability: number | string;
  disease: string | null;
  disease_th: string | null;
  confidence: number | string | null;
  all_probabilities: unknown;
  created_at: string;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit
): Response {
  return Response.json(
    {
      error: { code, message },
    } satisfies DiseaseApiError,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isProbability(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}

function isPredictionStatus(
  value: unknown
): value is DiseasePredictionStatus {
  return (
    value === "Unknown" ||
    value === "Uncertain" ||
    value === "Rice Leaf"
  );
}

function parseProbabilities(value: unknown): Record<string, number> {
  if (!isRecord(value)) {
    return {};
  }

  const probabilities: Record<string, number> = {};

  for (const [name, probability] of Object.entries(value)) {
    if (name.length <= 100 && isProbability(probability)) {
      probabilities[name] = probability;
    }
  }

  return probabilities;
}

function parsePredictionDetail(
  value: unknown
): DiseasePredictionDetail | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const disease = value.disease;
  const diseaseTh = value.disease_th;
  const confidence = value.confidence;

  if (
    typeof disease !== "string" ||
    !disease.trim() ||
    typeof diseaseTh !== "string" ||
    !diseaseTh.trim() ||
    !isProbability(confidence)
  ) {
    return undefined;
  }

  return {
    disease: disease.trim().slice(0, 100),
    diseaseTh: diseaseTh.trim().slice(0, 100),
    confidence,
    allProbabilities: parseProbabilities(value.all_probabilities),
  };
}

function parseServicePrediction(value: unknown): DiseasePrediction | null {
  if (!isRecord(value) || !isPredictionStatus(value.status)) {
    return null;
  }

  if (!isProbability(value.rice_probability)) {
    return null;
  }

  const prediction = parsePredictionDetail(value.prediction);

  if (value.status !== "Unknown" && !prediction) {
    return null;
  }

  return {
    status: value.status,
    riceProbability: value.rice_probability,
    prediction,
    message:
      typeof value.message === "string"
        ? value.message.slice(0, 300)
        : undefined,
    savedToHistory: false,
  };
}

function getClientIdentifier(request: Request, user?: OptionalUser): string {
  if (user) {
    return `user:${user.id}`;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const ip = forwardedFor?.split(",")[0]?.trim() || "anonymous";

  return `ip:${ip.slice(0, 100)}`;
}

function checkRateLimit(key: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + REQUEST_WINDOW_MS,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1_000)
      ),
    };
  }

  current.count += 1;

  return { allowed: true, retryAfterSeconds: 0 };
}

async function getOptionalUser(): Promise<OptionalUser | undefined> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return undefined;
    }

    return { id: user.id, supabase };
  } catch (error) {
    console.error("Unable to read disease prediction user:", error);

    return undefined;
  }
}

async function readServiceError(response: Response): Promise<string> {
  try {
    const payload: unknown = await response.json();

    if (isRecord(payload) && typeof payload.detail === "string") {
      return payload.detail.slice(0, 300);
    }
  } catch {
    // ใช้ข้อความสำรองด้านล่างเมื่อ service ส่งผลลัพธ์ที่อ่านไม่ได้
  }

  return "บริการวิเคราะห์ภาพไม่สามารถประมวลผลคำขอนี้ได้";
}

async function savePrediction(
  user: OptionalUser,
  prediction: DiseasePrediction
): Promise<boolean> {
  const { error } = await user.supabase
    .from("disease_predictions")
    .insert({
      user_id: user.id,
      prediction_status: prediction.status,
      rice_probability: prediction.riceProbability,
      disease: prediction.prediction?.disease ?? null,
      disease_th: prediction.prediction?.diseaseTh ?? null,
      confidence: prediction.prediction?.confidence ?? null,
      all_probabilities:
        prediction.prediction?.allProbabilities ?? {},
      model_version:
        process.env.DISEASE_MODEL_VERSION?.trim() ||
        "set2-resnet50-finetuned",
    });

  if (error) {
    console.error("Unable to save disease prediction:", {
      code: error.code,
      message: error.message,
    });

    return false;
  }

  return true;
}

function mapHistoryRow(row: DiseasePredictionRow): DiseaseHistoryEntry {
  return {
    id: row.id,
    status: isPredictionStatus(row.prediction_status)
      ? row.prediction_status
      : "Uncertain",
    riceProbability: Number(row.rice_probability),
    disease: row.disease,
    diseaseTh: row.disease_th,
    confidence:
      row.confidence === null ? null : Number(row.confidence),
    allProbabilities: parseProbabilities(row.all_probabilities),
    createdAt: row.created_at,
  };
}

export async function GET(): Promise<Response> {
  try {
    const user = await getOptionalUser();

    if (!user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนดูประวัติการตรวจโรค"
      );
    }

    const { data, error } = await user.supabase
      .from("disease_predictions")
      .select(
        "id, prediction_status, rice_probability, disease, disease_th, confidence, all_probabilities, created_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (error) {
      console.error("Unable to load disease history:", {
        code: error.code,
        message: error.message,
      });

      if (error.code === "42P01") {
        return jsonError(
          503,
          "DISEASE_HISTORY_NOT_READY",
          "ประวัติการตรวจโรคยังไม่พร้อม กรุณาให้ผู้ดูแลติดตั้งฐานข้อมูล"
        );
      }

      return jsonError(
        500,
        "DATABASE_ERROR",
        "ไม่สามารถโหลดประวัติการตรวจโรคได้ กรุณาลองใหม่อีกครั้ง"
      );
    }

    return Response.json(
      {
        data: (data as DiseasePredictionRow[]).map(mapHistoryRow),
      } satisfies DiseaseHistoryApiSuccess,
      {
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    console.error("Unexpected disease history error:", error);

    return jsonError(
      500,
      "INTERNAL_ERROR",
      "ไม่สามารถโหลดประวัติการตรวจโรคได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function POST(request: Request): Promise<Response> {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError(
      400,
      "INVALID_FORM_DATA",
      "ไม่สามารถอ่านไฟล์ภาพที่อัปโหลดได้"
    );
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError(
      400,
      "IMAGE_REQUIRED",
      "กรุณาเลือกภาพใบข้าวก่อนเริ่มวิเคราะห์"
    );
  }

  if (!ALLOWED_CONTENT_TYPES.has(file.type)) {
    return jsonError(
      415,
      "UNSUPPORTED_IMAGE_TYPE",
      "รองรับเฉพาะไฟล์ JPG, PNG และ WEBP"
    );
  }

  if (file.size === 0) {
    return jsonError(
      400,
      "EMPTY_IMAGE",
      "ไฟล์ภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่"
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonError(
      413,
      "IMAGE_TOO_LARGE",
      "ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB"
    );
  }

  const user = await getOptionalUser();
  const rateLimit = checkRateLimit(getClientIdentifier(request, user));

  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "อัปโหลดภาพถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      { "Retry-After": String(rateLimit.retryAfterSeconds) }
    );
  }

  const diseaseServiceUrl = process.env.DISEASE_API_URL?.trim();

  if (!diseaseServiceUrl) {
    return jsonError(
      503,
      "DISEASE_SERVICE_NOT_CONFIGURED",
      "ระบบวิเคราะห์โรคยังไม่ได้ตั้งค่า กรุณาติดต่อผู้ดูแลระบบ"
    );
  }

  const serviceFormData = new FormData();
  serviceFormData.append(
    "file",
    file,
    file.name || "rice-leaf-image"
  );

  let serviceResponse: Response;

  try {
    serviceResponse = await fetch(
      `${diseaseServiceUrl.replace(/\/+$/, "")}/predict`,
      {
        method: "POST",
        body: serviceFormData,
        cache: "no-store",
        signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
      }
    );
  } catch (error) {
    console.error("Disease inference service unavailable:", error);

    return jsonError(
      503,
      "DISEASE_SERVICE_UNAVAILABLE",
      "ระบบวิเคราะห์ภาพยังไม่พร้อมใช้งาน กรุณาลองใหม่อีกครั้ง"
    );
  }

  if (!serviceResponse.ok) {
    const serviceMessage = await readServiceError(serviceResponse);
    const safeStatus = [400, 413, 415].includes(serviceResponse.status)
      ? serviceResponse.status
      : 502;

    return jsonError(
      safeStatus,
      "DISEASE_INFERENCE_FAILED",
      serviceMessage
    );
  }

  let servicePayload: unknown;

  try {
    servicePayload = await serviceResponse.json();
  } catch {
    return jsonError(
      502,
      "INVALID_DISEASE_RESPONSE",
      "ระบบวิเคราะห์ภาพส่งผลลัพธ์ไม่ถูกต้อง กรุณาลองใหม่"
    );
  }

  const prediction = parseServicePrediction(servicePayload);

  if (!prediction) {
    console.error("Disease inference response has an invalid shape");

    return jsonError(
      502,
      "INVALID_DISEASE_RESPONSE",
      "ระบบวิเคราะห์ภาพส่งผลลัพธ์ไม่สมบูรณ์ กรุณาลองใหม่"
    );
  }

  if (user) {
    prediction.savedToHistory = await savePrediction(user, prediction);
  }

  return Response.json(
    { data: prediction } satisfies DiseasePredictionApiSuccess,
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
