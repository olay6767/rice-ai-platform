import { getAdminContext } from "@/lib/admin/auth";
import type { AdminDiseaseModelRelease } from "@/lib/admin/types";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 300;

const HEADERS = { "Cache-Control": "no-store" };
const MODEL_VERSION = /^[A-Za-z0-9][A-Za-z0-9._-]{1,99}$/;
const PRIVATE_MODEL_URL = /^https:\/\/[a-z0-9-]+\.private\.blob\.vercel-storage\.com\/[^?#]+\.keras$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MODEL_BYTES = 300 * 1024 * 1024;
const SHA256 = /^[0-9a-f]{64}$/;
const PREPROCESS_MODES = ["raw", "rescale_01", "resnet50"] as const;
type PreprocessMode = (typeof PREPROCESS_MODES)[number];
const CLASS_NAMES = [
  "Healthy",
  "Sheath Blight",
  "Bacterial Leaf Blight",
  "Brown Spot",
  "Rice Blast",
  "Neck Blast",
] as const;

function fail(status: number, message: string): Response {
  return Response.json(
    { error: { code: "DISEASE_MODEL_ADMIN_ERROR", message } },
    { status, headers: HEADERS }
  );
}

function text(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function databaseUnavailable(code?: string): boolean {
  return code === "42P01" || code === "PGRST205";
}

async function serviceStatus(): Promise<"online" | "offline" | "not_configured"> {
  const serviceUrl = process.env.DISEASE_API_URL?.trim();
  if (!serviceUrl) return "not_configured";
  try {
    const response = await fetch(`${serviceUrl.replace(/\/+$/, "")}/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? "online" : "offline";
  } catch {
    return "offline";
  }
}

async function validateModel(
  classifierModelUrl: string,
  classNames: readonly string[],
  preprocessMode: PreprocessMode
): Promise<
  | { ok: true; artifactSha256: string }
  | { ok: false; error: string }
> {
  const serviceUrl = process.env.DISEASE_API_URL?.trim();
  const serviceToken = process.env.DISEASE_API_TOKEN?.trim();
  if (!serviceUrl || !serviceToken) {
    return { ok: false, error: "ระบบตรวจสอบโมเดลยังไม่ได้ตั้งค่าใน Admin" };
  }

  let response: Response;
  try {
    response = await fetch(`${serviceUrl.replace(/\/+$/, "")}/models/validate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        classifier_model_url: classifierModelUrl,
        class_names: classNames,
        preprocess_mode: preprocessMode,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(290_000),
    });
  } catch {
    return { ok: false, error: "ติดต่อบริการตรวจสอบโมเดลไม่ได้ กรุณาลองใหม่" };
  }

  const payload = await response.json().catch(() => null) as {
    detail?: unknown;
    class_count?: unknown;
    class_names?: unknown;
    input_shape?: unknown;
    preprocess_mode?: unknown;
    artifact_sha256?: unknown;
  } | null;
  if (!response.ok) {
    return {
      ok: false,
      error: typeof payload?.detail === "string"
        ? payload.detail.slice(0, 300)
        : "บริการตรวจสอบไม่ยอมรับไฟล์โมเดลนี้",
    };
  }
  if (payload?.class_count !== CLASS_NAMES.length
    || !Array.isArray(payload.class_names)
    || payload.class_names.join("\n") !== CLASS_NAMES.join("\n")
    || !Array.isArray(payload.input_shape)
    || payload.input_shape.join("x") !== "224x224x3"
    || payload.preprocess_mode !== preprocessMode
    || typeof payload.artifact_sha256 !== "string"
    || !SHA256.test(payload.artifact_sha256)) {
    return { ok: false, error: "Validation manifest ของโมเดลไม่ตรงกับระบบ" };
  }
  return { ok: true, artifactSha256: payload.artifact_sha256 };
}

function publicRelease(row: AdminDiseaseModelRelease & Record<string, unknown>): AdminDiseaseModelRelease {
  return {
    id: row.id,
    model_version: row.model_version,
    model_name: row.model_name,
    artifact_size_bytes: row.artifact_size_bytes,
    artifact_sha256: row.artifact_sha256,
    class_count: row.class_count,
    class_names: row.class_names,
    input_shape: row.input_shape,
    preprocess_mode: row.preprocess_mode,
    is_active: row.is_active,
    validated_at: row.validated_at,
    activated_at: row.activated_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function GET(): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;

  const [modelsResult, status] = await Promise.all([
    createAdminClient()
      .from("rice_disease_model_releases")
      .select("id,model_version,model_name,artifact_size_bytes,artifact_sha256,class_count,class_names,input_shape,preprocess_mode,is_active,validated_at,activated_at,created_at,updated_at")
      .order("is_active", { ascending: false })
      .order("created_at", { ascending: false }),
    serviceStatus(),
  ]);
  if (modelsResult.error) {
    return fail(
      databaseUnavailable(modelsResult.error.code) ? 503 : 500,
      databaseUnavailable(modelsResult.error.code)
        ? "กรุณาติดตั้ง migration ระบบเวอร์ชันโมเดลโรค"
        : "โหลดรายการโมเดลโรคไม่สำเร็จ"
    );
  }

  return Response.json({
    data: {
      models: (modelsResult.data ?? []) as AdminDiseaseModelRelease[],
      canManage: context.role === "superadmin",
      serviceStatus: status,
      classNames: CLASS_NAMES,
    },
  }, { headers: HEADERS });
}

export async function POST(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;
  if (context.role !== "superadmin") return fail(403, "เฉพาะ Super Admin เท่านั้นที่เพิ่มโมเดลโรคได้");

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const modelVersion = text(body?.modelVersion, 100);
  const modelName = text(body?.modelName, 160);
  const classifierModelUrl = text(body?.classifierModelUrl, 2000);
  const artifactSizeBytes = Number(body?.artifactSizeBytes);
  const classNames = Array.isArray(body?.classNames)
    ? body.classNames.filter((value): value is string => typeof value === "string")
    : [];
  const preprocessMode = text(body?.preprocessMode, 30) as PreprocessMode;
  const activate = body?.activate !== false;

  if (!MODEL_VERSION.test(modelVersion)) {
    return fail(400, "เวอร์ชันใช้ได้เฉพาะตัวอักษร ตัวเลข จุด ขีดกลาง และขีดล่าง");
  }
  if (modelName.length < 2) {
    return fail(400, "กรุณากรอกชื่อโมเดลอย่างน้อย 2 ตัวอักษร");
  }
  if (!PRIVATE_MODEL_URL.test(classifierModelUrl)) {
    return fail(400, "ไฟล์โมเดลต้องอยู่ใน Private Vercel Blob และลงท้ายด้วย .keras");
  }
  if (!Number.isSafeInteger(artifactSizeBytes) || artifactSizeBytes < 1 || artifactSizeBytes > MAX_MODEL_BYTES) {
    return fail(400, "ไฟล์โมเดลต้องมีขนาดไม่เกิน 300 MB");
  }
  if (classNames.join("\n") !== CLASS_NAMES.join("\n")) {
    return fail(400, "Class manifest ไม่ตรงกับลำดับ Class ของระบบ");
  }
  if (!PREPROCESS_MODES.includes(preprocessMode)) {
    return fail(400, "รูปแบบ preprocessing ไม่ถูกต้อง");
  }

  const duplicate = await createAdminClient()
    .from("rice_disease_model_releases")
    .select("id")
    .eq("model_version", modelVersion)
    .maybeSingle();
  if (duplicate.error) {
    return fail(500, "ตรวจสอบเวอร์ชันโมเดลไม่สำเร็จ");
  }
  if (duplicate.data) {
    return fail(409, "เวอร์ชันโมเดลนี้มีอยู่แล้ว กรุณาใช้ชื่อเวอร์ชันใหม่");
  }

  const validation = await validateModel(classifierModelUrl, classNames, preprocessMode);
  if (!validation.ok) {
    return fail(400, validation.error);
  }

  const result = await createAdminClient().rpc("register_rice_disease_model", {
    p_model_version: modelVersion,
    p_model_name: modelName,
    p_classifier_model_url: classifierModelUrl,
    p_artifact_size_bytes: artifactSizeBytes,
    p_class_names: classNames,
    p_artifact_sha256: validation.artifactSha256,
    p_preprocess_mode: preprocessMode,
    p_actor_id: context.user.id,
    p_activate: activate,
  });
  if (result.error || !result.data) {
    return fail(result.error?.code === "23505" ? 409 : 400,
      result.error?.code === "23505"
        ? "เวอร์ชันโมเดลนี้มีอยู่แล้ว"
        : "บันทึกโมเดลโรคไม่สำเร็จ");
  }

  return Response.json(
    { data: publicRelease(result.data as AdminDiseaseModelRelease & Record<string, unknown>) },
    { status: 201, headers: HEADERS }
  );
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  if (context.role !== "superadmin") return fail(403, "เฉพาะ Super Admin เท่านั้นที่เปลี่ยนโมเดลโรคได้");

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const id = text(body?.id, 100);
  if (!UUID.test(id) || body?.active !== true) return fail(400, "คำสั่งเปลี่ยนโมเดลไม่ถูกต้อง");

  const release = await createAdminClient()
    .from("rice_disease_model_releases")
    .select("id,classifier_model_url,artifact_sha256,class_names,preprocess_mode")
    .eq("id", id)
    .single();
  if (release.error || !release.data) return fail(404, "ไม่พบเวอร์ชันโมเดลโรค");

  if (release.data.classifier_model_url) {
    const validation = await validateModel(
      release.data.classifier_model_url,
      release.data.class_names,
      release.data.preprocess_mode as PreprocessMode
    );
    if (!validation.ok) return fail(400, validation.error);
    if (!release.data.artifact_sha256
      || validation.artifactSha256 !== release.data.artifact_sha256) {
      return fail(409, "ไฟล์โมเดลเปลี่ยนจากไฟล์ที่ผ่านการตรวจสอบ จึงไม่สามารถเปิดใช้ได้");
    }
  }

  const result = await createAdminClient().rpc("activate_rice_disease_model", {
    p_id: id,
    p_actor_id: context.user.id,
  });
  if (result.error || !result.data) return fail(400, "ตั้งโมเดลโรคที่ใช้งานไม่สำเร็จ");
  return Response.json({
    data: publicRelease(result.data as AdminDiseaseModelRelease & Record<string, unknown>),
  }, { headers: HEADERS });
}
