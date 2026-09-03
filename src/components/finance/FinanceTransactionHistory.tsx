"use client";

import Link from "next/link";
import { ArrowLeft, Download, LoaderCircle, Pencil, Search, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  EXPENSE_CATEGORIES,
  getFinanceCategoryLabel,
  INCOME_CATEGORIES,
  type FinanceCategory,
  type FinanceTransactionType,
  type SavedFinanceTransaction,
} from "@/lib/finance/types";

interface HistoryResponse {
  data: { transactions: SavedFinanceTransaction[] };
}

function formatBaht(value: number): string {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB", maximumFractionDigits: 2 }).format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", year: "2-digit" }).format(new Date(`${value}T00:00:00+07:00`));
}

function monthStart(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit" }).format(new Date()) + "-01";
}

function today(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export default function FinanceTransactionHistory() {
  const [from, setFrom] = useState(monthStart);
  const [to, setTo] = useState(today);
  const [type, setType] = useState<"all" | FinanceTransactionType>("all");
  const [search, setSearch] = useState("");
  const [transactions, setTransactions] = useState<SavedFinanceTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<SavedFinanceTransaction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ from, to, ...(type === "all" ? {} : { type }), ...(search.trim() ? { search: search.trim() } : {}) });
      const response = await fetch(`/api/finance/transactions/list?${query}`, { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as HistoryResponse & { error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถโหลดรายการได้");
      setTransactions(payload.data.transactions);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถโหลดรายการได้");
    } finally { setIsLoading(false); }
  }, [from, search, to, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const groups = useMemo(() => {
    const grouped = new Map<string, SavedFinanceTransaction[]>();
    for (const item of transactions) grouped.set(item.transactionDate, [...(grouped.get(item.transactionDate) ?? []), item]);
    return Array.from(grouped.entries());
  }, [transactions]);

  function submitSearch(event: FormEvent<HTMLFormElement>): void { event.preventDefault(); void load(); }

  async function deleteTransaction(item: SavedFinanceTransaction): Promise<void> {
    if (!window.confirm(`ต้องการลบรายการ “${item.description}” หรือไม่?\nยอดรวม งบ และการวิเคราะห์จะอัปเดตทันที`)) return;
    setIsSaving(true);
    try {
      const response = await fetch(`/api/finance/transactions/${item.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("ไม่สามารถลบรายการได้");
      setTransactions((current) => current.filter((transaction) => transaction.id !== item.id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถลบรายการได้");
    } finally { setIsSaving(false); }
  }

  function exportCsv(): void {
    const query = new URLSearchParams({ from, to });
    window.location.assign(`/api/finance/transactions/export?${query}`);
  }

  return (
    <main className="relative isolate py-8 sm:py-12">
      <div className="dashboard-container relative z-10">
        <Link href="/finance/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-rice-leaf hover:text-rice-forest dark:text-rice-mint-light dark:hover:text-white"><ArrowLeft className="h-4 w-4" />กลับ Dashboard การเงิน</Link>
        <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div><h1 className="font-heading text-3xl font-bold text-rice-forest dark:text-white">รายการย้อนหลัง</h1><p className="mt-2 text-sm text-rice-muted dark:text-white/55">ค้นหา แก้ไข หรือลบรายการได้ทุกเวลา</p></div>
          <button type="button" onClick={exportCsv} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"><Download className="h-4 w-4" />ส่งออก CSV</button>
        </header>

        <form onSubmit={submitSearch} className="glass-card mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[170px_170px_160px_minmax(0,1fr)_auto] sm:p-5">
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} aria-label="ตั้งแต่วันที่" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} aria-label="ถึงวันที่" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
          <select value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="all">ทั้งหมด</option><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select>
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-muted" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาชื่อ หมวด หรือจำนวนเงิน" className="h-10 w-full rounded-xl border border-rice-forest/12 bg-white py-2 pl-9 pr-3 text-sm text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /></div>
          <button type="submit" className="h-10 rounded-xl border border-rice-forest/12 px-4 text-xs font-bold text-rice-forest hover:bg-rice-surface-soft dark:border-white/10 dark:text-white">ค้นหา</button>
        </form>

        {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
        <section className="mt-5 space-y-5">
          {isLoading ? <div className="glass-card flex min-h-56 items-center justify-center gap-2 text-sm text-rice-muted dark:text-white/55"><LoaderCircle className="h-4 w-4 animate-spin" />กำลังโหลดรายการ</div> : groups.length === 0 ? <div className="glass-card px-5 py-12 text-center text-sm text-rice-muted dark:text-white/55">ไม่พบรายการในช่วงเวลานี้</div> : groups.map(([date, items]) => {
            const dailyTotal = items.reduce((total, item) => total + (item.transactionType === "income" ? item.amount : -item.amount), 0);
            return <section key={date} className="glass-card overflow-hidden"><div className="flex items-center justify-between border-b border-rice-forest/8 px-4 py-3.5 dark:border-white/8 sm:px-5"><h2 className="font-bold text-rice-forest dark:text-white">{formatDate(date)}</h2><span className={`text-sm font-bold ${dailyTotal >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>รวม {dailyTotal >= 0 ? "+" : "−"}{formatBaht(Math.abs(dailyTotal))}</span></div><div className="divide-y divide-rice-forest/8 dark:divide-white/8">{items.map((item) => <TransactionRow key={item.id} item={item} onEdit={setEditing} onDelete={(current) => void deleteTransaction(current)} disabled={isSaving} />)}</div></section>;
          })}
        </section>
      </div>
      {editing && <TransactionEditor item={editing} onClose={() => setEditing(null)} onSaved={(updated) => { setTransactions((items) => items.map((item) => item.id === updated.id ? updated : item)); setEditing(null); }} />}
    </main>
  );
}

function TransactionRow({ item, onEdit, onDelete, disabled }: { item: SavedFinanceTransaction; onEdit: (item: SavedFinanceTransaction) => void; onDelete: (item: SavedFinanceTransaction) => void; disabled: boolean }) {
  const income = item.transactionType === "income";
  return <article className="flex items-center gap-3 px-4 py-3.5 sm:px-5"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${income ? "bg-emerald-500" : "bg-rose-400"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-rice-forest dark:text-white">{item.description}</p><p className="mt-0.5 text-xs text-rice-muted dark:text-white/45">{item.categoryLabel ?? getFinanceCategoryLabel(item.category)}{item.transactionTime ? ` · ${item.transactionTime.slice(0, 5)}` : ""}{item.notes ? " · มีหมายเหตุ" : ""}</p></div><p className={`shrink-0 text-sm font-bold ${income ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>{income ? "+" : "−"}{formatBaht(item.amount)}</p><button type="button" onClick={() => onEdit(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rice-surface-soft hover:text-rice-forest dark:text-white/45 dark:hover:bg-white/[0.07] dark:hover:text-white" aria-label={`แก้ไข ${item.description}`}><Pencil className="h-4 w-4" /></button><button type="button" disabled={disabled} onClick={() => onDelete(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40 dark:text-white/45 dark:hover:bg-rose-400/10 dark:hover:text-rose-200" aria-label={`ลบ ${item.description}`}><Trash2 className="h-4 w-4" /></button></article>;
}

function TransactionEditor({ item, onClose, onSaved }: { item: SavedFinanceTransaction; onClose: () => void; onSaved: (item: SavedFinanceTransaction) => void }) {
  const [transactionType, setTransactionType] = useState<FinanceTransactionType>(item.transactionType);
  const [category, setCategory] = useState<FinanceCategory>(item.category);
  const [description, setDescription] = useState(item.description);
  const [amount, setAmount] = useState(String(item.amount));
  const [date, setDate] = useState(item.transactionDate);
  const [time, setTime] = useState(item.transactionTime?.slice(0, 5) ?? "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const categories = transactionType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const selectableCategories = categories.includes(category as never) ? categories : [category, ...categories];

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      const response = await fetch(`/api/finance/transactions/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionType, category, description, amount: Number(amount), transactionDate: date, transactionTime: time || null, notes }) });
      const payload = (await response.json().catch(() => null)) as { data?: SavedFinanceTransaction; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถแก้ไขรายการได้");
      onSaved(payload.data);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถแก้ไขรายการได้"); } finally { setSaving(false); }
  }

  return <div className="fixed inset-0 z-[80] flex items-end bg-rice-dark/50 p-3 backdrop-blur-sm sm:items-center sm:justify-center" role="dialog" aria-modal="true" aria-label="แก้ไขรายการ"><form onSubmit={(event) => void submit(event)} className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl dark:bg-[#102417] sm:p-6"><div className="flex items-center justify-between"><h2 className="font-heading text-xl font-bold text-rice-forest dark:text-white">แก้ไขรายการ</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-rice-muted dark:text-white/55"><X className="h-4 w-4" /></button></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><select value={transactionType} onChange={(event) => { const next = event.target.value as FinanceTransactionType; setTransactionType(next); setCategory(next === "income" ? "other_income" : "other_expense"); }} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select><select value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white">{selectableCategories.map((key) => <option key={key} value={key}>{getFinanceCategoryLabel(key)}</option>)}</select><input required value={description} onChange={(event) => setDescription(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><input required type="number" min="0.01" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><input required type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><input value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="หมายเหตุ" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white sm:col-span-2" /></div>{error && <p className="mt-3 text-xs font-bold text-rose-700 dark:text-rose-200">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="h-10 rounded-xl px-4 text-xs font-bold text-rice-muted dark:text-white/55">ยกเลิก</button><button disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark">{saving && <LoaderCircle className="h-4 w-4 animate-spin" />}บันทึกการแก้ไข</button></div></form></div>;
}
