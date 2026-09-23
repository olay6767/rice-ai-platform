import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";

import { getAdminContext } from "@/lib/admin/auth";
import {
  inspectAgriculturalRows,
  type AgriculturalDatasetType,
  type ProvinceLookup,
} from "@/lib/admin/agricultural-import";
import { isSupportedDataFile, parseUploadFile } from "@/lib/admin/tabular-upload";

export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "no-store" };
const TABLES = {
  rice_price: "rice_price_series",
  flood: "flood_records",
  drought: "drought_records",
  storm: "storm_records",
} as const;
type DatasetType = AgriculturalDatasetType;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    INVALID_FILE_TYPE: "รองรับเฉพาะไฟล์ JSON, CSV และ Excel",
    ROW_LIMIT_EXCEEDED: "ไฟล์มีข้อมูลเกิน 20,000 แถว",
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

function requiredUuid(value: unknown): string {
  const id = requiredText(value, "รหัสเวอร์ชัน", 100);
  if (!UUID.test(id)) throw new RequestError("รหัสเวอร์ชันไม่ถูกต้อง");
  return id;
}

async function uploadDataset(
  request: Request,
  context: Awaited<ReturnType<typeof getAdminContext>>
): Promise<Response> {
  const form = await request.formData();
  const action = requiredText(form.get("action"), "คำสั่ง", 20);
  if (action !== "preview" && action !== "commit") {
    throw new RequestError("กรุณาตรวจไฟล์ก่อนยืนยันบันทึก");
  }
  const type = datasetType(form.get("type"));
  const versionId = requiredUuid(form.get("versionId"));
  const file = form.get("file");
  if (!(file instanceof File) || !isSupportedDataFile(file.name)) {
    throw new RequestError("กรุณาเลือกไฟล์ JSON, CSV หรือ Excel");
  }
  if (!file.size || file.size > MAX_FILE_SIZE) {
    throw new RequestError("ไฟล์ต้องมีขนาดมากกว่า 0 และไม่เกิน 10 MB");
  }

  const versionResult = await context.supabase
    .from("agricultural_dataset_versions")
    .select("id,dataset_type,label,status,revision")
    .eq("id", versionId)
    .eq("dataset_type", type)
    .maybeSingle();
  if (versionResult.error) throw versionResult.error;
  const version = versionResult.data;
  if (!version) throw new RequestError("ไม่พบเวอร์ชันที่เลือก", 404);
  if (version.status !== "draft") throw new RequestError("อัปโหลดได้เฉพาะฉบับร่าง", 409);

  let parsed: Awaited<ReturnType<typeof parseUploadFile>>;
  try {
    parsed = await parseUploadFile(file);
  } catch (error) {
    throw new RequestError(error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง");
  }
  const provinceResult = await context.supabase
    .from("rice_provinces")
    .select("id,province_th,province_en");
  if (provinceResult.error) throw provinceResult.error;
  const provinces: ProvinceLookup = { ids: new Set<number>(), names: new Map<string, number>() };
  for (const province of provinceResult.data ?? []) {
    const id = Number(province.id);
    provinces.ids.add(id);
    for (const name of [province.province_th, province.province_en]) {
      if (name) provinces.names.set(String(name).trim().replace(/\s+/g, "").toLowerCase(), id);
    }
  }

  const report = inspectAgriculturalRows(type, parsed.rows, provinces);
  const emptyDatasetError = report.rows.length === 0 && report.errorCount === 0
    ? [{ row: null, message: "ไม่พบแถวข้อมูลที่ตรงกับ dataset ที่เลือก" }]
    : [];
  const token = createHash("sha256")
    .update(JSON.stringify([version.id, version.revision, type, parsed.digest]))
    .digest("hex");
  const preview = {
    valid: report.errorCount === 0 && report.rows.length > 0,
    fileName: file.name,
    fileType: parsed.fileType,
    receivedRows: report.receivedRows,
    validRows: report.rows.length,
    errorCount: report.errorCount + emptyDatasetError.length,
    errors: [...report.errors, ...emptyDatasetError],
    warnings: report.warnings,
    provinceCount: report.provinceCount,
    years: report.years,
    duplicateCount: report.duplicateCount,
    unknownProvinceCount: report.unknownProvinceCount,
    previewRows: report.rows.slice(0, 10),
    columns: report.columns,
    token,
    revision: version.revision,
  };
  if (action === "preview") {
    return Response.json({ data: preview }, { headers: HEADERS });
  }
  if (!preview.valid) throw new RequestError("ไฟล์ยังมีข้อผิดพลาด กรุณาแก้ไขและตรวจใหม่");
  if (form.get("token") !== token) {
    throw new RequestError("ไฟล์หรือเวอร์ชันเปลี่ยนหลังตรวจ กรุณาตรวจไฟล์ใหม่", 409);
  }

  const validation = {
    rowCount: report.rows.length,
    provinceCount: report.provinceCount,
    minYear: report.years.at(0) ?? null,
    maxYear: report.years.at(-1) ?? null,
    missingCount: report.errorCount,
    duplicateCount: report.duplicateCount,
    unknownProvinceCount: report.unknownProvinceCount,
    warnings: report.warnings,
  };
  const result = await context.supabase.rpc("agricultural_dataset_import", {
    p_id: version.id,
    p_dataset_type: type,
    p_rows: report.rows,
    p_revision: version.revision,
    p_file_name: file.name,
    p_file_type: parsed.fileType,
    p_validation: validation,
  });
  if (result.error) throw result.error;
  invalidate(type);
  return Response.json({ data: { ...result.data, preview } }, { headers: HEADERS });
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
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      return await uploadDataset(request, context);
    }
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
