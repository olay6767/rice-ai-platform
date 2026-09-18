"use client";

import { readJsonResponse } from "@/lib/http/json";

import { Check, ChevronRight, LoaderCircle, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";

import {
  EXPENSE_CATEGORIES,
  FINANCE_CATEGORY_LABELS,
  INCOME_CATEGORIES,
  type FinanceCategoryOption,
  type FinanceTransactionType,
} from "@/lib/finance/types";

const DEFAULT_SELECTION = ["food", "coffee", "transport", "utilities_electricity", "salary", "side_income"];

interface FinanceOnboardingProps {
  /** Opens the familiar setup dialog again for users who already finished it. */
  open?: boolean;
  onClose?: () => void;
}

export default function FinanceOnboarding({
  open,
  onClose,
}: FinanceOnboardingProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [selected, setSelected] = useState<string[]>(DEFAULT_SELECTION);
  const [customName, setCustomName] = useState("");
  const [customType, setCustomType] = useState<FinanceTransactionType>("expense");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = open === true;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const settingsResponse = await fetch("/api/finance/settings", {
          cache: "no-store",
        });

        if (!settingsResponse.ok) throw new Error();

        const settings = await readJsonResponse<{
          data: { onboardingCompleted: boolean };
        }>(settingsResponse);

        if (!active) return;

        if (open !== true) {
          setIsVisible(!settings.data.onboardingCompleted);
          return;
        }

        const categoriesResponse = await fetch("/api/finance/categories", {
          cache: "no-store",
        });
        const categoriesPayload = await readJsonResponse<{
          data?: FinanceCategoryOption[];
          error?: { message?: string };
        }>(categoriesResponse);

        if (!categoriesResponse.ok || !categoriesPayload.data) {
          throw new Error(
            categoriesPayload.error?.message ?? "ไม่สามารถโหลดหมวดที่ตั้งไว้ได้"
          );
        }

        if (!active) return;

        setSelected(
          categoriesPayload.data
            .filter((category) => !category.isCustom && category.isEnabled && category.id)
            .map((category) => category.key)
        );
        setCustomName("");
        setError(null);
        setIsVisible(true);
      } catch (caughtError) {
        if (active && open === true) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "ไม่สามารถโหลดการตั้งค่าหมวดได้"
          );
          setIsVisible(true);
        }
        // The existing finance functions remain usable until the migration is installed.
      }
    })();
    return () => { active = false; };
  }, [open]);

  function toggle(key: string): void {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function complete(skip = false): Promise<void> {
    setIsSaving(true);
    setError(null);
    try {
      if (!skip && customName.trim()) {
        const customResponse = await fetch("/api/finance/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: customName.trim(), transactionType: customType, icon: "receipt" }),
        });
        if (!customResponse.ok) throw new Error("ไม่สามารถเพิ่มหมวดที่กำหนดเองได้");
      }
      const response = await fetch("/api/finance/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ onboardingCompleted: true, selectedCategoryKeys: skip ? [] : selected }),
      });
      const payload = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      if (!response.ok) throw new Error(payload?.error?.message ?? "ไม่สามารถบันทึกการตั้งค่าได้");
      setIsVisible(false);
      onClose?.();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "ไม่สามารถบันทึกการตั้งค่าได้");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end bg-rice-dark/55 p-3 backdrop-blur-sm sm:items-center sm:justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={isEditing ? "แก้ไขหมวดการเงิน" : "ตั้งค่าการเงินเริ่มต้น"}>
      <section className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/40 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#102417] sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/25 dark:text-rice-mint-light"><Sparkles className="h-5 w-5" /></span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rice-leaf dark:text-rice-mint-light">{isEditing ? "ปรับการตั้งค่า" : "เริ่มต้นใช้งาน"}</p>
            <h2 className="mt-1 font-heading text-2xl font-bold text-rice-forest dark:text-white">{isEditing ? "แก้ไขหมวดที่ใช้บ่อยของคุณ" : "ตั้งหมวดที่ใช้บ่อยของคุณ"}</h2>
            <p className="mt-2 text-sm leading-6 text-rice-muted dark:text-white/55">เลือกได้หลายหมวด เพิ่มหมวดเอง หรือยกเลิกหมวดที่ไม่ต้องการ แล้วกดบันทึกได้ทันที</p>
          </div>
          {isEditing && (
            <button type="button" onClick={onClose} aria-label="ปิดหน้าต่าง" className="ml-auto rounded-xl p-2 text-rice-muted hover:bg-rice-surface-soft dark:text-white/55 dark:hover:bg-white/[0.07]"><X className="h-4 w-4" /></button>
          )}
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <CategoryChoices title="หมวดรายจ่าย" keys={EXPENSE_CATEGORIES} selected={selected} onToggle={toggle} />
          <CategoryChoices title="หมวดรายรับ" keys={INCOME_CATEGORIES} selected={selected} onToggle={toggle} />
        </div>

        <div className="mt-5 rounded-2xl border border-rice-forest/10 bg-rice-surface-soft/70 p-3.5 dark:border-white/10 dark:bg-white/[0.04]">
          <p className="text-sm font-bold text-rice-forest dark:text-white">เพิ่มหมวดเอง</p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_150px]">
            <input value={customName} onChange={(event) => setCustomName(event.target.value)} maxLength={80} placeholder="เช่น ค่าเก็บเกี่ยว หรือ ค่าเกม" className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm text-rice-text outline-none focus:border-rice-leaf/50 dark:border-white/10 dark:bg-white/[0.06] dark:text-white" />
            <select value={customType} onChange={(event) => setCustomType(event.target.value as FinanceTransactionType)} className="h-10 rounded-xl border border-rice-forest/12 bg-white px-3 text-sm font-semibold text-rice-text outline-none dark:border-white/10 dark:bg-white/[0.06] dark:text-white"><option value="expense">รายจ่าย</option><option value="income">รายรับ</option></select>
          </div>
        </div>

        {error && <p role="alert" className="mt-3 text-xs font-semibold text-rose-700 dark:text-rose-200">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={isSaving} onClick={() => isEditing ? onClose?.() : void complete(true)} className="h-11 rounded-xl px-4 text-xs font-bold text-rice-muted hover:bg-rice-surface-soft dark:text-white/55 dark:hover:bg-white/[0.06]">{isEditing ? "ยกเลิก" : "ข้ามการตั้งค่า"}</button>
          <button type="button" disabled={isSaving} onClick={() => void complete()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rice-forest px-5 text-xs font-bold text-white hover:bg-rice-dark disabled:opacity-50 dark:bg-rice-mint-light dark:text-rice-dark">
            {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" />{isEditing ? "บันทึกการแก้ไข" : "เริ่มใช้งาน"}<ChevronRight className="h-4 w-4" /></>}
          </button>
        </div>
      </section>
    </div>
  );
}

function CategoryChoices({ title, keys, selected, onToggle }: { title: string; keys: readonly string[]; selected: string[]; onToggle: (key: string) => void }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-rice-forest dark:text-white">{title}</h3>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {keys.map((key) => {
          const isSelected = selected.includes(key);
          return <button key={key} type="button" onClick={() => onToggle(key)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${isSelected ? "border-rice-leaf/40 bg-rice-mint/55 text-rice-forest dark:border-rice-mint/25 dark:bg-rice-leaf/25 dark:text-rice-mint-light" : "border-rice-forest/10 bg-white text-rice-muted hover:border-rice-leaf/25 dark:border-white/10 dark:bg-white/[0.04] dark:text-white/55"}`}>{isSelected && <Check className="mr-1 inline h-3 w-3" />}{FINANCE_CATEGORY_LABELS[key as keyof typeof FINANCE_CATEGORY_LABELS]}</button>;
        })}
      </div>
    </div>
  );
}
