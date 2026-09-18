"use client";

import { useRef, useState, type DragEvent } from "react";
import {
  CheckCircle2,
  CircleAlert,
  FileCheck2,
  FileSpreadsheet,
  LoaderCircle,
  UploadCloud,
  X,
} from "lucide-react";

import {
  getDashboardDataset,
  type AdminDashboardVersion,
  type BatchImportPreview,
} from "@/lib/admin/dashboard-types";
import { API, Notice, button, errorText, muted, panel, primary, request } from "./shared";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_FILES = 3;

function fileIssue(file: File): string | null {
  if (!file.name.toLowerCase().endsWith(".csv")) return "รองรับเฉพาะไฟล์ .csv";
  if (file.size === 0) return "ไฟล์ไม่มีข้อมูล";
  if (file.size > MAX_FILE_SIZE) return "ไฟล์เกิน 10 MB";
  return null;
}

export default function BatchImportPanel({
  version,
  onSaved,
}: {
  version: AdminDashboardVersion;
  onSaved: (message: string) => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [preview, setPreview] = useState<BatchImportPreview | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState<"preview" | "commit" | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const localIssues = files.map(fileIssue).filter(Boolean);
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  const canPreview = files.length > 0 && !localIssues.length && !busy;

  function choose(nextFiles: File[]): void {
    const selected = nextFiles.slice(0, MAX_FILES);
    setFiles(selected);
    setPreview(null);
    setConfirmed(false);
    setError(
      nextFiles.length > MAX_FILES
        ? "เลือกได้ครั้งละไม่เกิน 3 ไฟล์ (หนึ่งไฟล์ต่อหนึ่งหมวดข้อมูล)"
        : ""
    );
  }

  function removeFile(index: number): void {
    setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPreview(null);
    setConfirmed(false);
    setError("");
    setInputKey((key) => key + 1);
  }

  function dropFiles(event: DragEvent<HTMLDivElement>): void {
    event.preventDefault();
    setDragActive(false);
    choose(Array.from(event.dataTransfer.files));
  }

  async function process(action: "preview" | "commit"): Promise<void> {
    if (!files.length || localIssues.length) return;
    setBusy(action);
    setError("");
    if (action === "preview") {
      setPreview(null);
      setConfirmed(false);
    }

    try {
      const form = new FormData();
      form.set("action", action === "preview" ? "batch-preview" : "batch-commit");
      form.set("versionId", version.id);
      files.forEach((file) => form.append("files", file));
      if (action === "commit" && preview) form.set("token", preview.token);

      if (action === "preview") {
        setPreview(await request<BatchImportPreview>(API, { method: "POST", body: form }));
      } else {
        const result = await request<{ imports: Array<{ importedRows: number }> }>(
          API,
          { method: "POST", body: form }
        );
        const rows = result.imports.reduce(
          (sum, item) => sum + Number(item.importedRows ?? 0),
          0
        );
        onSaved(
          `นำเข้า ${files.length.toLocaleString()} ไฟล์ รวม ${rows.toLocaleString()} แถวแล้ว ยังเป็นฉบับร่างและยังไม่แสดงต่อผู้ใช้`
        );
        setFiles([]);
        setPreview(null);
        setConfirmed(false);
        setInputKey((key) => key + 1);
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

  return (
    <section className={`${panel} space-y-4`} aria-label="นำเข้าหลายไฟล์พร้อมกัน">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-rice-mint/40 p-3">
          <UploadCloud className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-lg font-bold">นำเข้าหลายไฟล์พร้อมกัน</h3>
          <p className={muted}>
            เลือกได้สูงสุด 3 ไฟล์ ระบบตรวจหัวคอลัมน์และจัดหมวดให้เอง
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        key={inputKey}
        type="file"
        accept=".csv,text/csv"
        multiple
        className="sr-only"
        disabled={Boolean(busy)}
        onChange={(event) => choose(Array.from(event.target.files ?? []))}
      />
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!busy) setDragActive(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) setDragActive(false);
        }}
        onDrop={dropFiles}
        className={`rounded-2xl border-2 border-dashed p-4 transition sm:p-5 ${
          dragActive
            ? "border-rice-leaf bg-rice-mint/25 dark:border-rice-mint-light dark:bg-rice-leaf/15"
            : "border-rice-forest/20 bg-[var(--app-surface-soft)] dark:border-white/15"
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/25 dark:text-rice-mint-light">
            <UploadCloud className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold">
            ลากไฟล์ CSV มาวาง หรือเลือกจากเครื่อง
          </p>
          <p className={`mt-1 ${muted}`}>
            ผลผลิตรายปี · สภาพแวดล้อมรายเดือน · ผลพยากรณ์ผลผลิต
          </p>
          <button
            type="button"
            className={`${button} mt-3`}
            disabled={Boolean(busy)}
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud className="h-4 w-4" /> เลือกไฟล์ CSV
          </button>
        </div>
      </div>

      {files.length > 0 && (
        <div className="space-y-2" aria-live="polite">
          {files.map((file, index) => {
            const issue = fileIssue(file);
            return (
              <div
                key={`${file.name}:${file.size}:${index}`}
                className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 ${
                  issue
                    ? "border-rose-400/40 bg-rose-50/55 dark:border-rose-400/25 dark:bg-rose-400/[0.06]"
                    : "border-rice-leaf/20 bg-rice-mint/15 dark:border-white/10 dark:bg-white/[0.04]"
                }`}
              >
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-rice-leaf dark:text-rice-mint-light" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold" title={file.name}>
                    {file.name}
                  </p>
                  <p className={`mt-1 text-xs ${issue ? "text-rose-700 dark:text-rose-200" : muted}`}>
                    {issue ?? `${(file.size / 1024).toFixed(1)} KB · ระบบจะระบุหมวดจากหัวคอลัมน์`}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-lg p-2 text-rice-muted transition hover:bg-white/70 hover:text-rice-forest disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
                  onClick={() => removeFile(index)}
                  disabled={Boolean(busy)}
                  aria-label={`เอาไฟล์ ${file.name} ออก`}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
          <p className={muted}>
            {files.length} / {MAX_FILES} ไฟล์ · รวม {(totalSize / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={primary}
          disabled={!canPreview}
          onClick={() => void process("preview")}
        >
          {busy === "preview" ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <FileCheck2 className="h-4 w-4" />
          )}
          {busy === "preview" ? "กำลังตรวจทุกไฟล์…" : "ตรวจไฟล์ทั้งหมด"}
        </button>
        {!files.length && (
          <span className={`inline-flex items-center gap-1.5 px-2 py-2 ${muted}`}>
            <CircleAlert className="h-4 w-4" /> เลือกไฟล์ก่อนจึงจะตรวจได้
          </span>
        )}
      </div>

      {error && <Notice error>{error}</Notice>}

      {preview && (
        <div className="space-y-4 border-t border-[var(--app-border)] pt-4">
          <div>
            <h4 className="flex items-center gap-2 font-bold">
              <CheckCircle2 className="h-5 w-5" />
              {preview.valid
                ? "ทุกไฟล์ผ่านการตรวจ · ยังไม่ได้บันทึก"
                : "พบข้อผิดพลาดในบางไฟล์ · ยังไม่ได้บันทึก"}
            </h4>
            <p className={`mt-1 ${muted}`}>ปลายทาง: ฉบับร่าง “{version.label}”</p>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {preview.items.map((item) => {
              const dataset = getDashboardDataset(item.datasetType);
              return (
                <article
                  key={item.fileName}
                  className={`rounded-xl border p-4 ${
                    item.valid
                      ? "border-rice-leaf/25 bg-rice-mint/15 dark:border-rice-mint-light/20 dark:bg-rice-leaf/10"
                      : "border-rose-400/35 bg-rose-50/50 dark:border-rose-400/20 dark:bg-rose-400/[0.05]"
                  }`}
                >
                  <p className="break-all text-sm font-bold">{item.fileName}</p>
                  <p className={`mt-1 ${muted}`}>{dataset.label}</p>
                  <p className="mt-3 text-sm leading-6">
                    {item.validRows.toLocaleString()} แถว · เพิ่ม {item.inserts.toLocaleString()} · อัปเดต {item.updates.toLocaleString()}
                  </p>
                  {item.errorCount > 0 && (
                    <details className="mt-3 text-xs leading-5 text-rose-700 dark:text-rose-200">
                      <summary className="cursor-pointer font-bold">ข้อผิดพลาด {item.errorCount} จุด</summary>
                      <ul className="mt-2 list-disc space-y-1 pl-4">
                        {item.errors.map((issue, index) => (
                          <li key={`${issue.row}:${index}`}>
                            {issue.row ? `แถว ${issue.row}: ` : ""}
                            {issue.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {item.warnings.length > 0 && (
                    <p className="mt-3 text-xs leading-5 text-amber-700 dark:text-amber-200">
                      {item.warnings[0]}
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          {preview.valid && (
            <div className="space-y-3 border-t border-[var(--app-border)] pt-4">
              <label className="flex cursor-pointer items-start gap-3 text-sm leading-6">
                <input
                  type="checkbox"
                  checked={confirmed}
                  disabled={Boolean(busy)}
                  onChange={(event) => setConfirmed(event.target.checked)}
                  className="mt-1 h-5 w-5 shrink-0 accent-rice-leaf"
                />
                ตรวจสอบแล้ว: จะบันทึกทุกไฟล์ในฉบับร่างเดียวกัน หากไฟล์ใดบันทึกไม่ได้ ระบบจะไม่บันทึกไฟล์อื่นบางส่วน
              </label>
              <button
                type="button"
                className={primary}
                disabled={!confirmed || Boolean(busy) || preview.revision !== version.revision}
                onClick={() => void process("commit")}
              >
                {busy === "commit" ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <UploadCloud className="h-4 w-4" />
                )}
                {busy === "commit" ? "กำลังบันทึกทุกไฟล์…" : "ยืนยันบันทึกทุกไฟล์"}
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
