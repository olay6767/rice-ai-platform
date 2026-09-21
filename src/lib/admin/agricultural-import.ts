import * as XLSX from "xlsx";

export const AGRICULTURAL_TYPES = ["rice_price", "flood", "drought", "storm"] as const;
export type AgriculturalType = (typeof AGRICULTURAL_TYPES)[number];
export type AgriculturalRow = Record<string, string | number | boolean | null | Record<string, unknown>>;

const MAX_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 20_000;
const COMMON = ["source"];
const DEFINITIONS: Record<AgriculturalType, { required: string[]; optional: string[] }> = {
  rice_price: {
    required: ["observed_on", "rice_type", "rice_type_code", "price"],
    optional: ["year", "month", "unit", "data_type", "is_imputed", "model_name", "model_version", "forecast_date", "reliability", "reliability_label", "metadata", ...COMMON],
  },
  flood: {
    required: ["year", "month", "flood_events"],
    optional: ["province_id", "province", "affected_area_rai", "affected_households", "affected_people", "agricultural_damage_rai", ...COMMON],
  },
  drought: {
    required: ["year", "month", "drought_events"],
    optional: ["province_id", "province", "affected_area_rai", "affected_households", "agricultural_damage_rai", ...COMMON],
  },
  storm: {
    required: ["occurred_on", "storm_type", "storm_events"],
    optional: ["year", "month", "province_id", "province", "affected_people", "affected_households", "damaged_houses", "agricultural_damage_rai", ...COMMON],
  },
};

export class AgriculturalImportError extends Error {
  readonly code: string;
  constructor(message: string, code = "INVALID_FILE") { super(message); this.code = code; }
}

function cell(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return value === null || value === undefined ? "" : String(value).trim();
}

function rowsFromGrid(grid: unknown[][]): Array<Record<string, unknown>> {
  const [rawHeaders, ...records] = grid;
  if (!rawHeaders?.length) throw new AgriculturalImportError("ไฟล์ไม่มีแถวชื่อคอลัมน์", "MISSING_COLUMNS");
  const headers = rawHeaders.map(cell);
  if (headers.some((header) => !header) || new Set(headers).size !== headers.length) {
    throw new AgriculturalImportError("ชื่อคอลัมน์ว่างหรือซ้ำกัน", "DUPLICATE_COLUMNS");
  }
  return records.filter((record) => record.some((value) => cell(value) !== "")).map((record, index) => {
    if (record.length > headers.length) {
      throw new AgriculturalImportError(`แถว ${index + 2}: จำนวนคอลัมน์ไม่ตรงกับหัวตาราง`, "INVALID_COLUMNS");
    }
    return Object.fromEntries(headers.map((header, column) => [header, record[column] ?? ""]));
  });
}

function csvGrid(source: string): string[][] {
  const grid: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  const text = source.replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') { value += '"'; index += 1; }
      else if (character === '"') quoted = false;
      else value += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") { row.push(value); value = ""; }
    else if (character === "\n") { row.push(value.replace(/\r$/, "")); if (row.some((item) => item !== "")) grid.push(row); row = []; value = ""; }
    else value += character;
  }
  if (quoted) throw new AgriculturalImportError("CSV มีเครื่องหมายคำพูดไม่ครบคู่", "INVALID_CSV");
  if (value || row.length) { row.push(value.replace(/\r$/, "")); if (row.some((item) => item !== "")) grid.push(row); }
  return grid;
}

export function parseAgriculturalFile(name: string, bytes: Uint8Array): Array<Record<string, unknown>> {
  const extension = name.toLowerCase().split(".").pop();
  if (!extension || !["json", "csv", "xlsx", "xls"].includes(extension)) {
    throw new AgriculturalImportError("รองรับเฉพาะไฟล์ JSON, CSV, XLSX และ XLS", "UNSUPPORTED_FILE");
  }
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_SIZE) {
    throw new AgriculturalImportError("ไฟล์ต้องมีขนาดไม่เกิน 10 MB และไม่เป็นไฟล์ว่าง", "FILE_SIZE");
  }
  let records: Array<Record<string, unknown>>;
  try {
    if (extension === "json") {
      const parsed: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
      if (!Array.isArray(parsed) || parsed.some((row) => !row || typeof row !== "object" || Array.isArray(row))) {
        throw new AgriculturalImportError("JSON ต้องเป็นอาร์เรย์ของแถวข้อมูล", "INVALID_JSON");
      }
      records = parsed as Array<Record<string, unknown>>;
    } else if (extension === "csv") {
      records = rowsFromGrid(csvGrid(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
    } else {
      const workbook = XLSX.read(bytes, { type: "array", cellDates: true, dense: true });
      const first = workbook.Sheets[workbook.SheetNames[0]];
      if (!first) throw new AgriculturalImportError("ไฟล์ไม่มี Sheet ข้อมูล");
      const grid = XLSX.utils.sheet_to_json<unknown[]>(first, { header: 1, raw: true, defval: "", blankrows: false });
      records = rowsFromGrid(grid);
    }
  } catch (error) {
    if (error instanceof AgriculturalImportError) throw error;
    throw new AgriculturalImportError(`อ่านไฟล์ไม่สำเร็จ: ${error instanceof Error ? error.message : "รูปแบบไฟล์ไม่ถูกต้อง"}`);
  }
  if (!records.length || records.length > MAX_ROWS) {
    throw new AgriculturalImportError(`ต้องมีข้อมูล 1–${MAX_ROWS.toLocaleString()} แถว`, "ROW_COUNT");
  }
  return records;
}

function numeric(value: unknown, label: string, integer = false, optional = false): number | null {
  if (value === null || value === undefined || cell(value) === "") {
    if (optional) return null;
    throw new Error(`${label} หายไป`);
  }
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || (integer && !Number.isInteger(number))) throw new Error(`${label} ต้องเป็น${integer ? "จำนวนเต็ม" : "ตัวเลข"}ไม่ติดลบ`);
  return number;
}

function date(value: unknown, label: string): string {
  if (value instanceof Date && !Number.isNaN(value.valueOf())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const raw = cell(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`)) || new Date(`${raw}T00:00:00Z`).toISOString().slice(0, 10) !== raw) throw new Error(`${label} ต้องเป็นวันที่ YYYY-MM-DD ที่ถูกต้อง`);
  return raw;
}

function boolean(value: unknown): boolean {
  if (value === true || value === 1 || ["true", "1", "yes"].includes(cell(value).toLowerCase())) return true;
  if (value === false || value === 0 || cell(value) === "" || ["false", "0", "no"].includes(cell(value).toLowerCase())) return false;
  throw new Error("is_imputed ต้องเป็น true หรือ false");
}

function text(value: unknown, label: string, required = false, max = 160): string {
  const result = cell(value);
  if (required && !result) throw new Error(`${label} หายไป`);
  if (result.length > max) throw new Error(`${label} ยาวเกิน ${max} ตัวอักษร`);
  return result;
}

function metadata(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined || value === "") return {};
  let parsed = value;
  if (typeof value === "string") {
    try { parsed = JSON.parse(value); } catch { throw new Error("metadata ต้องเป็น JSON object"); }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("metadata ต้องเป็น JSON object");
  return parsed as Record<string, unknown>;
}

export function inspectAgriculturalRows(
  type: AgriculturalType,
  source: Array<Record<string, unknown>>,
  provinces: Array<{ id: number; province_th: string; province_en?: string | null }>
) {
  const definition = DEFINITIONS[type];
  const headers = new Set(source.flatMap((row) => Object.keys(row)));
  const allowed = new Set([...definition.required, ...definition.optional]);
  const unknown = [...headers].filter((header) => !allowed.has(header));
  const missing = definition.required.filter((header) => !headers.has(header));
  if (type !== "rice_price" && !headers.has("province_id") && !headers.has("province")) missing.push("province_id หรือ province");
  if (unknown.length || missing.length) {
    throw new AgriculturalImportError(`คอลัมน์ไม่ถูกต้อง${missing.length ? ` · ขาด ${missing.join(", ")}` : ""}${unknown.length ? ` · ไม่รู้จัก ${unknown.join(", ")}` : ""}`, "INVALID_COLUMNS");
  }
  const provinceMap = new Map<string, number>();
  for (const province of provinces) {
    provinceMap.set(String(province.id), province.id);
    provinceMap.set(province.province_th.trim().replace(/\s+/g, ""), province.id);
    if (province.province_en) provinceMap.set(province.province_en.toLowerCase().replace(/\s+/g, ""), province.id);
  }
  const errors: Array<{ row: number; message: string }> = [];
  const rows: AgriculturalRow[] = [];
  const unique = new Set<string>();
  const years = new Set<number>();
  const provinceIds = new Set<number>();
  for (const [index, input] of source.entries()) {
    try {
      const result: AgriculturalRow = { source: text(input.source, "source", false, 500) };
      let key: string;
      if (type === "rice_price") {
        const observed = date(input.observed_on, "observed_on");
        const year = Number(observed.slice(0, 4));
        const month = Number(observed.slice(5, 7));
        if ((input.year !== undefined && cell(input.year) !== "" && Number(input.year) !== year) ||
            (input.month !== undefined && cell(input.month) !== "" && Number(input.month) !== month)) throw new Error("year/month ไม่ตรงกับ observed_on");
        const dataType = text(input.data_type, "data_type") || "actual";
        if (!["actual", "forecast"].includes(dataType)) throw new Error("data_type ต้องเป็น actual หรือ forecast");
        Object.assign(result, { observed_on: observed, year, month,
          rice_type: text(input.rice_type, "rice_type", true),
          rice_type_code: text(input.rice_type_code, "rice_type_code", true, 80),
          price: numeric(input.price, "price"), unit: text(input.unit, "unit") || "บาท/ตัน",
          data_type: dataType, is_imputed: boolean(input.is_imputed),
          model_name: text(input.model_name, "model_name") || null,
          model_version: text(input.model_version, "model_version") || null,
          forecast_date: cell(input.forecast_date) ? date(input.forecast_date, "forecast_date") : null,
          reliability: numeric(input.reliability, "reliability", false, true),
          reliability_label: text(input.reliability_label, "reliability_label", false, 80) || null,
          metadata: metadata(input.metadata) });
        if (result.reliability !== null && (result.reliability as number) > 1) throw new Error("reliability ต้องอยู่ระหว่าง 0–1");
        key = [result.rice_type_code, observed, dataType, result.model_version || ""].join("|");
      } else {
        const rawProvince = cell(input.province_id || input.province).replace(/\s+/g, "");
        const provinceId = provinceMap.get(rawProvince) ?? provinceMap.get(rawProvince.toLowerCase());
        if (!provinceId) throw new Error(`จังหวัดไม่ถูกต้อง: ${rawProvince || "ว่าง"}`);
        if (cell(input.province_id) && cell(input.province) &&
            provinceMap.get(cell(input.province).replace(/\s+/g, "")) !== provinceId) throw new Error("province_id และ province ไม่ตรงกัน");
        result.province_id = provinceId;
        provinceIds.add(provinceId);
        const occurred = type === "storm" ? date(input.occurred_on, "occurred_on") : null;
        const year = occurred ? Number(occurred.slice(0, 4)) : numeric(input.year, "year", true)!;
        const month = occurred ? Number(occurred.slice(5, 7)) : numeric(input.month, "month", true)!;
        if (year < 1900 || year > 2200 || month < 1 || month > 12) throw new Error("year/month อยู่นอกช่วงที่รองรับ");
        if (occurred && ((input.year !== undefined && cell(input.year) !== "" && Number(input.year) !== year) ||
            (input.month !== undefined && cell(input.month) !== "" && Number(input.month) !== month))) throw new Error("year/month ไม่ตรงกับ occurred_on");
        Object.assign(result, { year, month });
        if (type === "storm") {
          Object.assign(result, { occurred_on: occurred, storm_type: text(input.storm_type, "storm_type", true),
            storm_events: numeric(input.storm_events, "storm_events", true),
            affected_people: numeric(input.affected_people, "affected_people", true, true),
            affected_households: numeric(input.affected_households, "affected_households", true, true),
            damaged_houses: numeric(input.damaged_houses, "damaged_houses", true, true),
            agricultural_damage_rai: numeric(input.agricultural_damage_rai, "agricultural_damage_rai", false, true) });
          key = [occurred, provinceId, result.storm_type].join("|");
        } else {
          const eventColumn = type === "flood" ? "flood_events" : "drought_events";
          result[eventColumn] = numeric(input[eventColumn], eventColumn, true);
          result.affected_area_rai = numeric(input.affected_area_rai, "affected_area_rai", false, true);
          result.affected_households = numeric(input.affected_households, "affected_households", true, true);
          result.agricultural_damage_rai = numeric(input.agricultural_damage_rai, "agricultural_damage_rai", false, true);
          if (type === "flood") result.affected_people = numeric(input.affected_people, "affected_people", true, true);
          key = [year, month, provinceId].join("|");
        }
      }
      if (unique.has(key)) throw new Error(`ข้อมูลซ้ำในไฟล์ (${key})`);
      unique.add(key);
      years.add(Number(result.year));
      rows.push(result);
    } catch (error) {
      errors.push({ row: index + 2, message: error instanceof Error ? error.message : "ข้อมูลไม่ถูกต้อง" });
    }
  }
  return { valid: errors.length === 0, receivedRows: source.length, validRows: rows.length,
    errorCount: errors.length, errors: errors.slice(0, 100), rows,
    provinceCount: provinceIds.size, minYear: years.size ? Math.min(...years) : null,
    maxYear: years.size ? Math.max(...years) : null };
}
