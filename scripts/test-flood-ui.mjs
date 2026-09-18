import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const dashboardSource = await readFile(
  new URL("../src/components/flood/FloodDashboard.tsx", import.meta.url),
  "utf8"
);
const chartsSource = await readFile(
  new URL("../src/components/rice-yield/RiceCharts.tsx", import.meta.url),
  "utf8"
);
const mapSource = await readFile(
  new URL("../src/components/flood/ThailandFloodMap.tsx", import.meta.url),
  "utf8"
);

test("removes the hero scope pills and global filter panel", () => {
  assert.doesNotMatch(dashboardSource, /<ScopePill\b/);
  assert.doesNotMatch(dashboardSource, /function ScopePill\b/);
  assert.doesNotMatch(dashboardSource, /title="ตัวกรองข้อมูล"/);
});

test("places the compact filters on all five flood visualizations", () => {
  assert.equal((dashboardSource.match(/action=\{chartFilters\(\)\}/g) ?? []).length, 5);
  assert.match(dashboardSource, /function FloodChartFilters\b/);
  assert.match(dashboardSource, /เลือกข้อมูล/);
});

test("uses image 28 as a borderless blended hero", () => {
  assert.match(dashboardSource, /src="\/images\/28\.png"[\s\S]*?fill[\s\S]*?priority/);
  assert.match(dashboardSource, /bg-gradient-to-r from-\[#eef6ee\]/);
  assert.doesNotMatch(dashboardSource, /src="\/images\/28\.png"[^>]*border/);
});

test("uses images 27, 12, 28, and 30 in horizontal KPI cards", () => {
  for (const imageNumber of [27, 12, 28, 30]) {
    assert.match(dashboardSource, new RegExp(`imageSrc: "/images/${imageNumber}\\.png"`));
  }
  assert.match(dashboardSource, /function FloodKpiCard\b/);
  assert.match(dashboardSource, /flex min-h-\[128px\] min-w-0 items-center/);
  assert.match(dashboardSource, /imageFit === "cover"/);
});

test("uses the requested year colors and toggleable dot legends", () => {
  for (const color of ["#4E79A7", "#59A89C", "#A38AC7", "#E08E79", "#D45D79"]) {
    assert.match(dashboardSource, new RegExp(color));
  }
  assert.match(dashboardSource, /toggleable/);
  assert.match(chartsSource, /type="checkbox"/);
  assert.match(chartsSource, /h-2\.5 w-2\.5 rounded-full/);
  assert.match(chartsSource, /visibleSeries/);
});

test("uses taller full-width blue monthly bars with more rounded tops", () => {
  assert.match(dashboardSource, /color: "#3E6F8E"/);
  assert.match(dashboardSource, /height=\{420\}/);
  assert.match(dashboardSource, /height=\{500\}/);
  assert.equal((dashboardSource.match(/fitWidth/g) ?? []).length, 2);
  assert.match(dashboardSource, /alignmentLegendLabels=\{visibleMonthlyYears\.map/);
  assert.match(dashboardSource, /label: String\(month\)/);
  assert.doesNotMatch(dashboardSource, /className="self-start"/);
  assert.match(chartsSource, /function topRoundedBarPath\b/);
  assert.match(chartsSource, /aspectRatio: `\$\{width\} \/ \$\{height\}`/);
  assert.match(chartsSource, /block h-full w-full/);
  assert.match(chartsSource, /min-w-\[560px\] sm:min-w-0/);
  assert.match(chartsSource, /const width = 860/);
  assert.match(chartsSource, /left: 32, right: 12/);
  assert.match(chartsSource, /barWidth \/ 2/);
  assert.match(chartsSource, /y=\{height - 20\}/);
  assert.match(chartsSource, /invisible mb-3 hidden flex-wrap gap-x-5 gap-y-2 text-xs xl:flex/);
});

test("uses uniform blue rectangular ranking bars that fill the panel height", () => {
  assert.equal((dashboardSource.match(/color: "#3E6F8E"/g) ?? []).length, 2);
  assert.match(dashboardSource, /barRadius=\{2\}/);
  assert.match(dashboardSource, /fillHeight/);
  assert.match(dashboardSource, /className="flex h-full flex-col"/);
  assert.match(chartsSource, /borderRadius: `\$\{barRadius\}px`/);
  assert.match(chartsSource, /h-full min-h-\[38rem\] flex-1/);
  assert.match(chartsSource, /flex min-h-0 flex-col justify-center/);
});

test("moves the map before the ranking and uses in-map overlays", () => {
  assert.ok(
    dashboardSource.indexOf('title="แผนที่ความถี่เหตุการณ์น้ำท่วม"') <
      dashboardSource.indexOf('title="10 จังหวัดที่มีเหตุการณ์สูงสุด"')
  );
  assert.doesNotMatch(mapSource, /lg:grid-cols-\[minmax\(0,1fr\)_220px\]/);
  assert.match(mapSource, /function MapLegendItem\b/);
  assert.match(mapSource, /absolute bottom-3 right-3/);
  assert.match(mapSource, /shadow-\[0_16px_40px_rgba\(11,46,28,0\.18\)\]/);
  assert.match(mapSource, /activePathFeature/);
  assert.match(mapSource, /stroke="#0b78b5"/);
  assert.match(mapSource, /vectorEffect="non-scaling-stroke"/);
});
