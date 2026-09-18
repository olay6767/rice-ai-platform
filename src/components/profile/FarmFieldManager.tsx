"use client";

import { readJsonResponse } from "@/lib/http/json";

import { CheckCircle2, ChevronRight, Edit3, LoaderCircle, MapPin, Plus, Search, Sprout, Star, Trash2, X } from "lucide-react";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { FarmField, FarmFieldInput } from "@/lib/farms/types";

const API = "/api/farm-fields";
const ACTIVE_LOCATION_STORAGE_KEY = "rice-weather-active-location-v1";

interface LocationResult {
  id: string;
  label: string;
  locality: string | null;
  district: string | null;
  province: string | null;
  latitude: number;
  longitude: number;
}

interface FarmFieldManagerProps {
  initialName: string;
  initialProvince: string;
  initialDistrict: string;
}

function emptyForm(initial: FarmFieldManagerProps): FarmFieldInput {
  return {
    name: initial.initialName || "แปลงหลัก",
    province: initial.initialProvince,
    district: initial.initialDistrict,
    subdistrict: "",
    areaRai: 0,
    riceVariety: "",
    plantingDate: "",
    expectedHarvestDate: "",
    latitude: null,
    longitude: null,
    isPrimary: true,
  };
}

function toForm(field: FarmField): FarmFieldInput {
  return {
    name: field.name,
    province: field.province,
    district: field.district ?? "",
    subdistrict: field.subdistrict ?? "",
    areaRai: field.areaRai,
    riceVariety: field.riceVariety,
    plantingDate: field.plantingDate ?? "",
    expectedHarvestDate: field.expectedHarvestDate ?? "",
    latitude: field.latitude,
    longitude: field.longitude,
    isPrimary: field.isPrimary,
  };
}

async function responseError(response: Response): Promise<string> {
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return payload?.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่";
}

function savePrimaryLocation(field: FarmField): void {
  if (field.latitude === null || field.longitude === null) return;
  const label = [field.subdistrict, field.district, field.province].filter(Boolean).join(" · ") || field.name;
  try {
    window.localStorage.setItem(ACTIVE_LOCATION_STORAGE_KEY, JSON.stringify({
      id: `farm:${field.id}`,
      name: label,
      region: "แปลงหลักของคุณ",
      district: field.district ?? undefined,
      province: field.province,
      latitude: field.latitude,
      longitude: field.longitude,
      custom: true,
      source: "search",
      labelSource: "user-corrected",
    }));
  } catch {
    // The farm still saves when local browser storage is unavailable.
  }
}

const inputClassName = "mt-1.5 min-h-11 w-full rounded-xl border border-rice-forest/10 bg-rice-background px-3.5 py-2 text-base text-rice-dark outline-none transition focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/30 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm dark:border-white/10 dark:bg-white/[0.055] dark:text-white";

export default function FarmFieldManager(initial: FarmFieldManagerProps) {
  const [fields, setFields] = useState<FarmField[]>([]);
  const [form, setForm] = useState<FarmFieldInput>(() => emptyForm(initial));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState<LocationResult[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);

  const editing = useMemo(() => fields.find((field) => field.id === editingId) ?? null, [fields, editingId]);
  const totalArea = useMemo(() => fields.reduce((total, field) => total + field.areaRai, 0), [fields]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch(API, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        return readJsonResponse<{ data: { fields: FarmField[] } }>(response);
      })
      .then((payload) => setFields(payload.data.fields))
      .catch((requestError: unknown) => {
        if (!(requestError instanceof DOMException && requestError.name === "AbortError")) {
          setError(requestError instanceof Error ? requestError.message : "ไม่สามารถโหลดแปลงนาได้");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = locationQuery.trim();
    if (query.length < 2) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearchingLocation(true);
      void fetch(`/api/weather/location?${new URLSearchParams({ query }).toString()}`, { cache: "no-store", signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) throw new Error(await responseError(response));
          return readJsonResponse<{ data: LocationResult[] }>(response);
        })
        .then((payload) => setLocationResults(payload.data.slice(0, 5)))
        .catch(() => setLocationResults([]))
        .finally(() => { if (!controller.signal.aborted) setSearchingLocation(false); });
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [locationQuery]);

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm(initial));
    setLocationQuery("");
    setLocationResults([]);
    setError("");
  }

  function chooseLocation(result: LocationResult) {
    setForm((current) => ({
      ...current,
      province: result.province ?? current.province,
      district: result.district ?? current.district,
      subdistrict: result.locality ?? current.subdistrict,
      latitude: result.latitude,
      longitude: result.longitude,
    }));
    setLocationQuery(result.label);
    setLocationResults([]);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(API, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { ...form, id: editingId } : form),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const payload = await readJsonResponse<{ data: FarmField }>(response);
      const saved = payload.data;
      setFields((current) => {
        const next = editingId ? current.map((field) => field.id === saved.id ? saved : field) : [saved, ...current];
        return next.sort((first, second) => Number(second.isPrimary) - Number(first.isPrimary));
      });
      if (saved.isPrimary) savePrimaryLocation(saved);
      setSuccess(editingId ? "แก้ไขข้อมูลแปลงนาแล้ว" : "เพิ่มแปลงนาแล้ว");
      setEditingId(saved.id);
      setForm(toForm(saved));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "ไม่สามารถบันทึกแปลงนาได้");
    } finally { setSaving(false); }
  }

  async function remove(field: FarmField) {
    if (!window.confirm(`ลบ “${field.name}” ออกจากโปรไฟล์แปลงนาหรือไม่?`)) return;
    setSaving(true); setError(""); setSuccess("");
    try {
      const response = await fetch(`${API}?${new URLSearchParams({ id: field.id }).toString()}`, { method: "DELETE" });
      if (!response.ok) throw new Error(await responseError(response));
      setFields((current) => current.filter((item) => item.id !== field.id));
      if (field.isPrimary) {
        try { window.localStorage.removeItem(ACTIVE_LOCATION_STORAGE_KEY); } catch { /* ignore */ }
      }
      resetForm();
      setSuccess("ลบแปลงนาแล้ว");
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "ไม่สามารถลบแปลงนาได้");
    } finally { setSaving(false); }
  }

  return <section id="farm-fields" aria-label="จัดการแปลงนา" className="mt-6 scroll-mt-24 rounded-[2rem] border border-rice-forest/10 bg-white/80 p-5 shadow-card backdrop-blur sm:p-7 dark:border-white/10 dark:bg-white/[0.045]">
    <div className="flex flex-col gap-4 border-b border-rice-forest/10 pb-5 dark:border-white/10 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-mint/60 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light"><Sprout className="h-5 w-5" /></span><div><h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">แปลงนาของฉัน</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-rice-muted dark:text-white/45">บันทึกพื้นที่ พันธุ์ข้าว และช่วงเพาะปลูก เพื่อใช้แปลงหลักกับสภาพอากาศและการแจ้งเตือน</p></div></div>
      <div className="flex gap-2"><span className="rounded-xl bg-rice-mint/35 px-3 py-2 text-xs font-bold text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light">{fields.length} แปลง</span>{fields.length > 0 && <span className="rounded-xl bg-rice-surface-soft px-3 py-2 text-xs font-bold text-rice-dark dark:bg-white/10 dark:text-white">{totalArea.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ไร่</span>}</div>
    </div>

    {error && <p role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200">{error}</p>}
    {success && <p role="status" className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{success}</p>}

    <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-3">
        <div className="flex items-center justify-between"><h3 className="text-sm font-bold text-rice-forest dark:text-white">รายการแปลง</h3><button type="button" onClick={resetForm} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-rice-forest px-3 text-xs font-bold text-white hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"><Plus className="h-4 w-4" />เพิ่มแปลง</button></div>
        {loading && <p className="flex min-h-24 items-center gap-2 rounded-2xl bg-rice-surface-soft px-4 text-sm text-rice-muted dark:bg-white/[0.05] dark:text-white/50"><LoaderCircle className="h-4 w-4 animate-spin" />กำลังโหลดแปลงนา…</p>}
        {!loading && !fields.length && <p className="rounded-2xl border border-dashed border-rice-forest/15 px-4 py-8 text-center text-sm leading-6 text-rice-muted dark:border-white/15 dark:text-white/50">เริ่มเพิ่มแปลงแรก เพื่อใช้เป็นบริบทสำหรับสภาพอากาศและคำแนะนำ</p>}
        {fields.map((field) => <article key={field.id} className={`rounded-2xl border p-4 ${editingId === field.id ? "border-rice-leaf bg-rice-mint/15 dark:border-rice-mint-light/50 dark:bg-rice-leaf/15" : "border-rice-forest/10 bg-rice-background/65 dark:border-white/10 dark:bg-white/[0.03]"}`}>
          <div className="flex gap-3"><span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rice-mint/50 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light"><MapPin className="h-4 w-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-bold text-rice-forest dark:text-white">{field.name}</h4>{field.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-rice-leaf/15 px-2 py-0.5 text-[11px] font-bold text-rice-leaf dark:text-rice-mint-light"><Star className="h-3 w-3" />แปลงหลัก</span>}</div><p className="mt-1 text-xs text-rice-muted dark:text-white/45">{[field.subdistrict, field.district, field.province].filter(Boolean).join(" · ")}</p><p className="mt-2 text-xs text-rice-dark dark:text-white/75">{field.areaRai.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ไร่ · {field.riceVariety}</p></div></div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={saving} onClick={() => { setEditingId(field.id); setForm(toForm(field)); setSuccess(""); setError(""); }} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rice-forest/10 px-2.5 text-xs font-bold text-rice-forest hover:bg-rice-mint/20 disabled:opacity-60 dark:border-white/10 dark:text-white dark:hover:bg-white/10"><Edit3 className="h-3.5 w-3.5" />แก้ไข</button><button type="button" disabled={saving || (field.isPrimary && fields.length > 1)} title={field.isPrimary && fields.length > 1 ? "เลือกแปลงอื่นเป็นแปลงหลักก่อนลบ" : undefined} onClick={() => void remove(field)} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-2.5 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-400/10"><Trash2 className="h-3.5 w-3.5" />ลบ</button></div>
        </article>)}
      </div>

      <form onSubmit={(event) => void save(event)} className="rounded-2xl border border-rice-forest/10 bg-rice-background/50 p-4 sm:p-5 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-start justify-between gap-3"><div><h3 className="font-heading text-base font-bold text-rice-forest dark:text-white">{editing ? `แก้ไข ${editing.name}` : "เพิ่มแปลงนา"}</h3><p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/45">ช่องที่มี * จำเป็นต่อการสร้างบริบทแปลงนา</p></div>{editing && <button type="button" onClick={resetForm} className="rounded-lg p-2 text-rice-muted hover:bg-rice-surface-soft dark:text-white/50 dark:hover:bg-white/10" aria-label="ยกเลิกการแก้ไข"><X className="h-4 w-4" /></button>}</div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-rice-dark sm:col-span-2 dark:text-white">ชื่อแปลง *<input required minLength={2} maxLength={120} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={saving} className={inputClassName} placeholder="เช่น แปลงบ้านสุรนารี" /></label>
          <div className="relative sm:col-span-2"><label className="text-sm font-semibold text-rice-dark dark:text-white">ค้นหาพื้นที่จริง</label><span className="relative block"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-rice-muted" /><input value={locationQuery} onChange={(event) => setLocationQuery(event.target.value)} disabled={saving} className={`${inputClassName} pl-10`} placeholder="พิมพ์ตำบล อำเภอ หรือจังหวัด" /></span>{searchingLocation && <LoaderCircle className="absolute right-3 top-10 h-4 w-4 animate-spin text-rice-muted" />}{locationQuery.trim().length >= 2 && locationResults.length > 0 && <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-xl border border-rice-forest/10 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-rice-dark">{locationResults.map((result) => <button key={result.id} type="button" onClick={() => chooseLocation(result)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-rice-mint/20 dark:hover:bg-white/10"><span className="min-w-0"><b className="block truncate text-rice-forest dark:text-white">{result.label}</b><span className="mt-0.5 block truncate text-xs text-rice-muted dark:text-white/45">{[result.locality, result.district, result.province].filter(Boolean).join(" · ")}</span></span><ChevronRight className="h-4 w-4 shrink-0 text-rice-muted" /></button>)}</div>}</div>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">จังหวัด *<input required minLength={2} maxLength={100} value={form.province} onChange={(event) => setForm({ ...form, province: event.target.value })} disabled={saving} className={inputClassName} placeholder="เช่น นครราชสีมา" /></label>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">อำเภอ<input maxLength={100} value={form.district} onChange={(event) => setForm({ ...form, district: event.target.value })} disabled={saving} className={inputClassName} placeholder="เช่น เมืองนครราชสีมา" /></label>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">ตำบล<input maxLength={100} value={form.subdistrict} onChange={(event) => setForm({ ...form, subdistrict: event.target.value })} disabled={saving} className={inputClassName} placeholder="เช่น สุรนารี" /></label>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">พื้นที่ปลูก (ไร่) *<input required type="number" min="0.01" max="1000000" step="0.01" inputMode="decimal" value={form.areaRai || ""} onChange={(event) => setForm({ ...form, areaRai: Number(event.target.value) })} disabled={saving} className={inputClassName} placeholder="เช่น 12.5" /></label>
          <label className="text-sm font-semibold text-rice-dark sm:col-span-2 dark:text-white">พันธุ์ข้าว *<input required minLength={2} maxLength={120} value={form.riceVariety} onChange={(event) => setForm({ ...form, riceVariety: event.target.value })} disabled={saving} className={inputClassName} placeholder="เช่น กข43 หรือ หอมมะลิ 105" /></label>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">วันเริ่มปลูก *<input required type="date" value={form.plantingDate} onChange={(event) => setForm({ ...form, plantingDate: event.target.value })} disabled={saving} className={inputClassName} /></label>
          <label className="text-sm font-semibold text-rice-dark dark:text-white">คาดว่าเก็บเกี่ยว<input type="date" min={form.plantingDate || undefined} value={form.expectedHarvestDate} onChange={(event) => setForm({ ...form, expectedHarvestDate: event.target.value })} disabled={saving} className={inputClassName} /></label>
        </div>
        <div className="mt-4 rounded-xl bg-rice-mint/20 px-3.5 py-3 text-xs leading-5 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light"><b>พิกัดสำหรับสภาพอากาศ:</b> {form.latitude === null || form.longitude === null ? "ยังไม่ได้เลือก — ค้นหาพื้นที่จริงด้านบนเพื่อให้ข้อมูลอากาศตรงกับแปลง" : `${form.latitude.toFixed(5)}, ${form.longitude.toFixed(5)}`}</div>
        <label className="mt-4 flex items-start gap-3 rounded-xl border border-rice-forest/10 px-3.5 py-3 text-sm text-rice-dark dark:border-white/10 dark:text-white"><input type="checkbox" checked={form.isPrimary} disabled={saving || Boolean(editing?.isPrimary)} onChange={(event) => setForm({ ...form, isPrimary: event.target.checked })} className="mt-0.5 h-4 w-4 accent-rice-leaf" /><span><b>ใช้เป็นแปลงหลัก</b><span className="mt-0.5 block text-xs leading-5 text-rice-muted dark:text-white/45">หน้าสภาพอากาศและการแจ้งเตือนจะใช้ตำแหน่งของแปลงนี้ {editing?.isPrimary ? "เลือกแปลงอื่นแล้วบันทึก หากต้องการเปลี่ยนแปลงหลัก" : ""}</span></span></label>
        <div className="mt-5 flex justify-end"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-rice-natural px-5 text-sm font-bold text-white shadow-primary transition hover:bg-rice-forest disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sprout className="h-4 w-4" />}{saving ? "กำลังบันทึก…" : editing ? "บันทึกการแก้ไข" : "บันทึกแปลงนา"}</button></div>
      </form>
    </div>
  </section>;
}
