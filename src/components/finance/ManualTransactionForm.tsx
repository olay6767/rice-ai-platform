"use client";

import { readJsonResponse } from "@/lib/http/json";

import { Check, LoaderCircle, Plus, X } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  type FinanceCategoryOption,
  type FinanceAccount,
  INCOME_CATEGORIES,
  type FinanceCategory,
  type FinanceTransactionType,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";

function todayInBangkok(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

interface ManualTransactionFormProps {
  onSaved: (transaction: SavedFinanceTransaction) => void;
}

export default function ManualTransactionForm({ onSaved }: ManualTransactionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [transactionType, setTransactionType] = useState<FinanceTransactionType>("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<FinanceCategory>("other_expense");
  const [transactionDate, setTransactionDate] = useState(todayInBangkok);
  const [transactionTime, setTransactionTime] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [customCategories, setCustomCategories] = useState<FinanceCategoryOption[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [accountId, setAccountId] = useState("");

  useEffect(() => {
    let active = true;
    void Promise.all([
      fetch("/api/finance/categories", { cache: "no-store" }),
      fetch("/api/finance/accounts", { cache: "no-store" }),
    ])
      .then(async ([categoriesResponse, accountsResponse]) => ({
        categories: await readJsonResponse<{ data?: FinanceCategoryOption[] }>(categoriesResponse),
        accounts: await readJsonResponse<{ data?: FinanceAccount[] }>(accountsResponse),
      }))
      .then((payload) => {
        if (active) {
          setCustomCategories((payload.categories.data ?? []).filter((item) => item.isCustom && item.isEnabled));
          setAccounts((payload.accounts.data ?? []).filter((account) => account.isEnabled));
        }
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, []);

  const categories = [
    ...(transactionType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES),
    ...customCategories.filter((item) => item.transactionType === transactionType).map((item) => item.key),
  ];

  function changeType(next: FinanceTransactionType): void {
    setTransactionType(next);
    setCategory(next === "expense" ? "other_expense" : "other_income");
  }

  function close(): void {
    if (isSaving) return;
    setIsOpen(false);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const numericAmount = Number(amount);
    if (!description.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("กรุณาระบุรายละเอียดและจำนวนเงินที่มากกว่า 0 บาท");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/finance/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionType,
          category,
          amount: numericAmount,
          description: description.trim(),
          transactionDate,
          transactionTime: transactionTime || null,
          notes: notes.trim(),
          source: "manual",
          accountId: accountId || null,
          sourceText: description.trim(),
          confidence: 1,
          clientRequestId: crypto.randomUUID(),
        }),
      });
      const payload = (await response.json().catch(() => null)) as { data?: SavedFinanceTransaction; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถบันทึกรายการได้");
      onSaved(payload.data);
      setDescription("");
      setAmount("");
      setTransactionTime("");
      setNotes("");
      setIsOpen(false);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถบันทึกรายการได้");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button type="button" onClick={() => setIsOpen(true)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-rice-leaf/25 bg-rice-mint/35 px-4 text-xs font-bold text-rice-forest transition hover:bg-rice-mint/60 dark:border-rice-mint/20 dark:bg-rice-leaf/15 dark:text-rice-mint-light">
        <Plus className="h-4 w-4" />
        เพิ่มรายการเอง
      </button>
    );
  }

  return (
    <section className="mb-5 rounded-3xl border border-rice-leaf/20 bg-rice-mint/15 p-4 shadow-sm dark:border-rice-leaf/20 dark:bg-rice-leaf/[0.08] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">เพิ่มรายการเอง</h2>
          <p className="mt-1 text-xs text-rice-muted dark:text-white/50">บันทึกรายรับหรือรายจ่ายโดยไม่ต้องผ่าน AI</p>
        </div>
        <button type="button" onClick={close} aria-label="ปิดฟอร์ม" className="rounded-lg p-2 text-rice-muted hover:bg-white/70 hover:text-rice-forest dark:text-white/50 dark:hover:bg-white/[0.08] dark:hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      <form onSubmit={(event) => void handleSubmit(event)} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <fieldset className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button type="button" onClick={() => changeType("expense")} className={`h-10 flex-1 rounded-xl border text-xs font-bold ${transactionType === "expense" ? "border-rose-300 bg-rose-100 text-rose-700 dark:border-rose-400/25 dark:bg-rose-400/15 dark:text-rose-200" : "border-rice-forest/10 bg-white text-rice-muted dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50"}`}>รายจ่าย</button>
          <button type="button" onClick={() => changeType("income")} className={`h-10 flex-1 rounded-xl border text-xs font-bold ${transactionType === "income" ? "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-400/25 dark:bg-emerald-400/15 dark:text-emerald-200" : "border-rice-forest/10 bg-white text-rice-muted dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50"}`}>รายรับ</button>
        </fieldset>
        <input required maxLength={200} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="รายละเอียด เช่น กาแฟ" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        <input required min="0.01" step="0.01" type="number" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="จำนวนเงิน (บาท)" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        <select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
          {categories.map((item) => <option key={item} value={item}>{FINANCE_CATEGORY_LABELS[item as keyof typeof FINANCE_CATEGORY_LABELS] ?? customCategories.find((value) => value.key === item)?.name ?? "อื่น ๆ"}</option>)}
        </select>
        <select value={accountId} onChange={(event) => setAccountId(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white">
          <option value="">ไม่ระบุบัญชี</option>
          {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
        </select>
        <input required type="date" value={transactionDate} onChange={(event) => setTransactionDate(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        <input type="time" value={transactionTime} onChange={(event) => setTransactionTime(event.target.value)} aria-label="เวลา" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
        <input maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="หมายเหตุ (ไม่บังคับ)" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white sm:col-span-2" />
        <button type="submit" disabled={isSaving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white transition hover:bg-rice-dark disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark">
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          บันทึกรายการ
        </button>
      </form>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-200">{error}</p>}
    </section>
  );
}
