import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/components/drought/DroughtDashboard.tsx", import.meta.url),
  "utf8"
);
const mapSource = await readFile(
  new URL("../src/components/drought/ThailandDroughtMap.tsx", import.meta.url),
  "utf8"
);
const pageSource = await readFile(
  new URL("../src/app/analytics/drought/page.tsx", import.meta.url),
  "utf8"
);
const shellSource = await readFile(
  new URL("../src/components/rice-yield/RiceAnalyticsShell.tsx", import.meta.url),
  "utf8"
);

test("uses the generated drought landscape as a blended background hero", () => {
  assert.match(pageSource, /heroImage="\/images\/drought-dashboard-hero\.png"/);
  assert.match(pageSource, /heroImageMode="background"/);
  assert.match(pageSource, /description="ดูแนวโน้มบันทึกภัยแล้งรายเดือนและรายปี พร้อมสำรวจข้อมูลแต่ละจังหวัดบนแผนที่"/);
  assert.match(pageSource, /notice=\{null\}/);
  assert.doesNotMatch(pageSource, /ไม่ใช่การจัดระดับผลกระทบ/);
  assert.match(shellSource, /heroImageMode === "background"/);
  assert.match(shellSource, /object-cover object-center opacity-60/);
});

test("removes the standalone filter panel and adds compact filters to all four charts", () => {
  assert.doesNotMatch(dashboardSource, /title="ตัวกรองข้อมูล"/);
  assert.equal((dashboardSource.match(/action=\{chartFilters\(\)\}/g) ?? []).length, 4);
  assert.match(dashboardSource, /function DroughtChartFilters\b/);
  assert.match(dashboardSource, /เลือกข้อมูล/);
});

test("removes repetitive chart descriptions while keeping compact filters", () => {
  assert.doesNotMatch(dashboardSource, /จัดอันดับตามความถี่ที่พบจากข้อมูลต้นฉบับ/);
  assert.doesNotMatch(dashboardSource, /สีเข้มหมายถึงพบบันทึกมาก/);
  assert.doesNotMatch(dashboardSource, /จำนวนบันทึกภัยแล้งรวมในแต่ละปี/);
  assert.doesNotMatch(dashboardSource, /จำนวนจังหวัดที่พบบันทึกภัยแล้งรายเดือนจากทุกปี/);
  assert.match(dashboardSource, /เลือกข้อมูล/);
});

test("uses images 30, 31, 32, and 21 in horizontal KPI cards", () => {
  for (const imageNumber of [30, 31, 32, 21]) {
    assert.match(dashboardSource, new RegExp(`imageSrc="/images/${imageNumber}\\.png"`));
  }
  assert.match(dashboardSource, /flex min-h-\[128px\] min-w-0 items-center/);
  assert.doesNotMatch(dashboardSource, /icon=\{/);
});

test("uses standard Thai month abbreviations and orange charts", () => {
  for (const month of ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "ธ.ค."]) {
    assert.match(dashboardSource, new RegExp(month.replace(".", "\\.")));
  }
  assert.match(dashboardSource, /const DROUGHT_ORANGE = "#F97316"/);
  assert.match(dashboardSource, /fill=\{DROUGHT_ORANGE\} radius=\{\[14, 14, 2, 2\]\}/);
  assert.match(dashboardSource, /stroke=\{DROUGHT_ORANGE\}/);
  assert.doesNotMatch(dashboardSource, /shortMonth/);
  assert.doesNotMatch(dashboardSource, /angle=\{-32\}/);
});

test("moves the compact map before the full-height ranking", () => {
  assert.ok(
    dashboardSource.indexOf('title="แผนที่ความถี่ที่พบบันทึกภัยแล้ง"') <
      dashboardSource.indexOf('"จังหวัดที่พบบ่อยสูงสุด"')
  );
  assert.match(dashboardSource, /xl:grid-cols-\[minmax\(0,1\.05fr\)_minmax\(0,0\.95fr\)\]/);
  assert.match(dashboardSource, /<ThailandDroughtMap[\s\S]*?compact/);
  assert.match(dashboardSource, /grid min-h-\[28rem\] flex-1 grid-rows-5/);
  assert.match(dashboardSource, /rounded-\[4px\] bg-orange-600/);
});

test("keeps drought map colors and shows in-map detail with connector", () => {
  for (const color of ["#e2e8f0", "#ffedd5", "#fdba74", "#f97316", "#c2410c"]) {
    assert.match(mapSource, new RegExp(color));
  }
  assert.match(mapSource, /dashboard-map-detail-card absolute bottom-3 right-3/);
  assert.match(mapSource, /dashboard-map-connector-line/);
  assert.match(mapSource, /stroke-\[#b57a05\]/);
  assert.match(mapSource, /compact[\s\S]*?bg-\[#fffaf5\]/);
});
