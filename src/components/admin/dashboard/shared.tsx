"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import type { DashboardRow, DatasetColumn, VersionStatus } from "@/lib/admin/dashboard-types";

export const API = "/api/admin/dashboard";
export const panel = "min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-6";
export const input = "min-h-12 w-full min-w-0 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-background)] px-3.5 py-2.5 text-base text-[var(--app-text)] outline-none focus:border-rice-leaf focus:ring-2 focus:ring-rice-mint/30 disabled:opacity-60 sm:text-sm";
// Share geometry, not colors: conflicting dark:text-* utilities hid primary labels.
const buttonBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice-leaf disabled:cursor-not-allowed disabled:opacity-60 [&_svg]:shrink-0";
export const button = buttonBase + " border-[var(--app-border-strong)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] enabled:hover:bg-[var(--app-surface-soft)]";
export const primary = buttonBase + " border-transparent bg-rice-forest text-white enabled:hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark dark:enabled:hover:bg-rice-mint";
export const muted = "text-sm leading-6 text-[var(--app-text-secondary)]";

export async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, cache: "no-store" });
  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.data === undefined) throw new Error(payload?.error?.message ?? "ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่");
  return payload.data as T;
}
export function errorText(error: unknown) { return error instanceof Error ? error.message : "เกิดข้อผิดพลาด กรุณาลองใหม่"; }
export function date(value: string | null) { return value ? new Date(value).toLocaleString("th-TH", {dateStyle:"medium",timeStyle:"short"}) : "ยังไม่เผยแพร่"; }
export function Notice({children, error = false}: {children: ReactNode; error?: boolean}) {
  return <div role={error ? "alert" : "status"} className={`rounded-xl border p-3 text-sm leading-6 ${error ? "border-rose-300/40 bg-rose-100/40 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200" : "border-rice-leaf/25 bg-rice-mint/20 text-rice-forest dark:text-rice-mint-light"}`}>{children}</div>;
}
export function StatusBadge({status, isDefault = false}: {status: VersionStatus; isDefault?: boolean}) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status === "published" ? "bg-rice-mint/50 text-rice-forest dark:text-rice-mint-light dark:bg-rice-leaf/20" : status === "draft" ? "bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" : "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60"}`}>{status === "draft" ? "ฉบับร่าง" : status === "archived" ? "เก็บในคลัง" : "เผยแพร่แล้ว"}{isDefault ? " · ค่าเริ่มต้น" : ""}</span>;
}
export function Field({label,children}: {label: string;children: ReactNode}) {
  return <label className="grid min-w-0 gap-1.5 text-sm font-semibold">{label}{children}</label>;
}
export function DataTable({rows,columns,provinces,renderActions}: {rows: DashboardRow[];columns: readonly DatasetColumn[];provinces?: Map<number,string>;renderActions?:(row:DashboardRow)=>ReactNode}) {
  if (!rows.length) return <p className="py-8 text-center text-sm text-rice-muted">ไม่พบข้อมูลในเงื่อนไขนี้</p>;
  return <div className="max-w-full overflow-x-auto rounded-xl border border-rice-forest/10 dark:border-white/10" tabIndex={0} role="region" aria-label="ตารางข้อมูล เลื่อนแนวนอนเพื่อดูทุกคอลัมน์">
    <table className="w-full text-left text-sm"><thead className="bg-rice-mint/25 dark:bg-white/5"><tr>{renderActions && <th className="sticky left-0 z-10 bg-[var(--app-surface)] p-3">จัดการ</th>}{columns.map(column=><th key={column.key} className="min-w-32 whitespace-nowrap p-3 font-semibold"><span className="block">{column.label}</span><span className="mt-1 block font-mono text-xs font-normal text-[var(--app-text-muted)]">{column.key}</span></th>)}</tr></thead>
      <tbody>{rows.map((row,index)=><tr key={String(row.id ?? index)} className="border-t border-rice-forest/10 even:bg-rice-mint/10 dark:border-white/10">{renderActions && <td className="sticky left-0 z-10 bg-[var(--app-surface)] p-3">{renderActions(row)}</td>}{columns.map(column=><td key={column.key} className="max-w-56 whitespace-nowrap p-3 tabular-nums">{row[column.key] === null || row[column.key] === undefined ? "—" : column.key === "province_id" && provinces?.has(Number(row[column.key])) ? `${row[column.key]} · ${provinces.get(Number(row[column.key]))}` : String(row[column.key])}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
export async function download(url: string, filename: string) {
  const response = await fetch(url, {cache:"no-store"});
  if (!response.ok) { const payload = await response.json().catch(()=>null); throw new Error(payload?.error?.message ?? "ดาวน์โหลดไม่สำเร็จ"); }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl; link.download = filename; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(()=>URL.revokeObjectURL(objectUrl),1000);
}
export function Dialog({title,children,onClose,busy = false}: {title: string;children: ReactNode;onClose:()=>void;busy?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{const dialog = ref.current; dialog?.showModal(); return ()=>dialog?.close();},[]);
  return <dialog ref={ref} onCancel={event=>{event.preventDefault();if (!busy) onClose();}} aria-labelledby="dashboard-dialog-title" className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-rice-forest/15 bg-white p-5 text-rice-forest shadow-2xl backdrop:bg-black/40 sm:p-6 dark:border-white/15 dark:bg-rice-dark dark:text-white">
    <div className="mb-5 flex items-start justify-between gap-4"><h3 id="dashboard-dialog-title" className="text-xl font-bold">{title}</h3><button aria-label="ปิดหน้าต่าง" className={button} disabled={busy} onClick={onClose}><X className="h-4 w-4" /></button></div>{children}
  </dialog>;
}
