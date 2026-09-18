import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const endpoint = process.env.WEATHER_TEST_URL ??
  "http://127.0.0.1:3000/api/weather?latitude=14.4745&longitude=100.1177&name=Suphanburi";
const response = await fetch(endpoint);
assert.equal(response.ok, true, `weather API returned HTTP ${response.status}`);
const payload = await response.json();
assert.equal(payload.data.hourly.length, 24);
assert.equal(payload.data.daily.length, 7);

const componentUrl = new URL(
  "../src/components/weather/WeatherForecastExplorer.tsx",
  import.meta.url
);
const source = await readFile(componentUrl, "utf8");
const dashboardSource = await readFile(
  new URL("../src/components/weather/WeatherDashboard.tsx", import.meta.url),
  "utf8"
);
const compiled = ts.transpileModule(source, {
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
  require,
  Intl,
}, { filename: componentUrl.pathname });

const html = renderToStaticMarkup(createElement(loadedModule.exports.default, {
  weather: payload.data,
}));

for (const label of [
  "ภาพรวม",
  "ปริมาณฝน",
  "อุณหภูมิ",
  "ความชื้น",
  "ความชื้นดิน",
  "การคายระเหย ET₀",
  "4 ชั่วโมง",
  "24 ชั่วโมง",
  "สะสม",
]) {
  assert.ok(html.includes(label), `missing rendered control: ${label}`);
}
assert.equal((html.match(/ข้อมูลพยากรณ์จาก Open-Meteo/g) ?? []).length, 1);
assert.equal((html.match(/rounded-2xl border p-4 transition/g) ?? []).length, 7);
assert.ok(!/NaN|Infinity|undefined/.test(html));

assert.ok(dashboardSource.includes("locationToolbar={locationToolbar}"));
for (const iconNumber of [38, 39, 40, 41]) {
  assert.ok(
    dashboardSource.includes(`/images/${iconNumber}.png`),
    `missing weather metric icon ${iconNumber}`
  );
}
assert.ok(
  dashboardSource.includes("/images/42.jpg"),
  "missing current-weather background image 42"
);
for (const removedText of [
  "กำลังดู:",
  "จดจำพื้นที่ล่าสุดในอุปกรณ์นี้",
  "อากาศจาก Open-Meteo ตามพิกัด",
  "ชื่อพื้นที่ไม่ถูกต้อง? ค้นหาหรือแก้ไข",
  "พิกัด {formatCoordinate",
  "GPS ของอุปกรณ์",
  "คำแนะนำสำหรับแปลงนา",
  "ประเมินจากฝน ความชื้น และลมเท่านั้น ควรตรวจสภาพจริงก่อนเริ่มงาน",
]) {
  assert.ok(!dashboardSource.includes(removedText), `removed copy still present: ${removedText}`);
}
assert.ok(dashboardSource.includes("activities.slice(0, 4).map"));
assert.ok(dashboardSource.includes("shadow-[0_10px_28px_rgba(64,145,108,0.16)]"));
console.log("PASS Weather Explorer rendered 24 hourly and 7 daily API records.");
