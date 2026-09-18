import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

import {
  buildRiceYieldMapPaths,
  createRiceYieldProjector,
} from "../src/lib/rice-yield/map-geometry.ts";

const geoJsonUrl = new URL("../public/data/rice-yield/thailand_provinces.geojson", import.meta.url);
const source = await readFile(geoJsonUrl);
const geoJson = JSON.parse(source.toString("utf8"));
const records = JSON.parse(await readFile(
  new URL("../public/data/rice-yield/rice_yield_yearly.json", import.meta.url),
  "utf8"
));
const width = 720;
const height = 760;

test("projects all real coordinates without exceeding the argument limit", () => {
  const project = createRiceYieldProjector(geoJson.features, width, height);
  assert.equal(typeof project, "function");
  let coordinateCount = 0;
  for (const feature of geoJson.features) {
    const polygons = feature.geometry.type === "Polygon"
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (const position of ring) {
          const [x, y] = project(position);
          assert.ok(Number.isFinite(x) && Number.isFinite(y));
          assert.ok(x >= 24 - 1e-6 && x <= width - 24 + 1e-6);
          assert.ok(y >= 24 - 1e-6 && y <= height - 24 + 1e-6);
          coordinateCount++;
        }
      }
    }
  }
  assert.ok(coordinateCount > 500_000, "regression must use the full detailed GeoJSON");
  console.log(`Verified ${coordinateCount.toLocaleString("en-US")} real coordinates.`);
});

test("builds finite SVG paths for all 77 provinces", () => {
  const paths = buildRiceYieldMapPaths(geoJson.features, width, height);
  assert.equal(paths.length, 77);
  for (const { feature, path } of paths) {
    assert.ok(path.startsWith("M"), feature.properties.province_th);
    assert.ok(path.endsWith("Z"), feature.properties.province_th);
    assert.ok(!/NaN|Infinity|undefined/.test(path), feature.properties.province_th);
  }
});

test("renders the actual choropleth component with the full real dataset", async () => {
  const componentUrl = new URL(
    "../src/components/rice-yield/RiceYieldStaticVisualizations.tsx",
    import.meta.url
  );
  const componentSource = await readFile(componentUrl, "utf8");
  const compiled = ts.transpileModule(componentSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const require = createRequire(import.meta.url);
  vm.runInNewContext(compiled, {
    module: loadedModule,
    exports: loadedModule.exports,
    require(name) {
      if (name === "@/lib/rice-yield/map-geometry") return { buildRiceYieldMapPaths };
      if (name === "./RiceAnalyticsShell") {
        return { RiceEmptyState: ({ message }) => createElement("p", null, message) };
      }
      return require(name);
    },
  }, { filename: componentUrl.pathname });

  const yearRecords = records.filter(record => record.crop_year === "2568/69");
  const html = renderToStaticMarkup(createElement(loadedModule.exports.ThailandYieldChoropleth, {
    geoJson,
    records: yearRecords,
    selectedProvince: yearRecords[0].province,
    onSelectProvince() {},
  }));
  assert.equal((html.match(/aria-label="จังหวัด/g) ?? []).length, 77);
  assert.ok(html.includes("จับคู่ข้อมูลได้ 77 จาก 77 จังหวัด"));
  assert.ok(!/NaN|Infinity|undefined/.test(html));
  assert.ok(!/d=\{geometryPath/.test(componentSource), "hover must reuse memoized SVG paths");
  assert.ok(
    componentSource.includes('key={`connector-${activeProvince}`}') &&
      componentSource.includes('key={`detail-${activeProvince}`}'),
    "province connector and detail card must use distinct sibling keys"
  );
  assert.ok(
    !componentSource.includes("key={activeProvince}"),
    "active province must not be reused as a key for sibling elements"
  );
  assert.ok(
    componentSource.includes("connector?.province === activeProvince"),
    "only the active province connector may be rendered"
  );
  assert.ok(
    !componentSource.includes('className="relative flex h-full min-h-[520px]'),
    "ranking content must not exceed its panel with a nested full height"
  );

  const provinceHistory = records.filter(
    record => record.province === yearRecords[0].province
  );
  const trendHtml = renderToStaticMarkup(createElement(
    loadedModule.exports.HistoricalYieldForecastChart,
    { history: provinceHistory, selectedYear: "2568/69" }
  ));
  assert.match(trendHtml, /stroke="#d6a72b"/, "actual yield line must be yellow");
  assert.doesNotMatch(trendHtml, /stroke="#237A57"/, "actual yield line must not be green");
});

test("empty geometry produces no invalid projection", () => {
  assert.equal(createRiceYieldProjector([], width, height), null);
  assert.deepEqual(buildRiceYieldMapPaths([], width, height), []);
});

test("does not modify the GeoJSON source", async () => {
  const hash = bytes => createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash(await readFile(geoJsonUrl)), hash(source));
  assert.equal(hash(Buffer.from(JSON.stringify(geoJson))), hash(Buffer.from(JSON.stringify(JSON.parse(source)))));
});
