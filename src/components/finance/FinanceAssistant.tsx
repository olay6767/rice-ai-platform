"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  CalendarDays,
  CarFront,
  Check,
  CircleDollarSign,
  Clock3,
  Coffee,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  Lightbulb,
  LoaderCircle,
  LogIn,
  MessageCircleMore,
  PiggyBank,
  PieChart,
  ReceiptText,
  Send,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserRound,
  WalletCards,
  WandSparkles,
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
  EXPENSE_CATEGORIES,
  getFinanceCategoryLabel,
  INCOME_CATEGORIES,
  type FinanceAnalysisResult,
  type FinanceApiError,
  type FinanceCategory,
  type FinanceOverview,
  type FinanceTrendPeriod,
  type FinanceTransactionDraft,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";
import FinanceBudgetPlanner from "@/components/finance/FinanceBudgetPlanner";
import ManualTransactionForm from "@/components/finance/ManualTransactionForm";
import FinanceOnboarding from "@/components/finance/FinanceOnboarding";

const MAX_MESSAGE_LENGTH = 1_000;
const FILTER_CATEGORIES: FinanceCategory[] = [
  ...EXPENSE_CATEGORIES,
  ...INCOME_CATEGORIES,
];

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
  tone: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    label: "ค่าปุ๋ย",
    text: "ซื้อปุ๋ย 2 กระสอบ 1,800 บาท",
    tone:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200",
  },
  {
    label: "ค่าแรง",
    text: "จ่ายค่าแรงหว่านข้าว 1,200 บาท",
    tone:
      "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-400/20 dark:bg-sky-400/10 dark:text-sky-200",
  },
  {
    label: "ค่าน้ำ",
    text: "ค่าสูบน้ำ 650 บาท",
    tone:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200",
  },
  {
    label: "ขายข้าว",
    text: "ขายข้าวเปลือก 15,000 บาท",
    tone:
      "border-violet-200 bg-violet-50 text-violet-800 dark:border-violet-400/20 dark:bg-violet-400/10 dark:text-violet-200",
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
    category,
    trendPeriod,
    signal,
  }: {
    month?: string;
    category?: FinanceCategory;
    trendPeriod?: FinanceTrendPeriod;
    signal?: AbortSignal;
  } = {}
): Promise<FinanceOverview> {
  const searchParams = new URLSearchParams();

  if (month) {
    searchParams.set("month", month);
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

  const payload =
    (await response.json()) as OverviewResponse;

  return payload.data;
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

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00+07:00`));
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
    <div className="mt-3 overflow-hidden rounded-2xl border border-rice-forest/10 bg-white shadow-sm dark:border-white/10 dark:bg-white/[0.06]">
      <div className="flex items-center justify-between gap-3 border-b border-rice-forest/8 px-4 py-3 dark:border-white/8">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${
            isIncome
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
              : "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200"
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
              : "text-rose-700 dark:text-rose-300"
          }`}
        >
          {isIncome ? "+" : "−"}
          {formatBaht(draft.amount)}
        </span>
      </div>

      <div className="space-y-3 px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rice-mint/45 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light">
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
          <div className="rounded-xl bg-rice-surface-soft/80 p-3 dark:bg-white/[0.04]">
            <p className="text-[11px] text-rice-muted dark:text-white/40">
              รายละเอียด
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-rice-text dark:text-white">
              {draft.description}
            </p>
          </div>
          <div className="rounded-xl bg-rice-surface-soft/80 p-3 dark:bg-white/[0.04]">
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
        <div className="grid grid-cols-2 gap-2 border-t border-rice-forest/8 p-3 dark:border-white/8">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-rice-forest/12 text-xs font-semibold text-rice-muted transition hover:bg-rice-surface-soft hover:text-rice-forest dark:border-white/10 dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            ยกเลิก
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest text-xs font-semibold text-white transition hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"
          >
            <Check className="h-3.5 w-3.5" />
            ยืนยันบันทึก
          </button>
        </div>
      )}

      {status === "saving" && (
        <div className="flex items-center justify-center gap-2 border-t border-rice-forest/8 px-3 py-3 text-xs font-semibold text-rice-muted dark:border-white/8 dark:text-white/55">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          กำลังบันทึกลงฐานข้อมูล
        </div>
      )}

      {status === "saved" && (
        <div className="flex items-center justify-center gap-2 border-t border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-200">
          <Check className="h-4 w-4" />
          บันทึกรายการเรียบร้อยแล้ว
        </div>
      )}

      {status === "cancelled" && (
        <div className="border-t border-rice-forest/8 bg-rice-surface-soft px-3 py-3 text-center text-xs font-semibold text-rice-muted dark:border-white/8 dark:bg-white/[0.03] dark:text-white/45">
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
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof TrendingUp;
  tone: string;
}) {
  return (
    <article className="glass-card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-rice-muted dark:text-white/50">
            {label}
          </p>
          <p className="mt-2 font-heading text-xl font-bold tracking-tight text-rice-forest dark:text-white sm:text-2xl">
            {value}
          </p>
          <p className="mt-1 text-[11px] text-rice-muted dark:text-white/40">
            {helper}
          </p>
        </div>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${tone}`}
        >
          <Icon className="h-5 w-5" />
        </span>
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
  const [selectedMonth, setSelectedMonth] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    FinanceCategory | "all"
  >("all");
  const [trendPeriod, setTrendPeriod] =
    useState<FinanceTrendPeriod>("month");
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

        const data = await requestOverview({
          month: selectedMonth || undefined,
          category:
            selectedCategory === "all"
              ? undefined
              : selectedCategory,
          trendPeriod,
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
    [isAuthenticated, selectedCategory, selectedMonth, trendPeriod]
  );

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const controller = new AbortController();

    requestOverview({
      month: selectedMonth || undefined,
      category:
        selectedCategory === "all"
          ? undefined
          : selectedCategory,
      trendPeriod,
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
  }, [isAuthenticated, selectedCategory, selectedMonth, trendPeriod]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void fetch("/api/finance/recurring/generate", {
      method: "POST",
      cache: "no-store",
    })
      .then(
        (response) =>
          response.json() as Promise<{ data?: { generated?: number } }>
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

      const payload =
        (await response.json()) as AnalyzeResponse;
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

      const payload =
        (await response.json()) as SaveResponse;

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
  const sortedCategories = [...categoryBreakdown]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 6);
  const categoryTotal = categoryBreakdown.reduce(
    (total, item) => total + item.amount,
    0
  );
  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "ทุกหมวดหมู่"
      : getFinanceCategoryLabel(selectedCategory);
  const currentMonth = summary.month;
  const availableMonths = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - index));
    return date.toISOString().slice(0, 7);
  });

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
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rice-leaf/20 bg-white/75 px-3 py-1.5 text-xs font-semibold text-rice-forest shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-rice-mint-light">
              <Sparkles className="h-3.5 w-3.5 text-rice-gold" />
              Gemini AI + PostgreSQL
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
              {dashboardOnly
                ? "Dashboard การเงินเกษตร"
                : "บันทึกต้นทุนข้าวง่าย ๆ"}
              <span className="block text-rice-leaf dark:text-rice-mint-light">
                {dashboardOnly
                  ? "เห็นภาพรวมการเงินในที่เดียว"
                  : "แค่พิมพ์เหมือนคุยกับเพื่อน"}
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-rice-muted sm:text-base dark:text-white/60">
              {dashboardOnly
                ? "ติดตามรายรับ รายจ่าย แนวโน้มย้อนหลัง และสัดส่วนตามหมวดหมู่จากข้อมูลที่บันทึกไว้"
                : "AI ช่วยแยกต้นทุนเมล็ดพันธุ์ ปุ๋ย ค่าแรง ค่าน้ำ น้ำมัน และรายรับจากการขายข้าว โดยให้คุณตรวจสอบก่อนบันทึกทุกครั้ง"}
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-rice-forest/10 bg-white/70 px-4 py-3 text-xs font-semibold text-rice-forest shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:self-auto">
            <ShieldCheck className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />
            ข้อมูลแยกตามบัญชีผู้ใช้
          </div>
        </header>

        {!dashboardOnly && isAuthenticated && (
          <nav aria-label="จัดการการเงิน" className="mb-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setIsCategorySetupOpen(true)} className="inline-flex h-9 items-center rounded-xl border border-rice-forest/12 bg-white px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">แก้ไขหมวดที่ตั้งไว้</button>
            <Link href="/finance/transactions" className="inline-flex h-9 items-center rounded-xl border border-rice-forest/12 bg-white px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">ดูรายการย้อนหลัง</Link>
          </nav>
        )}

        {dashboardOnly && isAuthenticated && (
          <nav aria-label="เมนูการเงิน" className="mb-5 flex flex-wrap gap-2">
            <Link href="/finance/transactions" className="inline-flex h-9 items-center rounded-xl border border-rice-forest/12 bg-white px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">รายการย้อนหลัง</Link>
            <button type="button" onClick={() => setIsCategorySetupOpen(true)} className="inline-flex h-9 items-center rounded-xl border border-rice-forest/12 bg-white px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">แก้ไขหมวดที่ตั้งไว้</button>
            <Link href="/finance/automation" className="inline-flex h-9 items-center rounded-xl border border-rice-forest/12 bg-white px-3 text-xs font-bold text-rice-forest transition hover:bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.09]">บัญชีและรายการประจำ</Link>
          </nav>
        )}

        {dashboardOnly && isAuthenticated && (
          <section
            aria-label="ตัวกรองข้อมูลการเงิน"
            className="glass-card mb-5 flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between sm:p-5"
          >
            <div>
              <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                ตัวกรองข้อมูล
              </h2>
              <p className="mt-1 text-xs text-rice-muted dark:text-white/45">
                เลือกเดือนและหมวดหมู่เพื่อดูยอดรวม รายการ และกราฟที่เกี่ยวข้อง
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1.5 text-xs font-semibold text-rice-muted dark:text-white/55">
                เดือน
                <select
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="h-10 min-w-48 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none transition focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="">
                    เดือนปัจจุบัน ({formatMonth(currentMonth)})
                  </option>
                  {[...availableMonths]
                    .reverse()
                    .filter((month) => month !== currentMonth)
                    .map((month) => (
                      <option key={month} value={month}>
                        {formatMonth(month)}
                      </option>
                    ))}
                </select>
              </label>
              <label className="grid gap-1.5 text-xs font-semibold text-rice-muted dark:text-white/55">
                หมวดหมู่
                <select
                  value={selectedCategory}
                  onChange={(event) =>
                    setSelectedCategory(
                      event.target.value as FinanceCategory | "all"
                    )
                  }
                  className="h-10 min-w-48 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none transition focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                >
                  <option value="all">ทุกหมวดหมู่</option>
                  {FILTER_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {getFinanceCategoryLabel(category)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        )}

        {dashboardOnly && isAuthenticated && (
          <FinanceBudgetPlanner
            month={selectedMonth || summary.month}
            selectedCategory={selectedCategory}
          />
        )}

        {dashboardOnly && isAuthenticated && (
          <section
            aria-label="สรุปการเงินตามตัวกรอง"
            className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          >
          <SummaryCard
            label="รายรับเดือนที่เลือก"
            value={
              isLoadingOverview
                ? "กำลังโหลด…"
                : formatBaht(summary.income)
            }
            helper={formatMonth(summary.month)}
            icon={TrendingUp}
            tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
          />
          <SummaryCard
            label="รายจ่ายเดือนที่เลือก"
            value={
              isLoadingOverview
                ? "กำลังโหลด…"
                : formatBaht(summary.expense)
            }
            helper={`${summary.transactionCount.toLocaleString("th-TH")} รายการ · ${selectedCategoryLabel}`}
            icon={TrendingDown}
            tone="bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200"
          />
          <SummaryCard
            label="คงเหลือสุทธิ"
            value={
              isLoadingOverview
                ? "กำลังโหลด…"
                : formatBaht(summary.balance)
            }
            helper={
              summary.balance >= 0
                ? "กระแสเงินสดเป็นบวก"
                : "รายจ่ายมากกว่ารายรับ"
            }
            icon={PiggyBank}
            tone="bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light"
          />
          <SummaryCard
            label="เงินเก็บเดือนนี้"
            value={
              isLoadingOverview
                ? "กำลังโหลด…"
                : formatBaht(summary.saving)
            }
            helper={
              summary.savingRate === null
                ? "ยังไม่มีรายรับในช่วงนี้"
                : `อัตราการออม ${summary.savingRate.toLocaleString("th-TH", { maximumFractionDigits: 1 })}%`
            }
            icon={PiggyBank}
            tone="bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200"
          />
          </section>
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
          <Link
            href="/finance/dashboard"
            className="group mb-5 flex items-center justify-between gap-4 rounded-3xl border border-rice-leaf/20 bg-rice-mint/20 px-4 py-4 text-rice-forest shadow-sm transition hover:-translate-y-0.5 hover:border-rice-leaf/35 hover:bg-rice-mint/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf sm:px-5 dark:border-rice-leaf/20 dark:bg-rice-leaf/10 dark:text-white dark:hover:bg-rice-leaf/15"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rice-forest text-white dark:bg-rice-mint-light dark:text-rice-dark">
                <BarChart3
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold">
                  ดู Dashboard การเงินเกษตร
                </span>
                <span className="mt-0.5 block truncate text-xs text-rice-muted dark:text-white/50">
                  ดูกราฟแนวโน้มและสัดส่วนรายรับ–รายจ่ายแบบเต็มหน้า
                </span>
              </span>
            </span>
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/70 text-rice-forest transition-transform group-hover:translate-x-0.5 dark:bg-white/[0.08] dark:text-rice-mint-light">
              <ArrowUpRight
                aria-hidden="true"
                className="h-4 w-4"
              />
            </span>
          </Link>
        )}

        {dashboardOnly && isAuthenticated && (
          <section
            aria-label="Dashboard วิเคราะห์การเงิน"
            className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]"
          >
          <article className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rice-mint/45 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light">
                    <BarChart3 className="h-4 w-4" />
                  </span>
                  <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                    แนวโน้มรายรับ–รายจ่าย
                  </h2>
                </div>
                <p className="mt-2 text-xs text-rice-muted dark:text-white/45">
                  {getTrendDescription(activeTrendPeriod)}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <div className="flex items-center gap-3 text-[11px] font-semibold text-rice-muted dark:text-white/50">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                    รายรับ
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    รายจ่าย
                  </span>
                </div>
                <div aria-label="เลือกช่วงเวลาของกราฟ" className="inline-flex rounded-xl border border-rice-forest/10 bg-rice-surface-soft p-1 dark:border-white/10 dark:bg-white/[0.05]">
                  {([
                    ["week", "สัปดาห์"],
                    ["month", "เดือน"],
                    ["year", "ปี"],
                  ] as const).map(([period, label]) => (
                    <button
                      key={period}
                      type="button"
                      aria-pressed={trendPeriod === period}
                      onClick={() => setTrendPeriod(period)}
                      className={`rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${trendPeriod === period ? "bg-white text-rice-forest shadow-sm dark:bg-rice-mint-light dark:text-rice-dark" : "text-rice-muted hover:text-rice-forest dark:text-white/50 dark:hover:text-white"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div
              className="mt-6 flex h-48 items-end gap-2 sm:gap-4"
              role="img"
              aria-label={`กราฟแท่งแสดงรายรับและรายจ่าย ${getTrendDescription(activeTrendPeriod)}`}
            >
              {trend.map((item) => {
                const incomeHeight =
                  item.income > 0
                    ? Math.max(
                        7,
                        (item.income / maxTrendValue) *
                          100
                      )
                    : 3;
                const expenseHeight =
                  item.expense > 0
                    ? Math.max(
                        7,
                        (item.expense / maxTrendValue) *
                          100
                      )
                    : 3;

                return (
                  <div
                    key={item.period}
                    className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
                  >
                    <div className="flex h-36 w-full items-end justify-center gap-1 sm:gap-1.5">
                      <div
                        className="w-2.5 rounded-t-lg bg-emerald-500 transition-all sm:w-4"
                        style={{
                          height: `${incomeHeight}%`,
                        }}
                        title={`รายรับ ${formatBaht(item.income)}`}
                      />
                      <div
                        className="w-2.5 rounded-t-lg bg-rose-400 transition-all sm:w-4"
                        style={{
                          height: `${expenseHeight}%`,
                        }}
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

            {trend.every(
              (item) =>
                item.income === 0 && item.expense === 0
            ) && (
              <p className="mt-2 text-center text-xs text-rice-muted dark:text-white/40">
                เมื่อเริ่มบันทึกรายการ กราฟแนวโน้มจะแสดงที่นี่
              </p>
            )}
          </article>

          <article className="glass-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rice-gold/20 text-amber-700 dark:bg-rice-gold/10 dark:text-rice-gold">
                    <PieChart className="h-4 w-4" />
                  </span>
                  <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                    สัดส่วนตามหมวดหมู่
                  </h2>
                </div>
                <p className="mt-2 text-xs text-rice-muted dark:text-white/45">
                  เดือน {formatMonth(summary.month)}
                </p>
              </div>
              <span className="text-xs font-bold text-rice-forest dark:text-white">
                {formatBaht(categoryTotal)}
              </span>
            </div>

            {sortedCategories.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-rice-forest/15 bg-rice-surface-soft/60 px-4 py-8 text-center text-xs leading-5 text-rice-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
                ยังไม่มีข้อมูลหมวดหมู่ของเดือนนี้
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {sortedCategories.map((item) => {
                  const share =
                    categoryTotal > 0
                      ? (item.amount / categoryTotal) *
                        100
                      : 0;
                  const isIncome =
                    item.transactionType === "income";

                  return (
                    <div key={`${item.transactionType}-${item.category}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2 font-semibold text-rice-text dark:text-white">
                          <span
                            className={`h-2 w-2 shrink-0 rounded-full ${
                              isIncome
                                ? "bg-emerald-500"
                                : "bg-rose-400"
                            }`}
                          />
                          <span className="truncate">
                            {getFinanceCategoryLabel(item.category)}
                          </span>
                        </span>
                        <span className="shrink-0 font-bold text-rice-muted dark:text-white/55">
                          {formatBaht(item.amount)}
                        </span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-rice-surface-soft dark:bg-white/[0.08]">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isIncome
                              ? "bg-emerald-500"
                              : "bg-rose-400"
                          }`}
                          style={{
                            width: `${Math.max(
                              3,
                              share
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </article>
          </section>
        )}

        {!dashboardOnly && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.75fr)]">
          <section className="glass-panel flex min-h-[720px] flex-col">
            <div className="flex items-center justify-between border-b border-rice-forest/10 px-4 py-3.5 sm:px-6 dark:border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-rice-forest text-white shadow-lg dark:bg-rice-mint-light dark:text-rice-dark">
                  <WandSparkles className="h-5 w-5" />
                  <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-500 dark:border-[#0d2014]" />
                </div>
                <div>
                  <h2 className="font-heading text-sm font-bold text-rice-forest sm:text-base dark:text-white">
                    AI ผู้ช่วยบันทึกเงิน
                  </h2>
                  <p className="text-xs text-rice-muted dark:text-white/45">
                    วิเคราะห์ด้วย Gemini
                  </p>
                </div>
              </div>
              <span className="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200 sm:inline-flex">
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
                    className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 ${example.tone}`}
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
                          <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rice-mint/50 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light">
                            <Bot className="h-4 w-4" />
                          </div>
                        )}

                        <div
                          className={`max-w-[90%] sm:max-w-[82%] ${
                            isAssistant
                              ? ""
                              : "rounded-3xl rounded-tr-lg bg-rice-forest px-4 py-3 text-white shadow-[0_12px_28px_rgba(11,46,28,0.16)] dark:bg-rice-mint-light dark:text-rice-dark"
                          }`}
                        >
                          {isAssistant ? (
                            <div className="rounded-3xl rounded-tl-lg border border-rice-forest/8 bg-white/75 px-4 py-3.5 text-rice-text shadow-sm dark:border-white/8 dark:bg-white/[0.06] dark:text-white">
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
              <div className="mt-2.5 flex items-center justify-between gap-3 px-1 text-[11px] text-rice-muted dark:text-white/40">
                <span>
                  Enter เพื่อส่ง ·
                  ระบบยังไม่บันทึกจนกว่าจะยืนยัน
                </span>
                <span>
                  {draft.length.toLocaleString("th-TH")}/
                  {MAX_MESSAGE_LENGTH.toLocaleString(
                    "th-TH"
                  )}
                </span>
              </div>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="glass-card p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                    รายการล่าสุด
                  </h2>
                  <p className="mt-1 text-xs text-rice-muted dark:text-white/45">
                    เรียงจากวันที่ล่าสุด
                  </p>
                </div>
                <Link href="/finance/transactions" aria-label="ดูรายการทั้งหมด" className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rice-mint/45 text-rice-forest transition hover:bg-rice-mint/75 dark:bg-rice-leaf/15 dark:text-rice-mint-light">
                  <Clock3 className="h-5 w-5" />
                </Link>
              </div>

              {isLoadingOverview ? (
                <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-rice-muted dark:text-white/45">
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  กำลังโหลดรายการ
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-rice-forest/15 bg-rice-surface-soft/60 px-6 text-center dark:border-white/10 dark:bg-white/[0.03]">
                  <ReceiptText className="h-8 w-8 text-rice-leaf/55 dark:text-rice-mint-light/50" />
                  <p className="mt-3 text-sm font-semibold text-rice-forest dark:text-white">
                    ยังไม่มีรายการ
                  </p>
                  <p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/45">
                    ลองพิมพ์รายการแรกในช่องแชต
                    แล้วกดยืนยันบันทึก
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {transactions.map((transaction) => {
                    const isIncome =
                      transaction.transactionType ===
                      "income";
                    const CategoryIcon =
                      CATEGORY_ICONS[transaction.category] ?? ReceiptText;

                    return (
                      <article
                        key={transaction.id}
                        className="flex items-center gap-3 rounded-2xl border border-rice-forest/8 bg-white/60 p-3 transition hover:border-rice-leaf/20 hover:bg-white dark:border-white/8 dark:bg-white/[0.035] dark:hover:bg-white/[0.06]"
                      >
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                            isIncome
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200"
                              : "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200"
                          }`}
                        >
                          <CategoryIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-rice-forest dark:text-white">
                            {transaction.description}
                          </p>
                          <p className="mt-0.5 truncate text-[11px] text-rice-muted dark:text-white/40">
                            {getFinanceCategoryLabel(transaction.category)}{" "}
                            ·{" "}
                            {formatDate(
                              transaction.transactionDate
                            )}
                          </p>
                        </div>
                        <p
                          className={`shrink-0 text-sm font-bold ${
                            isIncome
                              ? "text-emerald-700 dark:text-emerald-300"
                              : "text-rose-700 dark:text-rose-300"
                          }`}
                        >
                          {isIncome ? "+" : "−"}
                          {formatBaht(
                            transaction.amount
                          )}
                        </p>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-rice-gold/25 bg-rice-gold/10 p-5 dark:border-rice-gold/15 dark:bg-rice-gold/[0.06]">
              <div className="flex gap-3">
                <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-rice-gold" />
                <div>
                  <h2 className="text-sm font-bold text-rice-forest dark:text-white">
                    พิมพ์ให้ AI เข้าใจง่าย
                  </h2>
                  <ul className="mt-2 space-y-1.5 text-xs leading-5 text-rice-muted dark:text-white/55">
                    <li>• ใส่ต้นทุนหรือรายรับและจำนวนเงิน</li>
                    <li>
                      • ระบุวันที่เมื่อไม่ใช่วันนี้
                    </li>
                    <li>
                      • พิมพ์ครั้งละหนึ่งรายการ
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-rice-forest/10 bg-rice-forest p-5 text-white shadow-lg dark:border-white/10 dark:bg-white/[0.06]">
              <div className="flex items-center gap-2 text-rice-mint-light">
                <MessageCircleMore className="h-4 w-4" />
                <span className="text-xs font-bold">
                  ขั้นตอนการทำงาน
                </span>
              </div>
              <div className="mt-4 grid grid-cols-[auto_1fr] gap-x-3 gap-y-4">
                {[
                  "พิมพ์รายการ",
                  "AI วิเคราะห์",
                  "ตรวจสอบและยืนยัน",
                  "บันทึกลงฐานข้อมูล",
                ].map((step, index) => (
                  <div
                    key={step}
                    className="contents"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-[11px] font-bold text-rice-mint-light">
                      {index + 1}
                    </span>
                    <p className="self-center text-xs text-white/75">
                      {step}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </aside>
          </div>
        )}
      </div>
    </main>
  );
}
