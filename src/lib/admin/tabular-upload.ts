import "server-only";

import { createHash } from "node:crypto";
import * as XLSX from "xlsx";

export type UploadFileType = "csv" | "json" | "xlsx";

export interface ParsedUploadFile {
  fileType: UploadFileType;
  rows: Array<Record<string, unknown>>;
  csvText: string;
  digest: string;
}

const SUPPORTED_EXTENSIONS = [".csv", ".json", ".xlsx", ".xls"] as const;

export const DATA_FILE_ACCEPT =
  ".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function extension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  return SUPPORTED_EXTENSIONS.find((item) => normalized.endsWith(item)) ?? "";
}

export function isSupportedDataFile(fileName: string): boolean {
  return Boolean(extension(fileName));
}

function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text)
    ? `"${text.replace(/"/g, '""')}"`
    : text;
}

function recordsToCsv(rows: Array<Record<string, unknown>>): string {
  const headers: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    for (const rawKey of Object.keys(row)) {
      const key = rawKey.trim();
      if (key && !seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }
  if (!headers.length) throw new Error("ไฟล์ไม่มีชื่อคอลัมน์");
  return [
    headers.map(csvCell).join(","),
    ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
  ].join("\r\n");
}

function parseCsv(text: string): Array<Record<string, unknown>> {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (quoted) {
      if (character === '"' && source[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (character === '"') quoted = false;
      else cell += character;
    } else if (character === '"') quoted = true;
    else if (character === ",") {
      row.push(cell);
      cell = "";
    } else if (character === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }
  if (quoted) throw new Error("ไฟล์ CSV มีเครื่องหมายคำพูดไม่ครบคู่");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value.trim())) rows.push(row);
  }

  const [rawHeaders, ...values] = rows;
  const headers = (rawHeaders ?? []).map((value) => value.trim());
  if (!headers.length || headers.some((value) => !value)) {
    throw new Error("ไฟล์ CSV ไม่มีชื่อคอลัมน์ที่ถูกต้อง");
  }
  if (new Set(headers).size !== headers.length) {
    throw new Error("ไฟล์ CSV มีชื่อคอลัมน์ซ้ำกัน");
  }
  return values.map((cells, index) => {
    if (cells.length !== headers.length) {
      throw new Error(`แถว ${index + 2}: จำนวนช่องไม่ตรงกับชื่อคอลัมน์`);
    }
    return Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? ""]));
  });
}

function jsonRows(value: unknown): Array<Record<string, unknown>> {
  const candidate = Array.isArray(value)
    ? value
    : value && typeof value === "object"
      ? ((value as Record<string, unknown>).records ??
        (value as Record<string, unknown>).rows ??
        (value as Record<string, unknown>).data)
      : null;
  if (!Array.isArray(candidate)) {
    throw new Error("JSON ต้องเป็น array หรือมี records, rows หรือ data ที่เป็น array");
  }
  return candidate.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error(`รายการ JSON ลำดับ ${index + 1} ต้องเป็น object`);
    }
    return Object.fromEntries(
      Object.entries(row as Record<string, unknown>).map(([key, item]) => [key.trim(), item])
    );
  });
}

function workbookRows(buffer: ArrayBuffer): Array<Record<string, unknown>> {
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellFormula: false,
  });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("ไฟล์ Excel ไม่มี worksheet");
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(
    workbook.Sheets[firstSheetName],
    { defval: "", raw: false, dateNF: "yyyy-mm-dd" }
  );
}

export async function parseUploadFile(
  file: File,
  maxRows = 20_000
): Promise<ParsedUploadFile> {
  const fileExtension = extension(file.name);
  if (!fileExtension) throw new Error("รองรับเฉพาะ JSON, CSV, XLSX และ XLS");
  const buffer = await file.arrayBuffer();
  const digest = createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  let rows: Array<Record<string, unknown>>;
  let fileType: UploadFileType;

  if (fileExtension === ".csv") {
    fileType = "csv";
    rows = parseCsv(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
  } else if (fileExtension === ".json") {
    fileType = "json";
    let payload: unknown;
    try {
      payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(buffer));
    } catch {
      throw new Error("ไฟล์ JSON ไม่ถูกต้องหรือไม่ได้เข้ารหัส UTF-8");
    }
    rows = jsonRows(payload);
  } else {
    fileType = "xlsx";
    rows = workbookRows(buffer);
  }

  if (!rows.length) throw new Error("ไฟล์ไม่มีแถวข้อมูล");
  if (rows.length > maxRows) throw new Error(`ไฟล์มีข้อมูลเกิน ${maxRows.toLocaleString()} แถว`);
  const csvText = fileType === "csv"
    ? new TextDecoder("utf-8").decode(buffer).replace(/^\uFEFF/, "")
    : recordsToCsv(rows);
  return { fileType, rows, csvText, digest };
}
