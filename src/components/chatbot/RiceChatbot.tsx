"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Check,
  Copy,
  LogIn,
  RotateCcw,
  Send,
  UserRound,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import type {
  ChatbotApiError,
  ChatbotStreamEvent,
  KnowledgeTopic,
} from "@/lib/chatbot/types";

const MAX_MESSAGE_LENGTH = 4_000;

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface RiceChatbotProps {
  isAuthenticated: boolean;
  displayName?: string;
}

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWelcomeMessage(displayName?: string): ChatMessage {
  const greeting = displayName
    ? `สวัสดีคุณ ${displayName} 👋`
    : "สวัสดีครับ 👋";

  return {
    id: "welcome",
    role: "assistant",
    content: `${greeting}\nผมคือน้องเสริม ผู้ช่วยดูแลแปลงนาของคุณ\n\nถามเรื่องข้าว หรือข้อมูลน้ำท่วม พายุ ภัยแล้ง ผลผลิต และราคาข้าวในระบบได้เลยครับ`,
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ChatbotApiError;

    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ใช้ข้อความสำรองด้านล่างเมื่อ response ไม่ใช่ JSON
  }

  return "ไม่สามารถติดต่อผู้ช่วย AI ได้ กรุณาลองใหม่อีกครั้ง";
}

export default function RiceChatbot({
  isAuthenticated,
  displayName,
}: RiceChatbotProps) {
  const pagePath = usePathname();
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(displayName),
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousInteractionId, setPreviousInteractionId] = useState<
    string | null
  >(null);
  const [knowledgeTopics, setKnowledgeTopics] = useState<KnowledgeTopic[]>([]);
  const [copiedMessageId, setCopiedMessageId] = useState<
    string | null
  >(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  async function sendMessage(rawMessage: string): Promise<void> {
    const message = rawMessage.trim();

    if (!message || isSending || !isAuthenticated) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: "user",
      content: message,
    };
    const assistantMessageId = createMessageId();
    const assistantMessage: ChatMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
    };

    setMessages((current) => [
      ...current,
      userMessage,
      assistantMessage,
    ]);
    setDraft("");
    setError(null);
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          previousInteractionId,
          pagePath,
          knowledgeTopics,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      if (!response.body) {
        throw new Error(
          "เบราว์เซอร์ไม่รองรับการตอบกลับแบบสตรีม"
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let receivedText = false;

      while (true) {
        const { done, value } = await reader.read();

        buffer += decoder.decode(value, { stream: !done });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) {
            continue;
          }

          const event = JSON.parse(line) as ChatbotStreamEvent;

          if (event.type === "delta") {
            receivedText = true;
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantMessageId
                  ? {
                      ...item,
                      content: item.content + event.delta,
                    }
                  : item
              )
            );
          }

          if (event.type === "done") {
            setPreviousInteractionId(event.interactionId || null);
            setKnowledgeTopics(event.knowledgeTopics ?? []);
          }

          if (event.type === "error") {
            throw new Error(event.message);
          }
        }

        if (done) {
          if (!receivedText) {
            throw new Error(
              "ผู้ช่วย AI ไม่ได้ส่งคำตอบกลับมา กรุณาลองใหม่"
            );
          }

          break;
        }
      }
    } catch (caughtError) {
      if (
        caughtError instanceof DOMException &&
        caughtError.name === "AbortError"
      ) {
        return;
      }

      setMessages((current) =>
        current.filter((item) => item.id !== assistantMessageId)
      );
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
      textareaRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>
  ): void {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      void sendMessage(draft);
    }
  }

  function resetConversation(): void {
    abortControllerRef.current?.abort();
    setMessages([createWelcomeMessage(displayName)]);
    setPreviousInteractionId(null);
    setKnowledgeTopics([]);
    setDraft("");
    setError(null);
    setIsSending(false);
    textareaRef.current?.focus();
  }

  async function copyMessage(message: ChatMessage): Promise<void> {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedMessageId(message.id);
      window.setTimeout(() => setCopiedMessageId(null), 1_600);
    } catch {
      setError("ไม่สามารถคัดลอกข้อความได้");
    }
  }

  return (
    <main className="relative isolate overflow-hidden py-5 sm:py-12 lg:py-16">
      <div
        aria-hidden="true"
        className="ambient-orb -left-32 top-10 h-72 w-72 bg-rice-mint/35 dark:bg-rice-leaf/10"
      />
      <div
        aria-hidden="true"
        className="ambient-orb -right-32 top-60 h-80 w-80 bg-rice-gold/15 [animation-delay:1.4s] dark:bg-rice-gold/5"
      />

      <div className="dashboard-container relative z-10">
        <header className="mb-5 sm:mb-8">
          <h1 className="font-heading text-3xl font-bold tracking-[-0.03em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
            Nong Serm
          </h1>
          <p className="mt-2 text-sm font-medium text-rice-muted sm:text-base dark:text-white/60">
            ผู้ช่วยดูแลแปลงนา ถามง่าย ตอบเป็นขั้นตอน
          </p>
        </header>

        <div className="mx-auto w-full max-w-5xl">
          <section className="flex h-[calc(100dvh-7rem)] min-h-[580px] max-h-[760px] min-w-0 flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_24px_70px_rgba(31,62,43,0.14)] sm:h-[720px] sm:min-h-[720px] sm:max-h-none dark:bg-[#10251a]">
            <div className="flex items-center justify-between bg-white px-3 py-3 shadow-[0_5px_20px_rgba(31,62,43,0.07)] sm:px-6 sm:py-3.5 dark:bg-[#10251a]">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative h-14 w-14 shrink-0">
                  <Image
                    src="/images/44.png"
                    alt="น้องเสริม"
                    width={1254}
                    height={1254}
                    className="h-14 w-14 object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-sm font-bold text-rice-forest sm:text-base dark:text-white">
                    Nong Serm
                  </h2>
                  <p className="truncate text-xs text-rice-muted dark:text-white/50">
                    ผู้ช่วยประจำแปลงนา
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetConversation}
                disabled={isSending || messages.length === 1}
                className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-xs font-semibold text-rice-muted transition hover:bg-rice-forest/[0.06] hover:text-rice-forest disabled:cursor-not-allowed disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/[0.07] dark:hover:text-white sm:px-4"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="hidden sm:inline">เริ่มใหม่</span>
              </button>
            </div>

            <div
              className="min-h-0 flex-1 space-y-8 overscroll-contain overflow-y-auto px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6 lg:px-8"
              aria-live="polite"
              aria-label="บทสนทนากับ Nong Serm"
            >
              {!isAuthenticated ? (
                <div className="mx-auto flex min-h-full max-w-md flex-col items-center justify-center px-2 text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-rice-mint/45 text-rice-forest shadow-sm dark:bg-rice-leaf/15 dark:text-rice-mint-light">
                    <LogIn className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-rice-forest dark:text-white">
                    เข้าสู่ระบบเพื่อเริ่มถาม AI
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-rice-muted dark:text-white/55">
                    ระบบจำกัดการใช้งานไว้สำหรับสมาชิก เพื่อรักษาความปลอดภัยและควบคุมการใช้งานบริการ
                  </p>
                  <Link
                    href="/login?next=/chatbot"
                    className="primary-action mt-6"
                  >
                    <LogIn className="h-4 w-4" />
                    เข้าสู่ระบบ
                  </Link>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isAssistant = message.role === "assistant";

                    return (
                      <div
                        key={message.id}
                        className={`group flex min-w-0 gap-2.5 sm:gap-4 ${
                          isAssistant
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        {isAssistant && (
                          <div className="mt-1 h-10 w-10 shrink-0 sm:h-11 sm:w-11">
                            <Image
                              src="/images/44.png"
                              alt=""
                              width={1254}
                              height={1254}
                              className="h-10 w-10 object-contain sm:h-11 sm:w-11"
                            />
                          </div>
                        )}

                        <div
                          className={`relative min-w-0 max-w-[calc(100%-2.625rem)] rounded-3xl px-3.5 py-3 sm:max-w-[78%] sm:px-5 sm:py-3.5 ${
                            isAssistant
                              ? "rounded-tl-lg bg-[#f8faf7] text-rice-text shadow-[0_8px_24px_rgba(31,62,43,0.09)] dark:bg-white/[0.07] dark:text-white"
                              : "rounded-tr-lg bg-rice-forest text-white shadow-[0_12px_28px_rgba(11,46,28,0.16)] dark:bg-rice-mint-light dark:text-rice-dark"
                          }`}
                        >
                          {message.content ? (
                            <p className="break-words whitespace-pre-wrap text-sm leading-6 sm:leading-7">
                              {message.content}
                            </p>
                          ) : (
                            <div className="flex h-7 items-center gap-1.5" aria-label="AI กำลังพิมพ์">
                              {[0, 1, 2].map((index) => (
                                <span
                                  key={index}
                                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-rice-leaf/70 dark:bg-rice-mint-light/70"
                                  style={{
                                    animationDelay: `${index * 130}ms`,
                                  }}
                                />
                              ))}
                            </div>
                          )}

                          {isAssistant && message.content && (
                            <button
                              type="button"
                              onClick={() => void copyMessage(message)}
                              className="absolute -bottom-9 left-1 inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-medium text-rice-muted opacity-100 transition hover:bg-rice-forest/[0.06] hover:text-rice-forest focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:text-white/45 dark:hover:bg-white/[0.07] dark:hover:text-white"
                            >
                              {copiedMessageId === message.id ? (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  คัดลอกแล้ว
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3.5 w-3.5" />
                                  คัดลอก
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {!isAssistant && (
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rice-gold/20 text-amber-800 dark:bg-rice-gold/10 dark:text-rice-gold sm:h-9 sm:w-9">
                            <UserRound className="h-4 w-4" />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            <div className="bg-white p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-5px_20px_rgba(31,62,43,0.06)] sm:p-5 dark:bg-[#10251a]">
              {error && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-5">{error}</span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="flex items-end gap-2 sm:relative sm:block"
              >
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={!isAuthenticated || isSending}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  placeholder={
                    isAuthenticated
                      ? "พิมพ์คำถามเกี่ยวกับการปลูกข้าว..."
                      : "กรุณาเข้าสู่ระบบก่อนใช้งาน"
                  }
                  className="block min-h-20 min-w-0 flex-1 resize-none rounded-2xl border-0 bg-[#f5f8f3] px-3.5 py-3 text-base leading-6 text-rice-text shadow-[0_8px_24px_rgba(31,62,43,0.09)] outline-none transition placeholder:text-rice-muted/60 focus:ring-4 focus:ring-rice-mint/45 disabled:cursor-not-allowed disabled:bg-rice-surface-soft disabled:opacity-70 sm:min-h-24 sm:w-full sm:rounded-3xl sm:py-3.5 sm:pl-4 sm:pr-16 sm:text-sm dark:bg-white/[0.07] dark:text-white dark:placeholder:text-white/35 dark:focus:ring-rice-leaf/10"
                  aria-label="ข้อความถึง Nong Serm"
                />
                <button
                  type="submit"
                  disabled={
                    !isAuthenticated ||
                    isSending ||
                    !draft.trim()
                  }
                  aria-label="ส่งข้อความ"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rice-forest text-white shadow-md transition hover:-translate-y-0.5 hover:bg-rice-dark hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 sm:absolute sm:bottom-3 sm:right-3 sm:h-11 sm:w-11 dark:bg-rice-mint-light dark:text-rice-dark dark:hover:bg-rice-mint"
                >
                  {isSending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>

            </div>
          </section>

        </div>
      </div>
    </main>
  );
}
