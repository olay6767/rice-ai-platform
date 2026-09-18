import { getAdminContext } from "@/lib/admin/auth";
import {
  ADMIN_RESOURCE_CONFIG,
  asAdminDatabaseClient,
  getResource,
  logAdminActivity,
  parseAdminContent,
} from "@/lib/admin/content";

export const runtime = "nodejs";

interface ResourceRouteContext {
  params: Promise<{ resource: string }>;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function databaseError(error: { code?: string; message?: string }): Response {
  console.error("Admin content request failed", error);

  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(
      503,
      "ADMIN_SCHEMA_NOT_READY",
      "ระบบหลังบ้านยังไม่พร้อม กรุณาติดตั้ง migration จัดการเนื้อหาก่อน"
    );
  }

  return jsonError(500, "DATABASE_ERROR", "ไม่สามารถจัดการข้อมูลได้ กรุณาลองใหม่");
}

export async function GET(
  _request: Request,
  context: ResourceRouteContext
): Promise<Response> {
  const { resource: resourceValue } = await context.params;
  const resource = getResource(resourceValue);

  if (!resource) {
    return jsonError(404, "RESOURCE_NOT_FOUND", "ไม่พบข้อมูลที่ต้องการจัดการ");
  }

  try {
    const contextValue = await getAdminContext();

    if (contextValue.errorResponse || !contextValue.user) {
      return contextValue.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const config = ADMIN_RESOURCE_CONFIG[resource];
    const { data, error } = await asAdminDatabaseClient(contextValue.supabase)
      .from(config.table)
      .select(config.select)
      .order(config.orderColumn, { ascending: false })
      .limit(100);

    if (error) {
      return databaseError(error);
    }

    return Response.json(
      { data: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected admin content read error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
  }
}

export async function POST(
  request: Request,
  context: ResourceRouteContext
): Promise<Response> {
  const { resource: resourceValue } = await context.params;
  const resource = getResource(resourceValue);

  if (!resource) {
    return jsonError(404, "RESOURCE_NOT_FOUND", "ไม่พบข้อมูลที่ต้องการจัดการ");
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError(400, "INVALID_JSON", "รูปแบบข้อมูลไม่ถูกต้อง");
  }

  try {
    const contextValue = await getAdminContext();

    if (contextValue.errorResponse || !contextValue.user) {
      return contextValue.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const value = parseAdminContent(resource, payload, contextValue.user, false);
    const config = ADMIN_RESOURCE_CONFIG[resource];
    const { data, error } = await asAdminDatabaseClient(contextValue.supabase)
      .from(config.table)
      .insert(value)
      .select(config.select)
      .single();

    if (error) {
      return databaseError(error);
    }

    if (!data) {
      return jsonError(500, "DATABASE_ERROR", "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่");
    }

    const activityValue = value as Record<string, unknown>;
    const title = resource === "prices"
      ? String(activityValue.rice_type)
      : String(activityValue.title);
    await logAdminActivity(contextValue.supabase, {
      actorId: contextValue.user.id,
      action: "create",
      resourceType: resource,
      resourceId: data.id,
      summary: `เพิ่ม${config.label}: ${title}`,
    });

    return Response.json(
      { data },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(400, "INVALID_REQUEST", error.message);
    }

    console.error("Unexpected admin content create error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่");
  }
}
