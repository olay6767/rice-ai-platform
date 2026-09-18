import { ApiError, GoogleGenAI } from "@google/genai";

import { RICE_ASSISTANT_INSTRUCTIONS } from "@/lib/chatbot/prompt";
import {
  buildSiteKnowledgeContext,
  isRiceAssistantScope,
  OUT_OF_SCOPE_REPLY,
} from "@/lib/chatbot/site-knowledge";
import type {
  ChatbotApiError,
  ChatbotRequest,
  ChatbotStreamEvent,
  KnowledgeTopic,
} from "@/lib/chatbot/types";
import { recordBehaviorEvent } from "@/lib/recommendations/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 45;

const DEFAULT_MODEL = "gemini-3.6-flash";
const MAX_MESSAGE_LENGTH = 4_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 12;
const KNOWLEDGE_TOPICS: KnowledgeTopic[] = [
  "flood",
  "storm",
  "drought",
  "yield",
  "price",
];

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface SafeProviderError {
  code: string;
  message: string;
  providerCode?: string;
  status: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

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
    } satisfies ChatbotApiError,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
        ...headers,
      },
    }
  );
}

function isChatbotRequest(value: unknown): value is ChatbotRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const request = value as Record<string, unknown>;
  const previousInteractionId = request.previousInteractionId;
  const pagePath = request.pagePath;
  const knowledgeTopics = request.knowledgeTopics;

  return (
    typeof request.message === "string" &&
    (previousInteractionId === undefined ||
      previousInteractionId === null ||
      typeof previousInteractionId === "string") &&
    (pagePath === undefined ||
      (typeof pagePath === "string" && pagePath.length <= 200)) &&
    (knowledgeTopics === undefined ||
      (Array.isArray(knowledgeTopics) &&
        knowledgeTopics.length <= KNOWLEDGE_TOPICS.length &&
        knowledgeTopics.every(
          (topic) =>
            typeof topic === "string" &&
            KNOWLEDGE_TOPICS.includes(topic as KnowledgeTopic)
        )))
  );
}

function isValidInteractionId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,1000}$/.test(value);
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

    return {
      allowed: true,
      retryAfterSeconds: 0,
    };
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

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}

function encodeEvent(
  encoder: TextEncoder,
  event: ChatbotStreamEvent
): Uint8Array {
  return encoder.encode(`${JSON.stringify(event)}\n`);
}

function localAssistantResponse(message: string): Response {
  const events: ChatbotStreamEvent[] = [
    { type: "delta", delta: message },
    {
      type: "done",
      interactionId: "",
      model: "local-policy",
      knowledgeTopics: [],
    },
  ];

  return new Response(
    `${events.map((event) => JSON.stringify(event)).join("\n")}\n`,
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
      },
    }
  );
}

function getErrorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) {
    return error.status;
  }

  if (
    error &&
    typeof error === "object" &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "";
}

function classifyGeminiError(error: unknown): SafeProviderError {
  const status = getErrorStatus(error);
  const providerCode = getErrorCode(error);
  const normalizedMessage = getErrorMessage(error).toLowerCase();

  if (
    status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("resource_exhausted")
  ) {
    return {
      status: 429,
      code: "GEMINI_QUOTA_EXCEEDED",
      message:
        "โควตา Gemini API ไม่เพียงพอ กรุณาให้ผู้ดูแลระบบตรวจสอบแพ็กเกจและขีดจำกัดการใช้งาน",
      providerCode,
    };
  }

  if (status === 401 || status === 403) {
    return {
      status: 503,
      code: "GEMINI_AUTH_ERROR",
      message:
        "คีย์ Gemini ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้งาน กรุณาให้ผู้ดูแลระบบตรวจสอบการตั้งค่า",
      providerCode,
    };
  }

  if (status === 404) {
    return {
      status: 503,
      code: "GEMINI_MODEL_UNAVAILABLE",
      message:
        "ไม่พบโมเดล Gemini ที่ตั้งค่าไว้ กรุณาให้ผู้ดูแลระบบตรวจสอบ GEMINI_MODEL",
      providerCode,
    };
  }

  if (status === 400) {
    return {
      status: 400,
      code: "GEMINI_BAD_REQUEST",
      message:
        "ไม่สามารถประมวลผลบทสนทนานี้ได้ กรุณาเริ่มบทสนทนาใหม่",
      providerCode,
    };
  }

  if (
    status === 408 ||
    status === 504 ||
    normalizedMessage.includes("timeout")
  ) {
    return {
      status: 504,
      code: "GEMINI_TIMEOUT",
      message:
        "Gemini ใช้เวลาตอบนานเกินไป กรุณาลองส่งข้อความอีกครั้ง",
      providerCode,
    };
  }

  return {
    status: 502,
    code: "AI_UNAVAILABLE",
    message:
      "ผู้ช่วย AI ไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง",
    providerCode,
  };
}

function logProviderError(
  context: string,
  details: SafeProviderError
): void {
  console.error(context, {
    status: details.status,
    code: details.code,
    providerCode: details.providerCode,
  });
}

function getGeminiErrorResponse(error: unknown): Response {
  const details = classifyGeminiError(error);

  logProviderError("Gemini chatbot request failed", details);

  return jsonError(
    details.status,
    details.code,
    details.message
  );
}

function toStreamErrorEvent(error: unknown): ChatbotStreamEvent {
  const details = classifyGeminiError(error);

  logProviderError("Gemini chatbot stream failed", details);

  return {
    type: "error",
    code: details.code,
    message: details.message,
  };
}

function incompleteStreamEvent(): ChatbotStreamEvent {
  return {
    type: "error",
    code: "STREAM_INCOMPLETE",
    message:
      "การตอบกลับหยุดก่อนเสร็จ กรุณาลองส่งข้อความอีกครั้ง",
  };
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

  if (!isChatbotRequest(payload)) {
    return jsonError(
      400,
      "INVALID_REQUEST",
      "กรุณาส่งข้อความที่ถูกต้อง"
    );
  }

  const message = payload.message.trim();

  if (!message) {
    return jsonError(
      400,
      "EMPTY_MESSAGE",
      "กรุณาพิมพ์คำถามก่อนส่ง"
    );
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonError(
      413,
      "MESSAGE_TOO_LONG",
      `ข้อความยาวเกินไป กรุณาใช้ไม่เกิน ${MAX_MESSAGE_LENGTH.toLocaleString("th-TH")} ตัวอักษร`
    );
  }

  const previousInteractionId =
    payload.previousInteractionId?.trim() || undefined;
  const requestedPagePath = payload.pagePath?.trim();
  const pagePath =
    requestedPagePath && /^\/[a-z0-9/_-]{1,180}$/i.test(requestedPagePath)
      ? requestedPagePath
      : undefined;
  const previousKnowledgeTopics = payload.knowledgeTopics ?? [];

  if (
    previousInteractionId &&
    !isValidInteractionId(previousInteractionId)
  ) {
    return jsonError(
      400,
      "INVALID_CONVERSATION",
      "ข้อมูลบทสนทนาไม่ถูกต้อง กรุณาเริ่มบทสนทนาใหม่"
    );
  }

  let userId: string;
  let supabase: Awaited<ReturnType<typeof createClient>>;

  try {
    supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return jsonError(
        401,
        "AUTH_REQUIRED",
        "กรุณาเข้าสู่ระบบก่อนใช้งานผู้ช่วย AI"
      );
    }

    userId = user.id;
  } catch (error) {
    console.error("Unable to verify chatbot user:", error);

    return jsonError(
      500,
      "AUTH_UNAVAILABLE",
      "ไม่สามารถตรวจสอบผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง"
    );
  }

  if (
    !isRiceAssistantScope(
      message,
      pagePath,
      previousKnowledgeTopics
    )
  ) {
    return localAssistantResponse(OUT_OF_SCOPE_REPLY);
  }

  const rateLimit = checkRateLimit(userId);

  if (!rateLimit.allowed) {
    return jsonError(
      429,
      "RATE_LIMITED",
      "ส่งข้อความถี่เกินไป กรุณารอสักครู่แล้วลองใหม่",
      {
        "Retry-After": String(rateLimit.retryAfterSeconds),
      }
    );
  }

  await recordBehaviorEvent(supabase, userId, {
    eventType: "chat",
    feature: "chat",
    path: pagePath,
    metadata: {
      surface: pagePath === "/chatbot" ? "chatbot-page" : "global-assistant",
    },
  });

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return jsonError(
      503,
      "GEMINI_NOT_CONFIGURED",
      "ระบบยังไม่ได้ตั้งค่า GEMINI_API_KEY กรุณาติดต่อผู้ดูแลระบบ"
    );
  }

  const model =
    process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
  const gemini = new GoogleGenAI({ apiKey });
  let knowledgeContext: Awaited<
    ReturnType<typeof buildSiteKnowledgeContext>
  >;

  try {
    knowledgeContext = await buildSiteKnowledgeContext(
      message,
      pagePath,
      previousKnowledgeTopics
    );
  } catch (error) {
    console.error("Unable to load chatbot site knowledge:", error);
    knowledgeContext = {
      topics: previousKnowledgeTopics,
      context:
        "ไม่สามารถโหลดข้อมูลแดชบอร์ดภายในเว็บไซต์ได้ในขณะนี้ ห้ามคาดเดาตัวเลข และให้แจ้งผู้ใช้ว่าไม่สามารถตรวจข้อมูลส่วนนั้นได้ชั่วคราว",
    };
  }
  const systemInstruction = `${RICE_ASSISTANT_INSTRUCTIONS}\n\nบริบทจากข้อมูลภายในเว็บไซต์สำหรับคำถามนี้:\n${knowledgeContext.context}`;

  try {
    const upstream = await gemini.interactions.create(
      {
        model,
        input: message,
        previous_interaction_id: previousInteractionId,
        system_instruction: systemInstruction,
        generation_config: {
          max_output_tokens: 1_200,
          thinking_level: "low",
        },
        stream: true,
      },
      {
        timeout: 40_000,
        fetchOptions: {
          signal: request.signal,
        },
      }
    );
    const iterator = upstream[Symbol.asyncIterator]();
    let interactionId = "";
    let resolvedModel = model;
    let initialDelta: string | null = null;
    let completedDuringPreflight = false;

    while (true) {
      const nextEvent = await iterator.next();

      if (nextEvent.done) {
        return jsonError(
          502,
          "STREAM_INCOMPLETE",
          "Gemini ไม่ได้ส่งคำตอบกลับมา กรุณาลองใหม่อีกครั้ง"
        );
      }

      const event = nextEvent.value;

      if (event.event_type === "interaction.created") {
        interactionId = event.interaction.id;
        resolvedModel = event.interaction.model || resolvedModel;
      }

      if (event.event_type === "step.delta") {
        if (event.delta.type === "text") {
          initialDelta = event.delta.text;
          break;
        }
      }

      if (event.event_type === "interaction.completed") {
        interactionId = event.interaction.id;
        resolvedModel = event.interaction.model || resolvedModel;
        completedDuringPreflight = true;
        break;
      }

      if (event.event_type === "error") {
        return getGeminiErrorResponse(event.error);
      }

      if (
        event.event_type === "interaction.status_update" &&
        [
          "failed",
          "cancelled",
          "incomplete",
          "budget_exceeded",
        ].includes(event.status)
      ) {
        return jsonError(
          502,
          "STREAM_INCOMPLETE",
          "Gemini หยุดประมวลผลก่อนตอบเสร็จ กรุณาลองใหม่อีกครั้ง"
        );
      }
    }

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let completed = false;
        let terminalEventSent = false;

        try {
          if (initialDelta) {
            controller.enqueue(
              encodeEvent(encoder, {
                type: "delta",
                delta: initialDelta,
              })
            );
          }

          if (completedDuringPreflight) {
            completed = true;
            controller.enqueue(
              encodeEvent(encoder, {
                type: "done",
                interactionId,
                model: resolvedModel,
                knowledgeTopics: knowledgeContext.topics,
              })
            );
          }

          while (!completed) {
            const nextEvent = await iterator.next();

            if (nextEvent.done) {
              break;
            }

            const event = nextEvent.value;

            if (event.event_type === "interaction.created") {
              interactionId = event.interaction.id;
              resolvedModel =
                event.interaction.model || resolvedModel;
            }

            if (
              event.event_type === "step.delta" &&
              event.delta.type === "text"
            ) {
              controller.enqueue(
                encodeEvent(encoder, {
                  type: "delta",
                  delta: event.delta.text,
                })
              );
            }

            if (event.event_type === "interaction.completed") {
              completed = true;
              interactionId = event.interaction.id;
              resolvedModel =
                event.interaction.model || resolvedModel;
              controller.enqueue(
                encodeEvent(encoder, {
                  type: "done",
                  interactionId,
                  model: resolvedModel,
                  knowledgeTopics: knowledgeContext.topics,
                })
              );
              break;
            }

            if (event.event_type === "error") {
              terminalEventSent = true;
              controller.enqueue(
                encodeEvent(
                  encoder,
                  toStreamErrorEvent(event.error)
                )
              );
              break;
            }

            if (
              event.event_type === "interaction.status_update" &&
              [
                "failed",
                "cancelled",
                "incomplete",
                "budget_exceeded",
              ].includes(event.status)
            ) {
              terminalEventSent = true;
              controller.enqueue(
                encodeEvent(encoder, incompleteStreamEvent())
              );
              break;
            }
          }

          if (!completed && !terminalEventSent) {
            controller.enqueue(
              encodeEvent(encoder, incompleteStreamEvent())
            );
          }
        } catch (error) {
          if (!request.signal.aborted) {
            controller.enqueue(
              encodeEvent(
                encoder,
                toStreamErrorEvent(error)
              )
            );
          }
        } finally {
          controller.close();
        }
      },
      cancel() {
        void iterator.return?.();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    if (request.signal.aborted) {
      return jsonError(
        408,
        "REQUEST_CANCELLED",
        "คำขอถูกยกเลิก กรุณาลองใหม่อีกครั้ง"
      );
    }

    return getGeminiErrorResponse(error);
  }
}
