import { ApiError, GoogleGenAI } from "@google/genai";

import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  isCategoryForType,
  isFinanceCategory,
  isFinanceTransactionType,
  type FinanceAnalysisResult,
  type FinanceTransactionDraft,
} from "@/lib/finance/types";
import { parseThaiFinanceMessage } from "@/lib/finance/parser";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_MESSAGE_LENGTH = 1_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 20;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface GeminiFinanceResult {
  transaction_type?: unknown;
  category?: unknown;
  amount?: unknown;
  description?: unknown;
  transaction_date?: unknown;
  confidence?: unknown;
  needs_clarification?: unknown;
  clarification_message?: unknown;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const FINANCE_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    transaction_type: {
      type: "string",
      enum: ["income", "expense"],
      description: "ประเภทของรายการทางการเงิน",
    },
    category: {
      type: "string",
      enum: [
        ...EXPENSE_CATEGORIES,
        ...INCOME_CATEGORIES,
      ],
      description: "รหัสหมวดหมู่ที่ตรงกับประเภท",
    },
    amount: {
      type: "number",
      minimum: 0,
      description: "จำนวนเงินบาท ไม่รวมสัญลักษณ์สกุลเงิน",
    },
    description: {
      type: "string",
      description: "รายละเอียดรายการภาษาไทยแบบกระชับ",
    },
    transaction_date: {
      type: "string",
      description: "วันที่รูปแบบ YYYY-MM-DD",
    },
    confidence: {
      type: "number",
      minimum: 0,
      maximum: 1,
      description: "ความมั่นใจในการแยกข้อมูลตั้งแต่ 0 ถึง 1",
    },
    needs_clarification: {
      type: "boolean",
      description:
        "เป็น true เมื่อไม่พบจำนวนเงินหรือข้อมูลกำกวมจนบันทึกไม่ได้",
    },
    clarification_message: {
      type: "string",
      description:
        "คำถามภาษาไทยสั้น ๆ ที่ต้องถามเพิ่ม หรือข้อความว่างเมื่อข้อมูลครบ",
    },
  },
  required: [
    "transaction_type",
    "category",
    "amount",
    "description",
    "transaction_date",
    "confidence",
    "needs_clarification",
    "clarification_message",
  ],
};

function jsonError(
  status: number,
  code: string,
  message: string,
  headers?: HeadersInit
): Response {
  return Response.json(
    {
      error: {
        code,
        message,
      },
    },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

function getBangkokDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function checkRateLimit(userId: string): {
  allowed: boolean;
  retryAfterSeconds: number;
} {
  const now = Date.now();
  const current = rateLimitStore.get(userId);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (current.count >= RATE_LIMIT_REQUESTS) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((current.resetAt - now) / 1_000)
      ),
    };
  }

  current.count += 1;

  return { allowed: true, retryAfterSeconds: 0 };
}

function normalizeAnalysis(
  result: GeminiFinanceResult,
  sourceText: string,
  today: string
): FinanceAnalysisResult {
  const needsClarification =
    result.needs_clarification === true;
  const clarificationMessage =
    typeof result.clarification_message === "string"
      ? result.clarification_message.trim().slice(0, 240)
      : "";

  if (needsClarification) {
    return {
      draft: null,
      drafts: [],
      needsClarification: true,
      clarificationMessage:
        clarificationMessage ||
        "กรุณาระบุรายละเอียดและจำนวนเงินให้ชัดเจนขึ้นครับ",
    };
  }

  const amount =
    typeof result.amount === "number"
      ? Math.round(result.amount * 100) / 100
      : Number.NaN;
  const description =
    typeof result.description === "string"
      ? result.description.trim().slice(0, 200)
      : "";
  const transactionDate =
    typeof result.transaction_date === "string" &&
    isValidIsoDate(result.transaction_date)
      ? result.transaction_date
      : today;
  const confidence =
    typeof result.confidence === "number"
      ? Math.min(1, Math.max(0, result.confidence))
      : 0.5;

  if (
    !isFinanceTransactionType(result.transaction_type) ||
    !isFinanceCategory(result.category) ||
    !isCategoryForType(
      result.category,
      result.transaction_type
    ) ||
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !description
  ) {
    return {
      draft: null,
      drafts: [],
      needsClarification: true,
      clarificationMessage:
        "ยังแยกรายการนี้ไม่ได้ กรุณาลองพิมพ์ชื่อรายการพร้อมจำนวนเงิน เช่น “ซื้อกาแฟ 65 บาท”",
    };
  }

  const draft: FinanceTransactionDraft = {
    transactionType: result.transaction_type,
    category: result.category,
    amount,
    description,
    transactionDate,
    sourceText,
    confidence,
  };

  return {
    draft,
    drafts: [draft],
    needsClarification: false,
    clarificationMessage: "",
  };
}

function getGeminiErrorResponse(error: unknown): Response {
  const status =
    error instanceof ApiError ? error.status : undefined;

  console.error("Gemini finance analysis failed", {
    status,
    name:
      error instanceof Error ? error.name : "UnknownError",
  });

  if (status === 429) {
    return jsonError(
      429,
      "GEMINI_RATE_LIMIT",
      "ระบบ AI มีผู้ใช้งานจำนวนมากหรือโควตาไม่เพียงพอ กรุณารอสักครู่แล้วลองใหม่"
    );
  }

  if (status === 401 || status === 403) {
    return jsonError(
      503,
      "GEMINI_AUTH_ERROR",
      "ระบบ AI ยังไม่พร้อมใช้งาน กรุณาให้ผู้ดูแลตรวจสอบคีย์ Gemini"
    );
  }

  return jsonError(
    502,
    "AI_UNAVAILABLE",
    "ไม่สามารถวิเคราะห์รายการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง"
  );
}

export async function POST(request: Request): Promise<Response> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return jsonError(
      400,
      "INVALID_JSON",
      "รูปแบบข้อมูลไม่ถูกต้อง"
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    !("message" in payload) ||
    typeof payload.message !== "string"
  ) {
    return jsonError(
      400,
      "INVALID_REQUEST",
      "กรุณาส่งข้อความรายการทางการเงิน"
    );
  }

  const message = payload.message.trim();

  if (!message) {
    return jsonError(
      400,
      "EMPTY_MESSAGE",
      "กรุณาพิมพ์รายการก่อนส่ง"
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonError(
      413,
      "MESSAGE_TOO_LONG",
      `กรุณาพิมพ์ไม่เกิน ${MAX_MESSAGE_LENGTH.toLocaleString("th-TH")} ตัวอักษร`
    );
  }

  let userId: string;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนบันทึกรายการ"
      );
    }

    userId = user.id;
  } catch {
    return jsonError(
      500,
      "AUTH_UNAVAILABLE",
      "ไม่สามารถตรวจสอบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }

  const rateLimit = checkRateLimit(userId);

  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      {
        "Retry-After": String(
          rateLimit.retryAfterSeconds
        ),
      }
    );
  }

  // Everyday records are parsed locally first. This handles entries such as
  // "ค่าไฟ1200" and several records in one sentence without making users wait
  // for a third-party AI response. Gemini remains the fallback below for a
  // future conversational/ambiguous parser.
  const deterministicResult = parseThaiFinanceMessage(message);

  if (
    deterministicResult.needsClarification ||
    deterministicResult.drafts.length > 0
  ) {
    return Response.json(
      { data: deterministicResult },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return jsonError(
      503,
      "GEMINI_NOT_CONFIGURED",
      "ระบบยังไม่ได้ตั้งค่า Gemini API"
    );
  }

  const today = getBangkokDate();
  const model =
    process.env.GEMINI_FINANCE_MODEL?.trim() ||
    process.env.GEMINI_MODEL?.trim() ||
    DEFAULT_MODEL;
  const gemini = new GoogleGenAI({ apiKey });

  const systemInstruction = `
คุณคือผู้ช่วยแยกรายการรายรับรายจ่ายสำหรับการปลูกข้าวจากข้อความภาษาไทย
วันนี้ตามเวลา Asia/Bangkok คือ ${today}

กฎ:
- วิเคราะห์ครั้งละ 1 รายการเท่านั้น และใช้สกุลเงินบาท
- ห้ามเดาจำนวนเงิน ถ้าไม่พบจำนวนเงินที่ชัดเจนให้ needs_clarification เป็น true
- แยกคำบอกวันที่ เช่น วันนี้ เมื่อวาน พรุ่งนี้ เป็นวันที่ YYYY-MM-DD
- ถ้าไม่ระบุวันที่ ให้ใช้ ${today}
- รายจ่ายใช้หมวด: seed, fertilizer, pesticide, labor, irrigation, fuel_transport, land_rent, machinery, other_farm_expense
- รายรับใช้หมวด: rice_sales, farm_support, other_farm_income
- ซื้อเมล็ดพันธุ์ อยู่หมวด seed; ซื้อหรือใส่ปุ๋ย อยู่หมวด fertilizer
- ยาฆ่าแมลง ยาฆ่าหญ้า และสารป้องกันกำจัดศัตรูพืช อยู่หมวด pesticide
- ค่าแรงไถ หว่าน ดำนา เกี่ยวข้าว และแรงงานอื่น ๆ อยู่หมวด labor
- ค่าสูบน้ำ ค่าน้ำ และค่าไฟสูบน้ำ อยู่หมวด irrigation
- เติมน้ำมัน ค่าเครื่องยนต์ และค่าขนส่งผลผลิต อยู่หมวด fuel_transport
- ค่าเช่านา อยู่หมวด land_rent; ค่าซ่อมรถไถ/รถเกี่ยว อยู่หมวด machinery
- ขายข้าวเปลือกหรือผลผลิตข้าวเป็น income/rice_sales
- เงินช่วยเหลือเกษตรกรหรือเงินชดเชยเป็น income/farm_support
- description ต้องเป็นภาษาไทย กระชับ และไม่ใส่จำนวนเงินซ้ำ
- confidence เป็นค่าประเมินตั้งแต่ 0 ถึง 1
- เมื่อข้อมูลครบ clarification_message ต้องเป็นข้อความว่าง
`.trim();

  try {
    const interaction = await gemini.interactions.create(
      {
        model,
        input: message,
        system_instruction: systemInstruction,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: FINANCE_RESPONSE_SCHEMA,
        },
        generation_config: {
          max_output_tokens: 500,
          thinking_level: "minimal",
        },
      },
      {
        timeout: 25_000,
        fetchOptions: {
          signal: request.signal,
        },
      }
    );

    if (!interaction.output_text) {
      return jsonError(
        502,
        "EMPTY_AI_RESPONSE",
        "AI ไม่ได้ส่งผลการวิเคราะห์กลับมา กรุณาลองใหม่"
      );
    }

    let parsed: GeminiFinanceResult;

    try {
      parsed = JSON.parse(
        interaction.output_text
      ) as GeminiFinanceResult;
    } catch {
      return jsonError(
        502,
        "INVALID_AI_RESPONSE",
        "AI ส่งผลลัพธ์ที่ไม่สมบูรณ์ กรุณาลองใหม่"
      );
    }

    const data = normalizeAnalysis(
      parsed,
      message,
      today
    );

    return Response.json(
      { data },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    if (request.signal.aborted) {
      return jsonError(
        408,
        "REQUEST_CANCELLED",
        "คำขอถูกยกเลิก กรุณาลองใหม่"
      );
    }

    return getGeminiErrorResponse(error);
  }
}
