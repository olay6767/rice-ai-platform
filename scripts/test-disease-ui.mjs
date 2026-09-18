import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const detectorSource = await readFile(
  new URL("../src/components/disease/RiceDiseaseDetector.tsx", import.meta.url),
  "utf8"
);
const animationSource = await readFile(
  new URL("../src/components/disease/RiceDiseaseDetector.module.css", import.meta.url),
  "utf8"
);

test("removes the previous visible disease detector heading and description", () => {
  assert.doesNotMatch(detectorSource, />\s*ตรวจโรคข้าวจากภาพ\s*</);
  assert.doesNotMatch(
    detectorSource,
    /อัปโหลดภาพใบข้าวที่เห็นอาการชัดเจน เพื่อรับผลคาดการณ์จากระบบ AI พร้อมระดับความมั่นใจ/
  );
});

test("uses image 14 as a transparent mascot beside the upload experience", () => {
  assert.match(detectorSource, /src="\/images\/14\.png"/);
  assert.match(detectorSource, /ผู้ช่วย Rice Leaf AI/);
  assert.match(detectorSource, /หลักการและวิธีใช้/);
  assert.match(detectorSource, /grid-cols-\[minmax\(0,1fr\)_112px\]/);
  assert.doesNotMatch(detectorSource, /bg-\[linear-gradient\(125deg/);
  assert.ok(
    detectorSource.indexOf('id="disease-guide-title"') <
      detectorSource.indexOf("className={styles.mascotStage}"),
    "guide bubble should appear before the mascot so the mascot lands on the right"
  );
});

test("animates the mascot in from the side and respects reduced motion", () => {
  assert.match(detectorSource, /styles\.mascotLanding/);
  assert.match(detectorSource, /styles\.rocketTrail/);
  assert.match(animationSource, /@keyframes mascot-side-arrival/);
  assert.match(animationSource, /translate3d\(-82vw, 8px, 0\)/);
  assert.match(animationSource, /@keyframes mascot-side-trail/);
  assert.match(animationSource, /@media \(prefers-reduced-motion: reduce\)/);
});

test("presents upload and result experiences inside one tall iPhone frame", () => {
  assert.match(detectorSource, /testId="iphone-disease-frame"/);
  assert.doesNotMatch(detectorSource, /testId="iphone-upload-frame"/);
  assert.doesNotMatch(detectorSource, /testId="iphone-result-frame"/);
  assert.match(detectorSource, /data-testid={`\$\{testId\}-dynamic-island`}/);
  assert.match(detectorSource, /แถบสถานะโทรศัพท์/);
  assert.match(animationSource, /min-height: 820px/);
  assert.ok(
    detectorSource.indexOf('id="disease-guide-title"') <
      detectorSource.indexOf('testId="iphone-disease-frame"'),
    "usage guide should appear before the combined phone"
  );
});

test("simplifies the analysis card and removes requested notices", () => {
  assert.doesNotMatch(detectorSource, /ผลนี้เป็นการคาดการณ์จากระบบ AI/);
  assert.doesNotMatch(detectorSource, /ขอบเขตของโมเดล/);
  assert.doesNotMatch(detectorSource, /บันทึกผลตรวจไว้ในประวัติของคุณแล้ว/);
  assert.match(detectorSource, /shadow-\[0_8px_24px_rgba\(20,42,29,0\.10\)\]/);
  assert.match(detectorSource, /คำแนะนำสั้น ๆ/);
  assert.doesNotMatch(detectorSource, /<details\s+open/);
});

test("uses the requested image assets for upload and analysis actions", () => {
  assert.match(detectorSource, /src="\/images\/36\.png"/);
  assert.match(detectorSource, /src="\/images\/37\.png"/);
});

test("uses the dark mustard palette for the upload experience", () => {
  assert.match(detectorSource, /styles\.mustardIcon/);
  assert.match(detectorSource, /styles\.mustardDropZone/);
  assert.match(detectorSource, /styles\.mustardUploadIcon/);
  assert.match(detectorSource, /styles\.mustardButton/);
  assert.match(detectorSource, /styles\.mustardOutlineButton/);
  assert.match(animationSource, /background: #946b08 !important/);
});

test("documents file upload limitations and removes disease history", () => {
  assert.match(detectorSource, /เตรียมภาพใบข้าวที่ชัดเจนไว้ในเครื่อง/);
  assert.match(detectorSource, /อัปโหลดไฟล์แล้วกดเริ่มวิเคราะห์/);
  assert.match(detectorSource, /ยังไม่รองรับการเปิดกล้องถ่ายภาพโดยตรง/);
  assert.doesNotMatch(detectorSource, /\bcapture=/);
  assert.doesNotMatch(detectorSource, /ประวัติการตรวจโรค/);
  assert.doesNotMatch(detectorSource, /รีเฟรชประวัติ/);
});
