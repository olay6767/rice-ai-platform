import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

import { getAdminContext } from "@/lib/admin/auth";

export const runtime = "nodejs";

const MAX_MODEL_BYTES = 300 * 1024 * 1024;
const MODEL_PATH = /^disease-models\/[A-Za-z0-9][A-Za-z0-9._-]{1,99}\/[A-Za-z0-9][A-Za-z0-9._-]{0,179}\.keras$/;

function fail(status: number, message: string): Response {
  return Response.json(
    { error: { code: "DISEASE_MODEL_UPLOAD_ERROR", message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: HandleUploadBody;
  try {
    body = await request.json() as HandleUploadBody;
  } catch {
    return fail(400, "อ่านคำขออัปโหลดโมเดลไม่ได้");
  }

  try {
    const result = await handleUpload({
      request,
      body,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      onBeforeGenerateToken: async (pathname, clientPayload, multipart) => {
        const context = await getAdminContext();
        if (context.errorResponse || context.role !== "superadmin") {
          throw new Error("เฉพาะ Super Admin เท่านั้นที่อัปโหลดโมเดลโรคได้");
        }
        if (!multipart) throw new Error("ไฟล์โมเดลต้องอัปโหลดแบบ Multipart");
        if (!MODEL_PATH.test(pathname)) throw new Error("ชื่อหรือที่เก็บไฟล์โมเดลไม่ถูกต้อง");

        let payload: { modelVersion?: unknown } = {};
        try {
          payload = clientPayload ? JSON.parse(clientPayload) as { modelVersion?: unknown } : {};
        } catch {
          throw new Error("ข้อมูลเวอร์ชันโมเดลไม่ถูกต้อง");
        }
        const modelVersion = typeof payload.modelVersion === "string" ? payload.modelVersion : "";
        if (!pathname.startsWith(`disease-models/${modelVersion}/`)) {
          throw new Error("เวอร์ชันโมเดลไม่ตรงกับตำแหน่งไฟล์");
        }

        return {
          allowedContentTypes: ["application/octet-stream"],
          maximumSizeInBytes: MAX_MODEL_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ modelVersion, actorId: context.user?.id }),
        };
      },
      onUploadCompleted: async () => {
        // Registration and model validation happen in /api/admin/disease-models.
      },
    });
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Disease model client upload failed:", error);
    return fail(400, error instanceof Error ? error.message : "อัปโหลดโมเดลไม่สำเร็จ");
  }
}
