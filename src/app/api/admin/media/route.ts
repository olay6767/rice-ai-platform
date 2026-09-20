import { getAdminContext } from "@/lib/admin/auth";
import { logAdminActivity } from "@/lib/admin/content";

export const runtime = "nodejs";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_SIZE = 8 * 1024 * 1024;

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();

  if (fromName === "jpg" || fromName === "jpeg" || fromName === "png" || fromName === "webp") {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  return file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getAdminContext();

    if (context.errorResponse || !context.user) {
      return context.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const formData = await request.formData();
    const uploaded = formData.get("file");

    if (!(uploaded instanceof File)) {
      return jsonError(400, "FILE_REQUIRED", "กรุณาเลือกไฟล์รูปภาพ");
    }

    if (!ALLOWED_MIME_TYPES.has(uploaded.type)) {
      return jsonError(400, "INVALID_FILE_TYPE", "รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
    }

    if (uploaded.size === 0 || uploaded.size > MAX_FILE_SIZE) {
      return jsonError(400, "INVALID_FILE_SIZE", "ไฟล์รูปภาพต้องมีขนาดไม่เกิน 8 MB");
    }

    const path = `news/${context.user.id}/${crypto.randomUUID()}.${extensionFor(uploaded)}`;
    const { error: uploadError } = await context.supabase.storage
      .from("admin-media")
      .upload(path, uploaded, {
        contentType: uploaded.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Admin media upload failed", uploadError);
      return jsonError(500, "UPLOAD_FAILED", "ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่");
    }

    const { data: publicUrlData } = context.supabase.storage
      .from("admin-media")
      .getPublicUrl(path);

    await logAdminActivity(context.supabase, {
      actorId: context.user.id,
      action: "upload",
      resourceType: "media",
      summary: `อัปโหลดรูปภาพ: ${uploaded.name}`,
      details: { path, size: uploaded.size, mimeType: uploaded.type },
    });

    return Response.json(
      { data: { path, publicUrl: publicUrlData.publicUrl } },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected admin media upload error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่");
  }
}
