"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Check,
  CircleDollarSign,
  Coffee,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  LoaderCircle,
  LogIn,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  UserRound,
  WalletCards,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";

import {
  getFinanceCategoryLabel,
  type FinanceAnalysisResult,
  type FinanceApiError,
  type FinanceCategory,
  type FinanceOverview,
  type FinanceTrendPeriod,
  type FinanceTransactionDraft,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";
import ManualTransactionForm from "@/components/finance/ManualTransactionForm";
import FinanceOnboarding from "@/components/finance/FinanceOnboarding";

const MAX_MESSAGE_LENGTH = 1_000;

type DashboardPeriod = "current_month" | "previous_month" | "current_year";

interface FinanceAssistantProps {
  isAuthenticated: boolean;
  displayName?: string;
  dashboardOnly?: boolean;
}

type DraftStatus =
  | "pending"
  | "saving"
  | "saved"
  | "cancelled";

interface FinanceChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  draft?: FinanceTransactionDraft;
  draftStatus?: DraftStatus;
  clientRequestId?: string;
  drafts?: FinanceTransactionDraft[];
  draftStatuses?: DraftStatus[];
  clientRequestIds?: string[];
}

interface AnalyzeResponse {
  data: FinanceAnalysisResult;
}

interface SaveResponse {
  data: SavedFinanceTransaction;
}

interface OverviewResponse {
  data: FinanceOverview;
}

interface ExamplePrompt {
  label: string;
  text: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: "ค่าปุ๋ย",
    text: "ซื้อปุ๋ย 2 กระสอบ 1,800 บาท",
  },
  {
    label: "ค่าแรง",
    text: "จ่ายค่าแรงหว่านข้าว 1,200 บาท",
  },
  {
    label: "ค่าน้ำ",
    text: "ค่าสูบน้ำ 650 บาท",
  },
  {
    label: "ขายข้าว",
    text: "ขายข้าวเปลือก 15,000 บาท",
  },
];

const CATEGORY_ICONS: Record<string, typeof Coffee> = {
  seed: Sparkles,
  fertilizer: Sparkles,
  pesticide: ShieldCheck,
  labor: UserRound,
  irrigation: Coffee,
  fuel_transport: CarFront,
  land_rent: House,
  machinery: BriefcaseBusiness,
  other_farm_expense: ReceiptText,
  food: Coffee,
  coffee: Coffee,
  transport: CarFront,
  housing: House,
  phone_internet: ReceiptText,
  utilities_water: Coffee,
  utilities_electricity: ReceiptText,
  health: HeartPulse,
  education: GraduationCap,
  shopping: ShoppingBag,
  entertainment: Gamepad2,
  subscription: ReceiptText,
  debt: CircleDollarSign,
  family: HeartPulse,
  other_expense: ReceiptText,
  rice_sales: CircleDollarSign,
  farm_support: Gift,
  other_farm_income: CircleDollarSign,
  salary: WalletCards,
  wage: WalletCards,
  side_income: CircleDollarSign,
  product_sales: ShoppingBag,
  business: BriefcaseBusiness,
  bonus: Gift,
  interest: CircleDollarSign,
  dividend: CircleDollarSign,
  cashback: Gift,
  transfer: ArrowLeftRight,
  other_income: CircleDollarSign,
};

function createMessageId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createWelcomeMessage(
  displayName?: string
): FinanceChatMessage {
  const greeting = displayName
    ? `สวัสดีคุณ${displayName}`
    : "สวัสดีครับ";

  return {
    id: "finance-welcome",
    role: "assistant",
    content: `${greeting} พิมพ์ต้นทุนหรือรายรับจากการทำนาได้เลย เช่น “ซื้อปุ๋ย 2 กระสอบ 1,800 บาท” หรือ “ขายข้าวเปลือก 25,000 บาท”\n\nผมจะแยกประเภท หมวดหมู่ จำนวนเงิน และวันที่ให้ตรวจสอบก่อนบันทึกทุกครั้งครับ`,
  };
}

function emptyOverview(): FinanceOverview {
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());

  return {
    summary: {
      income: 0,
      expense: 0,
      balance: 0,
      saving: 0,
      savingRate: null,
      transactionCount: 0,
      month,
    },
    transactions: [],
    categoryBreakdown: [],
    trendPeriod: "month",
    trend: Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));

      return {
        period: date.toISOString().slice(0, 7),
        income: 0,
        expense: 0,
      };
    }),
  };
}

async function readApiError(
  response: Response
): Promise<string> {
  try {
    const payload =
      (await response.json()) as FinanceApiError;

    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ใช้ข้อความสำรองด้านล่าง
  }

  return "ระบบไม่พร้อมใช้งานชั่วคราว กรุณาลองใหม่อีกครั้ง";
}

async function requestOverview(
  {
    month,
    scope,
    category,
    trendPeriod,
    signal,
  }: {
    month?: string;
    scope?: "month" | "year";
    category?: FinanceCategory;
    trendPeriod?: FinanceTrendPeriod;
    signal?: AbortSignal;
  } = {}
): Promise<FinanceOverview> {
  const searchParams = new URLSearchParams();

  if (month) {
    searchParams.set("month", month);
  }

  if (scope) {
    searchParams.set("scope", scope);
  }

  if (category) {
    searchParams.set("category", category);
  }

  if (trendPeriod) {
    searchParams.set("trendPeriod", trendPeriod);
  }

  const query = searchParams.toString();
  const response = await fetch(
    `/api/finance/transactions${query ? `?${query}` : ""}`,
    {
      signal,
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = await readJsonResponse<OverviewResponse>(response);

  return payload.data;
}

function getBangkokMonth(offset = 0): string {
  const currentMonth = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const [year, month] = currentMonth.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));

  return shifted.toISOString().slice(0, 7);
}


function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits:
      Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(new Date(`${date}T00:00:00+07:00`));
}

function formatShortMonth(month: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "short",
  }).format(new Date(`${month}-01T00:00:00+07:00`));
}

function formatTrendPeriod(period: string, trendPeriod: FinanceTrendPeriod): string {
  if (trendPeriod === "week") {
    return new Intl.DateTimeFormat("th-TH", {
      weekday: "short",
      day: "numeric",
    }).format(new Date(`${period}T00:00:00+07:00`));
  }

  if (trendPeriod === "year") {
    return String(Number(period) + 543);
  }

  return formatShortMonth(period);
}

function getTrendDescription(trendPeriod: FinanceTrendPeriod): string {
  if (trendPeriod === "week") return "เปรียบเทียบย้อนหลัง 7 วัน";
  if (trendPeriod === "year") return "เปรียบเทียบย้อนหลัง 5 ปี";
  return "เปรียบเทียบย้อนหลัง 6 เดือน";
}

function TransactionPreview({
  draft,
  status = "pending",
  onConfirm,
  onCancel,
}: {
  draft: FinanceTransactionDraft;
  status?: DraftStatus;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const isIncome =
    draft.transactionType === "income";
  const CategoryIcon = CATEGORY_ICONS[draft.category] ?? ReceiptText;

  return (
    <div className="mt-3 overflow-hidden rounded-[24px] bg-amber-50/60 shadow-[0_18px_45px_rgba(120,83,12,0.16)] dark:bg-amber-300/[0.06] dark:shadow-[0_18px_45px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-3 bg-amber-100/75 px-4 py-3 dark:bg-amber-300/[0.1]">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            isIncome
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
              : "bg-amber-200 text-amber-900 dark:bg-amber-300/20 dark:text-amber-200"
          }`}
        >
          {isIncome ? (
            <ArrowDownLeft className="h-3.5 w-3.5" />
          ) : (
            <ArrowUpRight className="h-3.5 w-3.5" />
          )}
          {isIncome ? "รายรับ" : "รายจ่าย"}
        </span>
        <span
          className={`font-heading text-lg font-bold ${
            isIncome
              ? "text-emerald-700 dark:text-emerald-300"
              : "text-amber-800 dark:text-amber-200"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatBaht(draft.amount)}
        </span>
      </div>

      <div className="space-y-3 bg-white/85 px-4 py-3.5 dark:bg-white/[0.035]">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-900 shadow-sm dark:bg-amber-300/15 dark:text-amber-200">
            <CategoryIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs text-rice-muted dark:text-white/45">
              หมวดหมู่
            </p>
            <p className="truncate text-sm font-semibold text-rice-forest dark:text-white">
              {getFinanceCategoryLabel(draft.category)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 shadow-[0_7px_20px_rgba(120,83,12,0.09)] dark:bg-white/[0.06] dark:shadow-none">
            <p className="text-[11px] text-rice-muted dark:text-white/40">
              รายละเอียด
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-rice-text dark:text-white">
              {draft.description}
            </p>
          </div>
          <div className="rounded-xl bg-white p-3 shadow-[0_7px_20px_rgba(120,83,12,0.09)] dark:bg-white/[0.06] dark:shadow-none">
            <p className="text-[11px] text-rice-muted dark:text-white/40">
              วันที่
            </p>
            <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-rice-text dark:text-white">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(draft.transactionDate)}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 text-[11px] text-rice-muted dark:text-white/40">
          <span>
            ความมั่นใจ AI{" "}
            {Math.round(draft.confidence * 100)}%
          </span>
          <span>ตรวจสอบก่อนบันทึก</span>
        </div>
      </div>

      {status === "pending" && (
        <div className="grid grid-cols-2 gap-2 bg-amber-50/70 p-3 dark:bg-amber-300/[0.04]">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-white text-xs font-semibold text-rice-muted shadow-[0_6px_18px_rgba(120,83,12,0.12)] transition hover:-translate-y-0.5 hover:text-rice-forest dark:bg-white/[0.08] dark:text-white/60 dark:shadow-none dark:hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest text-xs font-semibold text-white shadow-[0_8px_20px_rgba(11,46,28,0.2)] transition hover:-translate-y-0.5 hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"
          >
            <Check className="h-3.5 w-3.5" />
            ยืนยันบันทึก
          </button>
        </div>
      )}

      {status === "saving" && (
        <div className="flex items-center justify-center gap-2 bg-amber-50/70 px-3 py-3 text-xs font-semibold text-rice-muted dark:bg-amber-300/[0.04] dark:text-white/55">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          กำลังบันทึกลงฐานข้อมูล
        </div>
      )}

      {status === "saved" && (
        <div className="flex items-center justify-center gap-2 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">
          <Check className="h-4 w-4" />
          บันทึกรายการเรียบร้อยแล้ว
        </div>
      )}

      {status === "cancelled" && (
        <div className="bg-amber-50/70 px-3 py-3 text-center text-xs font-semibold text-rice-muted dark:bg-amber-300/[0.04] dark:text-white/45">
          ยกเลิกรายการนี้แล้ว
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  helper,
  iconSrc,
  iconAlt,
}: {
  label: string;
  value: string;
  helper: string;
  iconSrc: string;
  iconAlt: string;
}) {
  return (
    <article className="rounded-[24px] bg-white px-5 py-5 shadow-[0_14px_38px_rgba(11,46,28,0.09)] dark:bg-white/[0.06] dark:shadow-[0_14px_38px_rgba(0,0,0,0.22)]">
      <div className="flex items-center gap-4">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_9px_24px_rgba(11,46,28,0.14)] dark:bg-white/[0.10]">
          <Image
            src={iconSrc}
            alt={iconAlt}
            width={42}
            height={42}
            className="h-10 w-10 object-contain"
          />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-2xl font-bold tracking-tight text-rice-forest dark:text-white">
            {value}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-rice-forest dark:text-white/80">
            {label}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-rice-muted dark:text-white/40">
            {helper}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function FinanceAssistant({
  isAuthenticated,
  displayName,
  dashboardOnly = false,
}: FinanceAssistantProps) {
  const [messages, setMessages] = useState<
    FinanceChatMessage[]
  >(() => [createWelcomeMessage(displayName)]);
  const [draft, setDraft] = useState("");
  const [isAnalyzing, setIsAnalyzing] =
    useState(false);
  const [error, setError] = useState<
    string | null
  >(null);
  const [overviewError, setOverviewError] =
    useState<string | null>(null);
  const [overview, setOverview] =
    useState<FinanceOverview>(() => emptyOverview());
  const [isLoadingOverview, setIsLoadingOverview] =
    useState(isAuthenticated);
  const [dashboardPeriod, setDashboardPeriod] =
    useState<DashboardPeriod>("current_month");
  const [isCategorySetupOpen, setIsCategorySetupOpen] = useState(false);
  const messagesEndRef =
    useRef<HTMLDivElement | null>(null);
  const textareaRef =
    useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef =
    useRef<AbortController | null>(null);

  const loadOverview = useCallback(
    async (signal?: AbortSignal) => {
      if (!isAuthenticated) {
        return;
      }

      try {
        if (!signal?.aborted) {
          setIsLoadingOverview(true);
        }

        const dashboardMonth = dashboardPeriod === "previous_month"
          ? getBangkokMonth(-1)
          : dashboardPeriod === "current_year"
            ? getBangkokMonth()
            : undefined;
        const data = await requestOverview({
          month: dashboardOnly ? dashboardMonth : undefined,
          scope: dashboardOnly && dashboardPeriod === "current_year"
            ? "year"
            : undefined,
          trendPeriod: "month",
          signal,
        });

        setOverview(data);
        setOverviewError(null);
      } catch (caughtError) {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setOverviewError(
          caughtError instanceof Error
            ? caughtError.message
            : "ไม่สามารถโหลดข้อมูลการเงินได้"
        );
      } finally {
        if (!signal?.aborted) {
          setIsLoadingOverview(false);
        }
      }
    },
    [dashboardOnly, dashboardPeriod, isAuthenticated]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    const dashboardMonth = dashboardPeriod === "previous_month"
      ? getBangkokMonth(-1)
      : dashboardPeriod === "current_year"
        ? getBangkokMonth()
        : undefined;

    requestOverview({
      month: dashboardOnly ? dashboardMonth : undefined,
      scope: dashboardOnly && dashboardPeriod === "current_year"
        ? "year"
        : undefined,
      trendPeriod: "month",
      signal: controller.signal,
    })
      .then((data) => {
        setOverview(data);
        setOverviewError(null);
      })
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setOverviewError(
          caughtError instanceof Error
            ? caughtError.message
            : "ไม่สามารถโหลดข้อมูลการเงินได้"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoadingOverview(false);
        }
      });

    return () => controller.abort();
  }, [dashboardOnly, dashboardPeriod, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void fetch("/api/finance/recurring/generate", {
      method: "POST",
      cache: "no-store",
    })
      .then((response) =>
        readJsonResponse<{ data?: { generated?: number } }>(response)
      )
      .then((payload) => {
        if ((payload.data?.generated ?? 0) > 0) {
          void loadOverview();
        }
      })
      .catch(() => {
        // A recurring schedule is optional; normal finance features keep working.
      });
  }, [isAuthenticated, loadOverview]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages, isAnalyzing]);

  useEffect(() => {
    return () => abortControllerRef.current?.abort();
  }, []);

  async function sendMessage(
    rawMessage: string
  ): Promise<void> {
    const message = rawMessage.trim();

    if (
      !message ||
      isAnalyzing ||
      !isAuthenticated
    ) {
      return;
    }

    const userMessage: FinanceChatMessage = {
      id: createMessageId(),
      role: "user",
      content: message,
    };
    const assistantMessageId = createMessageId();
    const assistantMessage: FinanceChatMessage = {
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
    setIsAnalyzing(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        "/api/finance/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = await readJsonResponse<AnalyzeResponse>(response);
      const analysis = payload.data;

      setMessages((current) =>
        current.map((item) => {
          if (item.id !== assistantMessageId) {
            return item;
          }

          if (
            analysis.needsClarification ||
            analysis.drafts.length === 0
          ) {
            return {
              ...item,
              content:
                analysis.clarificationMessage ||
                "ขอรายละเอียดเพิ่มอีกนิดครับ",
            };
          }

          return {
            ...item,
            content:
              analysis.drafts.length > 1
                ? `แยกได้ ${analysis.drafts.length.toLocaleString("th-TH")} รายการครับ กรุณาตรวจสอบและยืนยันบันทึกทีละรายการ`
                : "วิเคราะห์ให้แล้วครับ กรุณาตรวจสอบข้อมูลก่อนกดยืนยันบันทึก",
            drafts: analysis.drafts,
            draftStatuses: analysis.drafts.map(() => "pending"),
            clientRequestIds: analysis.drafts.map(() => crypto.randomUUID()),
          };
        })
      );
    } catch (caughtError) {
      if (
        caughtError instanceof DOMException &&
        caughtError.name === "AbortError"
      ) {
        return;
      }

      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถวิเคราะห์รายการได้ กรุณาลองใหม่";

      setMessages((current) =>
        current.map((item) =>
          item.id === assistantMessageId
            ? {
                ...item,
                content: message,
              }
            : item
        )
      );
      setError(message);
    } finally {
      setIsAnalyzing(false);
      abortControllerRef.current = null;
      textareaRef.current?.focus();
    }
  }

  async function confirmTransaction(
    messageId: string,
    draftIndex: number
  ): Promise<void> {
    const target = messages.find(
      (message) => message.id === messageId
    );

    if (
      !target?.drafts?.[draftIndex] ||
      !target.clientRequestIds?.[draftIndex] ||
      target.draftStatuses?.[draftIndex] !== "pending"
    ) {
      return;
    }

    setError(null);
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              draftStatuses: item.draftStatuses?.map((status, index) =>
                index === draftIndex ? "saving" : status
              ),
            }
          : item
      )
    );

    try {
      const response = await fetch(
        "/api/finance/transactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...target.drafts[draftIndex],
            clientRequestId: target.clientRequestIds[draftIndex],
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload = await readJsonResponse<SaveResponse>(response);

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                draftStatuses: item.draftStatuses?.map((status, index) =>
                  index === draftIndex ? "saved" : status
                ),
              }
            : item
        )
      );
      setOverview((current) => ({
        ...current,
        transactions: [
          payload.data,
          ...current.transactions.filter(
            (item) => item.id !== payload.data.id
          ),
        ].slice(0, 20),
      }));
      await loadOverview();
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่";

      setMessages((current) =>
        current.map((item) =>
          item.id === messageId
            ? {
                ...item,
                draftStatuses: item.draftStatuses?.map((status, index) =>
                  index === draftIndex ? "pending" : status
                ),
              }
            : item
        )
      );
      setError(message);
    }
  }

  function cancelTransaction(
    messageId: string,
    draftIndex: number
  ): void {
    setMessages((current) =>
      current.map((item) =>
        item.id === messageId
          ? {
              ...item,
              draftStatuses: item.draftStatuses?.map((status, index) =>
                index === draftIndex ? "cancelled" : status
              ),
            }
          : item
      )
    );
  }

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): void {
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

  function handleManualSaved(transaction: SavedFinanceTransaction): void {
    setOverview((current) => ({
      ...current,
      transactions: [
        transaction,
        ...current.transactions.filter((item) => item.id !== transaction.id),
      ].slice(0, 20),
    }));
    void loadOverview();
  }

  const {
    summary,
    transactions,
    trend,
    trendPeriod: activeTrendPeriod,
    categoryBreakdown,
  } = overview;
  const maxTrendValue = Math.max(
    1,
    ...trend.flatMap((item) => [
      item.income,
      item.expense,
    ])
  );
  const sortedCategories = categoryBreakdown
    .filter((item) => item.transactionType === "expense")
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const categoryTotal = categoryBreakdown
    .filter((item) => item.transactionType === "expense")
    .reduce(
    (total, item) => total + item.amount,
    0
  );
  const dashboardPeriodLabel = dashboardPeriod === "current_month"
    ? "เดือนนี้"
    : dashboardPeriod === "previous_month"
      ? "เดือนก่อน"
      : "ปีนี้";
  const dashboardPeriodIndex = dashboardPeriod === "current_month"
    ? 0
    : dashboardPeriod === "previous_month"
      ? 1
      : 2;
  const topExpenseCategory = sortedCategories[0];
  const summaryRecommendation = topExpenseCategory
    ? summary.balance >= 0
      ? `แนะนำให้ตรวจรายการ${getFinanceCategoryLabel(topExpenseCategory.category)}และกำหนดงบสำหรับช่วงถัดไป พร้อมกันเงินคงเหลือบางส่วนไว้เป็นทุนสำรอง`
      : `แนะนำให้ตรวจรายการ${getFinanceCategoryLabel(topExpenseCategory.category)}และลดค่าใช้จ่ายที่ยังไม่จำเป็น เพื่อให้รายรับกลับมาสูงกว่ารายจ่าย`
    : "แนะนำให้บันทึกรายรับและรายจ่ายอย่างสม่ำเสมอ เพื่อให้น้องเสริมช่วยวางแผนเงินได้แม่นยำขึ้น";
  const recentTransactions = transactions.slice(0, 5);

  return (
    <main className="relative isolate overflow-hidden py-8 sm:py-12 lg:py-14">
      <div
        aria-hidden="true"
        className="ambient-orb -left-28 top-8 h-72 w-72 bg-rice-mint/35 dark:bg-rice-leaf/10"
      />
      <div
        aria-hidden="true"
        className="ambient-orb -right-24 top-72 h-80 w-80 bg-rice-gold/15 dark:bg-rice-gold/5"
      />

      <div className="dashboard-container relative z-10">
        {isAuthenticated && (
          <FinanceOnboarding
            open={isCategorySetupOpen ? true : undefined}
            onClose={() => setIsCategorySetupOpen(false)}
          />
        )}
        <header className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {dashboardOnly && (
              <Link
                href="/finance"
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-rice-forest/10 bg-white/70 px-3 py-1.5 text-xs font-semibold text-rice-forest shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf dark:border-white/10 dark:bg-white/[0.05] dark:text-rice-mint-light dark:hover:bg-white/[0.1]"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                กลับไปหน้าบันทึกรายการ
              </Link>
            )}
            <h1 className="font-heading text-3xl font-bold tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
              {dashboardOnly
                ? "Dashboard รายรับ–ราย"
                : "บันทึกรายรับรายจ่ายกับน้องเสริม"}
              {dashboardOnly && (
                <span className="block text-rice-leaf dark:text-rice-mint-light">
                  น้องเสริมจัดการให้แล้ว
                </span>
              )}
            </h1>
          </div>
        </header>

        {dashboardOnly && isAuthenticated && (
          <section
            aria-label="สรุปรายรับรายจ่าย"
            className="mb-5 grid gap-4 sm:grid-cols-3"
          >
            <SummaryCard
              label="รายรับ"
              value={isLoadingOverview ? "กำลังโหลด…" : formatBaht(summary.income)}
              helper={dashboardPeriodLabel}
              iconSrc="/images/26.png"
              iconAlt="ไอคอนรายรับ"
            />
            <SummaryCard
              label="รายจ่าย"
              value={isLoadingOverview ? "กำลังโหลด…" : formatBaht(summary.expense)}
              helper={`${dashboardPeriodLabel} · ${summary.transactionCount.toLocaleString("th-TH")} รายการ`}
              iconSrc="/images/25.png"
              iconAlt="ไอคอนรายจ่าย"
            />
            <SummaryCard
              label="คงเหลือ"
              value={isLoadingOverview ? "กำลังโหลด…" : formatBaht(summary.balance)}
              helper={summary.balance >= 0 ? "รายรับมากกว่ารายจ่าย" : "รายจ่ายมากกว่ารายรับ"}
              iconSrc="/images/46.png"
              iconAlt="ไอคอนคงเหลือ"
            />
          </section>
        )}

        {dashboardOnly && isAuthenticated && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-rice-forest dark:text-white">
              ช่วงเวลาที่แสดง
            </p>
            <div
              aria-label="เลือกช่วงเวลาของ Dashboard"
              className="relative grid grid-cols-3 overflow-hidden rounded-2xl bg-white/80 p-1.5 shadow-[0_8px_24px_rgba(11,46,28,0.09)] backdrop-blur-xl dark:bg-white/[0.06]"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%_-_0.75rem)/3)] overflow-hidden rounded-[45%_55%_48%_52%/55%_45%_55%_45%] bg-amber-100/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_5px_16px_rgba(251,191,36,0.22)] ring-1 ring-inset ring-white/75 backdrop-blur-md transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-amber-200/15 dark:ring-white/15"
                style={{ transform: `translateX(${dashboardPeriodIndex * 100}%)` }}
              >
                <span className="absolute left-2 top-1.5 h-2.5 w-5 rounded-full bg-white/75 blur-[1px]" />
                <span className="absolute bottom-1 right-2 h-2 w-2 rounded-full bg-amber-300/55 blur-[1px] dark:bg-amber-100/20" />
              </span>
              {([
                ["current_month", "เดือนนี้"],
                ["previous_month", "เดือนก่อน"],
                ["current_year", "ปีนี้"],
              ] as const).map(([period, label]) => (
                <button
                  key={period}
                  type="button"
                  aria-pressed={dashboardPeriod === period}
                  onClick={() => setDashboardPeriod(period)}
                  className={`relative z-10 rounded-xl px-3 py-2 text-xs font-bold transition-colors duration-300 sm:px-4 ${dashboardPeriod === period ? "text-amber-950 dark:text-amber-100" : "text-rice-muted hover:text-rice-forest dark:text-white/55 dark:hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {overviewError && isAuthenticated && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{overviewError}</span>
          </div>
        )}

        {dashboardOnly && !isAuthenticated && (
          <section className="glass-card mb-5 flex min-h-[360px] flex-col items-center justify-center px-6 py-10 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rice-mint/45 text-rice-forest shadow-sm dark:bg-rice-leaf/15 dark:text-rice-mint-light">
              <LogIn className="h-7 w-7" />
            </div>
            <h2 className="mt-5 font-heading text-xl font-bold text-rice-forest dark:text-white">
              เข้าสู่ระบบเพื่อดู Dashboard
            </h2>
            <p className="mt-2 max-w-md text-sm leading-6 text-rice-muted dark:text-white/55">
              Dashboard จะแสดงเฉพาะข้อมูลการเงินของบัญชีคุณ
              เพื่อความเป็นส่วนตัวและความถูกต้องของข้อมูล
            </p>
            <Link
              href="/login?next=/finance/dashboard"
              className="primary-action mt-6"
            >
              <LogIn className="h-4 w-4" />
              เข้าสู่ระบบ
            </Link>
          </section>
        )}

        {!dashboardOnly && isAuthenticated && (
          <ManualTransactionForm onSaved={handleManualSaved} />
        )}

        {!dashboardOnly && (
          <div className="mb-5 flex justify-end">
            <Link
              href="/finance/dashboard"
              aria-label="ดู Dashboard การเงินเกษตร"
              title="ดู Dashboard การเงินเกษตร"
              className="group inline-flex h-12 w-12 items-center justify-center rounded-2xl shadow-[0_10px_26px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(15,23,42,0.24)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf focus-visible:ring-offset-2 dark:shadow-[0_10px_26px_rgba(0,0,0,0.38)]"
            >
              <Image
                src="/images/45.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 object-contain drop-shadow-[0_4px_7px_rgba(15,23,42,0.22)] transition-transform group-hover:scale-105 dark:invert"
              />
              <span className="sr-only">ดู Dashboard การเงินเกษตร</span>
            </Link>
          </div>
        )}

        {dashboardOnly && isAuthenticated && (
          <div className="space-y-5">
            <article className="glass-card p-5 sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center">
                    <Image
                      src="/images/47.png"
                      alt=""
                      width={34}
                      height={34}
                      className="h-8 w-8 object-contain drop-shadow-[0_8px_8px_rgba(15,23,42,0.24)] dark:invert"
                    />
                  </span>
                  <div>
                    <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                      แนวโน้มรายรับ–รายจ่าย
                    </h2>
                    <p className="mt-0.5 text-xs text-rice-muted dark:text-white/45">
                      {dashboardPeriod === "current_year" ? "รายเดือนในปีนี้" : getTrendDescription(activeTrendPeriod)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-semibold text-rice-muted dark:text-white/50">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    รายรับ
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                    รายจ่าย
                  </span>
                </div>
              </div>

              <div className="mt-6 overflow-x-auto pb-1">
                <div
                  className="flex h-72 min-w-[680px] items-end gap-4 sm:gap-7"
                  role="img"
                  aria-label={`กราฟแท่งเปรียบเทียบรายรับและรายจ่าย ${dashboardPeriodLabel}`}
                >
                  {trend.map((item) => {
                    const incomeHeight = item.income > 0
                      ? Math.max(7, (item.income / maxTrendValue) * 100)
                      : 3;
                    const expenseHeight = item.expense > 0
                      ? Math.max(7, (item.expense / maxTrendValue) * 100)
                      : 3;

                    return (
                      <div key={item.period} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <div className="flex h-60 w-full items-end justify-center gap-2.5">
                          <div
                            className="w-5 rounded-t-[14px] bg-amber-400 shadow-[0_-6px_16px_rgba(251,191,36,0.22)] transition-all duration-500 sm:w-7"
                            style={{ height: `${incomeHeight}%` }}
                            title={`รายรับ ${formatBaht(item.income)}`}
                          />
                          <div
                            className="w-5 rounded-t-[14px] bg-slate-400 shadow-[0_-6px_16px_rgba(148,163,184,0.22)] transition-all duration-500 sm:w-7 dark:bg-slate-500"
                            style={{ height: `${expenseHeight}%` }}
                            title={`รายจ่าย ${formatBaht(item.expense)}`}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-rice-muted dark:text-white/45 sm:text-[11px]">
                          {formatTrendPeriod(item.period, activeTrendPeriod)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {trend.every((item) => item.income === 0 && item.expense === 0) && (
                <p className="mt-2 text-center text-xs text-rice-muted dark:text-white/40">
                  ยังไม่มีข้อมูลสำหรับแสดงแนวโน้ม
                </p>
              )}
            </article>

            <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,0.65fr)]">
              <article className="glass-card p-5 sm:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center">
                      <Image
                        src="/images/48.png"
                        alt=""
                        width={42}
                        height={42}
                        className="h-10 w-10 object-contain drop-shadow-[0_9px_9px_rgba(15,23,42,0.24)] dark:invert"
                      />
                    </span>
                    <div>
                      <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                        รายจ่ายตามหมวดหมู่
                      </h2>
                      <p className="mt-0.5 text-xs text-rice-muted dark:text-white/45">
                        หมวดที่ใช้เงินมากใน{dashboardPeriodLabel}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-bold text-rice-forest dark:text-white">
                    {formatBaht(categoryTotal)}
                  </span>
                </div>

                {sortedCategories.length === 0 ? (
                  <p className="mt-8 text-center text-sm text-rice-muted dark:text-white/45">
                    ยังไม่มีข้อมูลรายจ่ายในช่วงนี้
                  </p>
                ) : (
                  <div className="mt-6 space-y-4">
                    {sortedCategories.map((item) => {
                      const share = categoryTotal > 0 ? (item.amount / categoryTotal) * 100 : 0;

                      return (
                        <div key={item.category}>
                          <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                            <span className="truncate font-semibold text-rice-text dark:text-white">
                              {getFinanceCategoryLabel(item.category)}
                            </span>
                            <span className="shrink-0 font-bold text-rice-muted dark:text-white/55">
                              {formatBaht(item.amount)}
                            </span>
                          </div>
                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)] transition-all duration-500 dark:bg-amber-300"
                              style={{ width: `${Math.max(3, share)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>

              <article className="glass-card p-5 sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rice-gold/20 text-amber-700 dark:bg-rice-gold/10 dark:text-rice-gold">
                    <Image
                      src="/images/44.png"
                      alt=""
                      width={34}
                      height={34}
                      className="h-8 w-8 object-contain drop-shadow-[0_3px_6px_rgba(120,53,15,0.18)]"
                    />
                  </span>
                  <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                    สรุป{dashboardPeriodLabel}
                  </h2>
                </div>
                <div className="mt-6 space-y-3 text-sm leading-6 text-rice-text dark:text-white/80">
                  <p>
                    {topExpenseCategory
                      ? `${getFinanceCategoryLabel(topExpenseCategory.category)}สูงที่สุด ใช้ไป ${formatBaht(topExpenseCategory.amount)}`
                      : "ยังไม่มีรายจ่ายในช่วงนี้"}
                  </p>
                  {(summary.income > 0 || summary.expense > 0) && (
                    <p className="text-rice-muted dark:text-white/55">
                      {summary.balance >= 0
                        ? `รายรับสูงกว่ารายจ่าย ${formatBaht(summary.balance)}`
                        : `รายจ่ายสูงกว่ารายรับ ${formatBaht(Math.abs(summary.balance))}`}
                    </p>
                  )}
                  <p className="font-medium text-amber-800 dark:text-amber-200">
                    <span className="font-bold">คำแนะนำ: </span>
                    {summaryRecommendation}
                  </p>
                </div>
              </article>
            </section>

            <article className="glass-card p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                    รายการล่าสุด
                  </h2>
                  <p className="mt-1 text-xs text-rice-muted dark:text-white/45">
                    5 รายการล่าสุดใน{dashboardPeriodLabel}
                  </p>
                </div>
                <Link
                  href="/finance/transactions"
                  className="inline-flex h-9 items-center rounded-xl bg-rice-surface-soft px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/55 dark:bg-white/[0.06] dark:text-white dark:hover:bg-white/[0.1]"
                >
                  ดูทั้งหมด
                </Link>
              </div>

              {recentTransactions.length === 0 ? (
                <p className="py-10 text-center text-sm text-rice-muted dark:text-white/45">
                  ยังไม่มีรายการในช่วงนี้
                </p>
              ) : (
                <div className="relative mt-5">
                  <span
                    aria-hidden="true"
                    className="absolute bottom-5 left-[17px] top-5 w-0.5 rounded-full bg-gradient-to-b from-amber-300 via-slate-300 to-amber-200 dark:from-amber-300/70 dark:via-slate-600 dark:to-amber-200/50"
                  />
                  {recentTransactions.map((transaction) => {
                    const isIncome = transaction.transactionType === "income";
                    const CategoryIcon = CATEGORY_ICONS[transaction.category] ?? ReceiptText;

                    return (
                      <div key={transaction.id} className="relative z-10 flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-rice-forest shadow-[0_5px_16px_rgba(15,23,42,0.13)] ring-2 ring-amber-100 dark:bg-[#17291f] dark:text-rice-mint-light dark:ring-amber-300/20">
                          <CategoryIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-rice-text dark:text-white">
                            {transaction.description}
                          </p>
                          <p className="mt-0.5 text-[11px] text-rice-muted dark:text-white/40">
                            {getFinanceCategoryLabel(transaction.category, transaction.categoryLabel)} · {formatDate(transaction.transactionDate)}
                          </p>
                        </div>
                        <p className={`shrink-0 text-sm font-bold ${isIncome ? "text-emerald-700 dark:text-emerald-300" : "text-rice-text dark:text-white"}`}>
                          {isIncome ? "+" : "−"}{formatBaht(transaction.amount)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </article>
          </div>
        )}

        {!dashboardOnly && (
          <div className="w-full">
          <section className="flex min-h-[720px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_24px_70px_rgba(11,46,28,0.12)] dark:bg-[#11231a] dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between border-b border-rice-forest/10 px-4 py-3.5 sm:px-6 dark:border-white/10">
              <div className="flex items-center gap-3">
                <Image
                  src="/images/44.png"
                  alt="น้องเสริม ผู้ช่วยบันทึกเงิน"
                  width={56}
                  height={56}
                  className="h-12 w-12 shrink-0 object-contain"
                />
                <div>
                  <h2 className="font-heading text-sm font-bold text-rice-forest sm:text-base dark:text-white">
                    AI ผู้ช่วยบันทึกเงิน
                  </h2>
                  <p className="text-xs text-rice-muted dark:text-white/45">
                    วิเคราะห์ด้วย Gemini
                  </p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[11px] font-semibold text-rice-forest shadow-[0_8px_22px_rgba(11,46,28,0.12)] dark:bg-white/[0.08] dark:text-white sm:inline-flex">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                พร้อมวิเคราะห์
              </span>
            </div>

            <div className="border-b border-rice-forest/8 px-4 py-3 dark:border-white/8 sm:px-6">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {EXAMPLE_PROMPTS.map((example) => (
                  <button
                    key={example.label}
                    type="button"
                    disabled={
                      !isAuthenticated || isAnalyzing
                    }
                    onClick={() =>
                      void sendMessage(example.text)
                    }
                    className="shrink-0 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black shadow-[0_7px_20px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,0.16)] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/[0.1] dark:text-white"
                  >
                    {example.text}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6"
              aria-live="polite"
              aria-label="บทสนทนาบันทึกรายรับรายจ่าย"
            >
              {!isAuthenticated ? (
                <div className="mx-auto flex min-h-[430px] max-w-md flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-rice-mint/45 text-rice-forest shadow-sm dark:bg-rice-leaf/15 dark:text-rice-mint-light">
                    <LogIn className="h-7 w-7" />
                  </div>
                  <h3 className="font-heading text-xl font-bold text-rice-forest dark:text-white">
                    เข้าสู่ระบบเพื่อเริ่มบันทึก
                  </h3>
                  <p className="mt-2.5 text-sm leading-6 text-rice-muted dark:text-white/55">
                    รายการทั้งหมดจะผูกกับบัญชีของคุณ
                    เพื่อให้ข้อมูลไม่ปะปนกับผู้ใช้คนอื่น
                  </p>
                  <Link
                    href="/login?next=/finance"
                    className="primary-action mt-6"
                  >
                    <LogIn className="h-4 w-4" />
                    เข้าสู่ระบบ
                  </Link>
                </div>
              ) : (
                <>
                  {messages.map((message) => {
                    const isAssistant =
                      message.role === "assistant";

                    return (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          isAssistant
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        {isAssistant && (
                          <Image
                            src="/images/44.png"
                            alt="น้องเสริม"
                            width={44}
                            height={44}
                            className="mt-0.5 h-9 w-9 shrink-0 object-contain"
                          />
                        )}

                        <div
                          className={`max-w-[90%] sm:max-w-[82%] ${
                            isAssistant
                              ? ""
                              : "rounded-3xl rounded-tr-lg bg-rice-forest px-4 py-3 text-white shadow-[0_12px_28px_rgba(11,46,28,0.16)] dark:bg-rice-mint-light dark:text-rice-dark"
                          }`}
                        >
                          {isAssistant ? (
                            <div className="rounded-3xl rounded-tl-lg bg-white px-4 py-3.5 text-rice-text shadow-[0_14px_36px_rgba(15,23,42,0.1)] dark:bg-white/[0.06] dark:text-white dark:shadow-[0_14px_36px_rgba(0,0,0,0.24)]">
                              {message.content ? (
                                <p className="whitespace-pre-wrap text-sm leading-7">
                                  {message.content}
                                </p>
                              ) : (
                                <div
                                  className="flex h-7 items-center gap-2"
                                  aria-label="AI กำลังวิเคราะห์"
                                >
                                  <LoaderCircle className="h-4 w-4 animate-spin text-rice-leaf dark:text-rice-mint-light" />
                                  <span className="text-xs font-semibold text-rice-muted dark:text-white/50">
                                    กำลังแยกรายการ…
                                  </span>
                                </div>
                              )}

                              {message.drafts?.map((transactionDraft, index) => (
                                <TransactionPreview
                                  key={`${message.id}-${index}`}
                                  draft={transactionDraft}
                                  status={message.draftStatuses?.[index]}
                                  onConfirm={() =>
                                    void confirmTransaction(message.id, index)
                                  }
                                  onCancel={() =>
                                    cancelTransaction(message.id, index)
                                  }
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <p className="whitespace-pre-wrap text-sm leading-7">
                                {message.content}
                              </p>
                            </div>
                          )}
                        </div>

                        {!isAssistant && (
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rice-gold/20 text-amber-800 dark:bg-rice-gold/10 dark:text-rice-gold">
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

            <div className="border-t border-rice-forest/10 bg-white/45 p-3 sm:p-5 dark:border-white/10 dark:bg-black/10">
              {error && (
                <div
                  role="alert"
                  className="mb-3 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-200"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span className="leading-5">
                    {error}
                  </span>
                </div>
              )}

              <form
                onSubmit={handleSubmit}
                className="relative"
              >
                <textarea
                  ref={textareaRef}
                  value={draft}
                  onChange={(event) =>
                    setDraft(event.target.value)
                  }
                  onKeyDown={handleKeyDown}
                  disabled={
                    !isAuthenticated || isAnalyzing
                  }
                  maxLength={MAX_MESSAGE_LENGTH}
                  rows={2}
                  placeholder={
                    isAuthenticated
                      ? "เช่น ซื้อปุ๋ย 1,800 บาท หรือ ขายข้าวเปลือก 25,000 บาท..."
                      : "กรุณาเข้าสู่ระบบก่อนใช้งาน"
                  }
                  className="block min-h-24 w-full resize-none rounded-3xl border border-rice-forest/15 bg-white py-3.5 pl-4 pr-16 text-sm leading-6 text-rice-text shadow-sm outline-none transition placeholder:text-rice-muted/60 focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/35 disabled:cursor-not-allowed disabled:bg-rice-surface-soft disabled:opacity-70 dark:border-white/12 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/35 dark:focus:border-rice-mint/30 dark:focus:ring-rice-leaf/10"
                  aria-label="รายการรายรับหรือรายจ่าย"
                />
                <button
                  type="submit"
                  disabled={
                    !isAuthenticated ||
                    isAnalyzing ||
                    !draft.trim()
                  }
                  aria-label="ส่งให้ AI วิเคราะห์"
                  className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-rice-forest text-white shadow-md transition hover:-translate-y-0.5 hover:bg-rice-dark hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 dark:bg-rice-mint-light dark:text-rice-dark"
                >
                  {isAnalyzing ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </form>
              <div className="mt-2.5 flex justify-end px-1 text-[11px] text-rice-muted dark:text-white/40">
                <span>
                  {draft.length.toLocaleString("th-TH")}/
                  {MAX_MESSAGE_LENGTH.toLocaleString(
                    "th-TH"
                  )}
                </span>
              </div>
            </div>
          </section>

          </div>
        )}
      </div>
    </main>
  );
}
