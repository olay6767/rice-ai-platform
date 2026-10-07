import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import vm from "node:vm";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const componentUrl = new URL(
  "../src/components/insights/DashboardMascotInsight.tsx",
  import.meta.url
);
const source = await readFile(componentUrl, "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
}).outputText;
const loadedModule = { exports: {} };
const require = createRequire(import.meta.url);

vm.runInNewContext(
  compiled,
  {
    module: loadedModule,
    exports: loadedModule.exports,
    require(name) {
      if (name === "next/image") {
        return {
          __esModule: true,
          default({ fill, ...props }) {
            return React.createElement("img", {
              ...props,
              "data-fill": fill ? "true" : undefined,
            });
          },
        };
      }
      return require(name);
    },
  },
  { filename: componentUrl.pathname }
);

test("renders the mascot, summary, and recommendation without a source line", () => {
  const html = renderToStaticMarkup(
    React.createElement(loadedModule.exports.default, {
      dashboardName: "ผลผลิตข้าว",
      summary: "ผลผลิตเพิ่มขึ้นจากปีก่อน",
      recommendation: "ติดตามข้อมูลจริงหลังเก็บเกี่ยว",
    })
  );

  assert.ok(html.includes("/images/14.png"));
  assert.ok(html.includes("สรุปผลผลิตข้าว"));
  assert.ok(!html.includes("จากข้อมูล:"));
  assert.ok(html.includes("ผลผลิตเพิ่มขึ้นจากปีก่อน"));
  assert.ok(html.includes("แนะนำว่าควรทำอย่างไร"));
  assert.ok(html.includes("ติดตามข้อมูลจริงหลังเก็บเกี่ยว"));
  assert.ok(html.includes("dashboard-mascot-character"));
  assert.ok(html.includes("dashboard-mascot-speech"));
});

test("is connected to all five active dashboards", async () => {
  const dashboardFiles = [
    "../src/components/disaster-overview/DisasterOverviewDashboard.tsx",
    "../src/components/rice-yield/RiceYieldDashboard.tsx",
    "../src/components/flood/FloodDashboard.tsx",
    "../src/components/drought/DroughtDashboard.tsx",
    "../src/components/storm/StormDashboard.tsx",
  ];

  for (const file of dashboardFiles) {
    const dashboardSource = await readFile(new URL(file, import.meta.url), "utf8");
    assert.ok(
      dashboardSource.includes("<DashboardMascotInsight"),
      `${file} must render the shared mascot insight`
    );
  }
});
