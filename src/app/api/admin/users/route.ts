import type { User } from "@supabase/supabase-js";

import { getAdminContext, getAdminRole } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  AdminRole,
  AdminUser,
  AdminUserDetails,
  AdminUserFarmField,
} from "@/lib/admin/types";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function failure(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: HEADERS }
  );
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mapUser(user: User): AdminUser {
  const bannedUntil = user.banned_until ? Date.parse(user.banned_until) : 0;

  return {
    id: user.id,
    email: user.email ?? "ไม่มีอีเมล",
    role: getAdminRole(user),
    disabled: bannedUntil > Date.now(),
    createdAt: user.created_at,
    lastSignInAt: user.last_sign_in_at ?? null,
  };
}

function mapFarmField(row: Record<string, unknown>): AdminUserFarmField {
  return {
    id: String(row.id),
    name: String(row.name ?? "ไม่ระบุชื่อแปลง"),
    province: String(row.province ?? ""),
    district: text(row.district),
    subdistrict: text(row.subdistrict),
    areaRai: Number(row.area_rai ?? 0),
    riceVariety: String(row.rice_variety ?? ""),
    plantingDate: text(row.planting_date),
    expectedHarvestDate: text(row.expected_harvest_date),
    latitude: row.latitude == null ? null : Number(row.latitude),
    longitude: row.longitude == null ? null : Number(row.longitude),
    isPrimary: row.is_primary === true,
  };
}

async function getUserDetails(userId: string): Promise<AdminUserDetails> {
  const admin = createAdminClient();
  const [userResult, farmResult] = await Promise.all([
    admin.auth.admin.getUserById(userId),
    admin
      .from("rice_farm_fields")
      .select(
        "id,name,province,district,subdistrict,area_rai,rice_variety,planting_date,expected_harvest_date,latitude,longitude,is_primary"
      )
      .eq("user_id", userId)
      .order("is_primary", { ascending: false })
      .order("updated_at", { ascending: false }),
  ]);

  if (userResult.error || !userResult.data.user) {
    throw userResult.error ?? new Error("ไม่พบผู้ใช้งาน");
  }

  if (farmResult.error) {
    throw farmResult.error;
  }

  const user = userResult.data.user;
  const metadata = user.user_metadata ?? {};

  return {
    ...mapUser(user),
    fullName: text(metadata.full_name),
    phone: text(metadata.phone),
    province: text(metadata.province),
    district: text(metadata.district),
    farmName: text(metadata.farm_name),
    emailConfirmedAt: user.email_confirmed_at ?? null,
    updatedAt: user.updated_at ?? user.created_at,
    farmFields: (farmResult.data ?? []).map((row) =>
      mapFarmField(row as Record<string, unknown>)
    ),
  };
}

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;

  try {
    const params = new URL(request.url).searchParams;
    const userId = params.get("id")?.trim() ?? "";

    if (userId) {
      if (context.role !== "superadmin") {
        return failure(
          403,
          "SUPERADMIN_REQUIRED",
          "เฉพาะ Super Admin เท่านั้นที่ดูข้อมูลส่วนตัวของผู้ใช้งานได้"
        );
      }

      if (!UUID.test(userId)) {
        return failure(400, "INVALID_USER", "รหัสผู้ใช้งานไม่ถูกต้อง");
      }

      return Response.json(
        { data: await getUserDetails(userId) },
        { headers: HEADERS }
      );
    }

    const query = params.get("search")?.trim().toLowerCase() ?? "";
    const admin = createAdminClient();
    const result = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (result.error) throw result.error;

    const users = result.data.users
      .map(mapUser)
      .filter((user) => !query || user.email.toLowerCase().includes(query));

    return Response.json({ data: users }, { headers: HEADERS });
  } catch (error) {
    console.error("Unable to load admin users", error);
    return failure(
      503,
      "USER_ADMIN_UNAVAILABLE",
      "ไม่สามารถโหลดข้อมูลผู้ใช้งานได้ กรุณาลองใหม่อีกครั้ง"
    );
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse || !context.user) return context.errorResponse!;

  try {
    const body = (await request.json()) as {
      id?: unknown;
      role?: unknown;
      disabled?: unknown;
    };

    if (typeof body.id !== "string" || !UUID.test(body.id)) {
      return failure(400, "INVALID_USER", "ไม่พบผู้ใช้งาน");
    }

    const hasRoleChange = body.role !== undefined;
    const hasStatusChange = body.disabled !== undefined;
    const changeCount = [hasRoleChange, hasStatusChange]
      .filter(Boolean).length;

    if (changeCount !== 1) {
      return failure(400, "INVALID_CHANGE", "กรุณาแก้ไขครั้งละหนึ่งรายการ");
    }

    const isSuperAdmin = context.role === "superadmin";

    if (hasRoleChange && !isSuperAdmin) {
      return failure(
        403,
        "SUPERADMIN_REQUIRED",
        "เฉพาะ Super Admin เท่านั้นที่เปลี่ยนสิทธิ์ผู้ใช้งานได้"
      );
    }

    const admin = createAdminClient();
    const current = await admin.auth.admin.getUserById(body.id);

    if (current.error || !current.data.user) {
      throw current.error ?? new Error("ไม่พบผู้ใช้งาน");
    }

    const target = current.data.user;
    const targetRole = getAdminRole(target);

    if (!isSuperAdmin && hasStatusChange && targetRole !== "user") {
      return failure(
        403,
        "SUPERADMIN_REQUIRED",
        "Admin ทั่วไปไม่สามารถแก้ไขบัญชี Admin หรือ Super Admin ได้"
      );
    }

    if (
      body.id === context.user.id &&
      (body.disabled === true || hasRoleChange)
    ) {
      return failure(
        400,
        "SELF_PROTECTED",
        "ไม่สามารถปิดบัญชีหรือเปลี่ยนสิทธิ์ของบัญชีที่กำลังใช้งานได้"
      );
    }

    const attributes: {
      app_metadata?: Record<string, unknown>;
      ban_duration?: string;
    } = {};
    let summary = "";
    let action: "role_update" | "update" = "update";

    if (hasRoleChange) {
      const role = body.role as AdminRole;

      if (!(["user", "admin", "superadmin"] as const).includes(role)) {
        return failure(400, "INVALID_ROLE", "ระดับสิทธิ์ไม่ถูกต้อง");
      }

      attributes.app_metadata = {
        ...target.app_metadata,
        role,
      };
      action = "role_update";
      summary = `เปลี่ยนสิทธิ์ ${target.email ?? "ผู้ใช้"} เป็น ${role}`;
    }

    if (hasStatusChange) {
      if (typeof body.disabled !== "boolean") {
        return failure(400, "INVALID_STATUS", "สถานะบัญชีไม่ถูกต้อง");
      }

      attributes.ban_duration = body.disabled ? "876000h" : "none";
      summary = `${body.disabled ? "ปิด" : "เปิด"}การใช้งานบัญชี ${target.email ?? "ผู้ใช้"}`;
    }

    const updated = await admin.auth.admin.updateUserById(body.id, attributes);

    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error("แก้ไขผู้ใช้งานไม่สำเร็จ");
    }

    await context.supabase.from("admin_activity_logs").insert({
      actor_id: context.user.id,
      action,
      resource_type: "user",
      resource_id: body.id,
      summary,
    });

    return Response.json(
      { data: mapUser(updated.data.user) },
      { headers: HEADERS }
    );
  } catch (error) {
    console.error("Unable to update admin user", error);
    return failure(
      500,
      "USER_UPDATE_FAILED",
      "แก้ไขผู้ใช้งานไม่สำเร็จ กรุณาลองใหม่อีกครั้ง"
    );
  }
}
