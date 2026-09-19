import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin/auth";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };
const TABLES = {
  rice_price: "rice_price_series",
  flood: "flood_records",
  drought: "drought_records",
  storm: "storm_records",
} as const;
type DatasetType = keyof typeof TABLES;

class RequestError extends Error {
  constructor(message: string, public readonly status = 400) {
    super(message);
  }
}

function datasetType(value: unknown): DatasetType {
  if (typeof value !== "string" || !(value in TABLES)) {
    throw new RequestError("ประเภทข้อมูลไม่ถูกต้อง");
  }
  return value as DatasetType;
}

function requiredText(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > max) {
    throw new RequestError(`${label}ไม่ถูกต้อง`);
  }
  return value.trim();
}

function optionalText(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" || value.trim().length > max) {
    throw new RequestError("ข้อความยาวเกินกำหนด");
  }
  return value.trim();
}

function fail(error: unknown): Response {
  if (error instanceof RequestError) {
    return Response.json(
      { error: { code: "INVALID_REQUEST", message: error.message } },
      { status: error.status, headers: HEADERS }
    );
  }
  const databaseError = error as { code?: string; message?: string };
  const known: Record<string, string> = {
    ADMIN_REQUIRED: "บัญชีนี้ไม่มีสิทธิ์ผู้ดูแลระบบ",
    SUPERADMIN_REQUIRED: "เฉพาะ Super Admin เท่านั้นที่กำหนด Dataset เริ่มต้นได้",
    VERSION_NOT_FOUND: "ไม่พบเวอร์ชันที่เลือก",
    VERSION_CHANGED: "ข้อมูลเปลี่ยนหลังจากเปิดหน้านี้ กรุณารีเฟรชก่อนทำรายการ",
    INVALID_DATASET_TYPE: "ประเภทข้อมูลไม่ถูกต้อง",
    INVALID_ACTION: "คำสั่งจัดการเวอร์ชันไม่ถูกต้อง",
    DATA_REQUIRED: "ต้องมีข้อมูลอย่างน้อยหนึ่งแถวก่อนเผยแพร่",
    DRAFT_REQUIRED: "ดำเนินการนี้ได้เฉพาะฉบับร่าง",
    PUBLISHED_REQUIRED: "เลือกเป็นค่าเริ่มต้นได้เฉพาะเวอร์ชันที่เผยแพร่แล้ว",
    ARCHIVED_REQUIRED: "เวอร์ชันนี้ไม่ได้อยู่ในคลัง",
    DEFAULT_PROTECTED: "กรุณาเลือกเวอร์ชันเริ่มต้นอื่นก่อนเก็บเวอร์ชันนี้เข้าคลัง",
  };
  if (databaseError.message && known[databaseError.message]) {
    return Response.json(
      { error: { code: databaseError.message, message: known[databaseError.message] } },
      { status: 409, headers: HEADERS }
    );
  }
  if (databaseError.code === "23505") {
    return Response.json(
      { error: { code: "DUPLICATE_VERSION", message: "รหัสเวอร์ชันนี้มีอยู่แล้ว" } },
      { status: 409, headers: HEADERS }
    );
  }
  console.error("Agricultural dataset administration failed", error);
  return Response.json(
    { error: { code: "DATASET_ADMIN_ERROR", message: "ไม่สามารถจัดการ Dataset ได้" } },
    { status: 500, headers: HEADERS }
  );
}

function invalidate(type: DatasetType) {
  const path = type === "rice_price" ? "/analytics/rice-price" : `/analytics/${type}`;
  revalidatePath(path);
  revalidatePath(`/api/v1/datasets/${type}`);
}

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  try {
    const type = datasetType(new URL(request.url).searchParams.get("type"));
    const versionsResult = await context.supabase
      .from("agricultural_dataset_versions")
      .select("*")
      .eq("dataset_type", type)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });
    if (versionsResult.error) throw versionsResult.error;
    const versions = versionsResult.data ?? [];
    const summaries = await Promise.all(versions.map(async (version) => {
      const [countResult, importResult, eventResult] = await Promise.all([
        context.supabase.from(TABLES[type]).select("*", { count: "exact", head: true }).eq("version_id", version.id),
        context.supabase.from("agricultural_import_files").select("file_name,file_type,row_count,validation_summary,imported_at").eq("version_id", version.id).order("imported_at", { ascending: false }),
        context.supabase.from("agricultural_dataset_events").select("action,summary,created_at").eq("version_id", version.id).order("created_at", { ascending: false }).limit(10),
      ]);
      const firstError = countResult.error ?? importResult.error ?? eventResult.error;
      if (firstError) throw firstError;
      return {
        ...version,
        record_count: countResult.count ?? 0,
        import_files: importResult.data ?? [],
        recent_events: eventResult.data ?? [],
      };
    }));
    return Response.json(
      { data: { type, versions: summaries, canSetDefault: context.role === "superadmin" } },
      { headers: HEADERS }
    );
  } catch (error) {
    return fail(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = datasetType(body.type);
    const result = await context.supabase.rpc("agricultural_dataset_create_version", {
      p_dataset_type: type,
      p_key: requiredText(body.key, "รหัสเวอร์ชัน", 50).toLowerCase(),
      p_label: requiredText(body.label, "ชื่อเวอร์ชัน", 120),
      p_description: optionalText(body.description, 1000) ?? "",
      p_source_name: optionalText(body.sourceName, 200) ?? "",
      p_source_url: optionalText(body.sourceUrl, 1000),
    });
    if (result.error) throw result.error;
    return Response.json({ data: result.data }, { status: 201, headers: HEADERS });
  } catch (error) {
    return fail(error);
  }
}

export async function PATCH(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  try {
    const body = await request.json() as Record<string, unknown>;
    const type = datasetType(body.type);
    const id = requiredText(body.id, "รหัสรายการ", 100);
    const action = requiredText(body.action, "คำสั่ง", 30);
    const revision = Number(body.revision);
    if (!Number.isInteger(revision) || revision < 0) throw new RequestError("Revision ไม่ถูกต้อง");
    const result = await context.supabase.rpc("agricultural_dataset_change_version", {
      p_id: id,
      p_action: action,
      p_revision: revision,
      p_label: optionalText(body.label, 120),
      p_description: optionalText(body.description, 1000),
      p_source_name: optionalText(body.sourceName, 200),
      p_source_url: optionalText(body.sourceUrl, 1000),
    });
    if (result.error) throw result.error;
    invalidate(type);
    return Response.json({ data: result.data }, { headers: HEADERS });
  } catch (error) {
    return fail(error);
  }
}
