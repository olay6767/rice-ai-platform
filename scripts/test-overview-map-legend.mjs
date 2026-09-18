import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const componentUrl = new URL(
  "../src/components/drought/ThailandDroughtMap.tsx",
  import.meta.url
);
const source = await readFile(componentUrl, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
  },
}).outputText;
const loadedModule = { exports: {} };
const require = createRequire(import.meta.url);

vm.runInNewContext(
  compiled + "\nexports.testFrequencyBand = frequencyBand;",
  {
    module: loadedModule,
    exports: loadedModule.exports,
    require(name) {
      if (name === "react") {
        return {
          ...React,
          useEffect() {},
          useMemo(callback) { return callback(); },
          // Render the loaded, empty-geometry state to inspect the actual legend.
          useState(initial) { return [initial === true ? false : initial, () => {}]; },
        };
      }
      if (name === "@/components/rice-yield/RiceAnalyticsShell") return {};
      if (name === "@/lib/http/json") return {};
      return require(name);
    },
  },
  { filename: componentUrl.pathname }
);

test("renders four visible legend swatches, darkest first", () => {
  const html = renderToStaticMarkup(
    React.createElement(loadedModule.exports.default, {
      values: new Map(),
      selectedProvince: null,
      onSelectProvince() {},
      scopeLabel: "ข้อมูลทั้งหมด",
      valueUnit: "ครั้ง",
      legendTitle: "ภัยแล้ง",
      theme: "green",
      compact: true,
    })
  );

  const colors = ["#40916C", "#90A955", "#ECF39E", "#e8ece6"];
  let previousPosition = -1;
  for (const color of colors) {
    const position = html.indexOf(`background-color:${color}`);
    assert.ok(position > previousPosition, `visible swatch ${color} must appear in order`);
    previousPosition = position;
  }
  assert.ok(html.includes("พบบ่อย"));
  assert.ok(html.includes("พบปานกลาง"));
  assert.ok(html.includes("พบน้อย"));
  assert.ok(html.includes("ไม่มีบันทึก"));
  assert.match(html, />ภัยแล้ง<\/p>/);
  assert.ok(!html.includes("พบบ่อยมาก"));
  assert.ok(!html.includes("ขอบเขต 0 จังหวัด"));
});

test("uses the same three frequency bands for province fills", () => {
  const band = loadedModule.exports.testFrequencyBand;
  assert.equal(band(0, 90, 3), 0);
  assert.equal(band(1, 90, 3), 1);
  assert.equal(band(30, 90, 3), 1);
  assert.equal(band(31, 90, 3), 2);
  assert.equal(band(60, 90, 3), 2);
  assert.equal(band(61, 90, 3), 3);
  assert.equal(band(90, 90, 3), 3);
  assert.equal(band(100, 90, 3), 3);
});

test("preserves five bands for non-overview maps", () => {
  const band = loadedModule.exports.testFrequencyBand;
  assert.equal(band(25, 100), 1);
  assert.equal(band(50, 100), 2);
  assert.equal(band(75, 100), 3);
  assert.equal(band(100, 100), 4);
});
