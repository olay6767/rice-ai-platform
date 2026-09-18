"use client";

import { useEffect, useState } from "react";
import { Download, EyeOff, History, LoaderCircle, Pencil, Trash2 } from "lucide-react";
import { DASHBOARD_DATASETS, getDashboardDataset, type AdminDashboardVersion, type DashboardDatasetType, type DashboardEvent, type DashboardRecords, type DashboardRow } from "@/lib/admin/dashboard-types";
import RecordEditor from "./RecordEditor";
import { API, DataTable, Field, Notice, button, date, download, errorText, input, muted, panel, request } from "./shared";

function Pagination({page,count,size,busy,onChange}: {page:number;count:number;size:number;busy:boolean;onChange:(page:number)=>void}) {
  const pages = Math.max(1,Math.ceil(count/size));
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className={muted}>{count.toLocaleString()} รายการ · หน้า {page} / {pages}</p><div className="flex gap-2"><button className={button} disabled={page <= 1 || busy} onClick={()=>onChange(page-1)}>ก่อนหน้า</button><button className={button} disabled={page >= pages || busy} onClick={()=>onChange(page+1)}>ถัดไป</button></div></div>;
}

export function DataBrowser({version,onSaved,onUnpublish,onCreateDraft}: {version:AdminDashboardVersion;onSaved:(message:string)=>void;onUnpublish:()=>void;onCreateDraft:()=>void}) {
  const [type,setType] = useState<DashboardDatasetType>("yearly-yield");
  const [province,setProvince] = useState("");
  const [year,setYear] = useState("");
  const [page,setPage] = useState(1);
  const [provinces,setProvinces] = useState<Array<{id:number;province_th:string}>>([]);
  const [result,setResult] = useState<DashboardRecords | null>(null);
  const [loading,setLoading] = useState(true);
  const [exporting,setExporting] = useState(false);
  const [error,setError] = useState("");
  const [reload,setReload] = useState(0);
  const [editing,setEditing] = useState<DashboardRow | null>(null);
  const [clearing,setClearing] = useState(false);
  const [deletingId,setDeletingId] = useState<number | null>(null);
  const dataset = getDashboardDataset(type);
  const years = version.datasets.find(item=>item.type === type)?.years ?? [];
  const query = new URLSearchParams({versionId:version.id,dataset:type,page:String(page)});
  if (province) query.set("province",province);
  if (year) query.set("year",year);
  const queryString = query.toString();
  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
    setLoading(true);setError("");setResult(null);
    await Promise.all([request<DashboardRecords>(`${API}?mode=records&${queryString}`,{signal:controller.signal}),request<Array<{id:number;province_th:string}>>(`${API}?mode=provinces`,{signal:controller.signal})]).then(([data,list])=>{if (!controller.signal.aborted) {setResult(data);setProvinces(list);}}).catch(error=>{if (!controller.signal.aborted) setError(errorText(error));}).finally(()=>{if (!controller.signal.aborted) setLoading(false);});
    }
    void load();
    return ()=>controller.abort();
  },[queryString,version.revision,reload]);
  async function exportData() {
    setExporting(true);setError("");
    try {await download(`${API}?mode=export&${queryString}`,`${version.version_key}_${dataset.fileName}`);} catch(error) {setError(errorText(error));} finally {setExporting(false);}
  }
  async function clearDataset() {
    if (!result?.count || !window.confirm(`ลบข้อมูล “${dataset.label}” ทั้งหมด ${result.count.toLocaleString()} แถวจากฉบับร่างนี้หรือไม่? การลบนี้ไม่กระทบเวอร์ชันที่เผยแพร่แล้ว`)) return;
    setClearing(true);setError("");
    try {
      const response = await request<{deletedRows:number}>(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clear-dataset",versionId:version.id,datasetType:type,revision:version.revision})});
      setReload(key=>key+1);
      onSaved(`ลบข้อมูล ${dataset.label} แล้ว ${Number(response.deletedRows).toLocaleString()} แถว`);
    } catch(error) {setError(errorText(error));} finally {setClearing(false);}
  }
  async function deleteRow(row:DashboardRow) {
    const recordId = Number(row.id);
    if (!Number.isSafeInteger(recordId) || recordId < 1 || !window.confirm("ลบข้อมูลแถวนี้จากฉบับร่างหรือไม่?")) return;
    setDeletingId(recordId);setError("");
    try {
      await request(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"delete-row",versionId:version.id,datasetType:type,recordId,revision:version.revision})});
      setReload(key=>key+1);
      onSaved("ลบข้อมูลรายแถวแล้ว");
    } catch(error) {setError(errorText(error));} finally {setDeletingId(null);}
  }
  return <section className={`${panel} space-y-4`}>
    <div><h3 className="text-lg font-bold">ข้อมูลที่บันทึกในเวอร์ชันนี้</h3><p className={muted}>แสดงครั้งละ 25 แถว • ดาวน์โหลดตามตัวกรองได้สูงสุด 20,000 แถวต่อไฟล์</p></div>
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="ประเภทข้อมูล"><select className={input} value={type} onChange={event=>{setType(event.target.value as DashboardDatasetType);setYear("");setPage(1);}}>{DASHBOARD_DATASETS.map(item=><option key={item.type} value={item.type}>{item.label}</option>)}</select></Field>
      <Field label="จังหวัด"><select className={input} value={province} onChange={event=>{setProvince(event.target.value);setPage(1);}}><option value="">ทุกจังหวัด</option>{provinces.map(item=><option key={item.id} value={item.id}>{item.province_th}</option>)}</select></Field>
      <Field label="ปี ค.ศ."><select className={input} value={year} onChange={event=>{setYear(event.target.value);setPage(1);}}><option value="">ทุกปี</option>{[...years].reverse().map(item=><option key={item} value={item}>{item} / พ.ศ. {item+543}</option>)}</select></Field>
    </div>
    <div className="flex flex-wrap gap-2"><button className={button} onClick={()=>setReload(key=>key+1)} disabled={loading || clearing || deletingId !== null}>รีเฟรชตาราง</button><button className={button} disabled={exporting || loading || clearing || deletingId !== null || !result?.count} onClick={()=>void exportData()}><Download className="h-4 w-4"/>{exporting ? "กำลังเตรียมไฟล์…" : "ดาวน์โหลดข้อมูลตามตัวกรอง"}</button>{version.status === "draft" && <button className={button + " border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10"} disabled={loading || clearing || deletingId !== null || !result?.count} onClick={()=>void clearDataset()}>{clearing ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}{clearing ? "กำลังลบข้อมูล…" : "ลบข้อมูลหมวดนี้"}</button>}</div>
    {error && <Notice error>{error}</Notice>}
    {version.status !== "draft" && <div className="space-y-3 rounded-xl bg-[var(--app-surface-soft)] p-4"><p className={muted}>{version.status === "published" ? "ต้องการแก้ข้อมูลในรุ่นเดิม? ปิดการเผยแพร่ก่อน ข้อมูลจะถูกซ่อนจากผู้ใช้ระหว่างแก้ไข หรือคัดลอกเป็นฉบับร่างเพื่อให้รุ่นเดิมแสดงต่อไป" : "เวอร์ชันนี้อยู่ในคลัง คัดลอกเป็นฉบับร่างเพื่อแก้ข้อมูลได้"}</p><div className="flex flex-wrap gap-2">{version.status === "published" && <button type="button" className={button} onClick={onUnpublish}><EyeOff className="h-4 w-4"/>ปิดเผยแพร่เพื่อแก้ไขรุ่นนี้</button>}<button type="button" className={button} onClick={onCreateDraft}>คัดลอกเป็นฉบับร่าง</button></div></div>}
    {loading ? <p className={muted} role="status">กำลังโหลดข้อมูล…</p> : result && <><DataTable rows={result.rows} columns={dataset.columns} provinces={new Map(provinces.map(item=>[item.id,item.province_th]))}
      renderActions={version.status === "draft" ? row => <div className="flex flex-wrap gap-2"><button type="button" className={button} disabled={clearing || deletingId !== null} onClick={()=>setEditing(row)} aria-label={`แก้ไขแถว จังหวัด ${provinces.find(item=>item.id === Number(row.province_id))?.province_th ?? row.province_id} ปี ${row[dataset.period]}${type === "monthly-environment" ? ` เดือน ${row.month}` : ""}`}><Pencil className="h-4 w-4"/>แก้ไข</button><button type="button" className={button + " border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10"} disabled={clearing || deletingId !== null} onClick={()=>void deleteRow(row)} aria-label="ลบข้อมูลแถวนี้">{deletingId === Number(row.id) ? <LoaderCircle className="h-4 w-4 animate-spin"/> : <Trash2 className="h-4 w-4"/>}ลบ</button></div> : undefined}/><Pagination page={page} count={result.count} size={25} busy={loading || clearing || deletingId !== null} onChange={setPage}/></>}
    {version.status === "draft" && <p className={muted}>ลบรายแถวได้จากตาราง หรือกด “ลบข้อมูลหมวดนี้” เพื่อล้างข้อมูลที่นำเข้าทั้งหมวดในฉบับร่าง เวอร์ชันที่เผยแพร่แล้วจะไม่ถูกกระทบ</p>}
    {editing && <RecordEditor version={version} type={type} row={editing} provinceName={provinces.find(item=>item.id === Number(editing.province_id))?.province_th ?? String(editing.province_id)} onClose={()=>setEditing(null)} onSaved={message=>{setEditing(null);setReload(key=>key+1);onSaved(message);}}/>}
  </section>;
}

export function VersionHistory({version}: {version:AdminDashboardVersion}) {
  const [page,setPage] = useState(1);
  const [result,setResult] = useState<{events:DashboardEvent[];count:number} | null>(null);
  const [error,setError] = useState("");
  const [loading,setLoading] = useState(true);
  const [reload,setReload] = useState(0);
  useEffect(()=>{
    const controller = new AbortController();
    async function load() {
    setLoading(true);setError("");setResult(null);
    await request<{events:DashboardEvent[];count:number}>(`${API}?mode=history&versionId=${version.id}&page=${page}`,{signal:controller.signal}).then(data=>{if (!controller.signal.aborted) setResult(data);}).catch(error=>{if (!controller.signal.aborted) setError(errorText(error));}).finally(()=>{if (!controller.signal.aborted) setLoading(false);});
    }
    void load();
    return ()=>controller.abort();
  },[version.id,version.revision,page,reload]);
  return <section className={panel}>
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-bold"><History className="h-5 w-5"/>ประวัติการอัปเดต</h3><button className={button} disabled={loading} onClick={()=>setReload(key=>key+1)}>รีเฟรช</button></div>
    <p className={`mb-4 ${muted}`}>บันทึกผู้ดำเนินการ เวลา ไฟล์ และจำนวนแถว เริ่มเก็บประวัติแบบละเอียดตั้งแต่เปิดใช้ระบบนี้</p>
    {error && <Notice error>{error}</Notice>}
    {loading ? <p className={muted}>กำลังโหลดประวัติ…</p> : result?.events.length ? <ol className="space-y-3">{result.events.map(event=><li key={event.id} className="rounded-xl border border-rice-forest/10 p-4 dark:border-white/10"><p className="font-semibold">{event.summary}</p><p className={`mt-1 break-words ${muted}`}>{date(event.created_at)} · {event.actor_name}</p>{event.action === "import" && <div className="mt-3 rounded-lg bg-rice-mint/20 p-3 text-xs leading-6"><p className="break-all">ไฟล์: {String(event.details.fileName ?? "—")}</p><p>ข้อมูล: {DASHBOARD_DATASETS.find(item=>item.type === event.details.datasetType)?.label ?? "—"}</p><p>บันทึก {Number(event.details.importedRows ?? 0).toLocaleString()} แถว · เพิ่ม {Number(event.details.inserts ?? 0).toLocaleString()} · อัปเดต {Number(event.details.updates ?? 0).toLocaleString()}</p></div>}{event.action === "clear-dataset" && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs leading-6 text-rose-800 dark:bg-rose-400/[0.07] dark:text-rose-100"><p>ลบหมวด: {String(event.details.datasetLabel ?? DASHBOARD_DATASETS.find(item=>item.type === event.details.datasetType)?.label ?? "—")}</p><p>ลบข้อมูล {Number(event.details.deletedRows ?? 0).toLocaleString()} แถว</p></div>}{event.action === "delete-row" && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs leading-6 text-rose-800 dark:bg-rose-400/[0.07] dark:text-rose-100">ลบข้อมูลแถวที่ {String(event.details.recordId ?? "—")} · {DASHBOARD_DATASETS.find(item=>item.type === event.details.datasetType)?.label ?? "—"}</div>}{event.action === "delete-import-file" && <div className="mt-3 rounded-lg bg-rose-50 p-3 text-xs leading-6 text-rose-800 dark:bg-rose-400/[0.07] dark:text-rose-100"><p className="break-all">ลบไฟล์: {String(event.details.fileName ?? "—")}</p><p>ลบข้อมูล {Number(event.details.deletedRows ?? 0).toLocaleString()} แถว · {DASHBOARD_DATASETS.find(item=>item.type === event.details.datasetType)?.label ?? "—"}</p></div>}{event.action === "clone" && <p className={`mt-2 ${muted}`}>ต้นฉบับ: {String(event.details.sourceLabel ?? "—")}</p>}</li>)}</ol> : <p className="py-8 text-center text-sm text-rice-muted">ยังไม่มีประวัติใหม่ของเวอร์ชันนี้</p>}
    {result?.events.filter(event=>event.action === "edit-row").map(event=><details key={event.id} className="mt-3 rounded-xl border border-[var(--app-border)] p-4"><summary className="cursor-pointer text-sm font-semibold">ดูค่าเดิม–ค่าใหม่ · {date(event.created_at)} · แถว {String(event.details.recordId)}</summary><div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">คอลัมน์</th><th className="p-2">ค่าเดิม</th><th className="p-2">ค่าใหม่</th></tr></thead><tbody>{Object.entries((event.details.after ?? {}) as Record<string,unknown>).filter(([key,value])=>JSON.stringify(value) !== JSON.stringify((event.details.before as Record<string,unknown> | undefined)?.[key])).map(([key,value])=><tr key={key}><td className="p-2">{DASHBOARD_DATASETS.find(item=>item.type === event.details.datasetType)?.columns.find(column=>column.key === key)?.label ?? key}</td><td className="p-2">{String((event.details.before as Record<string,unknown> | undefined)?.[key] ?? "—")}</td><td className="p-2">{String(value ?? "—")}</td></tr>)}</tbody></table></div></details>)}
    {result && <Pagination page={page} count={result.count} size={20} busy={loading} onChange={setPage}/>}
  </section>;
}
