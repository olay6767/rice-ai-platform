import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

const require = createRequire(import.meta.url);
const rootUrl = new URL("../", import.meta.url);
const typesUrl = new URL("src/lib/disaster-overview/types.ts", rootUrl);
const selectorsUrl = new URL("src/lib/disaster-overview/selectors.ts", rootUrl);
const dataUrl = new URL(
  "public/data/disasters/disaster_overview.json",
  rootUrl
);

function compileCommonJs(source, filename, mocks = {}) {
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  vm.runInNewContext(
    compiled,
    {
      module: loadedModule,
      exports: loadedModule.exports,
      require(name) {
        if (Object.hasOwn(mocks, name)) return mocks[name];
        return require(name);
      },
    },
    { filename }
  );
  return loadedModule.exports;
}

const types = compileCommonJs(await readFile(typesUrl, "utf8"), typesUrl.pathname);
const selectors = compileCommonJs(
  await readFile(selectorsUrl, "utf8"),
  selectorsUrl.pathname,
  { "./types": types }
);
const data = JSON.parse(await readFile(dataUrl, "utf8"));

test("uses 12 standard Thai month abbreviations", () => {
  assert.deepEqual(
    Array.from(selectors.THAI_SHORT_MONTHS),
    [
      "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
      "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
    ]
  );
  const view = selectors.deriveDisasterOverview(
    data,
    selectors.DEFAULT_OVERVIEW_FILTERS
  );
  assert.equal(view.monthRows.length, 12);
  assert.deepEqual(
    Array.from(view.monthRows, (row) => row.label),
    Array.from(selectors.THAI_SHORT_MONTHS)
  );
});

test("derives independent views without changing the source data", () => {
  const sourceBefore = JSON.stringify(data);
  const floodFilters = {
    ...selectors.DEFAULT_OVERVIEW_FILTERS,
    disaster: "น้ำท่วม",
  };
  const droughtFilters = {
    ...selectors.DEFAULT_OVERVIEW_FILTERS,
    disaster: "ภัยแล้ง",
  };
  const flood = selectors.deriveDisasterOverview(data, floodFilters);
  const drought = selectors.deriveDisasterOverview(data, droughtFilters);

  assert.deepEqual(Array.from(flood.visibleDisasters), ["น้ำท่วม"]);
  assert.deepEqual(Array.from(drought.visibleDisasters), ["ภัยแล้ง"]);
  assert.equal(flood.kpiValues.drought, null);
  assert.equal(drought.kpiValues.flood, null);
  assert.equal(JSON.stringify(data), sourceBefore);
});

test("limits line-chart history at the selected ending year", () => {
  const view = selectors.deriveDisasterOverview(
    data,
    selectors.DEFAULT_OVERVIEW_FILTERS
  );
  const rows = selectors.historicalTrendRows(view.yearlyRows, "2565");
  assert.ok(rows.length >= 2);
  assert.equal(rows.at(-1).label, "2565");
  assert.ok(rows.every((row) => Number(row.label) <= 2565));
});
