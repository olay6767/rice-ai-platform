"use client";

import { useRef, useState, type DragEvent } from "react";
import { CheckCircle2, CircleAlert, Copy, Download, EyeOff, FileCheck2, FileSpreadsheet, LoaderCircle, LockKeyhole, UploadCloud, X } from "lucide-react";
import { DASHBOARD_DATASETS, getDashboardDataset, type AdminDashboardVersion, type DashboardDatasetType, type ImportPreview } from "@/lib/admin/dashboard-types";
import BatchImportPanel from "./BatchImportPanel";
import ImportedFilesPanel from "./ImportedFilesPanel";
import { API, DataTable, Field, Notice, button, download, errorText, input, muted, panel, primary, request } from "./shared";

export default function ImportPanel({version,type,onTypeChange,onCreateDraft,onUnpublish,onSaved}: {
  version:AdminDashboardVersion;
  type:DashboardDatasetType;
  onTypeChange:(type:DashboardDatasetType)=>void;
  onCreateDraft:()=>void;
  onUnpublish:()=>void;
  onSaved:(message:string)=>void;
}) {
  const [file,setFile] = useState<File | null>(null);
  const [fileKey,setFileKey] = useState(0);
  const [preview,setPreview] = useState<ImportPreview | null>(null);
  const [busy,setBusy] = useState<"preview" | "commit" | "download" | null>(null);
  const [error,setError] = useState("");
  const [confirmed,setConfirmed] = useState(false);
  const [dragActive,setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataset = getDashboardDataset(type);
  const locked = version.status !== "draft";

  function fileIssue(nextFile:File | null): string {
    if (!nextFile) return "";
    if (!/\.(csv|json|xlsx|xls)$/i.test(nextFile.name)) return "เลือกไฟล์ JSON, CSV หรือ Excel เท่านั้น";
    if (nextFile.size === 0) return "ไฟล์ที่เลือกไม่มีข้อมูล";
    if (nextFile.size > 10 * 1024 * 1024) return "ไฟล์มีขนาดเกิน 10 MB";
    return "";
  }
  function chooseFile(nextFile:File | null) {
    const issue = fileIssue(nextFile);
    setPreview(null); setConfirmed(false); setError(issue); setFile(nextFile);
  }
  function clearFile() {
    chooseFile(null);
    setFileKey(key=>key+1);
  }
  function dropFile(event:DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    chooseFile(event.dataTransfer.files.item(0));
  }
  async function process(action:"preview" | "commit") {
    if (!file || locked) return;
    const issue = fileIssue(file);
    if (issue) {setError(issue); return;}
    setBusy(action);setError("");
    if (action === "preview") {setPreview(null);setConfirmed(false);}
    try {
      const form = new FormData();
      form.set("action",action);form.set("versionId",version.id);form.set("datasetType",type);form.set("file",file);
      if (preview) form.set("token",preview.token);
      if (action === "preview") setPreview(await request<ImportPreview>(API,{method:"POST",body:form}));
      else {
        const result = await request<{importedRows:number;inserts:number;updates:number}>(API,{method:"POST",body:form});
        setPreview(null);setFile(null);setFileKey(key=>key+1);setConfirmed(false);
        onSaved(`บันทึก ${dataset.label} ใน “${version.label}” แล้ว ${result.importedRows.toLocaleString()} แถว (เพิ่ม ${result.inserts.toLocaleString()} / อัปเดต ${result.updates.toLocaleString()}) ยังเป็นฉบับร่างและยังไม่แสดงต่อผู้ใช้`);
      }
    } catch (error) {setError(errorText(error));if (action === "commit") {setPreview(null);setConfirmed(false);}}
    finally {setBusy(null);}
  }
  async function getDownload(mode:"template" | "provinces") {
    setBusy("download");setError("");
    try {await download(`${API}?mode=${mode}&dataset=${type}&download=1`,mode === "template" ? "example_"+dataset.fileName : "province_codes.csv");}
    catch(error) {setError(errorText(error));} finally {setBusy(null);}
  }

  return <section className="space-y-4" aria-label="นำเข้าข้อมูล Dashboard">
    {!locked && <BatchImportPanel version={version} onSaved={onSaved} />}
    <ImportedFilesPanel version={version} onSaved={onSaved} />
    <details className={panel} open={locked}>
      <summary className="cursor-pointer text-sm font-bold">นำเข้าไฟล์เดี่ยว / ดาวน์โหลดไฟล์ตัวอย่าง</summary>
      <div className="mt-4">
      <div className="flex items-start gap-3"><span className="rounded-xl bg-rice-mint/40 p-3"><UploadCloud className="h-5 w-5" /></span><div><h3 className="text-lg font-bold">นำเข้า JSON / CSV / Excel อย่างเป็นขั้นตอน</h3><p className={muted}>เลือกประเภท → ตรวจไฟล์ → ตรวจผลและยืนยัน • ไม่เผยแพร่อัตโนมัติ</p></div></div>
      {locked && (
        <div className="mt-5 rounded-xl border border-[var(--app-border-strong)] bg-[var(--app-surface-soft)] p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <LockKeyhole aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-rice-leaf dark:text-rice-mint-light" />
            <div className="min-w-0">
              <h4 className="break-words font-semibold leading-6">{version.status === "published" ? "เวอร์ชันนี้เผยแพร่แล้ว จึงนำเข้าไฟล์ทับไม่ได้" : "เวอร์ชันนี้อยู่ในคลัง จึงยังนำเข้าไฟล์ไม่ได้"}</h4>
              <p className={`mt-2 break-words ${muted}`}>คัดลอก “{version.label}” เป็นฉบับร่างก่อน แล้วเลือกไฟล์ที่ต้องการอัปเดต ข้อมูลต้นฉบับและเวอร์ชันที่ผู้ใช้กำลังดูจะไม่เปลี่ยนแปลง</p>
            </div>
          </div>
          <button type="button" className={`${primary} mt-4 w-full sm:w-auto`} disabled={Boolean(busy)} onClick={onCreateDraft}>
            <Copy aria-hidden className="h-4 w-4" /><span>คัดลอกเป็นฉบับร่างเพื่อนำเข้าไฟล์</span>
          </button>
          <p className={`mt-2 ${muted}`}>หลังบันทึกฉบับร่าง ระบบจะเปิดให้นำเข้าไฟล์ต่อได้ทันที โดยไม่เผยแพร่อัตโนมัติ</p>
          {version.status === "published" && <div className="mt-4 border-t border-[var(--app-border)] pt-4"><p className={muted}>หรือปิดการเผยแพร่เพื่อแก้รุ่นเดิม ผู้ใช้จะไม่เห็นรุ่นนี้ระหว่างแก้ไข</p><button type="button" className={`${button} mt-2 w-full sm:w-auto`} disabled={Boolean(busy)} onClick={onUnpublish}><EyeOff className="h-4 w-4"/>ปิดเผยแพร่เพื่อแก้ไขรุ่นนี้</button></div>}
        </div>
      )}
      <div className={`mt-5 grid gap-4 ${locked ? "" : "md:grid-cols-2"}`}>
        <Field label="ประเภทข้อมูล"><select className={input} value={type} disabled={Boolean(busy)} onChange={event=>{onTypeChange(event.target.value as DashboardDatasetType);clearFile();}}>{DASHBOARD_DATASETS.map(item=><option key={item.type} value={item.type}>{item.label}</option>)}</select></Field>
        {!locked && <div className="min-w-0"><p className="mb-2 text-sm font-semibold">เลือกไฟล์ข้อมูล</p>
          <input ref={fileInputRef} key={fileKey} type="file" accept=".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" disabled={Boolean(busy)} className="sr-only" onChange={event=>chooseFile(event.target.files?.[0] ?? null)} />
          <div onDragOver={event=>{event.preventDefault();if (!busy) setDragActive(true);}} onDragLeave={event=>{if (event.currentTarget === event.target) setDragActive(false);}} onDrop={dropFile} className={`min-h-[7.75rem] rounded-2xl border-2 border-dashed p-3 transition sm:p-4 ${dragActive ? "border-rice-leaf bg-rice-mint/30 dark:border-rice-mint-light dark:bg-rice-leaf/15" : file ? fileIssue(file) ? "border-rose-400/60 bg-rose-50/55 dark:border-rose-400/35 dark:bg-rose-400/[0.07]" : "border-rice-leaf/35 bg-rice-mint/20 dark:border-rice-mint-light/25 dark:bg-rice-leaf/10" : "border-rice-forest/20 bg-[var(--app-surface-soft)] hover:border-rice-leaf/45 dark:border-white/15"}`}>
            {file ? <div className="flex min-w-0 items-center gap-3"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${fileIssue(file) ? "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200" : "bg-rice-mint/65 text-rice-forest dark:bg-rice-leaf/25 dark:text-rice-mint-light"}`}><FileSpreadsheet className="h-5 w-5"/></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold" title={file.name}>{file.name}</p><p className={`mt-1 text-xs ${fileIssue(file) ? "text-rose-700 dark:text-rose-200" : muted}`}>{fileIssue(file) || `${(file.size / 1024).toFixed(1)} KB · พร้อมตรวจไฟล์`}</p></div><button type="button" className="rounded-lg p-2 text-rice-muted transition hover:bg-white/70 hover:text-rice-forest disabled:opacity-40 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white" onClick={clearFile} disabled={Boolean(busy)} aria-label="เอาไฟล์ที่เลือกออก"><X className="h-4 w-4"/></button></div> : <div className="flex h-full flex-col items-center justify-center text-center"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/25 dark:text-rice-mint-light"><UploadCloud className="h-5 w-5"/></span><p className="mt-2 text-sm font-bold">ลากไฟล์มาวางที่นี่ หรือเลือกจากเครื่อง</p><p className={`mt-1 ${muted}`}>รองรับ JSON / CSV / Excel · ไม่เกิน 10 MB · สูงสุด 20,000 แถว</p><button type="button" className={`${button} mt-3`} disabled={Boolean(busy)} onClick={()=>fileInputRef.current?.click()}><UploadCloud className="h-4 w-4"/>เลือกไฟล์ข้อมูล</button></div>}
          </div>
        </div>}
      </div>
      <p className={`mt-3 ${muted}`}>{dataset.description}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {!locked && <button className={primary} onClick={()=>void process("preview")} disabled={!file || Boolean(fileIssue(file)) || Boolean(busy)}>{busy === "preview" ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <FileCheck2 className="h-4 w-4"/>}{busy === "preview" ? "กำลังตรวจทุกแถว…" : "ตรวจไฟล์ก่อนบันทึก"}</button>}
        <button className={button} disabled={Boolean(busy)} onClick={()=>void getDownload("template")}><Download className="h-4 w-4"/>ไฟล์ตัวอย่างตามประเภท</button>
        <button className={button} disabled={Boolean(busy)} onClick={()=>void getDownload("provinces")}><Download className="h-4 w-4"/>รหัสจังหวัด 77 จังหวัด</button>
      </div>
      {!locked && !file && <p className={`mt-3 flex items-center gap-1.5 ${muted}`}><CircleAlert className="h-4 w-4"/>เลือกไฟล์ก่อน ระบบจึงจะเปิดปุ่มตรวจไฟล์</p>}
      </div>
    </details>
    {error && <Notice error>{error}</Notice>}
    {preview && <div className={`${panel} space-y-4`}>
      <div><h3 className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 className="h-5 w-5"/>{preview.valid ? "ตรวจไฟล์ผ่าน • ยังไม่ได้บันทึก" : "ไฟล์ยังมีข้อผิดพลาด • ยังไม่ได้บันทึก"}</h3><p className={muted}>ปลายทาง: {version.label} · {dataset.label}</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[["แถวในไฟล์",preview.receivedRows],["แถวที่ผ่าน",preview.validRows],["เพิ่มใหม่",preview.inserts],["อัปเดตแถวเดิม",preview.updates]].map(([label,value])=><div key={label} className="rounded-xl bg-rice-mint/15 p-3 dark:bg-white/5"><p className={muted}>{label}</p><p className="text-2xl font-bold tabular-nums">{Number(value).toLocaleString()}</p></div>)}</div>
      <p className={muted}>{preview.provinceCount} จังหวัด · ปี ค.ศ. {preview.years.join(", ") || "—"}</p>
      {preview.errorCount > 0 && <Notice error><p className="font-semibold">ต้องแก้ไข {preview.errorCount} จุดก่อนบันทึก</p><ul className="mt-2 max-h-60 list-disc space-y-1 overflow-y-auto pl-5">{preview.errors.map((issue,index)=><li key={index}>{issue.row ? `แถวข้อมูล ${issue.row}: ` : ""}{issue.message}</li>)}</ul>{preview.errorCount > 100 && <p className="mt-2">แสดง 100 จุดแรก กรุณาแก้ไฟล์และตรวจใหม่</p>}</Notice>}
      {preview.warnings.length > 0 && <div className="rounded-xl border border-amber-400/30 bg-amber-100/30 p-3 text-sm leading-6 dark:bg-amber-400/5"><p className="font-semibold">ข้อควรตรวจสอบ (ไม่ใช่ข้อผิดพลาด)</p><ul className="mt-2 list-disc space-y-1 pl-5">{preview.warnings.map(warning=><li key={warning}>{warning}</li>)}</ul></div>}
      <details open><summary className="mb-3 cursor-pointer text-sm font-bold">ตัวอย่างข้อมูลที่ผ่านการตรวจ {preview.previewRows.length} แถวแรก</summary><DataTable rows={preview.previewRows} columns={dataset.columns}/></details>
      {preview.valid && <div className="space-y-3 border-t border-rice-forest/10 pt-4 dark:border-white/10">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} disabled={Boolean(busy)} onChange={event=>setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rice-leaf"/><span>ตรวจสอบแล้ว: จะบันทึก {preview.validRows.toLocaleString()} แถวในฉบับร่าง “{version.label}” แถวเดิมที่ตรงกันจะถูกแทนค่าทุกคอลัมน์ รวมถึงค่าว่าง ส่วนข้อมูลที่ไม่อยู่ในไฟล์จะไม่ถูกลบ</span></label>
        <button className={primary} disabled={!confirmed || Boolean(busy) || preview.revision !== version.revision} onClick={()=>void process("commit")}>{busy === "commit" ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <UploadCloud className="h-4 w-4"/>}{busy === "commit" ? "กำลังบันทึกทั้งไฟล์…" : "ยืนยันบันทึกลงฉบับร่าง"}</button>
      </div>}
    </div>}
    <details className={panel}><summary className="cursor-pointer text-sm font-bold">คู่มือคอลัมน์และรูปแบบไฟล์ • {dataset.columns.length} คอลัมน์</summary><p className={`my-3 ${muted}`}>ใช้ชื่อคอลัมน์ภาษาอังกฤษตามตาราง • CSV คั่นด้วย comma (,) • JSON ใช้ array ของ object • Excel อ่าน worksheet แรก • เว้นว่างแทนค่าที่ไม่มี ห้ามใส่ 0 แทนโดยไม่ตั้งใจ • ไฟล์ตัวอย่างเป็นข้อมูลจำลอง</p>
      <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr><th className="p-2">คอลัมน์</th><th className="p-2">เงื่อนไข</th><th className="p-2">ตัวอย่าง</th></tr></thead><tbody>{dataset.columns.map(column=><tr key={column.key} className="border-t border-rice-forest/10 dark:border-white/10"><td className="p-2"><code className="whitespace-nowrap">{column.key}</code><span className="mt-1 block text-rice-muted">{column.label}{column.required ? " · จำเป็น" : " · ไม่บังคับ"}</span></td><td className="min-w-44 p-2 leading-5">{column.help}</td><td className="p-2">{column.example}</td></tr>)}</tbody></table></div>
    </details>
  </section>;
}
