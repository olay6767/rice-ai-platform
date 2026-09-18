import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getAdminContext } from "@/lib/admin/auth";
import { inferDashboardDatasetType, inspectDashboardCsv, inspectDashboardRecord, isDashboardDatasetType } from "@/lib/admin/dashboard-import";
import { DASHBOARD_DATASETS, getDashboardDataset, type DashboardDatasetType, type DashboardRow, type AdminDashboardVersion, type DashboardImportFile, type ImportPreview } from "@/lib/admin/dashboard-types";

export const runtime = "nodejs";
const HEADERS = { "Cache-Control": "no-store" };
const MAX_SIZE = 10 * 1024 * 1024;
const MAX_BATCH_SIZE = MAX_SIZE * DASHBOARD_DATASETS.length + 128 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Database = Awaited<ReturnType<typeof getAdminContext>>["supabase"];

class RequestError extends Error {
  constructor(message: string, public status = 400, public code = "INVALID_REQUEST") { super(message); }
}
function fail(error: unknown): Response {
  if (error instanceof RequestError) return Response.json({error: {code: error.code, message: error.message}}, {status: error.status, headers: HEADERS});
  const db = error as {code?: string; message?: string};
  const messages: Record<string,string> = {
    VERSION_NOT_FOUND: "ไม่พบเวอร์ชันที่เลือก", VERSION_CHANGED: "ข้อมูลเปลี่ยนหลังจากเปิดหน้านี้ กรุณารีเฟรชและตรวจไฟล์ใหม่",
    DRAFT_REQUIRED: "แก้ไขข้อมูลได้เฉพาะฉบับร่าง กรุณาปิดการเผยแพร่หรือคัดลอกเป็นฉบับร่างก่อน",
    REPLACEMENT_REQUIRED: "กรุณาเลือกเวอร์ชันที่เผยแพร่แล้วเพื่อใช้เป็นค่าเริ่มต้นแทน",
    INVALID_REPLACEMENT: "สถานะเวอร์ชันเปลี่ยนแล้ว กรุณารีเฟรชก่อนปิดการเผยแพร่",
    RECORD_NOT_FOUND: "ไม่พบแถวข้อมูลในเวอร์ชันนี้ กรุณารีเฟรชตาราง",
    RECORD_KEY_CHANGED: "ไม่สามารถเปลี่ยนจังหวัด ปี เดือน หรือรหัสโมเดลของแถวเดิมได้",
    INVALID_ROW: "คอลัมน์ข้อมูลไม่ครบหรือไม่ถูกต้อง กรุณารีเฟรชตาราง",
    DEFAULT_PROTECTED: "เปลี่ยนเวอร์ชันเริ่มต้นเป็นรุ่นอื่นก่อนเก็บรุ่นนี้เข้าคลัง",
    PUBLISHED_DELETE_PROTECTED: "ปิดการเผยแพร่ก่อน จึงจะลบเวอร์ชันนี้ได้",
    LAST_PUBLISHED_PROTECTED: "ต้องเหลือเวอร์ชันที่เผยแพร่อย่างน้อยหนึ่งรุ่น",
    YEARLY_DATA_REQUIRED: "ต้องมีข้อมูลผลผลิตรายปีอย่างน้อยหนึ่งแถวก่อนเผยแพร่",
    PREDICTIONS_MISMATCH: "ข้อมูลผลผลิตจริงในไฟล์พยากรณ์ไม่ตรงกับผลผลิตรายปี หรือไม่มีจังหวัด/ปีนั้นในข้อมูลรายปี",
    MULTIPLE_MODELS: "หนึ่งเวอร์ชัน Dashboard ต้องมีผลพยากรณ์จากโมเดลเดียว",
    PUBLISHED_REQUIRED: "เลือกได้เฉพาะเวอร์ชันที่เผยแพร่แล้ว", ARCHIVED_REQUIRED: "เวอร์ชันนี้ไม่ได้อยู่ในคลัง",
    INVALID_BATCH: "กรุณาเลือกไฟล์ CSV ไม่เกิน 3 ไฟล์ และต้องไม่ซ้ำประเภทข้อมูล", INVALID_DATASET: "ไม่สามารถระบุประเภทข้อมูลได้",
    IMPORT_FILE_NOT_FOUND: "ไม่พบไฟล์นำเข้ารายการนี้ กรุณารีเฟรชรายการไฟล์",
  };
  if (db?.message && messages[db.message]) return Response.json({error:{code:db.message,message:messages[db.message]}}, {status:409,headers:HEADERS});
  if (db?.code === "23505") return Response.json({error:{code:"DUPLICATE",message:"รหัสเวอร์ชันหรือรายการข้อมูลซ้ำ กรุณาใช้รหัสใหม่"}},{status:409,headers:HEADERS});
  if (["42P01","42703","PGRST202","PGRST205"].includes(db?.code ?? "")) return Response.json({error:{code:"SCHEMA_NOT_READY",message:"กรุณาติดตั้ง Migration 202609040001 เพื่อเปิดใช้ระบบลบเวอร์ชัน Dashboard"}},{status:503,headers:HEADERS});
  console.error("Dashboard administration failed", error);
  return Response.json({error:{code:"INTERNAL_ERROR",message:"ไม่สามารถดำเนินการได้ กรุณาลองใหม่ ข้อมูลในไฟล์จะบันทึกครบหรือไม่บันทึกเลย"}},{status:500,headers:HEADERS});
}
function success(data: unknown) { return Response.json({data}, {headers:HEADERS}); }
function uuid(value: unknown): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new RequestError("กรุณาเลือกเวอร์ชันที่ถูกต้อง");
  return value;
}
function text(value: unknown, max: number, min = 0): string {
  if (typeof value !== "string" || value.trim().length < min || value.trim().length > max) throw new RequestError(`ข้อความต้องมีความยาว ${min}–${max} ตัวอักษร`);
  return value.trim();
}
function integer(value: string | null, fallback: number, min: number, max: number): number {
  if (value === null || value === "") return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < min || n > max) throw new RequestError("ตัวกรองตัวเลขไม่ถูกต้อง");
  return n;
}
async function versionById(db: Database, id: string): Promise<AdminDashboardVersion> {
  const result = await db.from("rice_dashboard_versions").select("*").eq("id",id).maybeSingle();
  if (result.error) throw result.error;
  if (!result.data) throw new RequestError("ไม่พบเวอร์ชันที่เลือก",404);
  return result.data as AdminDashboardVersion;
}
function invalidate() {
  revalidatePath("/dashboard");
  revalidatePath("/analytics/yield","layout");
  revalidatePath("/api/v1/dashboard");
  revalidatePath("/api/v1/dashboard/versions");
}
function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g,'""') + '"' : s;
}
function csvResponse(name: string, columns: string[], rows: Record<string,unknown>[]): Response {
  const csv = [columns.join(","),...rows.map(row=>columns.map(key=>csvCell(row[key])).join(","))].join("\r\n");
  return new Response("\uFEFF"+csv, {headers:{...HEADERS,"Content-Type":"text/csv; charset=utf-8","Content-Disposition":`attachment; filename="${name}"`}});
}
async function allKeys(db: Database, table: string, keys: readonly string[], id: string) {
  const rows: DashboardRow[] = [];
  for (let from = 0; ; from += 1000) {
    const result = await db.from(table).select(keys.join(",")).eq("dashboard_version_id",id).order("id").range(from,from+999);
    if (result.error) throw result.error;
    const page = (result.data ?? []) as unknown as DashboardRow[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

interface PreparedBatchFile {
  datasetType: DashboardDatasetType;
  fileName: string;
  source: string;
  report: ReturnType<typeof inspectDashboardCsv>;
}

function validCsvFile(file: File): void {
  if (!file.name.toLowerCase().endsWith(".csv")) {
    throw new RequestError(`ไฟล์ “${file.name}” ต้องเป็น .csv`);
  }
  if (!file.size || file.size > MAX_SIZE) {
    throw new RequestError(`ไฟล์ “${file.name}” ต้องมีขนาดไม่เกิน 10 MB`);
  }
}

async function prepareBatchFiles(
  files: File[],
  provinceIds: Set<number>
): Promise<PreparedBatchFile[]> {
  if (!files.length || files.length > DASHBOARD_DATASETS.length) {
    throw new RequestError("เลือกไฟล์ CSV ได้ครั้งละ 1–3 ไฟล์", 400, "INVALID_BATCH");
  }

  const prepared: PreparedBatchFile[] = [];
  const types = new Set<DashboardDatasetType>();
  for (const file of files) {
    validCsvFile(file);
    const source = await file.text();
    let datasetType: DashboardDatasetType;
    try {
      datasetType = inferDashboardDatasetType(source);
    } catch (cause) {
      throw new RequestError(
        `ไฟล์ “${file.name}”: ${cause instanceof Error ? cause.message : "ไม่สามารถระบุประเภทข้อมูลได้"}`
      );
    }
    if (types.has(datasetType)) {
      throw new RequestError(
        `พบไฟล์ประเภท “${getDashboardDataset(datasetType).label}” มากกว่าหนึ่งไฟล์ กรุณารวมข้อมูลเป็นไฟล์เดียวก่อน`,
        400,
        "INVALID_BATCH"
      );
    }
    types.add(datasetType);
    prepared.push({
      datasetType,
      fileName: file.name,
      source,
      report: inspectDashboardCsv(datasetType, source, provinceIds),
    });
  }

  return prepared;
}

async function batchPreviewItems(
  db: Database,
  versionId: string,
  prepared: PreparedBatchFile[]
): Promise<Array<ImportPreview & { datasetType: DashboardDatasetType }>> {
  return Promise.all(
    prepared.map(async (item) => {
      const dataset = getDashboardDataset(item.datasetType);
      const existing = await allKeys(db, dataset.table, dataset.keys, versionId);
      const key = (row: DashboardRow) =>
        JSON.stringify(dataset.keys.map((column) => row[column]));
      const current = new Set(existing.map(key));
      const updates = item.report.rows.filter((row) => current.has(key(row))).length;

      return {
        datasetType: item.datasetType,
        valid: item.report.errorCount === 0,
        fileName: item.fileName,
        receivedRows: item.report.receivedRows,
        validRows: item.report.rows.length,
        errorCount: item.report.errorCount,
        errors: item.report.errors,
        warnings: item.report.warnings,
        provinceCount: item.report.provinceCount,
        years: item.report.years,
        inserts: item.report.rows.length - updates,
        updates,
        previewRows: item.report.rows.slice(0, 10),
        columns: dataset.columns.map((column) => column.key),
        token: "",
        revision: 0,
      };
    })
  );
}
export async function GET(request: Request): Promise<Response> {
  try {
    const context = await getAdminContext();
    if (context.errorResponse) return context.errorResponse;
    const db = context.supabase;
    const params = new URL(request.url).searchParams;
    const mode = params.get("mode") ?? "status";
    if (mode === "status") {
      const result = await db.rpc("rice_dashboard_admin_summary");
      if (result.error) throw result.error;
      const versions = (result.data ?? []) as AdminDashboardVersion[];
      return success({versions:versions.map(version=>({...version,datasets:version.datasets.map(item=>({...item,label:getDashboardDataset(item.type).label}))}))});
    }
    if (mode === "provinces") {
      const result = await db.from("rice_provinces").select("id,province_th,province_en,region").order("id");
      if (result.error) throw result.error;
      if (params.get("download") === "1") return csvResponse("province_codes.csv",["province_id","province_th","province_en","region"],(result.data ?? []).map(row=>({...row,province_id:row.id})));
      return success(result.data ?? []);
    }
    const type = params.get("dataset");
    if (mode === "template") {
      if (!isDashboardDatasetType(type)) throw new RequestError("กรุณาเลือกประเภทข้อมูล");
      const dataset = getDashboardDataset(type);
      const example = Object.fromEntries(dataset.columns.map(column=>[column.key, Number.isFinite(Number(column.example)) ? Number(column.example) : column.example]));
      return csvResponse("example_"+dataset.fileName,dataset.columns.map(column=>column.key),[example]);
    }
    const id = uuid(params.get("versionId"));
    const version = await versionById(db,id);
    const page = integer(params.get("page"),1,1,100000);
    if (mode === "import-files") {
      const result = await db.rpc("rice_dashboard_list_import_files", {p_id:id});
      if (result.error) throw result.error;
      return success({files:(result.data ?? []) as DashboardImportFile[]});
    }
    if (mode === "history") {
      const result = await db.from("rice_dashboard_events").select("id,action,actor_name,summary,details,created_at",{count:"exact"}).eq("version_id",id).order("created_at",{ascending:false}).order("id").range((page-1)*20,page*20-1);
      if (result.error) throw result.error;
      return success({events:result.data ?? [],count:result.count ?? 0,page});
    }
    if (!["records","export"].includes(mode) || !isDashboardDatasetType(type)) throw new RequestError("ประเภทการดูข้อมูลไม่ถูกต้อง");
    const dataset = getDashboardDataset(type);
    const columns = dataset.columns.map(column=>column.key);
    let query = db.from(dataset.table).select((mode === "records" ? ["id",...columns] : columns).join(","),{count:"exact"}).eq("dashboard_version_id",id);
    if (params.get("province")) query = query.eq("province_id",integer(params.get("province"),0,1,999));
    if (params.get("year")) query = query.eq(dataset.period,integer(params.get("year"),0,1900,2200));
    query = query.order("province_id").order(dataset.period);
    if (type === "monthly-environment") query = query.order("month");
    if (type === "yield-predictions") query = query.order("model_version");
    if (mode === "records") {
      const result = await query.range((page-1)*25,page*25-1);
      if (result.error) throw result.error;
      return success({rows:result.data ?? [],count:result.count ?? 0,page,pageSize:25});
    }
    const rows: Record<string,unknown>[] = [];
    for (let from = 0; ; from += 1000) {
      const result = await query.range(from,from+999);
      if (result.error) throw result.error;
      if ((result.count ?? 0) > 20000) throw new RequestError("ข้อมูลเกิน 20,000 แถว กรุณากรองจังหวัดหรือปีก่อนดาวน์โหลด");
      rows.push(...(result.data ?? []) as unknown as Record<string,unknown>[]);
      if ((result.data?.length ?? 0) < 1000) break;
    }
    return csvResponse(version.version_key+"_"+dataset.fileName,columns,rows);
  } catch (error) { return fail(error); }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const context = await getAdminContext();
    if (context.errorResponse || !context.user) return context.errorResponse ?? new Response(null,{status:401});
    const db = context.supabase;
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) throw new RequestError("ไม่อนุญาตคำขอจากเว็บไซต์อื่น",403);
    if (Number(request.headers.get("content-length") ?? 0) > MAX_BATCH_SIZE) throw new RequestError("ไฟล์ที่เลือกมีขนาดรวมเกิน 30 MB",413);
    if (request.headers.get("content-type")?.includes("application/json")) {
      const raw = await request.text();
      if (raw.length > 4000) throw new RequestError("คำขอมีขนาดใหญ่เกินไป");
      let body: Record<string,unknown>;
      try { body = JSON.parse(raw); } catch { throw new RequestError("รูปแบบคำขอไม่ถูกต้อง"); }
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new RequestError("รูปแบบคำขอไม่ถูกต้อง");
      if (body.action === "create") {
        const key = text(body.versionKey,50,2).toLowerCase();
        if (!/^[a-z0-9][a-z0-9._-]{1,49}$/.test(key)) throw new RequestError("รหัสเวอร์ชันใช้ a-z, 0-9, จุด ขีดกลาง และขีดล่าง");
        const result = await db.rpc("rice_dashboard_create_version",{
          p_key:key,p_label:text(body.label,120,2),p_description:text(body.description ?? "",500),
          p_source_id:body.sourceId ? uuid(body.sourceId) : null,
        });
        if (result.error) throw result.error;
        return success(result.data);
      }
      if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 0) throw new RequestError("กรุณารีเฟรชข้อมูลเวอร์ชัน");
      if (body.action === "clear-dataset") {
        if (!isDashboardDatasetType(body.datasetType)) throw new RequestError("กรุณาเลือกประเภทข้อมูล");
        const result = await db.rpc("rice_dashboard_clear_dataset",{
          p_id:uuid(body.versionId),p_dataset:body.datasetType,p_revision:body.revision,
        });
        if (result.error) throw result.error;
        invalidate();
        return success(result.data);
      }
      if (body.action === "delete-row") {
        if (!isDashboardDatasetType(body.datasetType)) throw new RequestError("กรุณาเลือกประเภทข้อมูล");
        if (!Number.isSafeInteger(body.recordId) || Number(body.recordId) < 1) throw new RequestError("กรุณาเลือกแถวข้อมูลที่ถูกต้อง");
        const result = await db.rpc("rice_dashboard_delete_record",{
          p_id:uuid(body.versionId),p_dataset:body.datasetType,p_record_id:body.recordId,p_revision:body.revision,
        });
        if (result.error) throw result.error;
        invalidate();
        return success(result.data);
      }
      if (body.action === "delete-import-file") {
        const result = await db.rpc("rice_dashboard_delete_import_file",{
          p_id:uuid(body.versionId),p_import_file_id:uuid(body.importFileId),p_revision:body.revision,
        });
        if (result.error) throw result.error;
        invalidate();
        return success(result.data);
      }
      if (body.action === "edit-row") {
        if (!isDashboardDatasetType(body.datasetType)) throw new RequestError("กรุณาเลือกประเภทข้อมูล");
        if (!Number.isSafeInteger(body.recordId) || Number(body.recordId) < 1) throw new RequestError("กรุณาเลือกแถวข้อมูลที่ถูกต้อง");
        const version = await versionById(db,uuid(body.versionId));
        if (version.status !== "draft") throw new RequestError("ปิดการเผยแพร่หรือคัดลอกเป็นฉบับร่างก่อนแก้ไขข้อมูล",409);
        const provinces = await db.from("rice_provinces").select("id");
        if (provinces.error) throw provinces.error;
        let row: DashboardRow;
        try { row = inspectDashboardRecord(body.datasetType,body.row,new Set((provinces.data ?? []).map(item=>Number(item.id)))); }
        catch (error) { throw new RequestError(error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง"); }
        const result = await db.rpc("rice_dashboard_update_record",{
          p_id:version.id,p_dataset:body.datasetType,p_record_id:body.recordId,p_row:row,p_revision:body.revision,
        });
        if (result.error) throw result.error;
        return success(result.data);
      }
      if (body.action === "unpublish") {
        const result = await db.rpc("rice_dashboard_unpublish_version",{
          p_id:uuid(body.versionId),p_revision:body.revision,
          p_replacement_id:body.replacementVersionId ? uuid(body.replacementVersionId) : null,
        });
        if (result.error) throw result.error;
        invalidate();
        return success(result.data);
      }
      if (body.action === "delete") {
        const result = await db.rpc("rice_dashboard_delete_version",{
          p_id:uuid(body.versionId),p_revision:body.revision,
        });
        if (result.error) throw result.error;
        invalidate();
        return success(result.data);
      }
      if (!["edit","publish","publish-default","default","archive","restore"].includes(String(body.action))) throw new RequestError("การดำเนินการไม่ถูกต้อง");
      const result = await db.rpc("rice_dashboard_change_version",{
        p_id:uuid(body.versionId),p_action:body.action,p_revision:body.revision,
        p_label:body.action === "edit" ? text(body.label,120,2) : null,
        p_description:body.action === "edit" ? text(body.description ?? "",500) : null,
      });
      if (result.error) throw result.error;
      invalidate();
      return success(result.data);
    }
    const form = await request.formData();
    const action = form.get("action");
    if (action === "batch-preview" || action === "batch-commit") {
      const files = form
        .getAll("files")
        .filter((entry): entry is File => entry instanceof File);
      const version = await versionById(db,uuid(form.get("versionId")));
      if (version.status !== "draft") throw new RequestError("อัปโหลดได้เฉพาะฉบับร่าง กรุณาคัดลอกเวอร์ชันเดิมเพื่อแก้ไข",409);
      const provinces = await db.from("rice_provinces").select("id");
      if (provinces.error) throw provinces.error;
      const prepared = await prepareBatchFiles(
        files,
        new Set((provinces.data ?? []).map((row) => Number(row.id)))
      );
      const items = await batchPreviewItems(db,version.id,prepared);
      const token = createHash("sha256")
        .update(JSON.stringify([version.id,version.revision,prepared.map((item) => [item.datasetType,item.fileName,item.source])]))
        .digest("hex");
      const preview = {
        valid: items.every((item) => item.valid),
        items: items.map((item) => ({ ...item, token, revision: version.revision })),
        errorCount: items.reduce((count,item) => count + item.errorCount,0),
        token,
        revision: version.revision,
      };

      if (action === "batch-preview") return success(preview);
      if (!preview.valid) throw new RequestError("มีไฟล์ที่ยังมีข้อผิดพลาด กรุณาตรวจและแก้ไขก่อนบันทึก");
      if (form.get("token") !== token) throw new RequestError("ไฟล์หรือเวอร์ชันเปลี่ยนหลังตรวจ กรุณาตรวจไฟล์ใหม่",409,"PREVIEW_EXPIRED");
      const result = await db.rpc("rice_dashboard_import_batch",{
        p_id:version.id,
        p_items:prepared.map((item) => ({datasetType:item.datasetType,fileName:item.fileName,rows:item.report.rows})),
        p_revision:version.revision,
      });
      if (result.error) throw result.error;
      invalidate();
      return success({ ...result.data, preview });
    }
    if (action !== "preview" && action !== "commit") throw new RequestError("กรุณาตรวจไฟล์ก่อนยืนยันบันทึก");
    const type = form.get("datasetType");
    if (!isDashboardDatasetType(type)) throw new RequestError("กรุณาเลือกประเภทข้อมูล");
    const file = form.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".csv")) throw new RequestError("กรุณาเลือกไฟล์ .csv");
    if (!file.size || file.size > MAX_SIZE) throw new RequestError("ขนาดไฟล์ต้องมากกว่า 0 และไม่เกิน 10 MB");
    const version = await versionById(db,uuid(form.get("versionId")));
    if (version.status !== "draft") throw new RequestError("อัปโหลดได้เฉพาะฉบับร่าง กรุณาคัดลอกเวอร์ชันเดิมเพื่อแก้ไข",409);
    const provinces = await db.from("rice_provinces").select("id");
    if (provinces.error) throw provinces.error;
    const source = await file.text();
    let report: ReturnType<typeof inspectDashboardCsv>;
    try { report = inspectDashboardCsv(type,source,new Set((provinces.data ?? []).map(row=>Number(row.id)))); }
    catch (error) {
      if (action === "commit") throw new RequestError(error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง");
      return success({valid:false,fileName:file.name,receivedRows:0,validRows:0,errorCount:1,errors:[{row:null,message:error instanceof Error ? error.message : "ไฟล์ไม่ถูกต้อง"}],warnings:[],provinceCount:0,years:[],inserts:0,updates:0,previewRows:[],columns:[],token:"",revision:version.revision});
    }
    const dataset = getDashboardDataset(type);
    const token = createHash("sha256").update(JSON.stringify([version.id,version.revision,type,source])).digest("hex");
    if (action === "commit") {
      if (report.errorCount) throw new RequestError("ไฟล์ยังมีข้อผิดพลาด กรุณาตรวจไฟล์ใหม่");
      if (form.get("token") !== token) throw new RequestError("ไฟล์หรือเวอร์ชันเปลี่ยนหลังตรวจ กรุณาตรวจไฟล์ใหม่",409,"PREVIEW_EXPIRED");
      const result = await db.rpc("rice_dashboard_import",{p_id:version.id,p_dataset:type,p_rows:report.rows,p_revision:version.revision,p_file_name:file.name});
      if (result.error) throw result.error;
      return success(result.data);
    }
    const existing = await allKeys(db,dataset.table,dataset.keys,version.id);
    const key = (row: DashboardRow) => JSON.stringify(dataset.keys.map(k=>row[k]));
    const keys = new Set(existing.map(key));
    const updates = report.rows.filter(row=>keys.has(key(row))).length;
    return success({
      valid:report.errorCount === 0,fileName:file.name,receivedRows:report.receivedRows,validRows:report.rows.length,
      errorCount:report.errorCount,errors:report.errors,warnings:report.warnings,
      provinceCount:report.provinceCount,years:report.years,inserts:report.rows.length-updates,updates,
      previewRows:report.rows.slice(0,10),columns:dataset.columns.map(column=>column.key),token,revision:version.revision,
    });
  } catch (error) { return fail(error); }
}
