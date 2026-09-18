import { recordBehaviorEvent } from "@/lib/recommendations/server";
import {
  BEHAVIOR_FEATURES,
  type BehaviorFeature,
} from "@/lib/recommendations/types";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: HEADERS }
  );
}

function isFeature(value: unknown): value is BehaviorFeature {
  return (
    typeof value === "string" &&
    BEHAVIOR_FEATURES.includes(value as BehaviorFeature)
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลพฤติกรรมไม่ถูกต้อง");
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonError(400, "INVALID_EVENT", "ข้อมูลพฤติกรรมไม่ถูกต้อง");
  }

  const event = payload as Record<string, unknown>;
  const feature = event.feature;
  const path = event.path;

  if (!isFeature(feature)) {
    return jsonError(400, "INVALID_FEATURE", "ประเภทหน้าที่เข้าชมไม่ถูกต้อง");
  }

  if (
    typeof path !== "string" ||
    path.length > 200 ||
    !/^\/[a-z0-9/_-]*$/i.test(path)
  ) {
    return jsonError(400, "INVALID_PATH", "เส้นทางหน้าที่เข้าชมไม่ถูกต้อง");
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบก่อนบันทึกพฤติกรรม");
    }

    const saved = await recordBehaviorEvent(supabase, user.id, {
      eventType: "view",
      feature,
      path,
    });

    if (!saved) {
      return jsonError(
        503,
        "BEHAVIOR_TRACKING_NOT_READY",
        "ระบบบันทึกพฤติกรรมยังไม่พร้อม กรุณาให้ผู้ดูแลติดตั้งฐานข้อมูลล่าสุด"
      );
    }

    return new Response(null, { status: 204, headers: HEADERS });
  } catch (error) {
    console.error("User behavior API failed:", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถบันทึกพฤติกรรมได้");
  }
}
