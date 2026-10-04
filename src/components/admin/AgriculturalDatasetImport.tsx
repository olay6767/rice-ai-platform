"use client";

import { useRef, useState, type DragEvent } from "react";
import { Download, FileCheck2, FileSpreadsheet, LoaderCircle, UploadCloud, X } from "lucide-react";
import { button, download, errorText, primary, request } from "@/components/admin/dashboard/shared";
import type { AgriculturalType } from "@/lib/admin/agricultural-import";

type Preview = {
  valid: boolean;
  receivedRows: number;
  validRows: number;
  errorCount: number;
  errors: Array<{ row: number; message: string }>;
  previewRows: Array<Record<string, unknown>>;
  provinceCount: number;
  minYear: number | null;
  maxYear: number | null;
  replacedRows: number;
  token: string;
  revision: number;
};

export default function AgriculturalDatasetImport({ type, version, onSaved }: {
  type: AgriculturalType;
  version: { id: string; label: string; revision: number; record_count: number };
  onSaved: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"preview" | "commit" | "download" | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [fileKey, setFileKey] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function fileIssue(nextFile: File | null): string {
    if (!nextFile) return "";
    if (!/\.(json|csv|xlsx|xls)$/i.test(nextFile.name)) return "รองรับเฉพาะ JSON, CSV, XLSX และ XLS";
    if (nextFile.size <= 0) return "ไฟล์ว่างเปล่า";
    if (nextFile.size > 10 * 1024 * 1024) return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
    return "";
  }

  function chooseFile(nextFile: File | null) {
    setFile(nextFile);
    setPreview(null);
    setConfirmed(false);
    setSuccess("");
    setError(fileIssue(nextFile));
  }

  function clearFile() {
    setFile(null);
    setPreview(null);
    setConfirmed(false);
    setError("");
    setSuccess("");
    setFileKey((current) => current + 1);
  }

  function dropFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    if (busy) return;
    chooseFile(event.dataTransfer.files?.[0] ?? null);
  }

  function openFilePicker() {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = "";
    fileInputRef.current.click();
  }

  async function downloadTemplate() {
    setBusy("download");
    setError("");
    setSuccess("");
    try {
      await download(`/api/admin/datasets/import?type=${type}&template=1`, `${type}_import_template.xlsx`);
      setSuccess("ดาวน์โหลดไฟล์ Excel ตัวอย่างแล้ว");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function send(action: "preview" | "commit") {
    if (!file) return;
    setBusy(action); setError(""); setSuccess("");
    try {
      const form = new FormData();
      form.set("type", type); form.set("versionId", version.id);
      form.set("file", file); form.set("action", action);
      if (action === "commit") {
        if (!preview?.valid || !confirmed) return;
        form.set("token", preview.token);
        form.set("revision", String(preview.revision));
      }
      if (action === "preview") {
        setConfirmed(false);
        setPreview(await request<Preview>("/api/admin/datasets/import", { method: "POST", body: form }));
      } else {
        const result = await request<{ importedRows: number; replacedRows: number }>("/api/admin/datasets/import", { method: "POST", body: form });
        clearFile();
        setSuccess(`บันทึก ${result.importedRows.toLocaleString()} แถวในเวอร์ชันแล้ว (แทนข้อมูลเดิม ${result.replacedRows.toLocaleString()} แถว) ตรวจสอบก่อนเผยแพร่`);
        await onSaved();
      }
    } catch (cause) {
      setError(errorText(cause));
      if (action === "commit") { setConfirmed(false); setPreview(null); }
    } finally { setBusy(null); }
  }

  const columns = Object.keys(preview?.previewRows[0] ?? {});
  const selectedFileIssue = fileIssue(file);

  return <div className="mt-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 sm:p-5">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light"><UploadCloud aria-hidden="true" className="h-5 w-5" /></span>
      <div className="min-w-0"><h5 className="font-bold">นำเข้าไฟล์ในเวอร์ชัน “{version.label}”</h5><p className="mt-1 text-xs leading-5 text-[var(--app-text-secondary)]">Excel (.xlsx/.xls), CSV หรือ JSON · ไม่เกิน 10 MB · สูงสุด 20,000 แถว · ตรวจและ Preview ก่อนบันทึก</p></div>
    </div>
    <input
      ref={fileInputRef}
      key={fileKey}
      aria-label={`เลือกไฟล์สำหรับ ${version.label}`}
      type="file"
      accept=".json,.csv,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
      disabled={Boolean(busy)}
      onChange={(event) => chooseFile(event.target.files?.[0] ?? null)}
      className="sr-only"
    />
    <div
      onDragOver={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
      onDrop={dropFile}
      className={`mt-4 rounded-2xl border-2 border-dashed p-4 transition ${dragActive ? "border-rice-leaf bg-rice-mint/30" : selectedFileIssue ? "border-rose-400/60 bg-rose-50/60 dark:bg-rose-400/[0.06]" : file ? "border-rice-leaf/40 bg-rice-mint/15" : "border-[var(--app-border-strong)] bg-[var(--app-surface)] hover:border-rice-leaf/45"}`}
    >
      {file ? <div className="flex min-w-0 items-center gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${selectedFileIssue ? "bg-rose-100 text-rose-700" : "bg-rice-mint/55 text-rice-forest"}`}><FileSpreadsheet aria-hidden="true" className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" title={file.name}>{file.name}</p><p className={`mt-1 text-xs ${selectedFileIssue ? "text-rose-700 dark:text-rose-200" : "text-[var(--app-text-secondary)]"}`}>{selectedFileIssue || `${(file.size / 1024).toFixed(1)} KB · พร้อมตรวจไฟล์`}</p></div>
        <button type="button" className="rounded-lg p-2 text-[var(--app-text-muted)] transition hover:bg-[var(--app-surface-soft)]" onClick={clearFile} disabled={Boolean(busy)} aria-label="เอาไฟล์ที่เลือกออก"><X aria-hidden="true" className="h-4 w-4" /></button>
      </div> : <div className="py-2 text-center">
        <p className="text-sm font-bold">ลากไฟล์มาวางที่นี่ หรือเลือกจากเครื่อง</p>
        <p className="mt-1 text-xs text-[var(--app-text-secondary)]">รองรับ Excel (.xlsx/.xls), CSV และ JSON</p>
        <button type="button" className={`${button} mt-3`} disabled={Boolean(busy)} onClick={openFilePicker}><FileSpreadsheet aria-hidden="true" className="h-4 w-4" />เลือกไฟล์ข้อมูล</button>
      </div>}
    </div>
    <div className="mt-3 flex flex-wrap gap-2">
      <button type="button" className={primary} disabled={!file || Boolean(selectedFileIssue) || Boolean(busy)} onClick={() => void send("preview")}>
        {busy === "preview" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <FileCheck2 aria-hidden="true" className="h-4 w-4" />}
        {busy === "preview" ? "กำลังตรวจทุกแถว..." : "ตรวจไฟล์และดูตัวอย่าง"}
      </button>
      {file && <button type="button" className={button} disabled={Boolean(busy)} onClick={openFilePicker}>เปลี่ยนไฟล์</button>}
      {type === "rice_price" && <button type="button" className={button} disabled={Boolean(busy)} onClick={() => void downloadTemplate()}>
        {busy === "download" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Download aria-hidden="true" className="h-4 w-4" />}
        {busy === "download" ? "กำลังสร้างไฟล์..." : "ดาวน์โหลด Excel ตัวอย่าง"}
      </button>}
    </div>
    {type === "rice_price" && <details className="mt-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 text-sm">
      <summary className="cursor-pointer font-semibold">คอลัมน์ที่ไฟล์ราคาข้าวต้องมี</summary>
      <p className="mt-2 leading-6 text-[var(--app-text-secondary)]"><code>observed_on</code> วันที่รูปแบบ YYYY-MM-DD · <code>rice_type</code> ชื่อชนิดข้าว · <code>rice_type_code</code> รหัสชนิดข้าว · <code>price</code> ราคาเป็นตัวเลขไม่ติดลบ</p>
      <p className="mt-1 text-xs leading-5 text-[var(--app-text-muted)]">ระบบอ่าน Worksheet แรก และรองรับคอลัมน์เสริม เช่น unit, data_type, is_imputed, model_name, model_version และ source</p>
    </details>}
    {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</p>}
    {preview && <div className="mt-4 space-y-3 text-sm">
      <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
        <p className="font-semibold">{preview.valid ? "ตรวจไฟล์ผ่าน · ยังไม่ได้บันทึก" : `พบข้อผิดพลาด ${preview.errorCount} จุด · ยังไม่ได้บันทึก`}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["แถวในไฟล์", preview.receivedRows], ["แถวที่ผ่าน", preview.validRows], ["ปีเริ่มต้น", preview.minYear ?? "—"], ["ปีล่าสุด", preview.maxYear ?? "—"]].map(([label, value]) => <div key={label} className="rounded-lg bg-[var(--app-surface-soft)] p-3"><p className="text-[10px] text-[var(--app-text-muted)]">{label}</p><p className="mt-1 text-lg font-bold tabular-nums">{typeof value === "number" ? value.toLocaleString() : value}</p></div>)}</div>
        {type !== "rice_price" && <p className="mt-3 text-xs text-[var(--app-text-secondary)]">ครอบคลุม {preview.provinceCount.toLocaleString()} จังหวัด</p>}
      </div>
      <p className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">เมื่อยืนยัน ไฟล์นี้จะแทนข้อมูลเดิม {preview.replacedRows.toLocaleString()} แถวเฉพาะในเวอร์ชันนี้ โดยไม่กระทบเวอร์ชันที่เผยแพร่หรือค่าเริ่มต้น</p>
      {!!preview.errors.length && <ul role="alert" className="max-h-40 list-disc overflow-auto pl-5 text-rose-700 dark:text-rose-300">{preview.errors.map((issue, index) => <li key={index}>แถว {issue.row}: {issue.message}</li>)}</ul>}
      {!!preview.previewRows.length && <details open><summary className="cursor-pointer font-semibold">ตัวอย่างข้อมูล {preview.previewRows.length} แถวแรก</summary><div className="mt-2 max-h-72 overflow-auto rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)]"><table className="w-full min-w-max text-left text-xs"><thead className="sticky top-0 bg-[var(--app-surface-soft)]"><tr>{columns.map((column) => <th key={column} className="whitespace-nowrap px-3 py-2 font-mono">{column}</th>)}</tr></thead><tbody>{preview.previewRows.map((row, index) => <tr key={index} className="border-t border-[var(--app-border)]">{columns.map((column) => <td key={column} className="max-w-64 whitespace-nowrap px-3 py-2">{row[column] == null ? "—" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></div></details>}
      {preview.valid && <>
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3"><input type="checkbox" checked={confirmed} disabled={Boolean(busy)} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rice-leaf" /><span>ตรวจสอบ Preview แล้ว และยืนยันให้แทนข้อมูลทั้งหมดเฉพาะเวอร์ชัน “{version.label}”</span></label>
        <button type="button" className={primary} disabled={!confirmed || Boolean(busy) || preview.revision !== version.revision} onClick={() => void send("commit")}>
          {busy === "commit" ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <UploadCloud aria-hidden="true" className="h-4 w-4" />}
          {busy === "commit" ? "กำลังบันทึกข้อมูล..." : "ยืนยันบันทึกในเวอร์ชันนี้"}
        </button>
      </>}
    </div>}
  </div>;
}
