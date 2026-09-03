import "server-only";
import { getDashboardDataset, type DashboardRow, type ValidationIssue } from "./dashboard-types";

export const DASHBOARD_DATASET_TYPES = [
  "yearly-yield",
  "monthly-environment",
  "yield-predictions",
] as const;

export type DashboardDatasetType = (typeof DASHBOARD_DATASET_TYPES)[number];

type CsvRecord = Record<string, string>;
type DatabaseRow = DashboardRow;

/** Apply the same rules to the row editor and CSV imports; never coerce missing cells to zero. */
export function inspectDashboardRecord(type: DashboardDatasetType, value: unknown, provinceIds: Set<number>) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("รูปแบบแถวข้อมูลไม่ถูกต้อง");
  const row = value as Record<string, unknown>;
  const columns = getDashboardDataset(type).columns.map(column => column.key);
  if (Object.keys(row).some(key => !columns.includes(key)) || columns.some(key => !(key in row))) {
    throw new Error("คอลัมน์ข้อมูลไม่ตรงกับประเภทที่เลือก กรุณารีเฟรชตาราง");
  }
  const cells = columns.map(key => {
    const cell = row[key];
    if (cell !== null && !["string", "number", "boolean"].includes(typeof cell)) throw new Error(`ค่า ${key} ไม่ถูกต้อง`);
    if (typeof cell === "number" && !Number.isFinite(cell)) throw new Error(`ค่า ${key} ไม่ถูกต้อง`);
    return '"' + (cell === null ? "" : String(cell)).replace(/"/g, '""') + '"';
  });
  const report = inspectDashboardCsv(type, columns.join(",") + "\n" + cells.join(","), provinceIds);
  if (report.errorCount) throw new Error(report.errors.map(issue => issue.message).join("\n"));
  return report.rows[0];
}

interface DashboardDatasetDefinition {
  label: string;
  table: string;
  onConflict: string;
  requiredHeaders: string[];
  parse: (row: CsvRecord, rowNumber: number) => DatabaseRow;
  uniqueKey: (row: DatabaseRow) => string;
}

function parseCsv(text: string): { headers: string[]; records: CsvRecord[] } {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        cell += character;
      }
      continue;
    }

    if (character === '"') {
      quoted = true;
    } else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += character;
    }
  }

  if (quoted) {
    throw new Error("ไฟล์ CSV มีเครื่องหมายคำพูดไม่ครบคู่");
  }

  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }

  const [rawHeaders, ...values] = rows;
  const headers = (rawHeaders ?? []).map((header) => header.trim());

  if (headers.length === 0) {
    throw new Error("ไฟล์ CSV ไม่มีแถวชื่อคอลัมน์");
  }

  if (new Set(headers).size !== headers.length) {
    throw new Error("ไฟล์ CSV มีชื่อคอลัมน์ซ้ำกัน");
  }
  if (headers.some((header) => !header)) throw new Error("พบชื่อคอลัมน์ว่างในไฟล์ CSV");
  const malformed = values.findIndex((cells) => cells.length !== headers.length);
  if (malformed !== -1) throw new Error(`แถว ${malformed + 2}: จำนวนช่องข้อมูลไม่ตรงกับชื่อคอลัมน์ (${headers.length} ช่อง)`);

  return {
    headers,
    records: values.map((cells) =>
      Object.fromEntries(
        headers.map((header, index) => [header, cells[index]?.trim() ?? ""])
      )
    ),
  };
}

function requiredText(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
  maxLength = 160
): string {
  const text = value?.trim() ?? "";
  if (!text) throw new Error(`แถว ${rowNumber}: ไม่พบ ${fieldName}`);
  if (text.length > maxLength) {
    throw new Error(`แถว ${rowNumber}: ${fieldName}ยาวเกิน ${maxLength} ตัวอักษร`);
  }
  return text;
}

function numberValue(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
  options: { required?: boolean; integer?: boolean; min?: number; max?: number } = {}
): number | null {
  const text = value?.trim() ?? "";
  if (!text) {
    if (options.required) throw new Error(`แถว ${rowNumber}: ไม่พบ ${fieldName}`);
    return null;
  }

  const parsed = Number(text);
  if (!Number.isFinite(parsed) || (options.integer && !Number.isInteger(parsed))) {
    throw new Error(`แถว ${rowNumber}: ${fieldName}ต้องเป็นตัวเลขที่ถูกต้อง`);
  }
  if (options.min !== undefined && parsed < options.min) {
    throw new Error(`แถว ${rowNumber}: ${fieldName}ต้องไม่น้อยกว่า ${options.min}`);
  }
  if (options.max !== undefined && parsed > options.max) {
    throw new Error(`แถว ${rowNumber}: ${fieldName}ต้องไม่เกิน ${options.max}`);
  }
  return parsed;
}

function requiredNumber(
  value: string | undefined,
  fieldName: string,
  rowNumber: number,
  options: { integer?: boolean; min?: number; max?: number } = {}
): number {
  return numberValue(value, fieldName, rowNumber, {
    ...options,
    required: true,
  }) as number;
}

function booleanValue(value: string | undefined): boolean {
  const text = (value ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(text)) return true;
  if (["", "0", "false", "no", "n"].includes(text)) return false;
  throw new Error("ค่าจริง/เท็จต้องเป็น 0/1, false/true หรือ no/yes");
}

const DATASETS: Record<DashboardDatasetType, DashboardDatasetDefinition> = {
  "yearly-yield": {
    label: "ผลผลิตข้าวรายปี",
    table: "rice_yield_yearly",
    onConflict: "dashboard_version_id,province_id,crop_start_year",
    requiredHeaders: [
      "province_id",
      "crop_start_year",
      "crop_year",
      "actual_yield",
    ],
    parse: (row, rowNumber) => ({
      province_id: requiredNumber(row.province_id, "province_id", rowNumber, {
        integer: true,
        min: 1,
      }),
      crop_start_year: requiredNumber(
        row.crop_start_year,
        "crop_start_year",
        rowNumber,
        { integer: true, min: 1900, max: 2200 }
      ),
      crop_year: requiredText(row.crop_year, "crop_year", rowNumber, 20),
      actual_yield: requiredNumber(row.actual_yield, "actual_yield", rowNumber, {
        min: 0,
        max: 10_000,
      }),
      yield_per_harvested_rai: numberValue(
        row.yield_per_harvested_rai,
        "yield_per_harvested_rai",
        rowNumber,
        { min: 0 }
      ),
      production_ton: numberValue(row.production_ton, "production_ton", rowNumber, {
        min: 0,
      }),
      harvested_area_rai: numberValue(
        row.harvested_area_rai,
        "harvested_area_rai",
        rowNumber,
        { min: 0 }
      ),
      planted_area_rai: numberValue(
        row.planted_area_rai,
        "planted_area_rai",
        rowNumber,
        { min: 0 }
      ),
    }),
    uniqueKey: (row) => `${row.province_id}:${row.crop_start_year}`,
  },
  "monthly-environment": {
    label: "สภาพแวดล้อมรายเดือน",
    table: "rice_environment_monthly",
    onConflict: "dashboard_version_id,province_id,year,month",
    requiredHeaders: ["province_id", "year", "month"],
    parse: (row, rowNumber) => ({
      province_id: requiredNumber(row.province_id, "province_id", rowNumber, {
        integer: true,
        min: 1,
      }),
      year: requiredNumber(row.year, "year", rowNumber, {
        integer: true,
        min: 1900,
        max: 2200,
      }),
      month: requiredNumber(row.month, "month", rowNumber, {
        integer: true,
        min: 1,
        max: 12,
      }),
      temperature_mean_c: numberValue(
        row.temperature_mean_c,
        "temperature_mean_c",
        rowNumber,
        { min: -30, max: 70 }
      ),
      dewpoint_mean_c: numberValue(
        row.dewpoint_mean_c,
        "dewpoint_mean_c",
        rowNumber,
        { min: -50, max: 70 }
      ),
      soil_moisture_mean: numberValue(
        row.soil_moisture_mean,
        "soil_moisture_mean",
        rowNumber,
        { min: 0, max: 1 }
      ),
      rainfall_total_mm: numberValue(
        row.rainfall_total_mm,
        "rainfall_total_mm",
        rowNumber,
        { min: 0 }
      ),
      evaporation_total_mm: numberValue(
        row.evaporation_total_mm,
        "evaporation_total_mm",
        rowNumber,
        { min: 0 }
      ),
      solar_total_mj_m2: numberValue(
        row.solar_total_mj_m2,
        "solar_total_mj_m2",
        rowNumber,
        { min: 0 }
      ),
      ndvi_mean: numberValue(row.ndvi_mean, "ndvi_mean", rowNumber, {
        min: -1,
        max: 1,
      }),
      ndvi_median: numberValue(row.ndvi_median, "ndvi_median", rowNumber, {
        min: -1,
        max: 1,
      }),
      ndvi_std: numberValue(row.ndvi_std, "ndvi_std", rowNumber, { min: 0 }),
      ndvi_min: numberValue(row.ndvi_min, "ndvi_min", rowNumber, {
        min: -1,
        max: 1,
      }),
      ndvi_max: numberValue(row.ndvi_max, "ndvi_max", rowNumber, {
        min: -1,
        max: 1,
      }),
      rice_valid_ratio_mean: numberValue(
        row.rice_valid_ratio_mean,
        "rice_valid_ratio_mean",
        rowNumber,
        { min: 0, max: 1 }
      ),
      rice_ndvi_imputed: booleanValue(row.rice_ndvi_imputed),
      rice_ndvi_structural_missing: booleanValue(row.rice_ndvi_structural_missing),
      rice_ndvi_final_quality: row.rice_ndvi_final_quality || null,
      grid_cell_count: numberValue(row.grid_cell_count, "grid_cell_count", rowNumber, {
        integer: true,
        min: 0,
      }),
    }),
    uniqueKey: (row) => `${row.province_id}:${row.year}:${row.month}`,
  },
  "yield-predictions": {
    label: "ผลพยากรณ์ผลผลิต",
    table: "rice_yield_predictions",
    onConflict:
      "dashboard_version_id,province_id,crop_start_year,model_version",
    requiredHeaders: [
      "province_id",
      "crop_start_year",
      "crop_year",
      "actual_yield",
      "predicted_yield",
      "residual",
      "absolute_error",
      "model_version",
    ],
    parse: (row, rowNumber) => ({
      province_id: requiredNumber(row.province_id, "province_id", rowNumber, {
        integer: true,
        min: 1,
      }),
      crop_start_year: requiredNumber(
        row.crop_start_year,
        "crop_start_year",
        rowNumber,
        { integer: true, min: 1900, max: 2200 }
      ),
      crop_year: requiredText(row.crop_year, "crop_year", rowNumber, 20),
      actual_yield: requiredNumber(row.actual_yield, "actual_yield", rowNumber, {
        min: 0,
        max: 10_000,
      }),
      predicted_yield: requiredNumber(
        row.predicted_yield,
        "predicted_yield",
        rowNumber,
        { min: 0, max: 10_000 }
      ),
      residual: requiredNumber(row.residual, "residual", rowNumber),
      absolute_error: requiredNumber(
        row.absolute_error,
        "absolute_error",
        rowNumber,
        { min: 0 }
      ),
      percentage_error: numberValue(
        row.percentage_error,
        "percentage_error",
        rowNumber,
        { min: 0 }
      ),
      model_version: requiredText(row.model_version, "model_version", rowNumber, 120),
    }),
    uniqueKey: (row) =>
      `${row.province_id}:${row.crop_start_year}:${row.model_version}`,
  },
};

export function isDashboardDatasetType(value: unknown): value is DashboardDatasetType {
  return (
    typeof value === "string" &&
    (DASHBOARD_DATASET_TYPES as readonly string[]).includes(value)
  );
}

/** Identify a dataset from its CSV headers so admins can select several files at once. */
export function inferDashboardDatasetType(source: string): DashboardDatasetType {
  const { headers } = parseCsv(source.replace(/^\uFEFF/, ""));
  const matches = (Object.entries(DATASETS) as Array<
    [DashboardDatasetType, DashboardDatasetDefinition]
  >)
    .filter(([, definition]) =>
      definition.requiredHeaders.every((header) => headers.includes(header))
    )
    .sort(
      ([, left], [, right]) =>
        right.requiredHeaders.length - left.requiredHeaders.length
    );

  if (!matches.length) {
    throw new Error(
      "ไม่พบชุดคอลัมน์ที่ตรงกับผลผลิตรายปี สภาพแวดล้อมรายเดือน หรือผลพยากรณ์"
    );
  }

  if (
    matches.length > 1 &&
    matches[0][1].requiredHeaders.length === matches[1][1].requiredHeaders.length
  ) {
    throw new Error("ไม่สามารถระบุประเภทข้อมูลจากหัวคอลัมน์ได้");
  }

  return matches[0][0];
}

export function inspectDashboardCsv(type: DashboardDatasetType, source: string, provinceIds?: Set<number>) {
  const definition = DATASETS[type];
  const { headers, records } = parseCsv(source.replace(/^\uFEFF/, ""));
  const missingHeaders = definition.requiredHeaders.filter(
    (header) => !headers.includes(header)
  );

  if (missingHeaders.length > 0) {
    throw new Error(`ไฟล์ขาดคอลัมน์: ${missingHeaders.join(", ")}`);
  }
  if (records.length === 0) throw new Error("ไฟล์ CSV ไม่มีข้อมูล");
  if (records.length > 20_000) throw new Error("ไฟล์มีข้อมูลเกิน 20,000 แถว");

  const errors: ValidationIssue[] = [];
  const warnings = new Set<string>();
  const parsed: DatabaseRow[] = [];
  const seenKeys = new Set<string>();
  const catalog = getDashboardDataset(type);
  const knownHeaders = new Set(catalog.columns.map((column) => column.key));
  const ignoredHeaders = headers.filter((header) => !knownHeaders.has(header));
  if (ignoredHeaders.length) warnings.add(`คอลัมน์ที่ไม่ถูกนำเข้า: ${ignoredHeaders.join(", ")}`);
  const absent = catalog.columns.filter((column) => !column.required && !headers.includes(column.key));
  if (absent.length) warnings.add(`คอลัมน์ที่ไม่ระบุจะถูกบันทึกเป็นค่าว่าง (boolean เป็น false): ${absent.map((column) => column.key).join(", ")}`);

  for (const [index, raw] of records.entries()) {
    const rowNumber = index + 2;
    try {
      const row = definition.parse(raw, rowNumber);
      if (provinceIds && !provinceIds.has(Number(row.province_id))) throw new Error(`province_id ${row.province_id} ไม่มีในระบบ`);
      const key = definition.uniqueKey(row);
      if (seenKeys.has(key)) throw new Error("จังหวัด/ช่วงเวลา/โมเดลซ้ำกับแถวก่อนหน้า กรุณาเหลือเพียงหนึ่งแถวต่อรายการ");
      seenKeys.add(key);
      if (type !== "monthly-environment") {
        const year = Number(row.crop_start_year);
        const crop = String(row.crop_year).match(/^(\d{4})\/(\d{2}|\d{4})$/);
        if (!crop || ![year, year + 543].includes(Number(crop[1])) || Number(crop[2]) !== (crop[2].length === 2 ? (Number(crop[1]) + 1) % 100 : Number(crop[1]) + 1)) {
          throw new Error("crop_year ต้องตรงกับ crop_start_year เช่น 2025 และ 2568/69");
        }
      }
      if (type === "yearly-yield" && typeof row.harvested_area_rai === "number" && typeof row.planted_area_rai === "number" && row.harvested_area_rai > row.planted_area_rai) {
        throw new Error("พื้นที่เก็บเกี่ยวมากกว่าพื้นที่ปลูก");
      }
      if (type === "yield-predictions") {
        const residual = Number(row.actual_yield) - Number(row.predicted_yield);
        if (Math.abs(Number(row.residual) - residual) > 0.05) throw new Error("residual ไม่ตรงกับ actual_yield − predicted_yield");
        if (Math.abs(Number(row.absolute_error) - Math.abs(residual)) > 0.05) throw new Error("absolute_error ไม่ตรงกับค่าสัมบูรณ์ของ residual");
        if (Number(row.actual_yield) > 0 && row.percentage_error !== null && Math.abs(Number(row.percentage_error) - Math.abs(residual) / Number(row.actual_yield) * 100) > 0.05) throw new Error("percentage_error ไม่ตรงกับค่าคลาดเคลื่อนร้อยละ");
      }
      if (type === "monthly-environment") {
        if (row.rice_ndvi_final_quality && String(row.rice_ndvi_final_quality).length > 80) throw new Error("rice_ndvi_final_quality ยาวเกิน 80 ตัวอักษร");
        for (const value of [row.ndvi_mean, row.ndvi_median]) {
          if (typeof value === "number" && ((typeof row.ndvi_min === "number" && value < row.ndvi_min) || (typeof row.ndvi_max === "number" && value > row.ndvi_max))) throw new Error("NDVI เฉลี่ย/มัธยฐานต้องอยู่ระหว่างค่าต่ำสุดและสูงสุด");
        }
        if (typeof row.ndvi_min === "number" && typeof row.ndvi_max === "number" && row.ndvi_min > row.ndvi_max) throw new Error("ndvi_min ต้องไม่มากกว่า ndvi_max");
        if ([row.temperature_mean_c, row.rainfall_total_mm, row.soil_moisture_mean, row.ndvi_mean].every((value) => value === null)) throw new Error("ต้องมีอย่างน้อยหนึ่งค่าของฝน อุณหภูมิ ความชื้นดิน หรือ NDVI");
      }
      parsed.push(row);
    } catch (error) {
      errors.push({ row: rowNumber, message: error instanceof Error ? error.message : "ข้อมูลแถวนี้ไม่ถูกต้อง" });
    }
  }
  if (type === "yield-predictions" && new Set(parsed.map((row) => row.model_version)).size > 1) errors.push({row: null, message: "หนึ่งเวอร์ชัน Dashboard รองรับผลพยากรณ์จากโมเดลเดียว กรุณาแยกโมเดลเป็นคนละเวอร์ชัน"});
  const provinceCount = new Set(parsed.map((row) => row.province_id)).size;
  if (provinceCount < 77) warnings.add(`ไฟล์นี้มี ${provinceCount} จังหวัดจาก 77 จังหวัด พื้นที่ที่ยังไม่มีข้อมูลจะแสดงว่าไม่มีข้อมูล`);
  if (type === "monthly-environment") {
    const months = new Map<string, Set<number>>();
    for (const row of parsed) {
      const key = `${row.province_id}:${row.year}`;
      if (!months.has(key)) months.set(key, new Set());
      months.get(key)!.add(Number(row.month));
    }
    const missing = [...months.values()].filter((values) => values.size < 12).length;
    if (missing) warnings.add(`มี ${missing} คู่จังหวัด/ปีในไฟล์ที่ยังไม่ครบ 12 เดือน (อาจมีเดือนอื่นอยู่ในเวอร์ชันแล้ว)`);
  }

  return {
    label: definition.label,
    table: definition.table,
    onConflict: definition.onConflict,
    rows: parsed,
    receivedRows: records.length,
    errorCount: errors.length,
    errors: errors.slice(0, 100),
    warnings: [...warnings],
    headers,
    provinceCount,
    years: [...new Set(parsed.map((row) => Number(row[catalog.period])))].sort((a, b) => a - b),
  };
}

export function parseDashboardCsv(type: DashboardDatasetType, source: string) {
  const report = inspectDashboardCsv(type, source);
  if (report.errorCount) throw new Error(report.errors[0].message);
  return { ...report, duplicateRows: 0 };
}
