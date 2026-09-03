"use client";

import { useState, type FormEvent } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { getDashboardDataset, type AdminDashboardVersion, type DashboardDatasetType, type DashboardRow } from "@/lib/admin/dashboard-types";
import { API, Dialog, Field, Notice, button, errorText, input, muted, primary, request } from "./shared";

const booleanFields = new Set(["rice_ndvi_imputed", "rice_ndvi_structural_missing"]);
const textFields = new Set(["crop_year", "model_version", "rice_ndvi_final_quality"]);

export default function RecordEditor({version,type,row,provinceName,onClose,onSaved}: {
  version:AdminDashboardVersion; type:DashboardDatasetType; row:DashboardRow; provinceName:string;
  onClose:()=>void; onSaved:(message:string)=>void;
}) {
  const dataset = getDashboardDataset(type);
  const keys = new Set<string>(dataset.keys);
  const [values,setValues] = useState<Record<string,string>>(() => Object.fromEntries(dataset.columns.map(column => [column.key, row[column.key] == null ? "" : String(row[column.key])])));
  const [busy,setBusy] = useState(false);
  const [confirmed,setConfirmed] = useState(false);
  const [error,setError] = useState("");
  const changed = dataset.columns.some(column => values[column.key] !== (row[column.key] == null ? "" : String(row[column.key])));
  async function save(event:FormEvent) {
    event.preventDefault();
    if (!changed || !confirmed || version.status !== "draft" || busy) return;
    setBusy(true);setError("");
    try {
      await request(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        action:"edit-row",versionId:version.id,revision:version.revision,datasetType:type,recordId:Number(row.id),row:values,
      })});
      onSaved(`บันทึกการแก้ไข ${dataset.label} · ${provinceName} แล้ว ยังไม่เผยแพร่ต่อผู้ใช้`);
    } catch (error) { setError(errorText(error)); } finally { setBusy(false); }
  }
  return <Dialog title="แก้ไขข้อมูล Dashboard" onClose={onClose} busy={busy}>
    <form onSubmit={save} className="space-y-5">
      <div className="rounded-xl bg-[var(--app-surface-soft)] p-4">
        <p className="font-semibold">{dataset.label} · {provinceName}</p>
        <p className={`mt-1 break-words ${muted}`}>ฉบับร่าง: {version.label} · ปี {String(row[dataset.period])}{type === "monthly-environment" ? ` · เดือน ${row.month}` : ""}</p>
      </div>
      <p className={muted}>แก้ค่าในแถวนี้ได้โดยตรง เว้นว่างหากไม่มีข้อมูล ไม่ใช้ 0 แทนค่าว่าง จังหวัดและช่วงเวลาของแถวเดิมจะเปลี่ยนไม่ได้</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {dataset.columns.map(column => <Field key={column.key} label={column.label + (column.required ? " *" : "")}>
          {booleanFields.has(column.key)
            ? <select className={input} disabled={busy} value={values[column.key]} onChange={event=>{setValues({...values,[column.key]:event.target.value});setConfirmed(false);}}><option value="false">ไม่ใช่</option><option value="true">ใช่</option></select>
            : <input className={input} disabled={busy || keys.has(column.key)} type={textFields.has(column.key) ? "text" : "number"} step="any" required={column.required}
                value={values[column.key]} onChange={event=>{setValues({...values,[column.key]:event.target.value});setConfirmed(false);}} />}
          <span className="text-xs font-normal leading-5 text-[var(--app-text-secondary)]">{column.help}</span>
        </Field>)}
      </div>
      {error && <Notice error>{error}</Notice>}
      <label className="flex items-start gap-3 text-sm leading-6"><input className="mt-1 h-5 w-5 shrink-0 accent-rice-leaf" type="checkbox" checked={confirmed} disabled={busy || !changed} onChange={event=>setConfirmed(event.target.checked)} /><span>ตรวจสอบแล้ว ยืนยันแทนค่าของแถวนี้ในฉบับร่าง ระบบจะเก็บค่าเดิมและค่าใหม่ในประวัติ โดยไม่เผยแพร่อัตโนมัติ</span></label>
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={button} disabled={busy} onClick={onClose}>ยกเลิก</button>
        <button type="submit" className={primary} disabled={busy || !changed || !confirmed || version.status !== "draft"}>{busy ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}{busy ? "กำลังบันทึก…" : "บันทึกการแก้ไข"}</button>
      </div>
    </form>
  </Dialog>;
}
