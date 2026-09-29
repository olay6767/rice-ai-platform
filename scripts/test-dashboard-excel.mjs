import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import { createDashboardExcelWorkbook } from "../src/lib/admin/dashboard-excel.ts";
import { DASHBOARD_DATASETS } from "../src/lib/admin/dashboard-types.ts";

const counts = [1078, 13860, 154];
const sheets = DASHBOARD_DATASETS.map((dataset, datasetIndex) => ({
  name: dataset.label,
  columns: dataset.columns.map((column) => column.key),
  rows: Array.from({ length: counts[datasetIndex] }, (_, index) =>
    Object.fromEntries(dataset.columns.map((column) => [
      column.key,
      column.key === "crop_year" ? "2567/68"
        : column.key === "model_version" ? (index === 0 ? "=HYPERLINK(\"https://example.com\")" : "test-model")
        : column.key === "rice_ndvi_final_quality" ? "good"
        : column.key === "rice_ndvi_imputed" ? false
        : column.key === "province_id" ? (index % 77) + 1
        : index + 1,
    ]))
  ),
}));

const workbook = XLSX.read(createDashboardExcelWorkbook(sheets), { type: "array" });
assert.deepEqual(workbook.SheetNames, DASHBOARD_DATASETS.map((dataset) => dataset.label));

for (const [index, dataset] of DASHBOARD_DATASETS.entries()) {
  const sheet = workbook.Sheets[dataset.label];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
  assert.deepEqual(rows[0], dataset.columns.map((column) => column.key));
  assert.equal(rows.length - 1, counts[index]);
  assert.equal(sheet.B2.t, "n");
  assert.ok(sheet["!autofilter"]);
}

const predictionSheet = workbook.Sheets[DASHBOARD_DATASETS[2].label];
const modelColumn = DASHBOARD_DATASETS[2].columns.findIndex((column) => column.key === "model_version");
const formulaLikeCell = predictionSheet[`${XLSX.utils.encode_col(modelColumn)}2`];
assert.equal(formulaLikeCell.t, "s");
assert.equal(formulaLikeCell.f, undefined);
assert.equal(formulaLikeCell.v, '=HYPERLINK("https://example.com")');

console.log("Dashboard Excel export passed: 3 sheets, 15,092 rows, typed values, and formula-like text.");
