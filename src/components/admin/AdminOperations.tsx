"use client";

import {
  Bot,
  CheckCircle2,
  ImageUp,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import DashboardDataManager from "@/components/admin/DashboardDataManager";
import { button, errorText, input, panel, primary, request } from "@/components/admin/dashboard/shared";
import type { AdminAiModel, AdminDisease, AdminUser } from "@/lib/admin/types";

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl bg-rice-surface-soft/70 p-8 text-center text-sm text-[var(--app-text-secondary)] dark:bg-white/[0.04]">{children}</p>;
}

function Busy() {
  return <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />กำลังโหลด...</div>;
}

function Notice({ message, success = false }: { message: string; success?: boolean }) {
  return <div role={success ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${success ? "border-emerald-300/40 bg-emerald-50 text-emerald-800" : "border-rose-300/40 bg-rose-50 text-rose-800"}`}>{message}</div>;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยเข้าสู่ระบบ";
}

export function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    request<AdminUser[]>("/api/admin/users")
      .then((data) => { if (active) setUsers(data); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  const filtered = useMemo(() => users.filter((user) => user.email.toLowerCase().includes(search.trim().toLowerCase())), [search, users]);

  async function update(user: AdminUser, changes: { role?: "user" | "admin"; disabled?: boolean }) {
    const action = changes.role ? `เปลี่ยนสิทธิ์เป็น ${changes.role}` : `${changes.disabled ? "ปิด" : "เปิด"}บัญชี`;
    if (!window.confirm(`ยืนยัน${action}สำหรับ ${user.email}?`)) return;
    setBusyId(user.id); setError("");
    try {
      const updated = await request<AdminUser>("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, ...changes }) });
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (cause) { setError(errorText(cause)); }
    finally { setBusyId(null); }
  }

  return <section className="space-y-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div><p className="text-xs font-bold text-rice-leaf">จัดการบัญชี</p><h2 className="text-2xl font-bold">ผู้ใช้งาน</h2></div>
      <label className="relative w-full sm:max-w-sm"><Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-muted" /><input className={input + " pl-10"} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหาอีเมล" /></label>
    </div>
    {error && <Notice message={error} />}
    <div className={panel + " overflow-hidden p-0"}>
      {loading ? <Busy /> : !filtered.length ? <Empty>ไม่พบผู้ใช้งาน</Empty> : <div className="overflow-x-auto"><table className="w-full min-w-[880px] text-left text-sm"><thead className="bg-rice-mint/25"><tr>{["อีเมล", "Role", "สถานะ", "วันที่สมัคร", "Last Login", "จัดการ"].map((label) => <th key={label} className="p-4 font-bold">{label}</th>)}</tr></thead><tbody>{filtered.map((user) => <tr key={user.id} className="border-t border-[var(--app-border)]"><td className="p-4 font-semibold">{user.email}</td><td className="p-4"><select className={input + " min-h-10 py-1.5"} value={user.role} disabled={busyId === user.id} onChange={(event) => void update(user, { role: event.target.value as "user" | "admin" })}><option value="user">User</option><option value="admin">Admin</option></select></td><td className="p-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.disabled ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"}`}>{user.disabled ? "ปิดใช้งาน" : "ใช้งานได้"}</span></td><td className="p-4 whitespace-nowrap">{date(user.createdAt)}</td><td className="p-4 whitespace-nowrap">{date(user.lastSignInAt)}</td><td className="p-4"><button className={button} disabled={busyId === user.id} onClick={() => void update(user, { disabled: !user.disabled })}>{busyId === user.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />}{user.disabled ? "Enable" : "Disable"}</button></td></tr>)}</tbody></table></div>}
    </div>
    <p className="text-xs text-[var(--app-text-muted)]">ระบบไม่อนุญาต Hard Delete ผู้ใช้งาน เพื่อรักษาประวัติข้อมูลและ Audit Log</p>
  </section>;
}

type AgricultureCategory = "yield" | "price" | "flood" | "drought" | "storm";
type AgricultureRecord = { id: string; category: string; year: number; province_id: number | null; label: string; value: number | null; unit: string };
const AGRI_TABS: Array<{ id: AgricultureCategory; label: string }> = [
  { id: "yield", label: "ผลผลิตข้าว" }, { id: "price", label: "ราคาข้าว" }, { id: "flood", label: "น้ำท่วม" }, { id: "drought", label: "ภัยแล้ง" }, { id: "storm", label: "พายุ" },
];

export function AgriculturalDataPanel() {
  const [active, setActive] = useState<AgricultureCategory>("yield");
  const [rows, setRows] = useState<AgricultureRecord[]>([]);
  const [year, setYear] = useState("");
  const [province, setProvince] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AgricultureRecord | null>(null);
  const [draft, setDraft] = useState({ year: String(new Date().getFullYear()), provinceId: "", label: "", value: "", unit: "" });

  async function load() {
    if (active === "yield") return;
    setLoading(true); setError("");
    const params = new URLSearchParams({ category: active });
    if (year) params.set("year", year); if (province) params.set("province", province);
    try { setRows(await request<AgricultureRecord[]>(`/api/admin/agriculture?${params}`)); }
    catch (cause) { setError(errorText(cause)); }
    finally { setLoading(false); }
  }
  useEffect(() => {
    if (active === "yield") return;
    let mounted = true;
    const params = new URLSearchParams({ category: active });
    if (year) params.set("year", year);
    if (province) params.set("province", province);
    request<AgricultureRecord[]>(`/api/admin/agriculture?${params}`)
      .then((data) => { if (mounted) setRows(data); })
      .catch((cause) => { if (mounted) setError(errorText(cause)); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [active, year, province]);

  function open(record?: AgricultureRecord) {
    setEditing(record ?? null); setDraft(record ? { year: String(record.year), provinceId: record.province_id ? String(record.province_id) : "", label: record.label, value: record.value == null ? "" : String(record.value), unit: record.unit } : { year: String(new Date().getFullYear()), provinceId: "", label: "", value: "", unit: "" }); setFormOpen(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault(); setError("");
    try {
      await request("/api/admin/agriculture", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, id: editing?.id, category: active }) });
      setFormOpen(false); setEditing(null); await load();
    } catch (cause) { setError(errorText(cause)); }
  }
  async function remove(id: string) {
    if (!window.confirm("ยืนยันการลบข้อมูลรายการนี้?")) return;
    try { await request(`/api/admin/agriculture?id=${encodeURIComponent(id)}`, { method: "DELETE" }); await load(); }
    catch (cause) { setError(errorText(cause)); }
  }
  async function upload(file: File) {
    const body = new FormData(); body.append("category", active); body.append("file", file); setError("");
    try { await request("/api/admin/agriculture", { method: "POST", body }); await load(); }
    catch (cause) { setError(errorText(cause)); }
  }

  return <section className="space-y-5">
    <div><p className="text-xs font-bold text-rice-leaf">ฐานข้อมูล</p><h2 className="text-2xl font-bold">ข้อมูลการเกษตร</h2></div>
    <div className="flex gap-2 overflow-x-auto pb-1">{AGRI_TABS.map((tab) => <button key={tab.id} className={active === tab.id ? primary : button} onClick={() => { setActive(tab.id); setFormOpen(false); }}>{tab.label}</button>)}</div>
    {active === "yield" ? <DashboardDataManager /> : <>
      <div className="flex flex-wrap items-end gap-3 rounded-2xl bg-white/70 p-4 shadow-sm dark:bg-white/[0.04]">
        <label className="grid gap-1 text-xs font-bold">ปี<input className={input + " w-36"} type="number" value={year} onChange={(event) => setYear(event.target.value)} placeholder="ทุกปี" /></label>
        <label className="grid gap-1 text-xs font-bold">รหัสจังหวัด<input className={input + " w-40"} type="number" value={province} onChange={(event) => setProvince(event.target.value)} placeholder="ทุกจังหวัด" /></label>
        <button className={button} onClick={() => void load()}><RefreshCw className="h-4 w-4" />รีเฟรช</button>
        <button className={primary} onClick={() => open()}><Plus className="h-4 w-4" />เพิ่มข้อมูล</button>
        <label className={button + " cursor-pointer"}><UploadCloud className="h-4 w-4" />Upload CSV / Excel<input className="sr-only" type="file" accept=".csv,.xlsx,.xls" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.currentTarget.value = ""; }} /></label>
      </div>
      {error && <Notice message={error} />}
      {formOpen && <form onSubmit={save} className={panel + " grid gap-3 sm:grid-cols-2 lg:grid-cols-5"}><input className={input} type="number" required value={draft.year} onChange={(event) => setDraft({ ...draft, year: event.target.value })} placeholder="ปี ค.ศ." /><input className={input} type="number" value={draft.provinceId} onChange={(event) => setDraft({ ...draft, provinceId: event.target.value })} placeholder="รหัสจังหวัด" /><input className={input} required value={draft.label} onChange={(event) => setDraft({ ...draft, label: event.target.value })} placeholder="ชื่อข้อมูล" /><input className={input} type="number" step="any" value={draft.value} onChange={(event) => setDraft({ ...draft, value: event.target.value })} placeholder="ค่า" /><input className={input} value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} placeholder="หน่วย" /><div className="flex gap-2 sm:col-span-2 lg:col-span-5"><button className={primary} type="submit"><Save className="h-4 w-4" />บันทึก</button><button className={button} type="button" onClick={() => setFormOpen(false)}><X className="h-4 w-4" />ยกเลิก</button></div></form>}
      <div className={panel + " overflow-x-auto p-0"}>{loading ? <Busy /> : !rows.length ? <Empty>ไม่พบข้อมูล</Empty> : <table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-rice-mint/25"><tr>{["ปี", "จังหวัด", "รายการ", "ค่า", "หน่วย", "จัดการ"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-[var(--app-border)]"><td className="p-4">{row.year}</td><td className="p-4">{row.province_id ?? "ทั้งหมด"}</td><td className="p-4 font-semibold">{row.label}</td><td className="p-4 tabular-nums">{row.value ?? "—"}</td><td className="p-4">{row.unit || "—"}</td><td className="p-4"><div className="flex gap-2"><button className={button} onClick={() => open(row)}><Pencil className="h-4 w-4" /></button><button className={button + " text-rose-700"} onClick={() => void remove(row.id)}><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table>}</div>
    </>}
  </section>;
}

function metric(model: AdminAiModel, keys: string[]) {
  for (const key of keys) if (model.test_metrics[key] != null) return String(model.test_metrics[key]);
  return "—";
}

export function ModelsPanel() {
  const [models, setModels] = useState<AdminAiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() { setLoading(true); setError(""); try { setModels(await request<AdminAiModel[]>("/api/admin/models")); } catch (cause) { setError(errorText(cause)); } finally { setLoading(false); } }
  useEffect(() => {
    let active = true;
    request<AdminAiModel[]>("/api/admin/models")
      .then((data) => { if (active) setModels(data); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  async function update(model: AdminAiModel, changes: { active?: boolean; visible?: boolean }) {
    const label = changes.active ? "เปลี่ยน Active Model" : `${changes.visible ? "เปิด" : "ปิด"} Forecast หน้า User`;
    if (!window.confirm(`ยืนยัน${label}เป็น ${model.model_name}?`)) return;
    try { await request("/api/admin/models", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ version: model.model_version, ...changes }) }); await load(); }
    catch (cause) { setError(errorText(cause)); }
  }
  return <section className="space-y-5"><div><p className="text-xs font-bold text-rice-leaf">Forecast & AI</p><h2 className="text-2xl font-bold">จัดการโมเดล</h2></div>{error && <Notice message={error} />}{loading ? <Busy /> : !models.length ? <Empty>ยังไม่มีข้อมูลโมเดล</Empty> : <div className="grid gap-4 xl:grid-cols-2">{models.map((model) => <article key={model.model_version} className={panel}><div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-rice-mint/40 p-3"><Bot className="h-6 w-6" /></span><div className="flex gap-2">{model.is_active && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Active</span>}<span className={`rounded-full px-3 py-1 text-xs font-bold ${model.is_visible ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-600"}`}>{model.is_visible ? "แสดงหน้า User" : "ซ่อน"}</span></div></div><h3 className="mt-4 text-lg font-bold">{model.model_name}</h3><p className="text-xs text-[var(--app-text-muted)]">Version {model.model_version} · {model.target}</p><dl className="mt-5 grid grid-cols-4 gap-2">{[["Accuracy", ["accuracy", "Accuracy"]], ["MAE", ["mae", "MAE"]], ["RMSE", ["rmse", "RMSE"]], ["R²", ["r2", "r_squared", "R²"]]].map(([label, keys]) => <div key={label as string} className="rounded-xl bg-rice-surface-soft p-3 text-center"><dt className="text-[10px] text-rice-muted">{label as string}</dt><dd className="mt-1 font-bold">{metric(model, keys as string[])}</dd></div>)}</dl><div className="mt-5 flex flex-wrap gap-2"><button className={model.is_active ? button : primary} disabled={model.is_active} onClick={() => void update(model, { active: true })}><CheckCircle2 className="h-4 w-4" />{model.is_active ? "โมเดลปัจจุบัน" : "ตั้งเป็น Active"}</button><button className={button} onClick={() => void update(model, { visible: !model.is_visible })}><Power className="h-4 w-4" />{model.is_visible ? "ปิด Forecast" : "เปิด Forecast"}</button><a className={button} href="http://localhost:3000/analytics/yield" target="_blank" rel="noreferrer">ดู Forecast</a></div></article>)}</div>}</section>;
}

const EMPTY_DISEASE = { diseaseCode: "", nameTh: "", nameEn: "", imageUrl: "", symptoms: "", causes: "", prevention: "", treatment: "", isActive: true };

export function DiseasesPanel() {
  const [items, setItems] = useState<AdminDisease[]>([]);
  const [draft, setDraft] = useState(EMPTY_DISEASE);
  const [editing, setEditing] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() { setLoading(true); setError(""); try { setItems(await request<AdminDisease[]>("/api/admin/diseases")); } catch (cause) { setError(errorText(cause)); } finally { setLoading(false); } }
  useEffect(() => {
    let active = true;
    request<AdminDisease[]>("/api/admin/diseases")
      .then((data) => { if (active) setItems(data); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  function edit(item?: AdminDisease) { setEditing(item?.id ?? null); setDraft(item ? { diseaseCode: item.disease_code, nameTh: item.name_th, nameEn: item.name_en, imageUrl: item.image_url ?? "", symptoms: item.symptoms, causes: item.causes, prevention: item.prevention, treatment: item.treatment, isActive: item.is_active } : EMPTY_DISEASE); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); try { await request("/api/admin/diseases", { method: editing ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, id: editing }) }); setOpen(false); await load(); } catch (cause) { setError(errorText(cause)); } }
  async function upload(file: File) { const body = new FormData(); body.append("file", file); try { const data = await request<{ publicUrl: string }>("/api/admin/media", { method: "POST", body }); setDraft((current) => ({ ...current, imageUrl: data.publicUrl })); } catch (cause) { setError(errorText(cause)); } }
  async function remove(item: AdminDisease) { if (!window.confirm(`ยืนยันลบโรค ${item.name_th}?`)) return; try { await request(`/api/admin/diseases?id=${item.id}`, { method: "DELETE" }); await load(); } catch (cause) { setError(errorText(cause)); } }
  return <section className="space-y-5"><div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-rice-leaf">Rice Disease</p><h2 className="text-2xl font-bold">จัดการโรคข้าว</h2></div><button className={primary} onClick={() => edit()}><Plus className="h-4 w-4" />เพิ่มโรค</button></div>{error && <Notice message={error} />}{open && <form onSubmit={save} className={panel + " space-y-4"}><div className="flex items-center justify-between"><h3 className="font-bold">{editing ? "แก้ไขโรค" : "เพิ่มโรค"}</h3><button type="button" className={button} onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2"><input className={input} required disabled={Boolean(editing)} value={draft.diseaseCode} onChange={(event) => setDraft({ ...draft, diseaseCode: event.target.value })} placeholder="รหัสโรคจากโมเดล" /><input className={input} required value={draft.nameTh} onChange={(event) => setDraft({ ...draft, nameTh: event.target.value })} placeholder="ชื่อโรคภาษาไทย" /><input className={input} required value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} placeholder="ชื่อโรคภาษาอังกฤษ" /><div className="flex gap-2"><input className={input} value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="URL รูป" /><label className={button + " cursor-pointer px-3"}><ImageUp className="h-4 w-4" /><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label></div>{[["symptoms", "อาการ"], ["causes", "สาเหตุ"], ["prevention", "วิธีป้องกัน"], ["treatment", "วิธีรักษา"]].map(([key, label]) => <textarea key={key} className={input} rows={3} value={draft[key as keyof typeof draft] as string} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={label} />)}</div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />เปิดใช้งาน</label><button className={primary} type="submit"><Save className="h-4 w-4" />บันทึก</button></form>}{loading ? <Busy /> : !items.length ? <Empty>ยังไม่มีรายการโรค</Empty> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className={panel + " flex flex-col gap-4 sm:flex-row sm:items-center"}>{item.image_url ? <Image unoptimized src={item.image_url} alt="" width={96} height={80} className="h-20 w-24 rounded-xl object-cover" /> : <span className="flex h-20 w-24 items-center justify-center rounded-xl bg-rice-mint/30"><ShieldCheck className="h-7 w-7" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.name_th}</h3><span className="text-xs text-rice-muted">{item.name_en}</span>{!item.is_active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px]">ปิดใช้งาน</span>}</div><p className="mt-1 line-clamp-2 text-xs text-[var(--app-text-secondary)]">{item.symptoms || "ยังไม่มีรายละเอียดอาการ"}</p><p className="mt-2 text-xs font-bold text-rice-leaf">ตรวจพบ {item.detection_count.toLocaleString("th-TH")} ครั้ง</p></div><div className="flex gap-2"><button className={button} onClick={() => edit(item)}><Pencil className="h-4 w-4" />แก้ไข</button><button className={button + " text-rose-700"} onClick={() => void remove(item)}><Trash2 className="h-4 w-4" />ลบ</button></div></article>)}</div>}<div className={panel}><h3 className="font-bold">จัดการ Disease Model</h3><p className="mt-1 text-sm text-[var(--app-text-secondary)]">โมเดลปัจจุบันใช้ไฟล์ใน services/disease-ai/models และสถานะบริการตรวจได้จาก Health API</p><a href="http://127.0.0.1:8000/health" target="_blank" rel="noreferrer" className={button + " mt-3"}>ตรวจสถานะ Disease Model</a></div></section>;
}

type ActivityItem = { id: string; admin: string; action: string; resource_type: string; summary: string; created_at: string };
export function ActivityPanel() {
  const [items, setItems] = useState<ActivityItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { request<ActivityItem[]>("/api/admin/activity").then(setItems).catch((cause) => setError(errorText(cause))).finally(() => setLoading(false)); }, []);
  return <section className="space-y-5"><div><p className="text-xs font-bold text-rice-leaf">Audit</p><h2 className="text-2xl font-bold">Activity Log</h2></div>{error && <Notice message={error} />}{loading ? <Busy /> : !items.length ? <Empty>ยังไม่มีกิจกรรม</Empty> : <div className={panel + " overflow-x-auto p-0"}><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-rice-mint/25"><tr>{["Admin", "Action", "Target", "Date / Time"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[var(--app-border)]"><td className="p-4 font-semibold">{item.admin}</td><td className="p-4">{item.summary}</td><td className="p-4"><span className="rounded-full bg-rice-surface-soft px-2.5 py-1 text-xs">{item.resource_type}</span></td><td className="p-4 whitespace-nowrap">{date(item.created_at)}</td></tr>)}</tbody></table></div>}</section>;
}
