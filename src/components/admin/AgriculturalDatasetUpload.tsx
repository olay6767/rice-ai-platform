"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, FileSpreadsheet, LoaderCircle, UploadCloud, X } from "lucide-react";

import type { AgriculturalDatasetType } from "@/lib/admin/agricultural-import";
import { button, errorText, muted, primary, request } from "@/components/admin/dashboard/shared";

type Version = { id: string; label: string; revision: number };
type Preview = {
  valid: boolean;
  fileName: string;
  fileType: "csv" | "json" | "xlsx";
  receivedRows: number;
  validRows: number;
  errorCount: number;
  errors: Array<{ row: number | null; message: string }>;
  warnings: string[];
  provinceCount: number;
  years: number[];
  duplicateCount: number;
  unknownProvinceCount: number;
  previewRows: Array<Record<string, unknown>>;
  columns: string[];
  token: string;
  revision: number;
};

const ACCEPT = ".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

function fileIssue(file: File | null): string {
  if (!file) return "";
  if (!/\.(csv|json|xlsx|xls)$/i.test(file.name)) return "รองรับเฉพาะไฟล์ JSON, CSV และ Excel";
  if (!file.size) return "ไฟล์ไม่มีข้อมูล";
  if (file.size > 10 * 1024 * 1024) return "ไฟล์ต้องมีขนาดไม่เกิน 10 MB";
  return "";
}

export default function AgriculturalDatasetUpload({
  type,
  version,
  onSaved,
}: {
  type: AgriculturalDatasetType;
  version: Version;
  onSaved: (message: string) => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function choose(next: File | null) {
    setFile(next);
    setPreview(null);
    setConfirmed(false);
    setError(fileIssue(next));
  }

  function clear() {
    choose(null);
    setInputKey((key) => key + 1);
  }

  function drop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    choose(event.dataTransfer.files.item(0));
  }

  async function process(action: "preview" | "commit") {
    if (!file || fileIssue(file)) return;
    setBusy(action);
    setError("");
    if (action === "preview") {
      setPreview(null);
      setConfirmed(false);
    }
    try {
      const form = new FormData();
      form.set("action", action);
      form.set("type", type);
      form.set("versionId", version.id);
      form.set("file", file);
      if (preview) form.set("token", preview.token);
      if (action === "preview") {
        setPreview(await request<Preview>("/api/admin/datasets", { method: "POST", body: form }));
      } else {
        const result = await request<{ importedRows: number }>("/api/admin/datasets", { method: "POST", body: form });
        clear();
        await onSaved(`บันทึก ${Number(result.importedRows).toLocaleString("th-TH")} แถวลงฉบับร่าง “${version.label}” แล้ว`);
      }
    } catch (cause) {
      setError(errorText(cause));
      if (action === "commit") {
        setPreview(null);
        setConfirmed(false);
      }
    } finally {
      setBusy(null);
    }
  }

  return <div className="mt-5 space-y-4 border-t border-[var(--app-border)] pt-5">
    <div>
      <h5 className="font-bold">อัปโหลดข้อมูลลงฉบับร่าง</h5>
      <p className={muted}>Upload → Validate → Preview → บันทึก Draft จากนั้นจึง Publish หรือ Set Default</p>
    </div>
    <input ref={inputRef} key={inputKey} type="file" accept={ACCEPT} className="sr-only" disabled={Boolean(busy)} onChange={(event) => choose(event.target.files?.[0] ?? null)} />
    <div
      onDragOver={(event) => { event.preventDefault(); if (!busy) setDragActive(true); }}
      onDragLeave={(event) => { if (event.currentTarget === event.target) setDragActive(false); }}
      onDrop={drop}
      className={`rounded-2xl border-2 border-dashed p-4 transition ${dragActive ? "border-rice-leaf bg-rice-mint/25" : "border-[var(--app-border-strong)] bg-[var(--app-surface-soft)]"}`}
    >
      {file ? <div className="flex min-w-0 items-center gap-3">
        <FileSpreadsheet className="h-5 w-5 shrink-0 text-rice-leaf" />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{file.name}</p><p className={muted}>{fileIssue(file) || `${(file.size / 1024).toFixed(1)} KB · พร้อมตรวจไฟล์`}</p></div>
        <button type="button" className={button} disabled={Boolean(busy)} onClick={clear} aria-label="ลบไฟล์"><X className="h-4 w-4" /></button>
      </div> : <div className="text-center">
        <UploadCloud className="mx-auto h-6 w-6 text-rice-leaf" />
        <p className="mt-2 text-sm font-bold">ลากไฟล์มาวาง หรือเลือกจากเครื่อง</p>
        <p className={muted}>JSON / CSV / Excel · ไม่เกิน 10 MB · สูงสุด 20,000 แถว</p>
        <button type="button" className={`${button} mt-3`} onClick={() => inputRef.current?.click()}><UploadCloud className="h-4 w-4" />เลือกไฟล์</button>
      </div>}
    </div>
    {error && <div role="alert" className="rounded-xl border border-rose-300/40 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">{error}</div>}
    <button type="button" className={primary} disabled={!file || Boolean(fileIssue(file)) || Boolean(busy)} onClick={() => void process("preview")}>
      {busy === "preview" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      {busy === "preview" ? "กำลังตรวจข้อมูล…" : "Validate และ Preview"}
    </button>
    {preview && <div className="space-y-4 rounded-2xl bg-[var(--app-surface-soft)] p-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[["ทั้งหมด", preview.receivedRows], ["ผ่าน", preview.validRows], ["ผิดพลาด", preview.errorCount], ["จังหวัด", preview.provinceCount]].map(([label, value]) => <div key={label} className="rounded-xl bg-[var(--app-surface)] p-3"><p className="text-xs text-[var(--app-text-muted)]">{label}</p><p className="mt-1 text-xl font-bold">{Number(value).toLocaleString("th-TH")}</p></div>)}
      </div>
      <p className={muted}>ชนิดไฟล์ {preview.fileType.toUpperCase()} · ปี {preview.years.join(", ") || "—"} · ซ้ำ {preview.duplicateCount.toLocaleString("th-TH")} แถว</p>
      {!!preview.errors.length && <div className="rounded-xl border border-rose-300/40 bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-500/10 dark:text-rose-200"><p className="font-bold">ต้องแก้ไขก่อนบันทึก</p><ul className="mt-2 max-h-48 list-disc overflow-y-auto pl-5">{preview.errors.map((issue, index) => <li key={index}>{issue.row ? `แถว ${issue.row}: ` : ""}{issue.message}</li>)}</ul></div>}
      {!!preview.warnings.length && <ul className="list-disc rounded-xl bg-amber-50 p-3 pl-8 text-sm text-amber-900 dark:bg-amber-400/10 dark:text-amber-200">{preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>}
      {!!preview.previewRows.length && <div className="overflow-x-auto rounded-xl border border-[var(--app-border)]"><table className="w-full text-left text-xs"><thead className="bg-[var(--app-surface)]"><tr>{preview.columns.map((column) => <th key={column} className="whitespace-nowrap p-2 font-mono">{column}</th>)}</tr></thead><tbody>{preview.previewRows.map((row, index) => <tr key={index} className="border-t border-[var(--app-border)]">{preview.columns.map((column) => <td key={column} className="max-w-52 whitespace-nowrap p-2">{row[column] == null ? "—" : typeof row[column] === "object" ? JSON.stringify(row[column]) : String(row[column])}</td>)}</tr>)}</tbody></table></div>}
      {preview.valid && <div className="space-y-3 border-t border-[var(--app-border)] pt-4">
        <label className="flex items-start gap-2 text-sm"><input className="mt-1 h-4 w-4 accent-rice-leaf" type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>ตรวจสอบแล้ว ยืนยันแทนที่ข้อมูลเดิมของฉบับร่างนี้ด้วย {preview.validRows.toLocaleString("th-TH")} แถว</span></label>
        <button type="button" className={primary} disabled={!confirmed || Boolean(busy) || preview.revision !== version.revision} onClick={() => void process("commit")}>{busy === "commit" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}{busy === "commit" ? "กำลังบันทึก…" : "บันทึกลง Draft"}</button>
      </div>}
    </div>}
  </div>;
}
