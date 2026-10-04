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
const dashboardDataUrl = new URL(
  "../src/lib/rice-price/dashboard-data.ts",
  import.meta.url
);
const dashboardDataSource = await readFile(dashboardDataUrl, "utf8");

test("uses the compact rice-price hero without the removed notices", () => {
  assert.match(pageSource, /heroImage="\/images\/59\.jpg"/);
  assert.match(
    pageSource,
    /ติดตามแนวโน้มราคาข้าว 5 ชนิด ทั้งข้อมูลจริงและพยากรณ์รายเดือน/
  );
  assert.doesNotMatch(pageSource, /ข้อมูลราคาชุดนี้เป็นระดับประเทศ/);
  assert.doesNotMatch(dashboardSource, /ปี 2569 เป็นผลพยากรณ์จากโมเดล/);
  assert.doesNotMatch(dashboardSource, /title="ตัวกรองราคาข้าว"/);
});

test("loads every page from the published default dataset and maps canonical rows", async () => {
  const compiled = ts.transpileModule(dashboardDataSource, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const loadedModule = { exports: {} };
  const requests = [];
  const version = {
    id: "11111111-1111-4111-8111-111111111111",
    version_key: "0.2",
    label: "test",
    description: "test default",
    source_name: "test source",
    source_url: null,
    published_at: "2026-10-04T00:00:00.000Z",
  };
  const actualRow = {
    observed_on: "2026-01-01",
    year: 2026,
    month: 1,
    rice_type: "ข้าวขาว",
    price: 11800,
    unit: "บาท/ตัน",
    data_type: "actual",
    source: "mock",
    is_imputed: false,
    model_name: null,
    model_version: null,
    reliability: null,
    reliability_label: null,
    metadata: {},
  };
  const forecastRow = {
    ...actualRow,
    observed_on: "2026-03-01",
    month: 3,
    price: 12050,
    data_type: "forecast",
  };
  const firstPageRows = [actualRow, forecastRow, ...Array.from({ length: 498 }, () => actualRow)];

  async function fetchMock(input, init) {
    const url = String(input);
    requests.push({ url, cache: init?.cache });
    const page = new URL(url, "https://example.test").searchParams.get("page");
    const data = page === "1" ? firstPageRows : [actualRow];
    return new Response(JSON.stringify({
      data,
      meta: { version, page: Number(page), perPage: 500, total: 501 },
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }

  vm.runInNewContext(
    compiled,
    {
      module: loadedModule,
      exports: loadedModule.exports,
      require(id) {
        if (id === "@/lib/http/json") {
          return { readJsonResponse: async (response) => JSON.parse(await response.text()) };
        }
        throw new Error(`Unexpected dependency: ${id}`);
      },
      fetch: fetchMock,
      Response,
      URL,
      AbortController,
      DOMException,
    },
    { filename: dashboardDataUrl.pathname }
  );

  const result = await loadedModule.exports.fetchRicePriceDashboardData();
  assert.equal(requests.length, 2);
  assert.ok(requests.every((request) => request.cache === "no-store"));
  assert.ok(requests.every((request) => request.url.startsWith("/api/v1/datasets/rice_price")));
  assert.equal(result.dataset.label, "test");
  assert.equal(result.dataset.recordCount, 501);
  assert.equal(result.monthly.length, 2);
  assert.equal(result.monthly.find((row) => row.dataType === "observed").price, 1180);
  assert.equal(result.monthly.find((row) => row.dataType === "forecast").price, 1205);
  assert.deepEqual(Array.from(result.filters.yearsBe), [2569]);
  assert.equal(result.forecasts[0].month, 3);
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

test("uses warm price and forecast colors with clean comparison bars", async () => {
  const chartSource = await readFile(
    new URL("../src/components/rice-price/RicePriceCharts.tsx", import.meta.url),
    "utf8"
  );
  for (const color of ["#b78312", "#d06a27", "#bd4e3b", "#99455d", "#72543a"]) {
    assert.match(chartSource, new RegExp(color));
  }
  assert.match(chartSource, /ACTUAL_COLOR = "#d6a72b"/);
  assert.match(chartSource, /FORECAST_COLOR = "#e07a18"/);
  assert.match(chartSource, /type="checkbox"/);
  assert.match(chartSource, /toggleable/);
  assert.match(chartSource, /shadow-\[inset_0_0_0_2px_#e28a24,0_7px_20px_rgba\(179,91,17,0\.12\)\]/);
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
