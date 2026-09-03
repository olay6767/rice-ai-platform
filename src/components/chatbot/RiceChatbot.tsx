"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Bot,
  Bug,
  Check,
  CloudSun,
  Copy,
  Droplets,
  Leaf,
  LogIn,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  UserRound,
  Wheat,
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

interface Suggestion {
  icon: typeof Leaf;
  label: string;
  prompt: string;
  color: string;
}

const SUGGESTIONS: Suggestion[] = [
  {
    icon: Bug,
    label: "ตรวจอาการโรค",
    prompt:
      "ใบข้าวมีจุดสีน้ำตาลตรงกลางสีเทา ควรตรวจอะไรและดูแลเบื้องต้นอย่างไร?",
    color:
      "bg-amber-50 text-amber-700 dark:bg-amber-400/10 dark:text-amber-200",
  },
  {
    icon: Wheat,
    label: "วางแผนใส่ปุ๋ย",
    prompt:
      "ช่วยวางแผนใส่ปุ๋ยข้าวแบบเป็นขั้นตอน ตั้งแต่หลังปักดำจนถึงออกรวง",
    color:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  {
    icon: Droplets,
    label: "จัดการน้ำ",
    prompt:
      "ถ้าฝนตกต่อเนื่องหลายวัน ควรจัดการระดับน้ำในนาข้าวอย่างไรเพื่อลดความเสี่ยงโรค?",
    color:
      "bg-sky-50 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200",
  },
  {
    icon: CloudSun,
    label: "วางแผนตามอากาศ",
    prompt:
      "ช่วยทำเช็กลิสต์สิ่งที่ต้องดูจากพยากรณ์อากาศก่อนใส่ปุ๋ยและพ่นสารในนาข้าว",
    color:
      "bg-violet-50 text-violet-700 dark:bg-violet-400/10 dark:text-violet-200",
  },
];

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWelcomeMessage(displayName?: string): ChatMessage {
  const greeting = displayName
    ? `สวัสดีคุณ${displayName}`
    : "สวัสดีครับ";

  return {
    id: "welcome",
    role: "assistant",
    content: `${greeting} ผมคือ Rice AI Assistant ช่วยตอบคำถามเรื่องการปลูกข้าว โรคและแมลง การให้ปุ๋ย การจัดการน้ำ และการวางแผนแปลงนาได้ครับ\n\nวันนี้อยากให้ช่วยเรื่องอะไร?`,
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
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(displayName),
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousInteractionId, setPreviousInteractionId] = useState<
    string | null
  >(null);
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
            setPreviousInteractionId(event.interactionId);
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
        <header className="mb-5 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:items-end sm:justify-between sm:gap-5">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rice-leaf/20 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rice-forest shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-rice-mint-light">
              <Sparkles className="h-3.5 w-3.5 text-rice-gold" />
              Powered by Gemini
            </div>
            <h1 className="font-heading text-2xl font-bold tracking-[-0.03em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
              ผู้ช่วยเกษตรกร Rice AI
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-rice-muted sm:mt-3 sm:text-base sm:leading-7 dark:text-white/65">
              ถามเรื่องโรคข้าว ปุ๋ย น้ำ แมลง และการวางแผนแปลงนา
              พร้อมคำแนะนำภาษาไทยที่อ่านง่ายและนำไปใช้ต่อได้
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 sm:self-auto">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-50" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            AI พร้อมช่วยเหลือ
          </div>
        </header>

        <div className="grid min-w-0 gap-5 xl:grid-cols-[320px_minmax(0,1fr)] xl:grid-rows-[auto_1fr]">
          <section className="glass-card min-w-0 p-4 sm:p-5 xl:col-start-1 xl:row-start-1 xl:p-6">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rice-forest text-white shadow-md dark:bg-rice-mint-light dark:text-rice-dark">
                  <Leaf className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-bold text-rice-forest dark:text-white">
                    ลองถามคำถามเหล่านี้
                  </h2>
                  <p className="mt-0.5 text-xs text-rice-muted dark:text-white/55">
                    แตะเพื่อเริ่มบทสนทนา
                  </p>
                </div>
              </div>

              <p className="mb-2 text-[11px] text-rice-muted xl:hidden dark:text-white/45">
                ปัดไปทางซ้ายเพื่อดูคำถามเพิ่มเติม →
              </p>

              <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:thin] xl:mx-0 xl:block xl:space-y-2.5 xl:overflow-visible xl:px-0 xl:pb-0 xl:[scrollbar-width:auto]">
                {SUGGESTIONS.map((suggestion) => {
                  const Icon = suggestion.icon;

                  return (
                    <button
                      key={suggestion.label}
                      type="button"
                      disabled={!isAuthenticated || isSending}
                      onClick={() => void sendMessage(suggestion.prompt)}
                      className="group flex w-[78vw] max-w-[290px] shrink-0 snap-start items-start gap-3 rounded-2xl border border-rice-forest/8 bg-white/65 p-3.5 text-left transition hover:-translate-y-0.5 hover:border-rice-leaf/25 hover:bg-white hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-55 xl:w-full xl:max-w-none dark:border-white/8 dark:bg-white/[0.04] dark:hover:border-white/15 dark:hover:bg-white/[0.07]"
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${suggestion.color}`}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span>
                        <span className="block text-sm font-semibold text-rice-forest dark:text-white">
                          {suggestion.label}
                        </span>
                        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-rice-muted dark:text-white/50">
                          {suggestion.prompt}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
          </section>

          <section className="glass-panel flex h-[calc(100dvh-7rem)] min-h-[580px] max-h-[760px] min-w-0 flex-col overflow-hidden sm:h-[720px] sm:min-h-[720px] sm:max-h-none xl:col-start-2 xl:row-span-2 xl:row-start-1">
            <div className="flex items-center justify-between border-b border-rice-forest/10 px-3 py-3 sm:px-6 sm:py-3.5 dark:border-white/10">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-forest text-white shadow-lg dark:bg-rice-mint-light dark:text-rice-dark">
                  <Bot className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0d2014]" />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-heading text-sm font-bold text-rice-forest sm:text-base dark:text-white">
                    Rice AI Assistant
                  </h2>
                  <p className="truncate text-xs text-rice-muted dark:text-white/50">
                    ผู้ช่วยด้านการปลูกและดูแลข้าว
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
              aria-label="บทสนทนากับ Rice AI Assistant"
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
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rice-mint/50 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light sm:h-9 sm:w-9">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`relative min-w-0 max-w-[calc(100%-2.625rem)] rounded-3xl px-3.5 py-3 sm:max-w-[78%] sm:px-5 sm:py-3.5 ${
                            isAssistant
                              ? "rounded-tl-lg border border-rice-forest/8 bg-white/75 text-rice-text shadow-sm dark:border-white/8 dark:bg-white/[0.06] dark:text-white"
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

            <div className="border-t border-rice-forest/10 bg-white/45 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] sm:p-5 dark:border-white/10 dark:bg-black/10">
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
                  className="block min-h-20 min-w-0 flex-1 resize-none rounded-2xl border border-rice-forest/15 bg-white px-3.5 py-3 text-base leading-6 text-rice-text shadow-sm outline-none transition placeholder:text-rice-muted/60 focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/35 disabled:cursor-not-allowed disabled:bg-rice-surface-soft disabled:opacity-70 sm:min-h-24 sm:w-full sm:rounded-3xl sm:py-3.5 sm:pl-4 sm:pr-16 sm:text-sm dark:border-white/12 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/35 dark:focus:border-rice-mint/30 dark:focus:ring-rice-leaf/10"
                  aria-label="ข้อความถึง Rice AI Assistant"
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

              <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-[11px] text-rice-muted dark:text-white/40">
                <span className="sm:hidden">แตะปุ่มส่งเมื่อพิมพ์เสร็จ</span>
                <span className="hidden sm:inline">Enter เพื่อส่ง · Shift + Enter เพื่อขึ้นบรรทัดใหม่</span>
                <span>
                  {draft.length.toLocaleString("th-TH")}/
                  {MAX_MESSAGE_LENGTH.toLocaleString("th-TH")}
                </span>
              </div>
              <p className="mt-2 text-center text-[10px] leading-4 text-rice-muted/75 dark:text-white/30">
                AI อาจตอบผิดได้ ควรตรวจสอบข้อมูลสำคัญก่อนนำไปใช้จริง
              </p>
            </div>
          </section>

          <section className="rounded-3xl border border-rice-gold/25 bg-rice-gold/10 p-4 sm:p-5 xl:col-start-1 xl:row-start-2 xl:self-start dark:border-rice-gold/15 dark:bg-rice-gold/[0.06]">
            <div className="flex gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-rice-gold" />
              <div>
                <h2 className="text-sm font-bold text-rice-forest dark:text-white">
                  ใช้คำแนะนำอย่างปลอดภัย
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-rice-muted dark:text-white/55">
                  AI อาจให้ข้อมูลคลาดเคลื่อนได้ โดยเฉพาะการวินิจฉัยโรคและการใช้สารเคมี
                  ควรยืนยันกับฉลากหรือเจ้าหน้าที่เกษตรก่อนลงมือจริง
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
