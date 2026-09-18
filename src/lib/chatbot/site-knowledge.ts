import { readFile } from "node:fs/promises";
import path from "node:path";

import type { KnowledgeTopic } from "@/lib/chatbot/types";

const MAX_CONTEXT_LENGTH = 18_000;
const DATA_CACHE_TTL_MS = 5 * 60 * 1_000;

const TOPIC_ROUTES: Record<KnowledgeTopic, string> = {
  flood: "/analytics/flood",
  storm: "/analytics/storm",
  drought: "/analytics/drought",
  yield: "/analytics/yield",
  price: "/analytics/rice-price",
};

const TOPIC_KEYWORDS: Record<KnowledgeTopic, string[]> = {
  flood: ["น้ำท่วม", "อุทกภัย", "flood"],
  storm: ["พายุ", "วาตภัย", "storm"],
  drought: ["ภัยแล้ง", "แล้ง", "ฝนทิ้งช่วง", "drought"],
  yield: ["ผลผลิต", "กิโลกรัมต่อไร่", "กก./ไร่", "yield"],
  price: ["ราคาข้าว", "ราคา ข้าว", "ราคาตลาด", "rice price"],
};

const RICE_SCOPE_KEYWORDS = [
  "ข้าว",
  "ชาวนา",
  "นาข้าว",
  "แปลงนา",
  "ทำนา",
  "ปลูกข้าว",
  "ปักดำ",
  "หว่านข้าว",
  "ต้นกล้า",
  "รวง",
  "กาบใบ",
  "ใบข้าว",
  "เมล็ดพันธุ์",
  "ปุ๋ย",
  "ศัตรูพืช",
  "วัชพืช",
  "แมลง",
  "เพลี้ย",
  "หนอนกอ",
  "หอยเชอรี่",
  "เก็บเกี่ยว",
  "ไถนา",
  "คันนา",
  "น้ำในนา",
  "โรคไหม้",
  "โรคขอบใบแห้ง",
  "โรคใบจุด",
  "ต้นทุนการปลูก",
  "rice",
  "paddy",
  "rice farm",
  "rice disease",
  ...Object.values(TOPIC_KEYWORDS).flat(),
];

const GREETING_PATTERN = /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|ขอบคุณ|hello|hi|hey)[\s!?.]*$/i;
const FOLLOW_UP_PATTERN = /(แล้ว|เทียบ|มากสุด|น้อยสุด|อันดับ|ปี|เดือน|จังหวัด|ต่อ|อีก|ก่อนหน้า|ล่าสุด|แนวโน้ม|\d)/i;

const MONTHS = [
  { month: 1, names: ["มกราคม", "ม.ค.", "มค"] },
  { month: 2, names: ["กุมภาพันธ์", "ก.พ.", "กพ"] },
  { month: 3, names: ["มีนาคม", "มี.ค.", "มีค"] },
  { month: 4, names: ["เมษายน", "เม.ย.", "เมย"] },
  { month: 5, names: ["พฤษภาคม", "พ.ค.", "พค"] },
  { month: 6, names: ["มิถุนายน", "มิ.ย.", "มิย"] },
  { month: 7, names: ["กรกฎาคม", "ก.ค.", "กค"] },
  { month: 8, names: ["สิงหาคม", "ส.ค.", "สค"] },
  { month: 9, names: ["กันยายน", "ก.ย.", "กย"] },
  { month: 10, names: ["ตุลาคม", "ต.ค.", "ตค"] },
  { month: 11, names: ["พฤศจิกายน", "พ.ย.", "พย"] },
  { month: 12, names: ["ธันวาคม", "ธ.ค.", "ธค"] },
];

const RICE_TYPES = [
  "ข้าวหอมปทุมธานี",
  "ข้าวหอมมะลิ",
  "ข้าวเหนียว",
  "ข้าวนึ่ง",
  "ข้าวขาว",
];

const textCache = new Map<
  string,
  { expiresAt: number; value: Promise<string> }
>();

interface EventYearRecord {
  year: number;
  province: string;
  flood_events: number;
}

interface EventMonthRecord extends EventYearRecord {
  month: number;
  month_name: string;
}

interface DisasterDashboard {
  kpi: Record<string, string | number>;
  month_overall: Array<Record<string, string | number>>;
  monthly: Array<Record<string, string | number>>;
  monthly_full?: Array<Record<string, string | number>>;
  yearly: Array<Record<string, string | number>>;
  top5: Array<Record<string, string | number>>;
  heatmap: Array<Record<string, string | number>>;
  province_year: Array<Record<string, string | number>>;
  top5_by_year: Array<Record<string, string | number>>;
  top_month_by_year: Array<Record<string, string | number>>;
}

interface YieldRecord {
  province: string;
  crop_year: string;
  crop_start_year_be: number;
  yield_kg_rai: number;
  previous_yield_kg_rai: number | null;
  change_kg_rai: number | null;
  change_percent: number | null;
  trend: string | null;
  is_forecast: boolean;
}

interface YieldDashboard {
  metadata: Record<string, string | number>;
  provinces: string[];
  records: YieldRecord[];
  year_summary: Record<string, Record<string, unknown>>;
}

function dataPath(...segments: string[]): string {
  return path.join(process.cwd(), "public", "data", ...segments);
}

async function readDataText(...segments: string[]): Promise<string> {
  const filePath = dataPath(...segments);
  const cached = textCache.get(filePath);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const value = readFile(filePath, "utf8");
  textCache.set(filePath, {
    expiresAt: Date.now() + DATA_CACHE_TTL_MS,
    value,
  });

  return value;
}

async function readJson<T>(...segments: string[]): Promise<T> {
  return JSON.parse(await readDataText(...segments)) as T;
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      cells.push(cell);
      cell = "";
    } else {
      cell += character;
    }
  }

  cells.push(cell);
  return cells;
}

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const headers = parseCsvLine(lines.shift() ?? "");

  return lines
    .filter((line) => line.trim())
    .map((line) => {
      const values = parseCsvLine(line);
      return Object.fromEntries(
        headers.map((header, index) => [header, values[index] ?? ""])
      );
    });
}

function includesAny(message: string, keywords: string[]): boolean {
  const normalized = message.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword.toLowerCase()));
}

function topicFromPath(pagePath?: string): KnowledgeTopic | null {
  if (!pagePath) return null;

  return (
    Object.entries(TOPIC_ROUTES).find(([, route]) =>
      pagePath.startsWith(route)
    )?.[0] as KnowledgeTopic | undefined
  ) ?? null;
}

function isDisasterOverviewPath(pagePath?: string): boolean {
  return Boolean(pagePath?.startsWith("/analytics/overview"));
}

export function detectKnowledgeTopics(
  message: string,
  pagePath?: string,
  previousTopics: KnowledgeTopic[] = []
): KnowledgeTopic[] {
  const detected = (Object.keys(TOPIC_KEYWORDS) as KnowledgeTopic[]).filter(
    (topic) => includesAny(message, TOPIC_KEYWORDS[topic])
  );
  const currentPageTopic = topicFromPath(pagePath);

  if (detected.length === 0 && isDisasterOverviewPath(pagePath)) {
    detected.push("flood", "drought", "storm");
  }

  if (currentPageTopic && !detected.includes(currentPageTopic)) {
    detected.push(currentPageTopic);
  }

  if (detected.length > 0) return detected;

  if (FOLLOW_UP_PATTERN.test(message)) {
    return previousTopics.slice(0, 2);
  }

  return [];
}

export function isRiceAssistantScope(
  message: string,
  pagePath?: string,
  previousTopics: KnowledgeTopic[] = []
): boolean {
  const trimmed = message.trim();

  if (GREETING_PATTERN.test(trimmed)) return true;
  if (includesAny(trimmed, RICE_SCOPE_KEYWORDS)) return true;
  if (isDisasterOverviewPath(pagePath) && FOLLOW_UP_PATTERN.test(trimmed)) {
    return true;
  }
  if (topicFromPath(pagePath) && FOLLOW_UP_PATTERN.test(trimmed)) return true;

  return previousTopics.length > 0 && FOLLOW_UP_PATTERN.test(trimmed);
}

export const OUT_OF_SCOPE_REPLY =
  "น้องเสริมตอบเฉพาะเรื่องข้าวและการทำแปลงนาครับ ลองถามเรื่องโรคข้าว ปุ๋ย น้ำ แมลง น้ำท่วม พายุ ภัยแล้ง ผลผลิต หรือราคาข้าวได้เลย";

function queryYears(message: string): number[] {
  const years = Array.from(message.matchAll(/(?:^|\D)(25\d{2}|20\d{2})(?!\d)/g))
    .map((match) => Number(match[1]))
    .map((year) => (year < 2400 ? year + 543 : year));

  return Array.from(new Set(years));
}

function queryMonths(message: string): number[] {
  return MONTHS.filter(({ names }) => includesAny(message, names)).map(
    ({ month }) => month
  );
}

function findProvince(message: string, provinces: string[]): string | null {
  return [...provinces]
    .sort((left, right) => right.length - left.length)
    .find((province) => message.includes(province)) ?? null;
}

function compact(value: unknown): string {
  return JSON.stringify(value);
}

function sumBy<T>(records: T[], value: (record: T) => number): number {
  return records.reduce((total, record) => total + value(record), 0);
}

function topProvinceRows(records: EventYearRecord[], limit = 10) {
  const totals = new Map<string, number>();

  for (const record of records) {
    totals.set(
      record.province,
      (totals.get(record.province) ?? 0) + record.flood_events
    );
  }

  return Array.from(totals, ([province, flood_events]) => ({
    province,
    flood_events,
  }))
    .sort((left, right) => right.flood_events - left.flood_events)
    .slice(0, limit);
}

async function floodContext(message: string): Promise<string> {
  const [annual, monthly] = await Promise.all([
    readJson<EventYearRecord[]>("flood_annual.json"),
    readJson<EventMonthRecord[]>("flood_monthly.json"),
  ]);
  const years = queryYears(message);
  const months = queryMonths(message);
  const provinces = Array.from(new Set(annual.map((record) => record.province)));
  const province = findProvince(message, provinces);
  const annualFiltered = annual.filter(
    (record) =>
      (years.length === 0 || years.includes(record.year)) &&
      (!province || record.province === province)
  );
  const monthlyFiltered = monthly.filter(
    (record) =>
      (years.length === 0 || years.includes(record.year)) &&
      (months.length === 0 || months.includes(record.month)) &&
      (!province || record.province === province)
  );
  const yearlySummary = Array.from(new Set(annual.map((record) => record.year)))
    .sort()
    .map((year) => {
      const rows = annual.filter((record) => record.year === year);
      return {
        year,
        flood_events: sumBy(rows, (record) => record.flood_events),
        province_count: rows.length,
      };
    });

  return [
    "[ข้อมูลน้ำท่วมภายในเว็บไซต์]",
    "แหล่งข้อมูล: แดชบอร์ดสถานการณ์น้ำท่วม /analytics/flood",
    "ความหมาย: flood_events คือความถี่ของบันทึกเหตุการณ์ในชุดข้อมูล ไม่ใช่จำนวนภัยพิบัติทั้งหมดในโลกจริง",
    `ขอบเขต: รายปี พ.ศ. 2563–2568; รายเดือน พ.ศ. 2563–2567 (ปี 2568 ไม่มีข้อมูลรายเดือน)`,
    `ภาพรวมรายปี: ${compact(yearlySummary)}`,
    `จังหวัดที่มีความถี่รวมสูง: ${compact(topProvinceRows(annual))}`,
    `ข้อมูลรายปีที่ตรงคำถาม: ${compact(
      annualFiltered.sort((a, b) => b.flood_events - a.flood_events).slice(0, 20)
    )}`,
    `ข้อมูลรายเดือนที่ตรงคำถาม: ${compact(
      monthlyFiltered.sort((a, b) => b.flood_events - a.flood_events).slice(0, 24)
    )}`,
  ].join("\n");
}

async function disasterContext(
  topic: "storm" | "drought",
  message: string
): Promise<string> {
  const isStorm = topic === "storm";
  const dashboard = await readJson<DisasterDashboard>(
    isStorm ? "storm" : "drought",
    isStorm ? "พายุ_Dashboard_Data.json" : "ภัยแล้ง_Dashboard_Data.json"
  );
  const years = queryYears(message);
  const months = queryMonths(message);
  const provinces = dashboard.heatmap
    .map((row) => String(row["จังหวัด"] ?? ""))
    .filter(Boolean);
  const province = findProvince(message, provinces);
  const filterYear = (row: Record<string, string | number>) =>
    years.length === 0 || years.includes(Number(row["ปี"]));
  const filterMonth = (row: Record<string, string | number>) =>
    months.length === 0 || months.includes(Number(row["เดือนเลข"]));
  const filterProvince = (row: Record<string, string | number>) =>
    !province || row["จังหวัด"] === province;
  const matchingMonthly = (dashboard.monthly_full ?? dashboard.monthly)
    .filter(filterYear)
    .filter(filterMonth)
    .slice(0, 36);
  const matchingProvince = dashboard.province_year
    .filter(filterYear)
    .filter(filterProvince)
    .slice(0, 24);
  const label = isStorm ? "พายุ" : "ภัยแล้ง";

  return [
    `[ข้อมูล${label}ภายในเว็บไซต์]`,
    `แหล่งข้อมูล: แดชบอร์ดวิเคราะห์${label} ${TOPIC_ROUTES[topic]}`,
    "ความหมาย: record_count คือความถี่ที่พบบันทึกในชุดข้อมูล และ province_count คือจำนวนจังหวัดที่พบ ไม่ใช่จำนวนเหตุการณ์ทั้งหมดในโลกจริง",
    `KPI: ${compact(dashboard.kpi)}`,
    `ภาพรวมรายปี: ${compact(dashboard.yearly)}`,
    `ภาพรวมรายเดือน: ${compact(dashboard.month_overall)}`,
    `จังหวัดอันดับสูง: ${compact(dashboard.top5)}`,
    `อันดับจังหวัดตามปีที่ตรงคำถาม: ${compact(
      dashboard.top5_by_year.filter(filterYear)
    )}`,
    `เดือนเด่นตามปีที่ตรงคำถาม: ${compact(
      dashboard.top_month_by_year.filter(filterYear)
    )}`,
    `ข้อมูลเดือนที่ตรงคำถาม: ${compact(matchingMonthly)}`,
    `ข้อมูลจังหวัดที่ตรงคำถาม: ${compact(matchingProvince)}`,
  ].join("\n");
}

function requestedCropYears(message: string, available: string[]): string[] {
  const exact = Array.from(message.matchAll(/(25\d{2}\/\d{2})/g)).map(
    (match) => match[1]
  );

  if (exact.length > 0) return exact.filter((year) => available.includes(year));

  const years = queryYears(message);
  return available.filter((cropYear) =>
    years.some((year) => cropYear.startsWith(String(year)))
  );
}

async function yieldContext(message: string): Promise<string> {
  const dashboard = await readJson<YieldDashboard>(
    "rice-yield",
    "rice_yield_dashboard.json"
  );
  const availableYears = Object.keys(dashboard.year_summary);
  const requestedYears = requestedCropYears(message, availableYears);
  const selectedYears =
    requestedYears.length > 0
      ? requestedYears
      : [String(dashboard.metadata.latest_crop_year)];
  const province = findProvince(message, dashboard.provinces);
  const matching = dashboard.records.filter(
    (record) =>
      selectedYears.includes(record.crop_year) &&
      (!province || record.province === province)
  );
  const ranked = [...matching].sort(
    (left, right) => right.yield_kg_rai - left.yield_kg_rai
  );
  const provinceHistory = province
    ? dashboard.records.filter((record) => record.province === province)
    : [];
  const summaries = Object.fromEntries(
    selectedYears.map((year) => [year, dashboard.year_summary[year]])
  );

  return [
    "[ข้อมูลผลผลิตข้าวภายในเว็บไซต์]",
    "แหล่งข้อมูล: แดชบอร์ดผลผลิต /analytics/yield",
    `ขอบเขตและหน่วย: ${compact(dashboard.metadata)}; ผลผลิตเป็นกิโลกรัมต่อไร่`,
    "รายการที่ is_forecast=true เป็นค่าพยากรณ์ ไม่ใช่ผลผลิตจริงที่ยืนยันแล้ว",
    `สรุปปีที่ตรงคำถาม: ${compact(summaries)}`,
    `จังหวัดผลผลิตสูงสุดของปีที่เลือก: ${compact(ranked.slice(0, 10))}`,
    `จังหวัดผลผลิตต่ำสุดของปีที่เลือก: ${compact(ranked.slice(-5).reverse())}`,
    `ข้อมูลที่ตรงจังหวัด/ปี: ${compact(matching.slice(0, 30))}`,
    `ประวัติจังหวัดที่ถาม: ${compact(provinceHistory)}`,
  ].join("\n");
}

async function priceContext(message: string): Promise<string> {
  const [monthlyText, summaryText] = await Promise.all([
    readDataText("rice-price", "rice_price_monthly.csv"),
    readDataText("rice-price", "rice_summary.csv"),
  ]);
  const monthly = parseCsv(monthlyText);
  const summaries = parseCsv(summaryText);
  const years = queryYears(message);
  const months = queryMonths(message);
  const requestedTypes = RICE_TYPES.filter((riceType) =>
    message.includes(riceType)
  );
  const hasFilters =
    years.length > 0 || months.length > 0 || requestedTypes.length > 0;
  const matching = monthly
    .filter(
      (row) =>
        (years.length === 0 || years.includes(Number(row.year_be))) &&
        (months.length === 0 || months.includes(Number(row.month))) &&
        (requestedTypes.length === 0 || requestedTypes.includes(row.rice_type))
    )
    .map((row) => ({
      date: row.date,
      year_be: Number(row.year_be),
      month: Number(row.month),
      month_name_th: row.month_name_th,
      rice_type: row.rice_type,
      price: Number(row.price),
      data_type: row.data_type,
      forecast_reliability: row.forecast_reliability || null,
      source: row.source || null,
    }));
  const latestByType = RICE_TYPES.map((riceType) =>
    monthly.filter((row) => row.rice_type === riceType).at(-1)
  )
    .filter(Boolean)
    .map((row) => ({
      date: row?.date,
      rice_type: row?.rice_type,
      price: Number(row?.price),
      data_type: row?.data_type,
      forecast_reliability: row?.forecast_reliability || null,
    }));

  return [
    "[ข้อมูลราคาข้าวภายในเว็บไซต์]",
    "แหล่งข้อมูล: แดชบอร์ดราคาข้าวไทย /analytics/rice-price",
    "หน่วยราคา: บาทต่อ 100 กิโลกรัม; data_type=forecast คือค่าพยากรณ์ ไม่ใช่ราคาซื้อขายที่รับประกัน",
    "ข้อมูลระดับประเทศเท่านั้น ยังไม่มีราคาแยกภูมิภาคหรือจังหวัด",
    `สรุปพยากรณ์ปี 2569: ${compact(summaries)}`,
    `ข้อมูลล่าสุดแยกชนิดข้าว: ${compact(latestByType)}`,
    `ข้อมูลที่ตรงคำถาม: ${compact(
      (hasFilters ? matching : matching.slice(-24)).slice(0, 60)
    )}`,
  ].join("\n");
}

export async function buildSiteKnowledgeContext(
  message: string,
  pagePath?: string,
  previousTopics: KnowledgeTopic[] = []
): Promise<{ context: string; topics: KnowledgeTopic[] }> {
  const topics = detectKnowledgeTopics(message, pagePath, previousTopics).slice(
    0,
    isDisasterOverviewPath(pagePath) ? 3 : 2
  );

  if (topics.length === 0) {
    return {
      topics,
      context:
        "เว็บไซต์มีแดชบอร์ดน้ำท่วม พายุ ภัยแล้ง ผลผลิตข้าว และราคาข้าว หากคำถามเกี่ยวข้องให้แนะนำผู้ใช้ระบุปี เดือน จังหวัด หรือชนิดข้าวเพื่อค้นข้อมูลได้ตรงขึ้น",
    };
  }

  const sections = await Promise.all(
    topics.map((topic) => {
      if (topic === "flood") return floodContext(message);
      if (topic === "storm" || topic === "drought") {
        return disasterContext(topic, message);
      }
      if (topic === "yield") return yieldContext(message);
      return priceContext(message);
    })
  );
  const pageNote = pagePath
    ? `หน้าที่ผู้ใช้กำลังดู: ${pagePath}`
    : "";
  const context = [pageNote, ...sections].filter(Boolean).join("\n\n");

  return {
    topics,
    context: context.slice(0, MAX_CONTEXT_LENGTH),
  };
}
