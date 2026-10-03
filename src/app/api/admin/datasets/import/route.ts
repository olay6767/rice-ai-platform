import { createHash } from "node:crypto";
import * as XLSX from "xlsx";
import { getAdminContext } from "@/lib/admin/auth";
import { AGRICULTURAL_TYPES, AgriculturalImportError, inspectAgriculturalRows, parseAgriculturalFile, type AgriculturalType } from "@/lib/admin/agricultural-import";

export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "no-store" };
const TABLES: Record<AgriculturalType, string> = {
  rice_price: "rice_price_series", flood: "flood_records", drought: "drought_records", storm: "storm_records",
};
const RICE_PRICE_TEMPLATE = [
  {
    observed_on: "2024-01-01",
    rice_type: "ข้าวหอมมะลิ",
    rice_type_code: "jasmine",
    price: 15000,
    year: 2024,
    month: 1,
    unit: "บาท/ตัน",
    data_type: "actual",
    is_imputed: false,
    model_name: "",
    model_version: "",
    forecast_date: "",
    reliability: "",
    reliability_label: "",
    metadata: "{}",
    source: "ตัวอย่างสำหรับนำเข้า",
  },
  {
    observed_on: "2024-02-01",
    rice_type: "ข้าวหอมมะลิ",
    rice_type_code: "jasmine",
    price: 15250,
    year: 2024,
    month: 2,
    unit: "บาท/ตัน",
    data_type: "actual",
    is_imputed: false,
    model_name: "",
    model_version: "",
    forecast_date: "",
    reliability: "",
    reliability_label: "",
    metadata: "{}",
    source: "ตัวอย่างสำหรับนำเข้า",
  },
];

function responseError(error: unknown): Response {
  if (error instanceof AgriculturalImportError) return Response.json({ error: { code: error.code, message: error.message } }, { status: 400, headers: HEADERS });
  const database = error as { message?: string; code?: string };
  const known: Record<string, string> = {
    ADMIN_REQUIRED: "เฉพาะผู้ดูแลระบบเท่านั้น", DRAFT_REQUIRED: "นำเข้าได้เฉพาะฉบับร่าง",
    VERSION_CHANGED: "เวอร์ชันเปลี่ยนแล้ว กรุณาตรวจไฟล์ใหม่", VERSION_NOT_FOUND: "ไม่พบเวอร์ชัน",
    INVALID_ROWS: "จำนวนแถวไม่ถูกต้อง", INVALID_FILE: "ชื่อหรือประเภทไฟล์ไม่ถูกต้อง",
  };
  if (database.message && known[database.message]) return Response.json({ error: { code: database.message, message: known[database.message] } }, { status: 409, headers: HEADERS });
  if (database.code === "23505") return Response.json({ error: { code: "DUPLICATE", message: "พบข้อมูลซ้ำในไฟล์" } }, { status: 409, headers: HEADERS });
  if (["PGRST202", "42P01"].includes(database.code ?? "")) return Response.json({ error: { code: "MIGRATION_REQUIRED", message: "กรุณา Apply migration นำเข้าข้อมูลก่อน" } }, { status: 503, headers: HEADERS });
  console.error("Agricultural import failed", error);
  return Response.json({ error: { code: "IMPORT_FAILED", message: "นำเข้าข้อมูลไม่สำเร็จ ตรวจคอลัมน์และค่าข้อมูลแล้วลองใหม่" } }, { status: 500, headers: HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  try {
    const type = new URL(request.url).searchParams.get("type");
    if (type !== "rice_price") {
      throw new AgriculturalImportError("ไฟล์ตัวอย่างนี้รองรับข้อมูลราคาข้าวเท่านั้น", "INVALID_TYPE");
    }
    const worksheet = XLSX.utils.json_to_sheet(RICE_PRICE_TEMPLATE);
    worksheet["!cols"] = Object.keys(RICE_PRICE_TEMPLATE[0]).map((key) => ({ wch: Math.max(12, key.length + 2) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "rice_price");
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
    return new Response(new Uint8Array(buffer), {
      headers: {
        ...HEADERS,
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="rice_price_import_template.xlsx"',
      },
    });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const context = await getAdminContext();
  if (context.errorResponse) return context.errorResponse;
  try {
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) {
      return Response.json({ error: { code: "FORBIDDEN_ORIGIN", message: "ไม่อนุญาตคำขอจากเว็บไซต์อื่น" } }, { status: 403, headers: HEADERS });
    }
    if (Number(request.headers.get("content-length") ?? 0) > 10 * 1024 * 1024 + 128 * 1024) {
      return Response.json({ error: { code: "FILE_SIZE", message: "ไฟล์เกิน 10 MB" } }, { status: 413, headers: HEADERS });
    }
    const form = await request.formData();
    const action = form.get("action");
    const type = form.get("type");
    const id = form.get("versionId");
    const file = form.get("file");
    if (action !== "preview" && action !== "commit") throw new AgriculturalImportError("คำสั่งไม่ถูกต้อง");
    if (typeof type !== "string" || !AGRICULTURAL_TYPES.includes(type as AgriculturalType)) throw new AgriculturalImportError("ประเภทข้อมูลไม่ถูกต้อง");
    if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) throw new AgriculturalImportError("รหัสเวอร์ชันไม่ถูกต้อง");
    if (!(file instanceof File)) throw new AgriculturalImportError("กรุณาเลือกไฟล์");
    if (file.size > 10 * 1024 * 1024) throw new AgriculturalImportError("ไฟล์เกิน 10 MB", "FILE_SIZE");
    const datasetType = type as AgriculturalType;
    const versionResult = await context.supabase.from("agricultural_dataset_versions")
      .select("id,dataset_type,status,revision").eq("id", id).single();
    if (versionResult.error || versionResult.data?.dataset_type !== datasetType) throw new AgriculturalImportError("ไม่พบเวอร์ชันที่เลือก", "VERSION_NOT_FOUND");
    if (versionResult.data.status !== "draft") throw new AgriculturalImportError("นำเข้าได้เฉพาะฉบับร่าง", "DRAFT_REQUIRED");
    const bytes = new Uint8Array(await file.arrayBuffer());
    const source = parseAgriculturalFile(file.name, bytes);
    const provincesResult = await context.supabase.from("rice_provinces").select("id,province_th,province_en");
    if (provincesResult.error) throw provincesResult.error;
    const report = inspectAgriculturalRows(datasetType, source, provincesResult.data ?? []);
    const token = createHash("sha256")
      .update(JSON.stringify([context.user.id, id, datasetType, versionResult.data.revision, file.name]))
      .update(bytes).digest("hex");
    const countResult = await context.supabase.from(TABLES[datasetType]).select("id", { count: "exact", head: true }).eq("version_id", id);
    if (countResult.error) throw countResult.error;
    if (action === "preview") {
      return Response.json({ data: {
        ...report, rows: undefined, previewRows: report.rows.slice(0, 10),
        replacedRows: countResult.count ?? 0, token, revision: versionResult.data.revision,
      } }, { headers: HEADERS });
    }
    if (!report.valid) throw new AgriculturalImportError(`พบข้อผิดพลาด ${report.errorCount} จุด กรุณาตรวจไฟล์ใหม่`, "VALIDATION_FAILED");
    if (form.get("token") !== token || Number(form.get("revision")) !== versionResult.data.revision) {
      throw new AgriculturalImportError("ไฟล์หรือเวอร์ชันเปลี่ยนหลัง Preview กรุณาตรวจไฟล์ใหม่", "PREVIEW_EXPIRED");
    }
    const fileType = file.name.toLowerCase().split(".").pop()!;
    const result = await context.supabase.rpc("agricultural_dataset_import", {
      p_id: id, p_dataset_type: datasetType, p_revision: versionResult.data.revision,
      p_rows: report.rows, p_file_name: file.name, p_file_type: fileType,
      p_validation_summary: { rowCount: report.validRows, provinceCount: report.provinceCount,
        minYear: report.minYear, maxYear: report.maxYear, missingCount: 0,
        duplicateCount: 0, unknownProvinceCount: 0 },
    });
    if (result.error) throw result.error;
    return Response.json({ data: result.data }, { headers: HEADERS });
  } catch (error) {
    return responseError(error);
  }
}
