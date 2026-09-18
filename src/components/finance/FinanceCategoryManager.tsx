"use client";

import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import {
  getFinanceCategoryLabel,
  type FinanceCategoryOption,
  type FinanceTransactionType,
} from "@/lib/finance/types";

interface CategoriesResponse { data: FinanceCategoryOption[] }

export default function FinanceCategoryManager() {
  const [categories, setCategories] = useState<FinanceCategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [type, setType] = useState<FinanceTransactionType>("expense");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch("/api/finance/categories", { cache: "no-store" });
      const payload = (await response.json().catch(() => null)) as CategoriesResponse & { error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถโหลดหมวดได้");
      setCategories(payload.data);
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถโหลดหมวดได้"); } finally { setLoading(false); }
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const groups = useMemo(() => ({ expense: categories.filter((item) => item.transactionType === "expense"), income: categories.filter((item) => item.transactionType === "income") }), [categories]);

  async function add(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault(); if (!name.trim()) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/finance/categories", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), transactionType: type, icon: "receipt" }) });
      const payload = (await response.json().catch(() => null)) as { data?: FinanceCategoryOption; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถเพิ่มหมวดได้");
      setCategories((current) => [...current, payload.data!]); setName("");
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถเพิ่มหมวดได้"); } finally { setSaving(false); }
  }

  async function update(item: FinanceCategoryOption, isEnabled: boolean): Promise<void> {
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/finance/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, categoryKey: item.key, isEnabled }) });
      const payload = (await response.json().catch(() => null)) as { data?: FinanceCategoryOption; error?: { message?: string } } | null;
      if (!response.ok || !payload?.data) throw new Error(payload?.error?.message ?? "ไม่สามารถปรับหมวดได้");
      setCategories((current) => current.map((category) => category.key === item.key ? payload.data! : category));
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถปรับหมวดได้"); } finally { setSaving(false); }
  }

  async function remove(item: FinanceCategoryOption): Promise<void> {
    if (!item.id || !window.confirm(`ต้องการลบหมวด “${item.name}” หรือไม่?`)) return;
    setSaving(true); setError(null);
    try { const response = await fetch(`/api/finance/categories?id=${item.id}`, { method: "DELETE" }); if (!response.ok) throw new Error("ไม่สามารถลบหมวดได้"); setCategories((current) => current.filter((category) => category.id !== item.id)); }
    catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถลบหมวดได้"); } finally { setSaving(false); }
  }

  async function rename(item: FinanceCategoryOption): Promise<void> {
    const name = window.prompt("ชื่อหมวดใหม่", item.name);
    if (!name?.trim() || name.trim() === item.name) return;
    setSaving(true); setError(null);
    try {
      const response = await fetch("/api/finance/categories", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: item.id, categoryKey: item.key, name: name.trim() }) });
      const payload = await response.json().catch(() => null) as { data?: FinanceCategoryOption } | null;
      if (!response.ok || !payload?.data) throw new Error("ไม่สามารถแก้ชื่อหมวดได้");
      setCategories((current) => current.map((category) => category.key === item.key ? payload.data! : category));
    } catch (caughtError) { setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถแก้ชื่อหมวดได้"); } finally { setSaving(false); }
  }

  return <main className="py-8 sm:py-12"><div className="dashboard-container"><Link href="/finance/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-rice-leaf hover:text-rice-forest dark:text-rice-mint-light dark:hover:text-white"><ArrowLeft className="h-4 w-4" />กลับ Dashboard การเงิน</Link><header className="mt-4"><h1 className="font-heading text-3xl font-bold text-rice-forest dark:text-white">หมวดและงบประมาณ</h1><p className="mt-2 text-sm text-rice-muted dark:text-white/55">เพิ่มหมวดเฉพาะตัว เปิดหรือปิดการใช้ และตั้งงบในหน้า Dashboard</p></header><section className="glass-card mt-6 p-4 sm:p-5"><form onSubmit={(event) => void add(event)} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto]"><input value={name} onChange={(event) => setName(event.target.value)} maxLength={80} placeholder="ชื่อหมวดใหม่ เช่น ค่าอาหารสัตว์" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white" /><select value={type} onChange={(event) => setType(event.target.value as FinanceTransactionType)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="expense">หมวดรายจ่าย</option><option value="income">หมวดรายรับ</option></select><button disabled={saving} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-rice-forest px-4 text-xs font-bold text-white disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}เพิ่มหมวด</button></form></section>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}{loading ? <div className="mt-5 flex min-h-48 items-center justify-center gap-2 text-sm text-rice-muted dark:text-white/55"><LoaderCircle className="h-4 w-4 animate-spin" />กำลังโหลดหมวด</div> : <div className="mt-5 grid gap-5 lg:grid-cols-2"><CategoryGroup title="หมวดรายจ่าย" items={groups.expense} saving={saving} onUpdate={update} onRemove={remove} onRename={rename} /><CategoryGroup title="หมวดรายรับ" items={groups.income} saving={saving} onUpdate={update} onRemove={remove} onRename={rename} /></div>}</div></main>;
}

function CategoryGroup({ title, items, saving, onUpdate, onRemove, onRename }: { title: string; items: FinanceCategoryOption[]; saving: boolean; onUpdate: (item: FinanceCategoryOption, enabled: boolean) => void; onRemove: (item: FinanceCategoryOption) => void; onRename: (item: FinanceCategoryOption) => void }) {
  return <section className="glass-card overflow-hidden"><h2 className="border-b border-rice-forest/8 px-5 py-4 font-heading text-base font-bold text-rice-forest dark:border-white/8 dark:text-white">{title}</h2><div className="divide-y divide-rice-forest/8 dark:divide-white/8">{items.map((item) => <article key={item.key} className="flex items-center gap-3 px-5 py-3"><span className={`h-2.5 w-2.5 rounded-full ${item.isEnabled ? "bg-emerald-500" : "bg-slate-300"}`} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-rice-forest dark:text-white">{item.name || getFinanceCategoryLabel(item.key)}</p><p className="mt-0.5 text-[11px] text-rice-muted dark:text-white/45">{item.isCustom ? "หมวดที่กำหนดเอง" : "หมวดมาตรฐาน"} · {item.isEnabled ? "เปิดใช้งาน" : "ปิดใช้งาน"}</p></div><button type="button" disabled={saving} onClick={() => void onRename(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rice-surface-soft dark:text-white/45 dark:hover:bg-white/[0.07]" aria-label="แก้ชื่อหมวด"><Pencil className="h-4 w-4" /></button><button type="button" disabled={saving} onClick={() => void onUpdate(item, !item.isEnabled)} className="rounded-lg p-2 text-rice-muted hover:bg-rice-surface-soft dark:text-white/45 dark:hover:bg-white/[0.07]" aria-label={item.isEnabled ? "ปิดหมวด" : "เปิดหมวด"}>{item.isEnabled ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}</button>{item.isCustom && <button type="button" disabled={saving} onClick={() => void onRemove(item)} className="rounded-lg p-2 text-rice-muted hover:bg-rose-50 hover:text-rose-700 dark:text-white/45 dark:hover:bg-rose-400/10 dark:hover:text-rose-200" aria-label="ลบหมวด"><Trash2 className="h-4 w-4" /></button>}</article>)}</div></section>;
}
