"use client";

import { useState } from "react";
import { FileCheck2, UploadCloud } from "lucide-react";
import { button, errorText, primary, request } from "@/components/admin/dashboard/shared";
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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function send(action: "preview" | "commit") {
    if (!file) return;
    setBusy(true); setError(""); setSuccess("");
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
        setSuccess(`บันทึก ${result.importedRows.toLocaleString()} แถวใน Draft แล้ว (แทนข้อมูลเดิม ${result.replacedRows.toLocaleString()} แถว)`);
        setFile(null); setPreview(null); setConfirmed(false);
        await onSaved();
      }
    } catch (cause) {
      setError(errorText(cause));
      if (action === "commit") { setConfirmed(false); setPreview(null); }
    } finally { setBusy(false); }
  }

  return <div className="mt-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4">
    <h5 className="flex items-center gap-2 font-bold"><UploadCloud className="h-4 w-4" />นำเข้าไฟล์ลง Draft</h5>
    <p className="mt-1 text-xs text-[var(--app-text-secondary)]">JSON, CSV, XLSX, XLS · ไม่เกิน 10 MB · ตรวจไฟล์ก่อนบันทึก · ไฟล์ใหม่จะแทนข้อมูลทุกแถวใน Draft นี้</p>
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <input aria-label={`เลือกไฟล์สำหรับ ${version.label}`} type="file" accept=".json,.csv,.xlsx,.xls" onChange={(event) => { setFile(event.target.files?.[0] ?? null); setPreview(null); setConfirmed(false); setError(""); }} className="max-w-full text-sm" />
      <button type="button" className={button} disabled={!file || busy} onClick={() => void send("preview")}><FileCheck2 className="h-4 w-4" />{busy ? "กำลังตรวจ..." : "Validate & Preview"}</button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
    {success && <p role="status" className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{success}</p>}
    {preview && <div className="mt-4 space-y-3 text-sm">
      <p className="font-semibold">{preview.valid ? "ตรวจผ่าน" : `พบข้อผิดพลาด ${preview.errorCount} จุด`} · {preview.validRows.toLocaleString()} / {preview.receivedRows.toLocaleString()} แถว · {preview.provinceCount} จังหวัด · ปี {preview.minYear ?? "—"}–{preview.maxYear ?? "—"}</p>
      <p className="text-amber-800 dark:text-amber-200">เมื่อยืนยัน จะแทนข้อมูลเดิม {preview.replacedRows.toLocaleString()} แถวใน Draft “{version.label}”</p>
      {!!preview.errors.length && <ul role="alert" className="max-h-40 list-disc overflow-auto pl-5 text-rose-700 dark:text-rose-300">{preview.errors.map((issue, index) => <li key={index}>แถว {issue.row}: {issue.message}</li>)}</ul>}
      {!!preview.previewRows.length && <details><summary className="cursor-pointer font-semibold">ดูตัวอย่าง 10 แถวแรก</summary><pre className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--app-border)] p-3 text-xs">{JSON.stringify(preview.previewRows, null, 2)}</pre></details>}
      {preview.valid && <>
        <label className="flex items-start gap-2"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1" />ตรวจข้อมูลแล้วและยืนยันการแทนที่เฉพาะ Draft นี้</label>
        <button type="button" className={primary} disabled={!confirmed || busy || preview.revision !== version.revision} onClick={() => void send("commit")}><UploadCloud className="h-4 w-4" />Commit to Draft</button>
      </>}
    </div>}
  </div>;
}
