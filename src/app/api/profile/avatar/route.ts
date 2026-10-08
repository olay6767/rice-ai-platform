import { revalidatePath } from "next/cache";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "admin-media";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function extensionFor(type: string): "jpg" | "png" | "webp" {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function hasValidSignature(bytes: Uint8Array, type: string): boolean {
  if (type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }

  if (type === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }

  return (
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  );
}

async function authenticatedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { supabase, user, error };
}

function userAvatarPath(value: unknown, userId: string): string | null {
  if (typeof value !== "string") return null;
  return value.startsWith(`avatars/${userId}/`) ? value : null;
}

function refreshProfileViews() {
  revalidatePath("/", "layout");
  revalidatePath("/profile");
}

export async function POST(request: Request): Promise<Response> {
  try {
    const { supabase, user, error } = await authenticatedUser();

    if (error || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบใหม่");
    }

    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return jsonError(400, "FILE_REQUIRED", "กรุณาเลือกรูปโปรไฟล์");
    }

    if (!ALLOWED_MIME_TYPES.has(uploaded.type)) {
      return jsonError(400, "INVALID_FILE_TYPE", "รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
    }

    if (uploaded.size === 0 || uploaded.size > MAX_FILE_SIZE) {
      return jsonError(400, "INVALID_FILE_SIZE", "รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB");
    }

    const bytes = new Uint8Array(await uploaded.arrayBuffer());
    if (!hasValidSignature(bytes, uploaded.type)) {
      return jsonError(400, "INVALID_IMAGE", "ไฟล์ที่เลือกไม่ใช่รูปภาพที่รองรับ");
    }

    const admin = createAdminClient();
    const path = `avatars/${user.id}/avatar-${Date.now()}-${crypto.randomUUID()}.${extensionFor(uploaded.type)}`;
    const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, bytes, {
      contentType: uploaded.type,
      cacheControl: "31536000",
      upsert: false,
    });

    if (uploadError) {
      console.error("Profile avatar upload failed:", uploadError);
      return jsonError(500, "UPLOAD_FAILED", "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    }

    const { data: publicUrlData } = admin.storage.from(BUCKET).getPublicUrl(path);
    const previousPath = userAvatarPath(user.user_metadata?.avatar_path, user.id);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: publicUrlData.publicUrl,
        avatar_path: path,
      },
    });

    if (updateError) {
      await admin.storage.from(BUCKET).remove([path]);
      console.error("Profile avatar metadata update failed:", updateError);
      return jsonError(500, "PROFILE_UPDATE_FAILED", "บันทึกรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    }

    if (previousPath && previousPath !== path) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove([previousPath]);
      if (removeError) console.error("Previous profile avatar cleanup failed:", removeError);
    }

    refreshProfileViews();

    return Response.json(
      { data: { avatarUrl: publicUrlData.publicUrl } },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected profile avatar upload error:", error);
    return jsonError(500, "INTERNAL_ERROR", "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่");
  }
}

export async function DELETE(): Promise<Response> {
  try {
    const { supabase, user, error } = await authenticatedUser();

    if (error || !user) {
      return jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบใหม่");
    }

    const previousPath = userAvatarPath(user.user_metadata?.avatar_path, user.id);
    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        ...user.user_metadata,
        avatar_url: null,
        avatar_path: null,
      },
    });

    if (updateError) {
      console.error("Profile avatar removal failed:", updateError);
      return jsonError(500, "PROFILE_UPDATE_FAILED", "ลบรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    }

    if (previousPath) {
      const { error: removeError } = await createAdminClient().storage
        .from(BUCKET)
        .remove([previousPath]);
      if (removeError) console.error("Profile avatar file removal failed:", removeError);
    }

    refreshProfileViews();

    return Response.json(
      { data: { avatarUrl: null } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected profile avatar removal error:", error);
    return jsonError(500, "INTERNAL_ERROR", "ลบรูปโปรไฟล์ไม่สำเร็จ กรุณาลองใหม่");
  }
}
