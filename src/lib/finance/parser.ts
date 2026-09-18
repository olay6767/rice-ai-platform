import {
  type FinanceAnalysisResult,
  type FinanceCategory,
  type FinanceTransactionDraft,
  type FinanceTransactionType,
} from "@/lib/finance/types";

const AMOUNT_PATTERN = /\d[\d,]*(?:\.\d{1,2})?/g;
const QUANTITY_UNITS = /^(?:กระสอบ|กก\.?|กิโลกรัม|กิโล|ลิตร|ถุง|ชุด|ชิ้น|ไร่|วัน|คน|เดือน|ครั้ง)\b/i;

const EXPENSE_RULES: Array<{ category: FinanceCategory; words: string[] }> = [
  { category: "fertilizer", words: ["ปุ๋ย"] },
  { category: "seed", words: ["เมล็ด", "พันธุ์ข้าว"] },
  { category: "pesticide", words: ["ยาฆ่า", "ยาปราบ", "สารเคมี", "ยาแมลง", "ยาหญ้า"] },
  { category: "labor", words: ["ค่าแรง", "จ้างคน", "ค่าจ้างเกี่ยว", "ค่าเก็บเกี่ยว"] },
  { category: "irrigation", words: ["สูบน้ำ", "ค่าน้ำเกษตร", "ค่าน้ำ"] },
  { category: "fuel_transport", words: ["น้ำมัน", "เติมน้ำมัน", "ค่ารถ", "ขนส่ง", "grab", "bolt", "taxi", "รถไฟ"] },
  { category: "machinery", words: ["รถไถ", "รถเกี่ยว", "ซ่อมเครื่อง", "เครื่องจักร"] },
  { category: "land_rent", words: ["เช่านา", "ค่าเช่าที่", "ค่าเช่า"] },
  { category: "coffee", words: ["กาแฟ", "coffee", "ชา", "ชานม"] },
  { category: "food", words: ["ข้าว", "อาหาร", "ก๋วยเตี๋ยว", "ข้าวมันไก่", "ขนม"] },
  { category: "utilities_electricity", words: ["ค่าไฟ", "ไฟฟ้า"] },
  { category: "phone_internet", words: ["โทรศัพท์", "อินเทอร์เน็ต", "เน็ต", "มือถือ"] },
  { category: "subscription", words: ["netflix", "spotify", "youtube premium", "subscription"] },
  { category: "housing", words: ["หอพัก", "ที่พัก", "ค่าเช่า"] },
  { category: "health", words: ["หมอ", "ยา", "โรงพยาบาล", "สุขภาพ"] },
  { category: "education", words: ["เรียน", "หนังสือ", "คอร์ส"] },
  { category: "shopping", words: ["ซื้อเสื้อ", "เสื้อ", "รองเท้า", "ช้อป"] },
  { category: "entertainment", words: ["เกม", "หนัง", "คอนเสิร์ต"] },
  { category: "debt", words: ["หนี้", "ผ่อน", "บัตรเครดิต"] },
  { category: "family", words: ["ครอบครัว", "พ่อ", "แม่", "ลูก"] },
];

const INCOME_RULES: Array<{ category: FinanceCategory; words: string[] }> = [
  { category: "rice_sales", words: ["ขายข้าว", "ขายข้าวเปลือก", "ขายผลผลิต"] },
  { category: "farm_support", words: ["เงินชดเชย", "เงินช่วยเหลือ", "สนับสนุนเกษตร"] },
  { category: "salary", words: ["เงินเดือน"] },
  { category: "wage", words: ["ค่าจ้าง", "ได้ค่าจ้าง"] },
  { category: "side_income", words: ["รายได้เสริม", "งานเสริม"] },
  { category: "product_sales", words: ["ขายสินค้า", "ขายของ"] },
  { category: "bonus", words: ["โบนัส"] },
  { category: "interest", words: ["ดอกเบี้ย"] },
  { category: "dividend", words: ["ปันผล"] },
  { category: "cashback", words: ["เงินคืน", "cashback"] },
];

function getBangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function getBangkokTime(): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date());
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function detectDate(message: string, today: string): { date: string; cleaned: string } {
  const base = new Date(`${today}T00:00:00Z`);

  if (/เมื่อวาน/.test(message)) {
    base.setUTCDate(base.getUTCDate() - 1);
    return { date: toIsoDate(base), cleaned: message.replace(/เมื่อวาน/g, "") };
  }

  if (/พรุ่งนี้/.test(message)) {
    base.setUTCDate(base.getUTCDate() + 1);
    return { date: toIsoDate(base), cleaned: message.replace(/พรุ่งนี้/g, "") };
  }

  const explicitDay = message.match(/(?:วันที่|วันที)\s*(\d{1,2})\b/);
  if (explicitDay) {
    const day = Number(explicitDay[1]);
    if (day >= 1 && day <= 31) {
      base.setUTCDate(day);
      return {
        date: toIsoDate(base),
        cleaned: message.replace(explicitDay[0], ""),
      };
    }
  }

  return { date: today, cleaned: message.replace(/วันนี้/g, "") };
}

function cleanDescription(value: string): string {
  return value
    // Keep words such as "รับเงิน" and "เงินเดือน" intact. They are both
    // useful to the user and are the strongest signal that this is income.
    .replace(/\s*บาท\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

function detectType(value: string): FinanceTransactionType {
  return /(?:เงินเดือน|ได้ค่าจ้าง|รับค่าจ้าง|ได้เงิน|ได้รับเงิน|รับเงิน|เงินเข้า|โอนเข้า|รายรับ|รายได้|ขายข้าว|ขายสินค้า|ขายผลผลิต|โบนัส|ดอกเบี้ย|ปันผล|เงินคืน|cashback)/i.test(value)
    ? "income"
    : "expense";
}

function detectCategory(value: string, type: FinanceTransactionType): FinanceCategory {
  const normalised = value.toLowerCase();
  const rules = type === "income" ? INCOME_RULES : EXPENSE_RULES;
  const found = rules.find((rule) => rule.words.some((word) => normalised.includes(word)));

  return found?.category ?? (type === "income" ? "other_income" : "other_expense");
}

interface AmountSlice {
  description: string;
  rawDescription: string;
  amount: number;
}

function extractAmountSlices(message: string): AmountSlice[] {
  const matches = Array.from(message.matchAll(AMOUNT_PATTERN));
  const slices: AmountSlice[] = [];
  let itemStart = 0;

  for (let index = 0; index < matches.length; index += 1) {
    const current = matches[index];
    const next = matches[index + 1];
    const matchIndex = current.index ?? 0;
    const after = message.slice(matchIndex + current[0].length, next?.index ?? message.length);

    // In "ปุ๋ย 2 กระสอบ 1800" the first number is a quantity, not money.
    if (next && QUANTITY_UNITS.test(after.trim())) {
      continue;
    }

    const rawDescription = message.slice(itemStart, matchIndex).trim();
    const description = cleanDescription(rawDescription);
    const amount = Number(current[0].replaceAll(",", ""));

    if (description && Number.isFinite(amount) && amount > 0) {
      slices.push({ description, rawDescription, amount });
      itemStart = matchIndex + current[0].length;
    }
  }

  return slices;
}

/**
 * A deterministic first pass makes everyday entries fast and reliable even if
 * an AI provider is unavailable. The caller can still use Gemini for prose
 * that cannot be parsed into a clear amount.
 */
export function parseThaiFinanceMessage(message: string): FinanceAnalysisResult {
  const today = getBangkokToday();
  const currentTime = getBangkokTime();
  const { date, cleaned } = detectDate(message, today);
  const slices = extractAmountSlices(cleaned);

  if (slices.length === 0) {
    return {
      draft: null,
      drafts: [],
      needsClarification: true,
      clarificationMessage: "ไม่พบจำนวนเงิน กรุณาระบุจำนวนเงิน เช่น ข้าว 80",
    };
  }

  const drafts = slices.map((slice): FinanceTransactionDraft => {
    const type = detectType(slice.rawDescription);

    return {
      transactionType: type,
      category: detectCategory(slice.rawDescription, type),
      amount: Math.round(slice.amount * 100) / 100,
      description: slice.description,
      transactionDate: date,
      transactionTime: currentTime,
      sourceText: message,
      source: "chat",
      confidence: 0.98,
    };
  });

  return {
    draft: drafts[0] ?? null,
    drafts,
    needsClarification: false,
    clarificationMessage: "",
  };
}
