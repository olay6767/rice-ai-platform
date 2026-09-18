import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

// Render the actual components without an admin session or database access.
const nodeRequire = createRequire(import.meta.url);
const modules = new Map();
function loadComponent(fileName) {
  const file = path.resolve(fileName);
  if (modules.has(file)) return modules.get(file);
  const source = fs.readFileSync(file, "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const testModule = { exports: {} };
  function componentRequire(name) {
    if (!name.startsWith("@/") && !name.startsWith(".")) return nodeRequire(name);
    const base = name.startsWith("@/") ? path.resolve("src", name.slice(2)) : path.resolve(path.dirname(file), name);
    const target = [base, base + ".ts", base + ".tsx"].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    assert.ok(target, `Cannot resolve ${name} from ${file}`);
    return loadComponent(target);
  }
  vm.runInNewContext(compiled, { module: testModule, exports: testModule.exports, require: componentRequire }, { filename: file });
  modules.set(file, testModule.exports);
  return testModule.exports;
}
const { primary, button, input } = loadComponent("src/components/admin/dashboard/shared.tsx");
const tokens = primary.split(/\s+/);
let checks = 0;
function check(name, run) { run(); checks++; console.log(`PASS ${name}`); }

check("primary dark label uses one foreground", () => {
  assert.deepEqual(tokens.filter(value => /^dark:text-/.test(value)), ["dark:text-rice-dark"]);
});
check("primary does not inherit neutral label colors", () => {
  assert.ok(!tokens.includes("text-rice-forest"));
  assert.ok(!tokens.includes("text-[var(--app-text-secondary)]"));
  assert.ok(!tokens.includes("dark:text-rice-mint-light"));
});
check("primary light label is white", () => assert.ok(tokens.includes("text-white")));
check("neutral button uses paired theme foreground and surface", () => {
  assert.ok(button.includes("bg-[var(--app-surface)]"));
  assert.ok(button.includes("text-[var(--app-text-secondary)]"));
});
check("controls retain touch targets and keyboard focus", () => {
  assert.ok(primary.includes("min-h-11") && button.includes("min-h-11"));
  assert.ok(input.includes("min-h-12"));
  assert.ok(primary.includes("focus-visible:outline-2"));
});
check("mobile fields use readable text without automatic focus zoom", () => {
  assert.ok(input.includes("text-base") && input.includes("sm:text-sm"));
});

const theme = fs.readFileSync("src/app/globals.css", "utf8");
const color = name => {
  const value = theme.match(new RegExp(`--color-${name}:\\s*(#[0-9a-f]{6})`, "i"))?.[1];
  assert.ok(value, `Missing theme color ${name}`);
  return value;
};
function luminance(hex) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(first, second) {
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
check("primary normal labels exceed 4.5:1 in both themes", () => {
  assert.ok(contrast(color("rice-forest"), "#ffffff") >= 4.5);
  assert.ok(contrast(color("rice-mint-light"), color("rice-dark")) >= 4.5);
});
check("primary hover labels exceed 4.5:1 in both themes", () => {
  assert.ok(contrast(color("rice-dark"), "#ffffff") >= 4.5);
  assert.ok(contrast(color("rice-mint"), color("rice-dark")) >= 4.5);
});

const { default: ImportPanel } = loadComponent("src/components/admin/dashboard/ImportPanel.tsx");
const { DASHBOARD_DATASETS } = loadComponent("src/lib/admin/dashboard-types.ts");
const version = { id: "test-version", label: "ข้อมูลทดสอบ", revision: 1 };
function renderImport(status, type = "yearly-yield") {
  return renderToStaticMarkup(createElement(ImportPanel, {
    version: { ...version, status }, type,
    onTypeChange: () => {}, onCreateDraft: () => {}, onUnpublish: () => {}, onSaved: () => {},
  }));
}
for (const status of ["published", "archived"]) {
  check(`${status}: locked import provides an enabled draft action instead of a disabled file chooser`, () => {
    const html = renderImport(status);
    assert.ok(!html.includes('type="file"'));
    assert.ok(!html.includes("ตรวจไฟล์ก่อนบันทึก"));
    const draftAction = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/)?.[0];
    assert.ok(draftAction?.includes("คัดลอกเป็นฉบับร่างเพื่อนำเข้าไฟล์"));
    assert.ok(draftAction.includes('type="button"'));
    assert.ok(!draftAction.includes("disabled="));
    assert.ok(html.includes("ข้อมูลต้นฉบับและเวอร์ชันที่ผู้ใช้กำลังดูจะไม่เปลี่ยนแปลง"));
    assert.ok(html.includes(status === "published" ? "เวอร์ชันนี้เผยแพร่แล้ว" : "เวอร์ชันนี้อยู่ในคลัง"));
  });
  check(`${status}: template and province downloads remain available`, () => {
    const html = renderImport(status);
    for (const label of ["ไฟล์ตัวอย่างตามประเภท", "รหัสจังหวัด 77 จังหวัด"]) {
      const control = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g).find(markup => markup.includes(label));
      assert.ok(control && !control.includes("disabled="));
    }
  });
}
for (const dataset of DASHBOARD_DATASETS) {
  check(`draft: ${dataset.type} keeps the selected dataset and enables CSV selection`, () => {
    const html = renderImport("draft", dataset.type);
    const fileInput = html.match(/<input\b[^>]*type="file"[^>]*>/)?.[0];
    assert.ok(fileInput && !fileInput.includes("disabled="));
    assert.ok(fileInput.includes('accept=".csv,text/csv"'));
    assert.ok(!html.includes("คัดลอกเป็นฉบับร่างเพื่อนำเข้าไฟล์"));
    const selectedOption = html.match(/<option\b[^>]*selected=""[^>]*>/)?.[0];
    assert.ok(selectedOption?.includes(`value="${dataset.type}"`));
    assert.ok(html.includes(dataset.description));
    const validateButton = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g).find(markup => markup.includes("ตรวจไฟล์ก่อนบันทึก"));
    assert.ok(validateButton?.includes("disabled="), "Validation must still wait for a file");
    assert.ok(!html.includes("ยืนยันบันทึกลงฉบับร่าง"), "Commit requires preview and explicit confirmation");
  });
}
check("published import provides an explicit unpublish path; archived import does not", () => {
  assert.ok(renderImport("published").includes("ปิดเผยแพร่เพื่อแก้ไขรุ่นนี้"));
  assert.ok(!renderImport("archived").includes("ปิดเผยแพร่เพื่อแก้ไขรุ่นนี้"));
});
const { DataTable } = loadComponent("src/components/admin/dashboard/shared.tsx");
check("data tables show edit actions only when enabled by their caller", () => {
  const props = { rows: [{ id: 1, province_id: 1 }], columns: [{ key: "province_id", label: "จังหวัด" }] };
  assert.ok(!renderToStaticMarkup(createElement(DataTable, props)).includes("จัดการ"));
  const html = renderToStaticMarkup(createElement(DataTable, { ...props, renderActions: () => createElement("button", {}, "แก้ไข") }));
  assert.ok(html.includes("จัดการ") && html.includes("แก้ไข"));
});
const { default: RecordEditor } = loadComponent("src/components/admin/dashboard/RecordEditor.tsx");
for (const dataset of DASHBOARD_DATASETS) {
  check(`row editor ${dataset.type} locks identity fields and requires confirmation`, () => {
    const row = Object.fromEntries(dataset.columns.map(column=>[column.key,column.example]));
    const html = renderToStaticMarkup(createElement(RecordEditor, {
      version: { ...version, status: "draft" }, type: dataset.type, row: {id:1,...row}, provinceName:"ทดสอบ",
      onClose:()=>{},onSaved:()=>{},
    }));
    const inputs = html.match(/<input\b[^>]*>/g);
    for (const key of dataset.keys) assert.ok(inputs.some(control=>control.includes(`value="${row[key]}"`) && control.includes("disabled=")));
    const save = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g).find(control=>control.includes("บันทึกการแก้ไข"));
    assert.ok(save?.includes("disabled="));
    assert.ok(html.includes("ค่าเดิมและค่าใหม่ในประวัติ"));
  });
}
console.log(`${checks} dashboard UI checks passed; no database writes.`);
