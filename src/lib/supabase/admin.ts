import { createClient } from "@supabase/supabase-js";

function getLegacyJwtRole(value: string): string | null {
  if (!value.startsWith("eyJ")) {
    return null;
  }

  try {
    const payload = value.split(".")[1];

    if (!payload) {
      return null;
    }

    const decoded = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { role?: unknown };

    return typeof decoded.role === "string" ? decoded.role : null;
  } catch {
    return null;
  }
}

/**
 * ใช้เฉพาะใน Route Handler ฝั่งเซิร์ฟเวอร์สำหรับงานที่ Supabase client ปกติทำไม่ได้
 * ห้าม import โมดูลนี้ใน Client Component และห้ามตั้งชื่อ key ด้วย NEXT_PUBLIC_.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า SUPABASE_SERVICE_ROLE_KEY สำหรับจัดการผู้ใช้หรืออัปโหลดสื่อ"
    );
  }

  if (serviceRoleKey.startsWith("sb_publishable_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ใช้ Publishable key ไม่ได้ กรุณาใช้ Secret key (sb_secret_...) จาก Supabase Dashboard"
    );
  }

  const legacyRole = getLegacyJwtRole(serviceRoleKey);

  if (legacyRole && legacyRole !== "service_role") {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY ต้องเป็น service_role key ไม่ใช่ anon หรือ publishable key"
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
