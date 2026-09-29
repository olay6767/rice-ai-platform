import * as XLSX from "xlsx";

export interface DashboardExcelSheet {
  name: string;
  columns: readonly string[];
  rows: readonly Record<string, unknown>[];
}

function cellValue(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  return String(value);
}

export function createDashboardExcelWorkbook(sheets: readonly DashboardExcelSheet[]): Uint8Array {
  const workbook = XLSX.utils.book_new();

  for (const { name, columns, rows } of sheets) {
    const values = [
      [...columns],
      ...rows.map((row) => columns.map((key) => cellValue(row[key]))),
    ];
    const sheet = XLSX.utils.aoa_to_sheet(values);
    sheet["!cols"] = columns.map((key) => ({ wch: Math.min(30, Math.max(14, key.length + 2)) }));
    sheet["!autofilter"] = {
      ref: `A1:${XLSX.utils.encode_col(columns.length - 1)}${rows.length + 1}`,
    };
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  }

  return new Uint8Array(XLSX.write(workbook, { type: "buffer", bookType: "xlsx", compression: true }));
}
