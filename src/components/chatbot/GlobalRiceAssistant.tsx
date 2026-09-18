"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogIn, RotateCcw, Send, X } from "lucide-react";
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

interface WidgetMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface GlobalRiceAssistantProps {
  isAuthenticated: boolean;
  displayName?: string;
}

function messageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function welcomeMessage(displayName?: string): WidgetMessage {
  const greeting = displayName
    ? `สวัสดีคุณ ${displayName}ครับ`
    : "สวัสดีครับ";

  return {
    id: "widget-welcome",
    role: "assistant",
    content: `${greeting} ผมคือน้องเสริม\nถามเรื่องข้าวหรือข้อมูลในหน้าที่กำลังดูได้เลยครับ`,
  };
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as ChatbotApiError;
    if (payload.error?.message) return payload.error.message;
  } catch {
    // Use the fallback message when the response is not JSON.
  }

  return "ไม่สามารถติดต่อน้องเสริมได้ กรุณาลองใหม่อีกครั้ง";
}

export default function GlobalRiceAssistant({
  isAuthenticated,
  displayName,
}: GlobalRiceAssistantProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<WidgetMessage[]>(() => [
    welcomeMessage(displayName),
  ]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previousInteractionId, setPreviousInteractionId] = useState<
    string | null
  >(null);
  const [knowledgeTopics, setKnowledgeTopics] = useState<KnowledgeTopic[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isSending]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  async function sendMessage(rawMessage: string): Promise<void> {
    const message = rawMessage.trim();

    if (!message || isSending || !isAuthenticated) return;

    const userMessage: WidgetMessage = {
      id: messageId(),
      role: "user",
      content: message,
    };
    const assistantMessageId = messageId();

    setMessages((current) => [
      ...current,
      userMessage,
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);
    setDraft("");
    setError(null);
    setIsSending(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          previousInteractionId,
          pagePath: pathname,
          knowledgeTopics,
        }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(await readApiError(response));
      if (!response.body) {
        throw new Error("เบราว์เซอร์ไม่รองรับการตอบกลับแบบสตรีม");
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
          if (!line.trim()) continue;

          const event = JSON.parse(line) as ChatbotStreamEvent;

          if (event.type === "delta") {
            receivedText = true;
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantMessageId
                  ? { ...item, content: item.content + event.delta }
                  : item
              )
            );
          }

          if (event.type === "done") {
            setPreviousInteractionId(event.interactionId || null);
            setKnowledgeTopics(event.knowledgeTopics ?? []);
          }

          if (event.type === "error") throw new Error(event.message);
        }

        if (done) {
          if (!receivedText) {
            throw new Error("น้องเสริมไม่ได้ส่งคำตอบกลับมา กรุณาลองใหม่");
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
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendMessage(draft);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
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
    setMessages([welcomeMessage(displayName)]);
    setPreviousInteractionId(null);
    setKnowledgeTopics([]);
    setDraft("");
    setError(null);
    setIsSending(false);
  }

  if (pathname === "/chatbot") return null;

  return (
    <aside data-print-hidden="true" aria-label="น้องเสริม ผู้ช่วยประจำเว็บไซต์">
      {isOpen ? (
        <section
          role="dialog"
          aria-label="สนทนากับน้องเสริม"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+9.75rem)] left-3 right-3 z-[90] flex h-[min(68dvh,580px)] flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-[0_28px_85px_rgba(19,55,37,0.28)] sm:bottom-24 sm:left-auto sm:right-5 sm:h-[580px] sm:w-[390px] dark:bg-[#10251a]"
        >
          <header className="flex items-center justify-between px-4 py-3 shadow-[0_5px_18px_rgba(31,62,43,0.08)]">
            <div className="flex min-w-0 items-center gap-2.5">
              <Image
                src="/images/44.png"
                alt="น้องเสริม"
                width={1254}
                height={1254}
                className="h-12 w-12 shrink-0 object-contain"
              />
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-bold text-rice-forest dark:text-white">
                  Nong Serm
                </h2>
                <p className="truncate text-[11px] text-rice-muted dark:text-white/50">
                  ถามข้อมูลในหน้านี้ได้เลย
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={resetConversation}
                disabled={isSending || messages.length === 1}
                aria-label="เริ่มบทสนทนาใหม่"
                className="grid h-9 w-9 place-items-center rounded-full text-rice-muted transition hover:bg-rice-forest/[0.06] hover:text-rice-forest disabled:opacity-30 dark:text-white/55 dark:hover:bg-white/10"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="ปิดน้องเสริม"
                className="grid h-9 w-9 place-items-center rounded-full text-rice-muted transition hover:bg-rice-forest/[0.06] hover:text-rice-forest dark:text-white/55 dark:hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          <div
            className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-[#fbfcfa] px-3.5 py-4 dark:bg-black/10"
            aria-live="polite"
          >
            {!isAuthenticated ? (
              <div className="flex min-h-full flex-col items-center justify-center px-6 text-center">
                <Image
                  src="/images/44.png"
                  alt=""
                  width={1254}
                  height={1254}
                  className="h-20 w-20 object-contain"
                />
                <h3 className="mt-3 font-heading text-base font-bold text-rice-forest dark:text-white">
                  เข้าสู่ระบบเพื่อคุยกับน้องเสริม
                </h3>
                <Link
                  href="/login"
                  className="mt-5 inline-flex items-center gap-2 rounded-full bg-rice-forest px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <LogIn className="h-4 w-4" />
                  เข้าสู่ระบบ
                </Link>
              </div>
            ) : (
              messages.map((message) => {
                const isAssistant = message.role === "assistant";

                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 ${
                      isAssistant ? "justify-start" : "justify-end"
                    }`}
                  >
                    {isAssistant ? (
                      <Image
                        src="/images/44.png"
                        alt=""
                        width={1254}
                        height={1254}
                        className="h-8 w-8 shrink-0 object-contain"
                      />
                    ) : null}
                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-6 shadow-sm ${
                        isAssistant
                          ? "rounded-bl-md bg-white text-rice-text dark:bg-white/10 dark:text-white"
                          : "rounded-br-md bg-rice-forest text-white"
                      }`}
                    >
                      {message.content || (
                        <span className="flex h-6 items-center gap-1.5" aria-label="น้องเสริมกำลังพิมพ์">
                          {[0, 1, 2].map((index) => (
                            <span
                              key={index}
                              className="h-1.5 w-1.5 animate-bounce rounded-full bg-rice-leaf/70"
                              style={{ animationDelay: `${index * 130}ms` }}
                            />
                          ))}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {isAuthenticated ? (
            <footer className="bg-white p-3 shadow-[0_-5px_18px_rgba(31,62,43,0.06)] dark:bg-[#10251a]">
              {error ? (
                <p role="alert" className="mb-2 text-xs leading-5 text-red-600 dark:text-red-300">
                  {error}
                </p>
              ) : null}
              <form onSubmit={handleSubmit} className="relative">
                <textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isSending}
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  placeholder="ถามน้องเสริมเกี่ยวกับข้าว..."
                  aria-label="ข้อความถึงน้องเสริม"
                  className="block min-h-16 w-full resize-none rounded-2xl border-0 bg-[#f3f7f1] px-3.5 py-3 pr-14 text-sm leading-5 text-rice-text shadow-inner outline-none transition placeholder:text-rice-muted/60 focus:ring-4 focus:ring-rice-mint/45 disabled:opacity-60 dark:bg-white/[0.07] dark:text-white"
                />
                <button
                  type="submit"
                  disabled={isSending || !draft.trim()}
                  aria-label="ส่งข้อความ"
                  className="absolute bottom-2.5 right-2.5 grid h-10 w-10 place-items-center rounded-xl bg-rice-forest text-white shadow-md transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0"
                >
                  {isSending ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              <Link
                href="/chatbot"
                className="mt-2 block text-center text-[11px] font-medium text-rice-muted hover:text-rice-forest dark:text-white/45 dark:hover:text-white"
              >
                เปิดหน้าสนทนาแบบเต็ม
              </Link>
            </footer>
          ) : null}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={isOpen ? "ปิดน้องเสริม" : "เปิดน้องเสริม"}
        aria-expanded={isOpen}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 z-[91] grid h-[68px] w-[68px] place-items-center rounded-full bg-white p-1 shadow-[0_14px_38px_rgba(19,55,37,0.26)] transition hover:-translate-y-1 hover:shadow-[0_18px_46px_rgba(19,55,37,0.32)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice-leaf sm:bottom-5 sm:right-5"
      >
        <Image
          src="/images/44.png"
          alt=""
          width={1254}
          height={1254}
          className="h-16 w-16 object-contain"
        />
      </button>
    </aside>
  );
}
