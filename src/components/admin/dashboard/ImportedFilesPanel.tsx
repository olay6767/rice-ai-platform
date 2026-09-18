"use client";

import { useCallback, useEffect, useState } from "react";
import { CircleAlert, FileSpreadsheet, LoaderCircle, RefreshCw, Trash2 } from "lucide-react";

import {
  getDashboardDataset,
  type AdminDashboardVersion,
  type DashboardImportFile,
} from "@/lib/admin/dashboard-types";
import { API, Notice, button, errorText, muted, panel, request } from "./shared";

function formattedDate(value: string): string {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function ImportedFilesPanel({
  version,
  onSaved,
}: {
  version: AdminDashboardVersion;
  onSaved: (message: string) => void;
}) {
  const [files, setFiles] = useState<DashboardImportFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await request<{ files: DashboardImportFile[] }>(
        `${API}?mode=import-files&versionId=${encodeURIComponent(version.id)}`
      );
      setFiles(result.files);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [version.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void load();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [load, version.revision]);

  async function removeFile(file: DashboardImportFile): Promise<void> {
    const dataset = getDashboardDataset(file.dataset_type);
    const warning = file.current_row_count
      ? `ระบบจะลบข้อมูล ${file.current_row_count.toLocaleString()} แถวที่ยังมาจากไฟล์นี้ออกจากฉบับร่าง`
      : "ไฟล์นี้ไม่มีแถวข้อมูลคงเหลือแล้ว เพราะถูกแทนที่หรือแก้ไขภายหลัง";
    if (!window.confirm(`ลบไฟล์ “${file.file_name}” หรือไม่?\n\n${warning}\nข้อมูลจากไฟล์หรือแถวอื่นจะไม่ถูกลบ`)) return;

    setDeletingId(file.id);
    setError("");
    try {
      const result = await request<{ deletedRows: number }>(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-import-file",
          versionId: version.id,
          importFileId: file.id,
          revision: version.revision,
        }),
      });
      setFiles((current) => current.filter((item) => item.id !== file.id));
      onSaved(
        `ลบไฟล์ “${file.file_name}” (${dataset.label}) แล้ว ${Number(result.deletedRows).toLocaleString()} แถว ยังเป็นฉบับร่างและยังไม่แสดงต่อผู้ใช้`
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <section className={`${panel} space-y-4`} aria-label="ไฟล์ที่นำเข้าแล้ว">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">ไฟล์ที่นำเข้าแล้ว</h3>
          <p className={muted}>ลบได้เฉพาะฉบับร่าง และจะลบเฉพาะแถวที่ยังมาจากไฟล์นั้น</p>
        </div>
        <button type="button" className={button} onClick={() => void load()} disabled={loading || Boolean(deletingId)}>
          {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          รีเฟรช
        </button>
      </div>

      {error && <Notice error>{error}</Notice>}

      {loading ? (
        <p className={`flex items-center gap-2 ${muted}`}><LoaderCircle className="h-4 w-4 animate-spin" />กำลังโหลดรายการไฟล์…</p>
      ) : files.length ? (
        <div className="space-y-2">
          {files.map((file) => {
            const dataset = getDashboardDataset(file.dataset_type);
            const isDeleting = deletingId === file.id;
            return (
              <article key={file.id} className="flex flex-col gap-3 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-3 sm:flex-row sm:items-center sm:p-4">
                <FileSpreadsheet className="h-5 w-5 shrink-0 text-rice-leaf dark:text-rice-mint-light" />
                <div className="min-w-0 flex-1">
                  <p className="break-all text-sm font-bold">{file.file_name}</p>
                  <p className={`mt-1 ${muted}`}>{dataset.label} · นำเข้า {formattedDate(file.created_at)}</p>
                  <p className="mt-2 text-sm">ในไฟล์ {file.original_row_count.toLocaleString()} แถว · คงเหลือจากไฟล์นี้ {file.current_row_count.toLocaleString()} แถว</p>
                </div>
                {version.status === "draft" && (
                  <button
                    type="button"
                    className={`${button} border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10`}
                    disabled={Boolean(deletingId)}
                    onClick={() => void removeFile(file)}
                  >
                    {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {isDeleting ? "กำลังลบ…" : "ลบไฟล์นี้"}
                  </button>
                )}
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--app-border)] p-4 text-sm">
          <p className="font-semibold">ยังไม่มีไฟล์ที่ติดตามได้ในฉบับร่างนี้</p>
          <p className={`mt-1 ${muted}`}>ไฟล์ที่นำเข้าก่อนเปิดใช้ระบบนี้ไม่มีการผูกแถวข้อมูลกับไฟล์ จึงใช้ “ลบข้อมูลหมวดนี้” หรือ “ลบ” รายแถวในแท็บข้อมูลที่บันทึกแทนได้</p>
        </div>
      )}

      <p className={`flex gap-2 text-xs leading-5 ${muted}`}><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />เมื่อแก้ไขแถวด้วยตนเอง แถวนั้นจะไม่ผูกกับไฟล์เดิมแล้ว เพื่อป้องกันไม่ให้การลบไฟล์ลบการแก้ไขของคุณ</p>
    </section>
  );
}
