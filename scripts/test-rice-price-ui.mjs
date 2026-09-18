import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const pageSource = await readFile(
  new URL("../src/app/analytics/rice-price/page.tsx", import.meta.url),
  "utf8"
);
const dashboardSource = await readFile(
  new URL("../src/components/rice-price/RicePriceDashboard.tsx", import.meta.url),
  "utf8"
);

test("uses the compact rice-price hero without the removed notices", () => {
  assert.match(pageSource, /heroImage="\/images\/22\.png"/);
  assert.match(
    pageSource,
    /ติดตามแนวโน้มราคาข้าว 5 ชนิด ทั้งข้อมูลจริงและพยากรณ์รายเดือน/
  );
  assert.doesNotMatch(pageSource, /ข้อมูลราคาชุดนี้เป็นระดับประเทศ/);
  assert.doesNotMatch(dashboardSource, /ปี 2569 เป็นผลพยากรณ์จากโมเดล/);
  assert.doesNotMatch(dashboardSource, /title="ตัวกรองราคาข้าว"/);
});

test("places the compact filter action on all remaining chart panels", () => {
  assert.equal((dashboardSource.match(/<PriceChartFilters\b/g) ?? []).length, 4);
  assert.match(dashboardSource, /<details className="group relative z-40 self-start">/);
  assert.match(dashboardSource, /เลือกข้อมูล/);
  assert.doesNotMatch(dashboardSource, /title="3\. รูปแบบราคาตามฤดูกาล"/);
  assert.doesNotMatch(dashboardSource, /<SeasonalChart\b/);
});

test("uses image icons 23 through 26 in horizontal KPI cards", () => {
  for (const imageNumber of [23, 24, 25, 26]) {
    assert.match(dashboardSource, new RegExp(`imageSrc="/images/${imageNumber}\\.png"`));
  }
  assert.equal((dashboardSource.match(/imageSrc="\/images\/2[3-6]\.png"/g) ?? []).length, 4);
  assert.match(dashboardSource, /flex min-h-\[128px\] min-w-0 items-center/);
  assert.match(dashboardSource, /rounded-full bg-white shadow-/);
});

test("uses cool line colors and clean warm comparison bars without duplicate labels", async () => {
  const chartSource = await readFile(
    new URL("../src/components/rice-price/RicePriceCharts.tsx", import.meta.url),
    "utf8"
  );
  for (const color of ["#1f4d5c", "#176b73", "#285c87", "#425a78", "#315f55"]) {
    assert.match(chartSource, new RegExp(color));
  }
  assert.match(chartSource, /SELECTED_SERIES_COLOR = "#e7bd4b"/);
  assert.match(chartSource, /type="checkbox"/);
  assert.match(chartSource, /toggleable/);
  assert.match(chartSource, /shadow-\[0_5px_16px_rgba\(31,77,92,0\.14\)\]/);
  assert.doesNotMatch(chartSource, /border-amber-200 bg-amber-50\/70/);
  for (const color of ["#fde7c2", "#fbd8ae", "#f8c999", "#f4b982", "#efa96e"]) {
    assert.match(chartSource, new RegExp(color));
  }
  for (const color of ["#c66a16", "#b85d12", "#aa500f", "#9b440e", "#8d380c"]) {
    assert.match(chartSource, new RegExp(color));
  }
  assert.doesNotMatch(chartSource, /repeating-linear-gradient/);
  assert.doesNotMatch(chartSource, /\{meta\.label\} \(\{meta\.detail\}\)/);
});

test("renders yellow actual prices and an orange forecast endpoint", async () => {
  const componentUrl = new URL(
    "../src/components/rice-price/RicePriceCharts.tsx",
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

  vm.runInNewContext(
    compiled,
    {
      module: loadedModule,
      exports: loadedModule.exports,
      require,
    },
    { filename: componentUrl.pathname }
  );

  const records = [
    {
      date: "2025-11",
      yearAd: 2025,
      yearBe: 2568,
      month: 11,
      monthNameTh: "พฤศจิกายน",
      riceType: "ข้าวขาว",
      price: 1200,
      dataType: "observed",
    },
    {
      date: "2025-12",
      yearAd: 2025,
      yearBe: 2568,
      month: 12,
      monthNameTh: "ธันวาคม",
      riceType: "ข้าวขาว",
      price: 1220,
      dataType: "observed",
    },
    {
      date: "2026-01",
      yearAd: 2026,
      yearBe: 2569,
      month: 1,
      monthNameTh: "มกราคม",
      riceType: "ข้าวขาว",
      price: 1240,
      dataType: "forecast",
    },
    {
      date: "2026-02",
      yearAd: 2026,
      yearBe: 2569,
      month: 2,
      monthNameTh: "กุมภาพันธ์",
      riceType: "ข้าวขาว",
      price: 1260,
      dataType: "forecast",
    },
  ];

  const html = renderToStaticMarkup(
    createElement(loadedModule.exports.PriceTimelineChart, {
      records,
      selectedDate: "2026-01",
    })
  );

  assert.match(html, /stroke="#d6a72b"/);
  assert.match(html, /stroke="#e07a18"/);
  assert.match(html, /fill="#64748b"/);
  assert.match(html, /fill="#475569"/);
  assert.match(html, /fill="#fff1df"/);
  assert.match(html, /r="9"/);
  assert.equal((html.match(/<circle\b/g) ?? []).length, 4);
});
