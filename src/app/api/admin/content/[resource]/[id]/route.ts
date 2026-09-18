import { getAdminContext } from "@/lib/admin/auth";
import {
  ADMIN_RESOURCE_CONFIG,
  asAdminDatabaseClient,
  getResource,
  logAdminActivity,
  parseAdminContent,
} from "@/lib/admin/content";

export const runtime = "nodejs";

interface ResourceItemRouteContext {
  params: Promise<{ resource: string; id: string }>;
}

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function databaseError(error: { code?: string; message?: string }): Response {
  console.error("Admin content mutation failed", error);

  if (error.code === "42P01" || error.code === "PGRST205") {
    return jsonError(
      503,
      "ADMIN_SCHEMA_NOT_READY",
      "ระบบหลังบ้านยังไม่พร้อม กรุณาติดตั้ง migration จัดการเนื้อหาก่อน"
    );
  }

  return jsonError(500, "DATABASE_ERROR", "ไม่สามารถจัดการข้อมูลได้ กรุณาลองใหม่");
}

export async function PATCH(
  request: Request,
  context: ResourceItemRouteContext
): Promise<Response> {
  const { resource: resourceValue, id } = await context.params;
  const resource = getResource(resourceValue);

  if (!resource || !isUuid(id)) {
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

    const value = parseAdminContent(resource, payload, contextValue.user, true);
    const config = ADMIN_RESOURCE_CONFIG[resource];
    const { data, error } = await asAdminDatabaseClient(contextValue.supabase)
      .from(config.table)
      .update(value)
      .eq("id", id)
      .select(config.select)
      .maybeSingle();

    if (error) {
      return databaseError(error);
    }

    if (!data) {
      return jsonError(404, "ITEM_NOT_FOUND", "ไม่พบข้อมูลที่ต้องการแก้ไข");
    }

    const activityValue = value as Record<string, unknown>;
    const title = resource === "prices"
      ? String(activityValue.rice_type)
      : String(activityValue.title);
    await logAdminActivity(contextValue.supabase, {
      actorId: contextValue.user.id,
      action: "update",
      resourceType: resource,
      resourceId: id,
      summary: `แก้ไข${config.label}: ${title}`,
    });

    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof Error) {
      return jsonError(400, "INVALID_REQUEST", error.message);
    }

    console.error("Unexpected admin content update error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถแก้ไขข้อมูลได้ กรุณาลองใหม่");
  }
}

export async function DELETE(
  _request: Request,
  context: ResourceItemRouteContext
): Promise<Response> {
  const { resource: resourceValue, id } = await context.params;
  const resource = getResource(resourceValue);

  if (!resource || !isUuid(id)) {
    return jsonError(404, "RESOURCE_NOT_FOUND", "ไม่พบข้อมูลที่ต้องการจัดการ");
  }

  try {
    const contextValue = await getAdminContext();

    if (contextValue.errorResponse || !contextValue.user) {
      return contextValue.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const config = ADMIN_RESOURCE_CONFIG[resource];
    const { data: current, error: currentError } = await asAdminDatabaseClient(contextValue.supabase)
      .from(config.table)
      .select(resource === "prices" ? "id, rice_type" : "id, title")
      .eq("id", id)
      .maybeSingle();

    if (currentError) {
      return databaseError(currentError);
    }

    if (!current) {
      return jsonError(404, "ITEM_NOT_FOUND", "ไม่พบข้อมูลที่ต้องการลบ");
    }

    const { error } = await asAdminDatabaseClient(contextValue.supabase)
      .from(config.table)
      .delete()
      .eq("id", id);

    if (error) {
      return databaseError(error);
    }

    const label = resource === "prices" ? String(current.rice_type) : String(current.title);
    await logAdminActivity(contextValue.supabase, {
      actorId: contextValue.user.id,
      action: "delete",
      resourceType: resource,
      resourceId: id,
      summary: `ลบ${config.label}: ${label}`,
    });

    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("Unexpected admin content delete error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถลบข้อมูลได้ กรุณาลองใหม่");
  }
}
