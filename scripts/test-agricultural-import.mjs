import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { inspectAgriculturalRows, parseAgriculturalFile } from "../src/lib/admin/agricultural-import.ts";

const provinces = [{ id: 1, province_th: "กรุงเทพมหานคร", province_en: "Bangkok" }];
const examples = {
  rice_price: { observed_on: "2024-01-01", rice_type: "ข้าวหอมมะลิ", rice_type_code: "jasmine", price: 367 },
  flood: { year: 2024, month: 1, province_id: 1, flood_events: 2 },
  drought: { year: 2024, month: 1, province_id: 1, drought_events: 1 },
  storm: { occurred_on: "2024-01-01", province_id: 1, storm_type: "tropical", storm_events: 1 },
};

for (const [type, example] of Object.entries(examples)) {
  const headers = Object.keys(example);
  const values = Object.values(example);
  const csv = `${headers.join(",")}\n${values.join(",")}`;
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, values]), "Data");
  const files = [
    ["test.json", new TextEncoder().encode(JSON.stringify([example]))],
    ["test.csv", new TextEncoder().encode(csv)],
    ["test.xlsx", XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })],
    ["test.xls", XLSX.write(workbook, { type: "buffer", bookType: "biff8" })],
  ];
  for (const [name, bytes] of files) {
    const source = parseAgriculturalFile(name, bytes);
    const report = inspectAgriculturalRows(type, source, provinces);
    assert.equal(report.valid, true, `${type}/${name}: ${JSON.stringify(report.errors)}`);
    assert.equal(report.validRows, 1);
  }
  const duplicate = inspectAgriculturalRows(type, [example, example], provinces);
  assert.equal(duplicate.valid, false);
  assert.match(duplicate.errors[0].message, /ซ้ำ/);
  const missing = { ...example };
  delete missing[headers[0]];
  assert.throws(() => inspectAgriculturalRows(type, [missing], provinces), /คอลัมน์/);
  if (type !== "rice_price") {
    const invalid = inspectAgriculturalRows(type, [{ ...example, province_id: 999 }], provinces);
    assert.equal(invalid.valid, false);
    assert.match(invalid.errors[0].message, /จังหวัด/);
  }
}
assert.throws(() => parseAgriculturalFile("large.csv", new Uint8Array(10 * 1024 * 1024 + 1)), /10 MB/);
assert.throws(() => parseAgriculturalFile("bad.csv", new TextEncoder().encode("year,year\n1,2")), /ซ้ำ/);
assert.throws(() => parseAgriculturalFile("bad.csv", new TextEncoder().encode("year,month\n\"broken")), /คำพูด/);
console.log("Agricultural import validation passed: 4 governed datasets × JSON/CSV/XLSX/XLS, plus error cases");
