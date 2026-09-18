"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Plus, Repeat2, Trash2, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  getFinanceCategoryLabel,
  INCOME_CATEGORIES,
  type FinanceAccount,
  type FinanceCategory,
  type FinanceRecurringTransaction,
  type FinanceTransactionType,
} from "@/lib/finance/types";

function readError(payload: unknown, fallback: string): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const error = payload.error;
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") return error.message;
  }
  return fallback;
}

export default function FinanceAutomationManager() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [recurring, setRecurring] = useState<FinanceRecurringTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<FinanceAccount["accountType"]>("cash");
  const [recurringType, setRecurringType] = useState<FinanceTransactionType>("expense");
  const [recurringCategory, setRecurringCategory] = useState<FinanceCategory>("subscription");
  const [recurringDescription, setRecurringDescription] = useState("");
  const [recurringAmount, setRecurringAmount] = useState("");
  const [recurringDay, setRecurringDay] = useState("1");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [accountsResponse, recurringResponse] = await Promise.all([fetch("/api/finance/accounts", { cache: "no-store" }), fetch("/api/finance/recurring", { cache: "no-store" })]);
      const accountsPayload = await accountsResponse.json().catch(() => null) as { data?: FinanceAccount[] } | null;
      const recurringPayload = await recurringResponse.json().catch(() => null) as { data?: FinanceRecurringTransaction[] } | null;
      if (!accountsResponse.ok || !accountsPayload?.data) throw new Error(readError(accountsPayload, "ไม่สามารถโหลดบัญชีได้"));
      if (!recurringResponse.ok || !recurringPayload?.data) throw new Error(readError(recurringPayload, "ไม่สามารถโหลดรายการประจำได้"));
      setAccounts(accountsPayload.data); setRecurring(recurringPayload.data);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถโหลดข้อมูลได้"); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function addAccount(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!accountName.trim()) return;
    setSaving(true); setError(null);
    try { const response = await fetch("/api/finance/accounts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: accountName.trim(), accountType }) }); const payload = await response.json().catch(() => null) as { data?: FinanceAccount } | null; if (!response.ok || !payload?.data) throw new Error(readError(payload, "ไม่สามารถเพิ่มบัญชีได้")); setAccounts((current) => [...current, payload.data!]); setAccountName(""); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถเพิ่มบัญชีได้"); } finally { setSaving(false); }
  }

  async function addRecurring(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); const amount = Number(recurringAmount); const day = Number(recurringDay); if (!recurringDescription.trim() || !Number.isFinite(amount) || amount <= 0) return;
    setSaving(true); setError(null);
    try { const response = await fetch("/api/finance/recurring", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionType: recurringType, category: recurringCategory, description: recurringDescription.trim(), amount, dayOfMonth: day }) }); const payload = await response.json().catch(() => null) as { data?: FinanceRecurringTransaction } | null; if (!response.ok || !payload?.data) throw new Error(readError(payload, "ไม่สามารถเพิ่มรายการประจำได้")); setRecurring((current) => [...current, payload.data!]); setRecurringDescription(""); setRecurringAmount(""); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถเพิ่มรายการประจำได้"); } finally { setSaving(false); }
  }

  async function toggleRecurring(item: FinanceRecurringTransaction): Promise<void> {
    setSaving(true); setError(null);
    try { const response = await fetch("/api/finance/recurring", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, isEnabled: !item.isEnabled }) }); const payload = await response.json().catch(() => null) as { data?: FinanceRecurringTransaction } | null; if (!response.ok || !payload?.data) throw new Error(readError(payload, "ไม่สามารถแก้ไขรายการประจำได้")); setRecurring((current) => current.map((value) => value.id === item.id ? payload.data! : value)); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถแก้ไขรายการประจำได้"); } finally { setSaving(false); }
  }

  async function deleteRecurring(item: FinanceRecurringTransaction): Promise<void> {
    if (!window.confirm(`ต้องการลบรายการประจำ “${item.description}” หรือไม่?`)) return;
    setSaving(true); setError(null);
    try { const response = await fetch(`/api/finance/recurring?id=${item.id}`, { method: "DELETE" }); if (!response.ok) throw new Error("ไม่สามารถลบรายการประจำได้"); setRecurring((current) => current.filter((value) => value.id !== item.id)); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถลบรายการประจำได้"); } finally { setSaving(false); }
  }

  function switchRecurringType(next: FinanceTransactionType): void { setRecurringType(next); setRecurringCategory(next === "expense" ? "subscription" : "salary"); }
  const categories = recurringType === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  return <main className="py-8 sm:py-12"><div className="dashboard-container"><Link href="/finance/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-rice-leaf hover:text-rice-forest dark:text-rice-mint-light dark:hover:text-white"><ArrowLeft className="h-4 w-4" />กลับ Dashboard การเงิน</Link><header className="mt-4"><h1 className="font-heading text-3xl font-bold text-rice-forest dark:text-white">บัญชีและรายการประจำ</h1><p className="mt-2 text-sm text-rice-muted dark:text-white/55">แยกแหล่งเงิน และให้รายการประจำถูกบันทึกตามวันที่กำหนดเมื่อคุณเปิดระบบ</p></header>{error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}{loading ? <div className="mt-6 flex min-h-56 items-center justify-center gap-2 text-sm text-rice-muted dark:text-white/55"><LoaderCircle className="h-4 w-4 animate-spin" />กำลังโหลดข้อมูล</div> : <div className="mt-6 grid gap-5 xl:grid-cols-2"><section className="glass-card p-5"><div className="flex items-center gap-2"><WalletCards className="h-5 w-5 text-rice-leaf dark:text-rice-mint-light" /><h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">หลายบัญชี</h2></div><form onSubmit={(event) => void addAccount(event)} className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_auto]"><input value={accountName} onChange={(event) => setAccountName(event.target.value)} placeholder="เช่น เงินสด หรือ บัญชีส่วนตัว" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><select value={accountType} onChange={(event) => setAccountType(event.target.value as FinanceAccount["accountType"])} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="cash">เงินสด</option><option value="personal">ส่วนตัว</option><option value="business">ธุรกิจ</option><option value="family">ครอบครัว</option><option value="other">อื่น ๆ</option></select><button disabled={saving} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rice-forest px-3 text-xs font-bold text-white disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark"><Plus className="h-4 w-4" />เพิ่ม</button></form><div className="mt-4 space-y-2">{accounts.length === 0 ? <p className="rounded-xl bg-rice-surface-soft/70 px-3 py-4 text-center text-xs text-rice-muted dark:bg-white/[0.04] dark:text-white/50">ยังไม่มีบัญชี</p> : accounts.map((account) => <div key={account.id} className="flex items-center justify-between rounded-xl border border-rice-forest/8 px-3 py-2.5 dark:border-white/8"><span><b className="text-sm text-rice-forest dark:text-white">{account.name}</b><span className="ml-2 text-xs text-rice-muted dark:text-white/45">{account.accountType}</span></span><span className={`text-xs font-bold ${account.isEnabled ? "text-emerald-700 dark:text-emerald-300" : "text-rice-muted dark:text-white/45"}`}>{account.isEnabled ? "ใช้งาน" : "ปิด"}</span></div>)}</div></section><section className="glass-card p-5"><div className="flex items-center gap-2"><Repeat2 className="h-5 w-5 text-rice-leaf dark:text-rice-mint-light" /><h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">รายการประจำ</h2></div><form onSubmit={(event) => void addRecurring(event)} className="mt-4 grid gap-2 sm:grid-cols-2"><select value={recurringType} onChange={(event) => switchRecurringType(event.target.value as FinanceTransactionType)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select><select value={recurringCategory} onChange={(event) => setRecurringCategory(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white">{categories.map((category) => <option key={category} value={category}>{FINANCE_CATEGORY_LABELS[category]}</option>)}</select><input required value={recurringDescription} onChange={(event) => setRecurringDescription(event.target.value)} placeholder="เช่น Netflix" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><input required type="number" min="0.01" step="0.01" value={recurringAmount} onChange={(event) => setRecurringAmount(event.target.value)} placeholder="จำนวนเงิน" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><select value={recurringDay} onChange={(event) => setRecurringDay(event.target.value)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/[0.06] dark:text-white">{Array.from({ length: 28 }, (_, index) => <option key={index + 1} value={index + 1}>ทุกวันที่ {index + 1}</option>)}</select><button disabled={saving} className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-rice-forest px-3 text-xs font-bold text-white disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark"><Plus className="h-4 w-4" />เพิ่ม</button></form><div className="mt-4 space-y-2">{recurring.length === 0 ? <p className="rounded-xl bg-rice-surface-soft/70 px-3 py-4 text-center text-xs text-rice-muted dark:bg-white/[0.04] dark:text-white/50">ยังไม่มีรายการประจำ</p> : recurring.map((item) => <div key={item.id} className="flex items-center gap-2 rounded-xl border border-rice-forest/8 px-3 py-2.5 dark:border-white/8"><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-rice-forest dark:text-white">{item.description} · {item.amount.toLocaleString("th-TH")} บาท</p><p className="mt-0.5 text-xs text-rice-muted dark:text-white/45">{getFinanceCategoryLabel(item.category)} · ทุกวันที่ {item.dayOfMonth}</p></div><button disabled={saving} type="button" onClick={() => void toggleRecurring(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rice-surface-soft dark:text-white/45 dark:hover:bg-white/[0.07]">{item.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button><button disabled={saving} type="button" onClick={() => void deleteRecurring(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rose-50 hover:text-rose-700 dark:text-white/45 dark:hover:bg-rose-400/10 dark:hover:text-rose-200"><Trash2 className="h-4 w-4" /></button></div>)}</div></section></div>}</div></main>;
}
