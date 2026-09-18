"use client";

import { readJsonResponse } from "@/lib/http/json";

import {
  AlertTriangle,
  BarChart3,
  Check,
  CircleDollarSign,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
  TrendingDown,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";

import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  type ExpenseCategory,
  type FinanceApiError,
  type FinanceBudgetOverview,
  type FinanceCategory,
} from "@/lib/finance/types";

interface FinanceBudgetPlannerProps {
  month: string;
  selectedCategory: FinanceCategory | "all";
}

interface BudgetResponse {
  data: FinanceBudgetOverview;
}

function formatBaht(amount: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatMonth(month: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${month}-01T00:00:00+07:00`));
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as FinanceApiError;

    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ใช้ข้อความสำรองด้านล่าง
  }

  return "ระบบงบประมาณไม่พร้อมใช้งานชั่วคราว";
}

async function requestBudgetOverview(
  month: string,
  signal?: AbortSignal
): Promise<FinanceBudgetOverview> {
  const response = await fetch(
    `/api/finance/budgets?month=${encodeURIComponent(month)}`,
    { cache: "no-store", signal }
  );

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = await readJsonResponse<BudgetResponse>(response);

  return payload.data;
}

function emptyOverview(month: string): FinanceBudgetOverview {
  return {
    month,
    totalBudget: 0,
    totalExpense: 0,
    remaining: 0,
    utilizationPercent: null,
    previousMonthExpense: 0,
    expenseChangePercent: null,
    overBudgetCount: 0,
    budgets: [],
    categories: [],
    insights: [],
  };
}

export default function FinanceBudgetPlanner({
  month,
  selectedCategory,
}: FinanceBudgetPlannerProps) {
  const [overview, setOverview] = useState<FinanceBudgetOverview>(() =>
    emptyOverview(month)
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [budgetCategory, setBudgetCategory] = useState<ExpenseCategory>(
    "fertilizer"
  );
  const [budgetAmount, setBudgetAmount] = useState("");

  const loadBudgetOverview = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await requestBudgetOverview(month);

      setOverview(data);
      setError(null);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถโหลดข้อมูลงบประมาณได้"
      );
    } finally {
      setIsLoading(false);
    }
  }, [month]);

  useEffect(() => {
    const controller = new AbortController();

    requestBudgetOverview(month, controller.signal)
      .then((data) => {
        setOverview(data);
        setError(null);
      })
      .catch((caughtError: unknown) => {
        if (
          caughtError instanceof DOMException &&
          caughtError.name === "AbortError"
        ) {
          return;
        }

        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "ไม่สามารถโหลดข้อมูลงบประมาณได้"
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [month]);

  const statuses = useMemo(() => {
    const activeStatuses = overview.categories.filter(
      (item) => item.budget > 0 || item.actual > 0
    );

    if (selectedCategory === "all") {
      return activeStatuses;
    }

    return activeStatuses.filter(
      (item) => item.category === selectedCategory
    );
  }, [overview.categories, selectedCategory]);
  const hasIncomeFilter =
    selectedCategory !== "all" &&
    !(EXPENSE_CATEGORIES as readonly string[]).includes(selectedCategory);

  async function handleSaveBudget(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault();

    const amount = Number(budgetAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("กรุณาระบุจำนวนงบประมาณที่มากกว่า 0 บาท");
      return;
    }

    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const response = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month,
          category: budgetCategory,
          amount,
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setBudgetAmount("");
      setNotice(
        `บันทึกงบ ${FINANCE_CATEGORY_LABELS[budgetCategory]} เรียบร้อยแล้ว`
      );
      await loadBudgetOverview();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถบันทึกงบประมาณได้"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteBudget(
    category: ExpenseCategory
  ): Promise<void> {
    setError(null);
    setNotice(null);
    setIsSaving(true);

    try {
      const searchParams = new URLSearchParams({ month, category });
      const response = await fetch(
        `/api/finance/budgets?${searchParams}`,
        { method: "DELETE" }
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setNotice(`ลบงบ ${FINANCE_CATEGORY_LABELS[category]} แล้ว`);
      await loadBudgetOverview();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "ไม่สามารถลบงบประมาณได้"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section
      aria-label="งบประมาณและการวิเคราะห์พฤติกรรม"
      className="glass-card mb-5 overflow-hidden"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-rice-forest/8 px-5 py-4 dark:border-white/8 sm:px-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rice-mint/45 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light">
              <CircleDollarSign className="h-4 w-4" />
            </span>
            <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
              งบประมาณและพฤติกรรมการใช้จ่าย
            </h2>
          </div>
          <p className="mt-1.5 text-xs leading-5 text-rice-muted dark:text-white/45">
            ติดตามงบรายหมวดของ {formatMonth(month)} และรับคำแนะนำจากข้อมูลที่บันทึกจริง
          </p>
        </div>
        {overview.overBudgetCount > 0 && (
          <span className="rounded-full bg-rose-100 px-3 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-400/15 dark:text-rose-200">
            เกินงบ {overview.overBudgetCount.toLocaleString("th-TH")} หมวด
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 border-b border-rose-200 bg-rose-50 px-5 py-3 text-xs font-semibold text-rose-700 dark:border-rose-400/15 dark:bg-rose-400/10 dark:text-rose-200 sm:px-6"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {notice && !error && (
        <div className="flex items-start gap-2.5 border-b border-emerald-200 bg-emerald-50 px-5 py-3 text-xs font-semibold text-emerald-700 dark:border-emerald-400/15 dark:bg-emerald-400/10 dark:text-emerald-200 sm:px-6">
          <Check className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-64 items-center justify-center gap-2 px-5 py-8 text-sm text-rice-muted dark:text-white/50">
          <LoaderCircle className="h-4 w-4 animate-spin" />
          กำลังวิเคราะห์งบประมาณ
        </div>
      ) : (
        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <BudgetSummary
              label="งบที่ตั้ง"
              value={formatBaht(overview.totalBudget)}
              tone="text-rice-forest dark:text-white"
            />
            <BudgetSummary
              label="ใช้ไป"
              value={formatBaht(overview.totalExpense)}
              helper={
                overview.expenseChangePercent === null
                  ? "ยังไม่มีข้อมูลเดือนก่อน"
                  : `${
                      overview.expenseChangePercent > 0 ? "เพิ่ม" : "ลด"
                    } ${Math.abs(
                      overview.expenseChangePercent
                    ).toLocaleString("th-TH", {
                      maximumFractionDigits: 1,
                    })}% จากเดือนก่อน`
              }
              tone="text-rose-700 dark:text-rose-300"
            />
            <BudgetSummary
              label={overview.remaining >= 0 ? "คงเหลือ" : "เกินงบรวม"}
              value={formatBaht(Math.abs(overview.remaining))}
              tone={
                overview.remaining >= 0
                  ? "text-emerald-700 dark:text-emerald-300"
                  : "text-rose-700 dark:text-rose-300"
              }
            />
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div>
              <form
                onSubmit={(event) => void handleSaveBudget(event)}
                className="rounded-2xl border border-rice-leaf/20 bg-rice-mint/15 p-4 dark:border-rice-leaf/20 dark:bg-rice-leaf/[0.07]"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />
                  <h3 className="text-sm font-bold text-rice-forest dark:text-white">
                    ตั้งหรือแก้ไขงบรายหมวด
                  </h3>
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_auto]">
                  <select
                    value={budgetCategory}
                    onChange={(event) =>
                      setBudgetCategory(
                        event.target.value as ExpenseCategory
                      )
                    }
                    className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  >
                    {EXPENSE_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {FINANCE_CATEGORY_LABELS[category]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    inputMode="decimal"
                    value={budgetAmount}
                    onChange={(event) => setBudgetAmount(event.target.value)}
                    placeholder="งบ (บาท)"
                    className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white"
                  />
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white transition hover:bg-rice-dark disabled:cursor-not-allowed disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark"
                  >
                    {isSaving ? (
                      <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    บันทึกงบ
                  </button>
                </div>
              </form>

              <div className="mt-4 space-y-3">
                {hasIncomeFilter ? (
                  <EmptyBudgetState message="ตัวกรองที่เลือกเป็นหมวดรายรับ งบประมาณจะแสดงเฉพาะหมวดรายจ่าย" />
                ) : statuses.length === 0 ? (
                  <EmptyBudgetState message="ยังไม่มีงบหรือรายจ่ายในหมวดที่เลือก เริ่มตั้งงบจากแบบฟอร์มด้านบนได้เลย" />
                ) : (
                  statuses.map((status) => {
                    const progress = Math.min(
                      100,
                      status.utilizationPercent ?? 0
                    );
                    const isOverBudget =
                      status.budget > 0 && status.actual > status.budget;

                    return (
                      <article
                        key={status.category}
                        className="rounded-2xl border border-rice-forest/8 bg-white/60 p-3.5 dark:border-white/8 dark:bg-white/[0.035]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-rice-forest dark:text-white">
                              {FINANCE_CATEGORY_LABELS[status.category]}
                            </p>
                            <p className="mt-1 text-xs text-rice-muted dark:text-white/45">
                              ใช้ไป {formatBaht(status.actual)}
                              {status.budget > 0
                                ? ` จากงบ ${formatBaht(status.budget)}`
                                : " · ยังไม่ได้ตั้งงบ"}
                            </p>
                          </div>
                          {status.budget > 0 && (
                            <button
                              type="button"
                              disabled={isSaving}
                              onClick={() =>
                                void handleDeleteBudget(status.category)
                              }
                              aria-label={`ลบงบ ${FINANCE_CATEGORY_LABELS[status.category]}`}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-rice-muted transition hover:bg-rose-50 hover:text-rose-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-white/45 dark:hover:bg-rose-400/10 dark:hover:text-rose-200"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                        {status.budget > 0 && (
                          <>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-rice-surface-soft dark:bg-white/[0.08]">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isOverBudget
                                    ? "bg-rose-500"
                                    : status.utilizationPercent !== null &&
                                        status.utilizationPercent >= 80
                                      ? "bg-amber-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.max(2, progress)}%` }}
                              />
                            </div>
                            <div className="mt-2 flex justify-between gap-3 text-[11px] font-semibold">
                              <span
                                className={
                                  isOverBudget
                                    ? "text-rose-700 dark:text-rose-300"
                                    : "text-rice-muted dark:text-white/45"
                                }
                              >
                                {status.utilizationPercent?.toLocaleString("th-TH", {
                                  maximumFractionDigits: 1,
                                }) ?? 0}% ของงบ
                              </span>
                              <span
                                className={
                                  status.remaining >= 0
                                    ? "text-emerald-700 dark:text-emerald-300"
                                    : "text-rose-700 dark:text-rose-300"
                                }
                              >
                                {status.remaining >= 0 ? "เหลือ " : "เกิน "}
                                {formatBaht(Math.abs(status.remaining))}
                              </span>
                            </div>
                          </>
                        )}
                      </article>
                    );
                  })
                )}
              </div>
            </div>

            <aside className="rounded-2xl border border-rice-gold/25 bg-rice-gold/10 p-4 dark:border-rice-gold/15 dark:bg-rice-gold/[0.06]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-amber-700 dark:text-rice-gold" />
                <h3 className="text-sm font-bold text-rice-forest dark:text-white">
                  วิเคราะห์พฤติกรรม
                </h3>
              </div>
              <div className="mt-4 space-y-3">
                {overview.insights.map((insight) => (
                  <div
                    key={insight.title}
                    className={`rounded-xl border px-3.5 py-3 ${
                      insight.tone === "warning"
                        ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
                        : insight.tone === "positive"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                          : "border-rice-forest/10 bg-white/65 text-rice-text dark:border-white/10 dark:bg-white/[0.05] dark:text-white"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {insight.tone === "warning" ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : insight.tone === "positive" ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0" />
                      ) : (
                        <TrendingDown className="mt-0.5 h-4 w-4 shrink-0" />
                      )}
                      <div>
                        <p className="text-xs font-bold">{insight.title}</p>
                        <p className="mt-1 text-[11px] leading-5 opacity-80">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      )}
    </section>
  );
}

function BudgetSummary({
  label,
  value,
  helper,
  tone,
}: {
  label: string;
  value: string;
  helper?: string;
  tone: string;
}) {
  return (
    <div className="rounded-2xl bg-rice-surface-soft/75 p-3.5 dark:bg-white/[0.04]">
      <p className="text-[11px] font-semibold text-rice-muted dark:text-white/45">
        {label}
      </p>
      <p className={`mt-1 font-heading text-lg font-bold ${tone}`}>{value}</p>
      {helper && (
        <p className="mt-1 text-[11px] text-rice-muted dark:text-white/40">
          {helper}
        </p>
      )}
    </div>
  );
}

function EmptyBudgetState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-rice-forest/15 bg-rice-surface-soft/60 px-4 py-7 text-center text-xs leading-5 text-rice-muted dark:border-white/10 dark:bg-white/[0.03] dark:text-white/45">
      {message}
    </div>
  );
}
