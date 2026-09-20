import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/components/storm/StormDashboard.tsx", import.meta.url),
  "utf8"
);
const mapSource = await readFile(
  new URL("../src/components/drought/ThailandDroughtMap.tsx", import.meta.url),
  "utf8"
);
const pageSource = await readFile(
  new URL("../src/app/analytics/storm/page.tsx", import.meta.url),
  "utf8"
);

test("uses storm image 61 as a blended hero with shorter copy", () => {
  assert.match(pageSource, /heroImage="\/images\/61\.png"/);
  assert.match(pageSource, /heroImageMode="background"/);
  assert.match(pageSource, /heroImagePosition="center 48%"/);
  assert.match(
    pageSource,
    /description="ดูแนวโน้มบันทึกพายุรายเดือนและรายปี พร้อมสำรวจข้อมูลแต่ละจังหวัดบนแผนที่"/
  );
  assert.match(pageSource, /notice=\{null\}/);
  assert.doesNotMatch(pageSource, /ข้อมูลนี้สรุปความถี่ที่พบบันทึกพายุ/);
});

test("moves compact filters from the standalone panel to all four charts", () => {
  assert.doesNotMatch(dashboardSource, /title="ตัวกรองข้อมูล"/);
  assert.equal((dashboardSource.match(/action=\{chartFilters\(\)\}/g) ?? []).length, 4);
  assert.match(dashboardSource, /function StormChartFilters\b/);
  assert.match(dashboardSource, /เลือกข้อมูล/);
});

test("uses images 34, 12, 31, and 32 in horizontal KPI cards", () => {
  for (const imageNumber of [34, 12, 31, 32]) {
    assert.match(dashboardSource, new RegExp(`imageSrc="/images/${imageNumber}\\.png"`));
  }
  assert.match(dashboardSource, /flex min-h-\[128px\] min-w-0 items-center/);
  assert.doesNotMatch(dashboardSource, /icon=\{/);
});

test("uses standard Thai month abbreviations and rounded-top red bars", () => {
  for (const month of ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "ธ.ค."]) {
    assert.match(dashboardSource, new RegExp(month.replace(".", "\\.")));
  }
  assert.match(dashboardSource, /fill=\{STORM_RED\}[\s\S]*?radius=\{\[12, 12, 2, 2\]\}/);
});

test("uses the compact connected map beside a larger ranking chart", () => {
  assert.match(
    dashboardSource,
    /xl:grid-cols-\[minmax\(0,1\.05fr\)_minmax\(0,0\.95fr\)\]/
  );
  assert.match(dashboardSource, /<ThailandFrequencyMap[\s\S]*?compact/);
  assert.match(dashboardSource, /grid min-h-\[34rem\] flex-1 auto-rows-fr/);
  assert.match(mapSource, /dashboard-map-detail-card absolute bottom-3 right-3/);
  assert.match(mapSource, /dashboard-map-connector-line/);
});

test("uses uniform red rectangular ranking bars", () => {
  assert.match(dashboardSource, /const STORM_RED = "#D32F2F"/);
  assert.match(dashboardSource, /backgroundColor: STORM_RED/);
  assert.match(dashboardSource, /rounded-\[3px\] bg-slate-200/);
  assert.match(dashboardSource, /className="h-full rounded-\[3px\]"/);
  assert.doesNotMatch(
    dashboardSource,
    /<p className="mt-0\.5 text-\[11px\][^"]*">\s*\{item\.detail\}/
  );
});

test("removes repetitive descriptions from all four storm charts", () => {
  for (const description of [
    "จัดอันดับจากข้อมูลใน JSON ตามตัวกรอง",
    "ความถี่ที่พบบันทึกพายุ · ภาพรวมทุกปี",
    "ความถี่ที่พบบันทึกพายุรวมในแต่ละปี",
    "จำนวนจังหวัดที่พบบันทึกพายุในแต่ละเดือน",
  ]) {
    assert.doesNotMatch(dashboardSource, new RegExp(description));
  }
});
