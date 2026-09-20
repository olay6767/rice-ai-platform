"use client";

import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  FileText,
  ImageUp,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Newspaper,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  UsersRound,
  Wheat,
  BrainCircuit,
  Bug,
  ScrollText,
  X,
} from "lucide-react";
import Image from "next/image";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

import type {
  AdminAlert,
  AdminNewsPost,
  AdminOverview,
  AdminRecommendation,
  AdminResource,
  AdminRicePrice,
  AdminRole,
} from "@/lib/admin/types";
import {
  ActivityPanel,
  AgriculturalDataPanel,
  DiseasesPanel,
  ModelsPanel,
  UsersPanel,
} from "@/components/admin/AdminOperations";
import AdminNewsEditor from "@/components/admin/AdminNewsEditor";
import AdminThemeToggle from "@/components/admin/AdminThemeToggle";
import { createClient } from "@/lib/supabase/client";

type AdminTab =
  | "overview"
  | "users"
  | "agriculture"
  | "models"
  | "diseases"
  | "activity"
  | AdminResource;
type FormValue = string | boolean;
type Draft = Record<string, FormValue>;

const TAB_ITEMS: Array<{
  id: AdminTab;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "users", label: "ผู้ใช้งาน", icon: UsersRound },
  { id: "agriculture", label: "ข้อมูลการเกษตร", icon: Wheat },
  { id: "models", label: "Forecast & AI Model", icon: BrainCircuit },
  { id: "diseases", label: "โรคข้าว", icon: Bug },
  { id: "posts", label: "ข่าวและอินโฟกราฟิก", icon: Newspaper },
  { id: "activity", label: "Activity Log", icon: ScrollText },
];

const EMPTY_RECORDS: Record<
  AdminResource,
  Array<AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation>
> = {
  posts: [],
  alerts: [],
  prices: [],
  recommendations: [],
};

function isResource(tab: AdminTab): tab is AdminResource {
  return ["posts", "alerts", "prices", "recommendations"].includes(tab);
}

function dateTimeInput(value?: string | null): string {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offsetDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return offsetDate.toISOString().slice(0, 16);
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "ยังไม่กำหนด";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  }).format(value);
}

function getVisibilityStatus(
  resource: AdminResource,
  item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation
): { label: string; className: string } {
  const visibleClassName =
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200";
  const pendingClassName =
    "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200";
  const hiddenClassName =
    "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/55";
  const now = Date.now();

  if (resource === "posts") {
    const post = item as AdminNewsPost;

    if (post.status !== "published") {
      return { label: "ฉบับร่าง — ยังไม่แสดง", className: hiddenClassName };
    }

    if (post.published_at && Date.parse(post.published_at) > now) {
      return { label: "ตั้งเวลาเผยแพร่", className: pendingClassName };
    }

    return { label: "กำลังแสดงบนเว็บ", className: visibleClassName };
  }

  if (resource === "prices") {
    return (item as AdminRicePrice).is_published
      ? { label: "กำลังแสดงบนเว็บ", className: visibleClassName }
      : { label: "ปิดเผยแพร่ — ยังไม่แสดง", className: hiddenClassName };
  }

  const scheduledItem = item as AdminAlert | AdminRecommendation;

  if (!scheduledItem.is_active) {
    return { label: "ปิดใช้งาน — ยังไม่แสดง", className: hiddenClassName };
  }

  if (Date.parse(scheduledItem.starts_at) > now) {
    return { label: "ตั้งเวลาแสดง", className: pendingClassName };
  }

  if (
    scheduledItem.expires_at &&
    Date.parse(scheduledItem.expires_at) <= now
  ) {
    return { label: "หมดอายุ — ไม่แสดง", className: hiddenClassName };
  }

  return { label: "กำลังแสดงบนเว็บ", className: visibleClassName };
}

function getInitialDraft(resource: AdminResource): Draft {
  const now = dateTimeInput(new Date().toISOString());

  switch (resource) {
    case "posts":
      return {
        title: "",
        summary: "",
        body: "",
        category: "weather",
        sourceName: "Rice AI",
        imageUrl: "",
        imageAlt: "",
        isFeatured: false,
        status: "published",
        publishedAt: now,
      };
    case "alerts":
      return {
        title: "",
        description: "",
        alertType: "weather",
        severity: "medium",
        areaName: "ประเทศไทย",
        isActive: true,
        startsAt: now,
        expiresAt: "",
      };
    case "prices":
      return {
        riceType: "",
        pricePerTon: "",
        trend: "steady",
        changePercent: "0",
        marketName: "ราคาอ้างอิง Rice AI",
        observedAt: now,
        isPublished: true,
      };
    case "recommendations":
      return {
        title: "",
        description: "",
        category: "water",
        priority: "normal",
        isActive: true,
        startsAt: now,
        expiresAt: "",
      };
  }
}

function getItemDraft(
  resource: AdminResource,
  item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation
): Draft {
  switch (resource) {
    case "posts": {
      const post = item as AdminNewsPost;
      return {
        title: post.title,
        summary: post.summary,
        body: post.body,
        category: post.category,
        sourceName: post.source_name,
        imageUrl: post.image_url ?? "",
        imageAlt: post.image_alt,
        isFeatured: post.is_featured,
        status: post.status,
        publishedAt: dateTimeInput(post.published_at),
      };
    }
    case "alerts": {
      const alert = item as AdminAlert;
      return {
        title: alert.title,
        description: alert.description,
        alertType: alert.alert_type,
        severity: alert.severity,
        areaName: alert.area_name,
        isActive: alert.is_active,
        startsAt: dateTimeInput(alert.starts_at),
        expiresAt: dateTimeInput(alert.expires_at),
      };
    }
    case "prices": {
      const price = item as AdminRicePrice;
      return {
        riceType: price.rice_type,
        pricePerTon: String(price.price_per_ton),
        trend: price.trend,
        changePercent: String(price.change_percent),
        marketName: price.market_name,
        observedAt: dateTimeInput(price.observed_at),
        isPublished: price.is_published,
      };
    }
    case "recommendations": {
      const recommendation = item as AdminRecommendation;
      return {
        title: recommendation.title,
        description: recommendation.description,
        category: recommendation.category,
        priority: recommendation.priority,
        isActive: recommendation.is_active,
        startsAt: dateTimeInput(recommendation.starts_at),
        expiresAt: dateTimeInput(recommendation.expires_at),
      };
    }
  }
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...options?.headers,
    },
  });
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;

  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่");
  }

  return payload.data;
}

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-100">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-rice-forest dark:text-white/80">
        {label}
      </span>
      {children}
    </label>
  );
}

const inputClassName =
  "w-full rounded-xl border border-rice-forest/15 bg-white px-3 py-2.5 text-sm text-rice-forest outline-none transition placeholder:text-rice-muted/60 focus:border-rice-leaf focus:ring-4 focus:ring-rice-mint/35 dark:border-white/10 dark:bg-white/[0.06] dark:text-white";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-xl bg-rice-surface-soft/70 px-3 py-2.5 text-sm font-semibold text-rice-forest dark:bg-white/[0.04] dark:text-white">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-rice-leaf"
      />
      {label}
    </label>
  );
}

function ContentForm({
  resource,
  draft,
  onChange,
  onSubmit,
  onCancel,
  onUpload,
  isSaving,
  isUploading,
  editing,
}: {
  resource: AdminResource;
  draft: Draft;
  onChange: (key: string, value: FormValue) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  onUpload: (file: File) => void;
  isSaving: boolean;
  isUploading: boolean;
  editing: boolean;
}) {
  const text = (key: string) => String(draft[key] ?? "");
  const checked = (key: string) => draft[key] === true;

  return (
    <form onSubmit={onSubmit} className="mb-6 rounded-3xl border border-rice-leaf/20 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">
            {editing ? "แก้ไขข้อมูล" : "เพิ่มข้อมูลใหม่"}
          </p>
          <h2 className="font-heading text-xl font-bold text-rice-forest dark:text-white">
            {resource === "posts" && "ข่าวหรืออินโฟกราฟิก"}
            {resource === "alerts" && "การแจ้งเตือน"}
            {resource === "prices" && "ราคาข้าว"}
            {resource === "recommendations" && "คำแนะนำเกษตรกร"}
          </h2>
        </div>
        <button type="button" onClick={onCancel} className="inline-flex items-center gap-1.5 text-sm font-bold text-rice-muted hover:text-rice-forest dark:text-white/55 dark:hover:text-white">
          <X className="h-4 w-4" /> ยกเลิก
        </button>
      </div>

      {resource === "posts" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 md:col-span-2">
            <FormField label="หัวข้อข่าว">
              <input className={inputClassName} value={text("title")} onChange={(event) => onChange("title", event.target.value)} maxLength={180} required />
            </FormField>
            <FormField label="สรุปย่อ">
              <textarea className={inputClassName} value={text("summary")} onChange={(event) => onChange("summary", event.target.value)} rows={3} maxLength={600} required />
            </FormField>
          </div>
          <FormField label="หมวดข่าว">
            <select className={inputClassName} value={text("category")} onChange={(event) => onChange("category", event.target.value)}>
              <option value="weather">อากาศและภัยพิบัติ</option>
              <option value="disaster">ภัยพิบัติ</option>
              <option value="disease">โรคข้าว</option>
              <option value="pest">แมลงศัตรูพืช</option>
              <option value="price">ราคาข้าว</option>
              <option value="knowledge">ความรู้และคำแนะนำ</option>
            </select>
          </FormField>
          <FormField label="แหล่งข้อมูล">
            <input className={inputClassName} value={text("sourceName")} onChange={(event) => onChange("sourceName", event.target.value)} maxLength={120} />
          </FormField>
          <FormField label="การแสดงผลบนเว็บผู้ใช้">
            <div>
              <select className={inputClassName} value={text("status")} onChange={(event) => onChange("status", event.target.value)}>
                <option value="published">เผยแพร่ทันที — แสดงบนหน้าเว็บ</option>
                <option value="draft">เก็บเป็นฉบับร่าง — ยังไม่แสดง</option>
              </select>
              <p className="mt-2 text-xs leading-5 text-rice-muted dark:text-white/45">
                ข่าวจะแสดงในหน้า “ข่าวสาร” เมื่อเลือกเผยแพร่เท่านั้น
              </p>
            </div>
          </FormField>
          <FormField label="วันและเวลาเผยแพร่">
            <input className={inputClassName} type="datetime-local" value={text("publishedAt")} onChange={(event) => onChange("publishedAt", event.target.value)} />
          </FormField>
          <div className="md:col-span-2 grid gap-3 sm:grid-cols-[1fr_auto]">
            <FormField label="รูปปก (อัปโหลดหรือวาง URL)">
              <input className={inputClassName} value={text("imageUrl")} onChange={(event) => onChange("imageUrl", event.target.value)} placeholder="อัปโหลดรูป หรือใช้ /images/..." />
            </FormField>
            <label className="flex cursor-pointer items-end">
              <span className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rice-mint px-4 py-2.5 text-sm font-bold text-rice-forest transition hover:bg-rice-mint-light">
                {isUploading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
                อัปโหลดรูป
              </span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={isUploading} onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onUpload(file);
                event.currentTarget.value = "";
              }} />
            </label>
          </div>
          <FormField label="คำอธิบายรูปภาพ">
            <input className={inputClassName} value={text("imageAlt")} onChange={(event) => onChange("imageAlt", event.target.value)} maxLength={300} />
          </FormField>
          <div className="md:col-span-2">
            <FormField label="เนื้อหาฉบับเต็ม (ไม่บังคับ)">
              <textarea className={inputClassName} value={text("body")} onChange={(event) => onChange("body", event.target.value)} rows={5} maxLength={20000} />
            </FormField>
          </div>
          <Toggle label="แสดงเป็นข่าวเด่น" checked={checked("isFeatured")} onChange={(value) => onChange("isFeatured", value)} />
        </div>
      )}

      {resource === "alerts" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 md:col-span-2">
            <FormField label="หัวข้อแจ้งเตือน"><input className={inputClassName} value={text("title")} onChange={(event) => onChange("title", event.target.value)} maxLength={180} required /></FormField>
            <FormField label="รายละเอียด"><textarea className={inputClassName} value={text("description")} onChange={(event) => onChange("description", event.target.value)} rows={3} maxLength={600} required /></FormField>
          </div>
          <FormField label="ประเภท"><select className={inputClassName} value={text("alertType")} onChange={(event) => onChange("alertType", event.target.value)}><option value="weather">สภาพอากาศ</option><option value="disaster">ภัยพิบัติ</option><option value="disease">โรคข้าว</option><option value="pest">แมลงศัตรูพืช</option><option value="price">ราคาข้าว</option><option value="general">ทั่วไป</option></select></FormField>
          <FormField label="ระดับความรุนแรง"><select className={inputClassName} value={text("severity")} onChange={(event) => onChange("severity", event.target.value)}><option value="low">ต่ำ</option><option value="medium">ปานกลาง</option><option value="high">สูง</option></select></FormField>
          <FormField label="พื้นที่"><input className={inputClassName} value={text("areaName")} onChange={(event) => onChange("areaName", event.target.value)} maxLength={120} /></FormField>
          <FormField label="วันเริ่มต้น"><input className={inputClassName} type="datetime-local" value={text("startsAt")} onChange={(event) => onChange("startsAt", event.target.value)} required /></FormField>
          <FormField label="วันสิ้นสุด (ไม่บังคับ)">
            <div>
              <input className={inputClassName} type="datetime-local" value={text("expiresAt")} min={text("startsAt")} onChange={(event) => onChange("expiresAt", event.target.value)} />
              <p className="mt-2 text-xs leading-5 text-rice-muted dark:text-white/45">
                เว้นว่างหากต้องการให้แจ้งเตือนแสดงต่อเนื่องจนกว่าจะปิดใช้งาน
              </p>
            </div>
          </FormField>
          <Toggle label="เปิดใช้งานการแจ้งเตือน" checked={checked("isActive")} onChange={(value) => onChange("isActive", value)} />
        </div>
      )}

      {resource === "prices" && (
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="ชนิดข้าว"><input className={inputClassName} value={text("riceType")} onChange={(event) => onChange("riceType", event.target.value)} maxLength={100} required /></FormField>
          <FormField label="ราคา (บาท/ตัน)"><input className={inputClassName} type="number" min="0" step="0.01" value={text("pricePerTon")} onChange={(event) => onChange("pricePerTon", event.target.value)} required /></FormField>
          <FormField label="แนวโน้ม"><select className={inputClassName} value={text("trend")} onChange={(event) => onChange("trend", event.target.value)}><option value="up">เพิ่มขึ้น</option><option value="down">ลดลง</option><option value="steady">ทรงตัว</option></select></FormField>
          <FormField label="เปลี่ยนแปลง (%)"><input className={inputClassName} type="number" min="-100" max="100" step="0.01" value={text("changePercent")} onChange={(event) => onChange("changePercent", event.target.value)} /></FormField>
          <FormField label="แหล่งอ้างอิง"><input className={inputClassName} value={text("marketName")} onChange={(event) => onChange("marketName", event.target.value)} maxLength={160} /></FormField>
          <FormField label="วันที่อ้างอิง"><input className={inputClassName} type="datetime-local" value={text("observedAt")} onChange={(event) => onChange("observedAt", event.target.value)} required /></FormField>
          <Toggle label="เผยแพร่ราคานี้" checked={checked("isPublished")} onChange={(value) => onChange("isPublished", value)} />
        </div>
      )}

      {resource === "recommendations" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-4 md:col-span-2">
            <FormField label="หัวข้อคำแนะนำ"><input className={inputClassName} value={text("title")} onChange={(event) => onChange("title", event.target.value)} maxLength={180} required /></FormField>
            <FormField label="รายละเอียด"><textarea className={inputClassName} value={text("description")} onChange={(event) => onChange("description", event.target.value)} rows={4} maxLength={1200} required /></FormField>
          </div>
          <FormField label="หมวดคำแนะนำ"><select className={inputClassName} value={text("category")} onChange={(event) => onChange("category", event.target.value)}><option value="water">น้ำ</option><option value="fertilizer">ปุ๋ย</option><option value="disease">โรคและแมลง</option><option value="harvest">เก็บเกี่ยว</option><option value="cost">ต้นทุน</option><option value="general">ทั่วไป</option></select></FormField>
          <FormField label="ระดับความสำคัญ"><select className={inputClassName} value={text("priority")} onChange={(event) => onChange("priority", event.target.value)}><option value="normal">ปกติ</option><option value="important">สำคัญ</option></select></FormField>
          <FormField label="วันเริ่มต้น"><input className={inputClassName} type="datetime-local" value={text("startsAt")} onChange={(event) => onChange("startsAt", event.target.value)} required /></FormField>
          <FormField label="วันสิ้นสุด (ไม่บังคับ)"><input className={inputClassName} type="datetime-local" value={text("expiresAt")} onChange={(event) => onChange("expiresAt", event.target.value)} /></FormField>
          <Toggle label="เปิดแสดงคำแนะนำ" checked={checked("isActive")} onChange={(value) => onChange("isActive", value)} />
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button type="submit" disabled={isSaving || isUploading} className="inline-flex items-center gap-2 rounded-xl bg-rice-forest px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rice-dark disabled:cursor-not-allowed disabled:opacity-60 dark:bg-rice-mint-light dark:text-rice-dark">
          {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {editing ? "บันทึกการแก้ไข" : "บันทึกข้อมูล"}
        </button>
      </div>
    </form>
  );
}

export default function AdminConsole({
  administratorId,
  administratorName,
  administratorRole,
}: {
  administratorId: string;
  administratorName: string;
  administratorRole: Exclude<AdminRole, "user">;
}) {
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [records, setRecords] = useState(EMPTY_RECORDS);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(getInitialDraft("posts"));
  const [isSaving, setIsSaving] = useState(false);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [isNewsEditorOpen, setIsNewsEditorOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const resource = isResource(activeTab) ? activeTab : null;
  const currentItems = resource ? records[resource] : [];

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setLoading(true);
      setError(null);

      try {
        if (activeTab === "overview") {
          const data = await requestJson<AdminOverview>("/api/admin/overview");
          if (active) setOverview(data);
        } else if (isResource(activeTab)) {
          const data = await requestJson<typeof currentItems>(`/api/admin/content/${activeTab}`);
          if (active) {
            setRecords((current) => ({ ...current, [activeTab]: data }));
          }
        }
      } catch (requestError) {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "ไม่สามารถโหลดข้อมูลได้");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [activeTab, refreshKey]);

  function resetForm(): void {
    if (!resource) return;
    setEditingId(null);
    setDraft(getInitialDraft(resource));
    setIsFormOpen(false);
  }

  function openNewForm(): void {
    if (!resource) return;
    setError(null);
    setSuccess(null);
    if (resource === "posts") {
      setIsNewsEditorOpen(true);
      setIsFormOpen(false);
      return;
    }
    setEditingId(null);
    setDraft(getInitialDraft(resource));
    setIsFormOpen(true);
  }

  function openEditForm(item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation): void {
    if (!resource) return;
    setError(null);
    setSuccess(null);
    setEditingId(item.id);
    setDraft(getItemDraft(resource, item));
    setIsFormOpen(true);
  }

  function updateDraft(key: string, value: FormValue): void {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  async function refreshOverview(): Promise<void> {
    try {
      setOverview(await requestJson<AdminOverview>("/api/admin/overview"));
    } catch {
      // ภาพรวมจะโหลดใหม่เมื่อผู้ดูแลกลับไปที่แท็บนี้
    }
  }

  async function submitForm(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!resource) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const isEditing = Boolean(editingId);
      const item = await requestJson<AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation>(
        isEditing
          ? `/api/admin/content/${resource}/${editingId}`
          : `/api/admin/content/${resource}`,
        {
          method: isEditing ? "PATCH" : "POST",
          body: JSON.stringify(draft),
        }
      );
      setRecords((current) => ({
        ...current,
        [resource]: isEditing
          ? current[resource].map((currentItem) => currentItem.id === item.id ? item : currentItem)
          : [item, ...current[resource]],
      }));
      setSuccess(
        resource === "posts"
          ? draft.status === "published"
            ? "เผยแพร่ข่าวบนเว็บผู้ใช้แล้ว"
            : "บันทึกเป็นฉบับร่างแล้ว ข่าวนี้ยังไม่แสดงบนเว็บผู้ใช้"
          : isEditing
            ? "บันทึกการแก้ไขแล้ว"
            : "เพิ่มข้อมูลแล้ว"
      );
      resetForm();
      void refreshOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ไม่สามารถบันทึกข้อมูลได้");
    } finally {
      setIsSaving(false);
    }
  }

  async function publishPost(item: AdminNewsPost): Promise<void> {
    setPublishingId(item.id);
    setError(null);
    setSuccess(null);

    try {
      const nextDraft = getItemDraft("posts", item);
      nextDraft.status = "published";
      nextDraft.publishedAt = dateTimeInput(new Date().toISOString());

      const published = await requestJson<AdminNewsPost>(
        `/api/admin/content/posts/${item.id}`,
        {
          method: "PATCH",
          body: JSON.stringify(nextDraft),
        }
      );

      setRecords((current) => ({
        ...current,
        posts: current.posts.map((currentItem) =>
          currentItem.id === published.id ? published : currentItem
        ),
      }));
      setSuccess("เผยแพร่ข่าวบนเว็บผู้ใช้แล้ว");
      void refreshOverview();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ไม่สามารถเผยแพร่ข่าวได้"
      );
    } finally {
      setPublishingId(null);
    }
  }

  async function deleteItem(item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation): Promise<void> {
    if (!resource || !window.confirm("ต้องการลบรายการนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้")) return;

    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/content/${resource}/${item.id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
        throw new Error(payload?.error?.message ?? "ไม่สามารถลบข้อมูลได้");
      }
      setRecords((current) => ({
        ...current,
        [resource]: current[resource].filter((currentItem) => currentItem.id !== item.id),
      }));
      setSuccess("ลบข้อมูลแล้ว");
      if (editingId === item.id) resetForm();
      void refreshOverview();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ไม่สามารถลบข้อมูลได้");
    }
  }

  async function uploadImage(file: File): Promise<void> {
    setIsUploading(true);
    setError(null);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/admin/media", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as
        | { data?: { publicUrl?: string }; error?: { message?: string } }
        | null;
      if (!response.ok || !payload?.data?.publicUrl) {
        throw new Error(payload?.error?.message ?? "ไม่สามารถอัปโหลดรูปภาพได้");
      }
      updateDraft("imageUrl", payload.data.publicUrl);
      setSuccess("อัปโหลดรูปภาพแล้ว กดบันทึกเพื่อผูกกับข่าว");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "ไม่สามารถอัปโหลดรูปภาพได้");
    } finally {
      setIsUploading(false);
    }
  }

  async function syncRicePrices(): Promise<void> {
    setIsSyncingPrices(true);
    setError(null);
    setSuccess(null);

    try {
      const data = await requestJson<AdminRicePrice[]>(
        "/api/admin/rice-prices/sync",
        { method: "POST" }
      );
      setRecords((current) => ({
        ...current,
        prices: [...data, ...current.prices],
      }));
      setSuccess(
        `ดึงราคาข้าวจาก Agri-Map แล้ว ${data.length.toLocaleString("th-TH")} รายการ`
      );
      void refreshOverview();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "ไม่สามารถดึงราคาข้าวจาก API ได้"
      );
    } finally {
      setIsSyncingPrices(false);
    }
  }

  async function signOut(): Promise<void> {
    setIsSigningOut(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
      window.location.assign("/login");
    } catch {
      setError("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง");
      setIsSigningOut(false);
    }
  }

  return (
    <main className="min-h-dvh bg-[#f4f5ef] p-2 sm:p-3 lg:py-0 lg:pl-0 lg:pr-4">
      <div className="grid min-h-dvh w-full min-w-0 gap-3 lg:grid-cols-[270px_minmax(0,1fr)] lg:gap-4">
        <aside className="flex min-w-0 flex-col rounded-[22px] border border-rice-forest/10 bg-white shadow-[0_12px_36px_rgba(11,46,28,0.07)] lg:sticky lg:top-0 lg:h-dvh lg:self-start lg:rounded-l-none">
          <div className="flex items-center gap-3 px-4 py-4 sm:px-5 lg:px-6 lg:py-6">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-[#fff0dc] text-[#b94f0b]">
              <Wheat className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate font-heading text-xl font-bold tracking-[-0.025em] text-rice-forest">Rice AI Admin</h1>
              <p className="mt-0.5 text-xs font-medium text-rice-muted">ระบบผู้ดูแล</p>
            </div>
          </div>

          <div className="mx-5 h-px bg-gradient-to-r from-orange-400/70 via-rice-forest/10 to-transparent" />

          <nav className="flex gap-2 overflow-x-auto p-3 sm:p-4 lg:flex-1 lg:flex-col lg:overflow-y-auto lg:px-4 lg:py-5" role="tablist" aria-label="เมนูผู้ดูแลระบบ">
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsFormOpen(false);
                    setIsNewsEditorOpen(false);
                    setSuccess(null);
                    setError(null);
                  }}
                  className={`relative inline-flex min-h-12 shrink-0 items-center gap-3 rounded-xl px-4 text-left text-sm font-bold transition-all duration-200 lg:w-full ${selected ? "bg-[#fff0dc] text-[#b94f0b] shadow-[0_8px_22px_rgba(234,88,12,0.10)] before:absolute before:inset-y-2 before:left-0 before:w-1 before:rounded-r-full before:bg-orange-500" : "text-[#53627b] hover:bg-[#f5f7f1] hover:text-rice-forest"}`}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="whitespace-nowrap">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="m-4 mt-1 rounded-2xl border border-rice-forest/10 bg-[#faf9f6] p-3 lg:mt-auto">
            <p className="truncate px-1 text-[11px] font-semibold text-rice-muted">{administratorName}</p>
            <p className="mt-1 px-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[#b94f0b]">
              {administratorRole === "superadmin" ? "Super Admin" : "Admin"}
            </p>
            <div className="mt-2">
              <AdminThemeToggle showLabel={false} />
            </div>
            <button
              type="button"
              onClick={() => void signOut()}
              disabled={isSigningOut}
              className="mt-2 inline-flex min-h-11 w-full items-center gap-3 rounded-xl bg-white px-3.5 text-sm font-bold text-[#53627b] shadow-sm transition hover:text-rice-forest disabled:cursor-wait disabled:opacity-60"
            >
              {isSigningOut ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {isSigningOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
            </button>
          </div>
        </aside>

        <div className="min-w-0 rounded-[22px] border border-rice-forest/8 bg-[#fbfaf7] p-3 shadow-[0_12px_36px_rgba(11,46,28,0.05)] sm:p-5 lg:my-4 lg:p-6">
          <header className="relative mb-5 grid min-h-[230px] overflow-hidden rounded-[24px] border border-rice-forest/10 bg-gradient-to-br from-white via-[#fffdf7] to-[#edf5e9] shadow-[0_14px_38px_rgba(11,46,28,0.08)] lg:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)]">
            <div className="relative z-10 flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#fff0dc] px-3 py-1.5 text-xs font-bold text-[#b85a15]">
                <ShieldCheck className="h-4 w-4" /> พื้นที่ผู้ดูแลระบบ
              </span>
              <h2 className="mt-4 font-heading text-3xl font-bold tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-[2.75rem]">
                {TAB_ITEMS.find((item) => item.id === activeTab)?.label}
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-rice-muted sm:text-base">
                เลือกเมนูเพื่อจัดการข้อมูล ติดตามการใช้งาน และดูแลระบบได้อย่างสะดวก
              </p>
              <div className="mt-5 inline-flex w-fit items-center gap-3 rounded-xl border border-rice-forest/8 bg-white/85 px-4 py-2.5 shadow-sm backdrop-blur">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-rice-mint/55 text-rice-forest">
                  <ShieldCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-rice-muted">ผู้ดูแลที่กำลังใช้งาน</p>
                  <p className="truncate text-xs font-bold text-rice-forest sm:text-sm">{administratorName}</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[180px] sm:min-h-[210px] lg:min-h-[230px]">
              <Image
                src="/images/62.jpg"
                alt="เกษตรกรกำลังดูแลต้นกล้าข้าวในแปลงนา"
                fill
                priority
                sizes="(max-width: 1023px) 100vw, 38vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-[#fffdf7] via-[#fffdf7]/10 to-transparent lg:bg-gradient-to-r" />
              <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-rice-forest/35 to-transparent" />
              <div className="absolute bottom-5 right-5 rounded-xl border border-white/30 bg-rice-forest/75 px-4 py-3 text-white shadow-lg backdrop-blur-md">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/65">Rice AI Platform</p>
                <p className="mt-1 text-sm font-bold">ข้อมูลเพื่อการเกษตรที่จัดการได้ง่าย</p>
              </div>
            </div>
          </header>

          <div className="min-w-0">
            <ErrorNotice message={error} />
            {success && <div className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><p>{success}</p></div>}

            {activeTab === "overview" && (loading && !overview ? <LoadingPanel /> : <OverviewPanel overview={overview} />)}
            {activeTab === "users" && (
              <UsersPanel
                viewerId={administratorId}
                viewerRole={administratorRole}
              />
            )}
            {activeTab === "agriculture" && <AgriculturalDataPanel />}
            {activeTab === "models" && <ModelsPanel />}
            {activeTab === "diseases" && <DiseasesPanel />}
            {activeTab === "activity" && <ActivityPanel />}

            {resource === "posts" && isNewsEditorOpen ? (
              <AdminNewsEditor
                onClose={() => setIsNewsEditorOpen(false)}
                onSaved={() => {
                  setRefreshKey((value) => value + 1);
                  void refreshOverview();
                }}
              />
            ) : resource && (
          <section>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">จัดการข้อมูล</p>
                <h2 className="mt-1 font-heading text-2xl font-bold text-rice-forest dark:text-white">{TAB_ITEMS.find((item) => item.id === resource)?.label}</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setRefreshKey((value) => value + 1)} className="inline-flex items-center gap-2 rounded-xl border border-rice-forest/10 bg-white/70 px-3 py-2.5 text-xs font-bold text-rice-forest hover:bg-rice-mint/20 dark:border-white/10 dark:bg-white/[0.05] dark:text-white"><RefreshCw className="h-4 w-4" /> รีเฟรช</button>
                {resource === "prices" && <button type="button" onClick={() => void syncRicePrices()} disabled={isSyncingPrices} className="inline-flex items-center gap-2 rounded-xl border border-rice-leaf/30 bg-rice-mint/35 px-3 py-2.5 text-xs font-bold text-rice-forest hover:bg-rice-mint/60 disabled:cursor-not-allowed disabled:opacity-60 dark:border-rice-mint-light/25 dark:bg-rice-leaf/20 dark:text-rice-mint-light"><RefreshCw className={`h-4 w-4 ${isSyncingPrices ? "animate-spin" : ""}`} /> {isSyncingPrices ? "กำลังดึงราคา..." : "ดึงจาก Agri-Map"}</button>}
                <button type="button" onClick={openNewForm} className="inline-flex items-center gap-2 rounded-xl bg-rice-forest px-4 py-2.5 text-sm font-bold text-white hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"><Plus className="h-4 w-4" /> {resource === "posts" ? "สร้างข่าวสารใหม่" : "เพิ่มรายการ"}</button>
              </div>
            </div>
            {isFormOpen && <ContentForm resource={resource} draft={draft} onChange={updateDraft} onSubmit={submitForm} onCancel={resetForm} onUpload={uploadImage} isSaving={isSaving} isUploading={isUploading} editing={Boolean(editingId)} />}
            {loading ? <LoadingPanel /> : <RecordList resource={resource} items={currentItems} onEdit={openEditForm} onDelete={deleteItem} onPublish={publishPost} publishingId={publishingId} />}
          </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function LoadingPanel() {
  return <div className="flex min-h-48 items-center justify-center rounded-3xl border border-rice-forest/10 bg-white/65 text-sm font-semibold text-rice-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/60"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" /> กำลังโหลดข้อมูล...</div>;
}

function OverviewPanel({ overview }: { overview: AdminOverview | null }) {
  if (!overview) return <LoadingPanel />;
  const cards = [
    { label: "ผู้ใช้งาน", value: overview.counts.users, detail: "บัญชีในระบบทั้งหมด", icon: UsersRound, tone: "bg-emerald-100 text-emerald-700" },
    { label: "ตรวจโรค", value: overview.counts.diseaseChecks, detail: "การตรวจใน 7 วันล่าสุด", icon: Bug, tone: "bg-amber-100 text-amber-700" },
    { label: "Nong Serm AI", value: overview.counts.assistantUses, detail: "การใช้งานใน 7 วันล่าสุด", icon: BrainCircuit, tone: "bg-violet-100 text-violet-700" },
    { label: "ข่าวและข้อมูล", value: overview.counts.content, detail: `ข่าวเผยแพร่ ${overview.counts.publishedPosts} รายการ`, icon: Newspaper, tone: "bg-sky-100 text-sky-700" },
  ];
  const maximum = Math.max(1, ...overview.dailyUsage.flatMap((item) => [item.diseaseChecks, item.assistantUses]));
  return <div className="space-y-5">
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="glass-card p-5"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}><Icon className="h-5 w-5" /></span><p className="mt-4 text-3xl font-bold text-rice-forest dark:text-white">{card.value.toLocaleString("th-TH")}</p><h3 className="mt-1 text-sm font-bold text-rice-forest dark:text-white">{card.label}</h3><p className="mt-1 text-xs text-rice-muted dark:text-white/45">{card.detail}</p></article>; })}</div>
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
      <section className="glass-card p-5 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-bold text-rice-leaf">ภาพรวม 7 วัน</p><h2 className="mt-1 font-heading text-lg font-bold">จำนวนการใช้งานรายวัน</h2></div><div className="flex gap-3 text-xs"><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rice-leaf" />ตรวจโรค</span><span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-rice-gold" />Nong Serm AI</span></div></div><div className="mt-6 grid h-56 grid-cols-7 items-end gap-2 border-b border-rice-forest/10 px-1">{overview.dailyUsage.map((item) => <div key={item.date} className="flex h-full min-w-0 flex-col justify-end gap-2"><div className="flex flex-1 items-end justify-center gap-1"><span title={`ตรวจโรค ${item.diseaseChecks}`} className="w-3 rounded-t-md bg-rice-leaf/85" style={{ height: `${Math.max(item.diseaseChecks ? 8 : 2, item.diseaseChecks / maximum * 100)}%` }} /><span title={`Nong Serm AI ${item.assistantUses}`} className="w-3 rounded-t-md bg-rice-gold" style={{ height: `${Math.max(item.assistantUses ? 8 : 2, item.assistantUses / maximum * 100)}%` }} /></div><span className="truncate text-center text-[10px] text-rice-muted">{new Date(item.date).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span></div>)}</div></section>
      <section className="glass-card p-5"><div className="flex items-center gap-2"><Activity className="h-4 w-4 text-rice-leaf" /><h2 className="font-heading text-base font-bold">กิจกรรมล่าสุด</h2></div><div className="mt-4 space-y-4">{overview.recentActivity.length ? overview.recentActivity.map((item) => <div key={item.id} className="flex gap-3"><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-rice-mint/45"><Clock3 className="h-4 w-4" /></span><div><p className="text-xs font-bold">{item.summary}</p><p className="mt-1 text-[11px] text-rice-muted">{formatDate(item.created_at)}</p></div></div>) : <p className="rounded-2xl bg-rice-surface-soft/70 p-3 text-sm text-rice-muted">ยังไม่มีกิจกรรม</p>}</div></section>
    </div>
  </div>;
}

function RecordList({
  resource,
  items,
  onEdit,
  onDelete,
  onPublish,
  publishingId,
}: {
  resource: AdminResource;
  items: Array<AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation>;
  onEdit: (item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation) => void;
  onDelete: (item: AdminNewsPost | AdminAlert | AdminRicePrice | AdminRecommendation) => void;
  onPublish: (item: AdminNewsPost) => void;
  publishingId: string | null;
}) {
  if (!items.length) {
    return (
      <div className="rounded-3xl border border-dashed border-rice-forest/20 bg-white/50 p-10 text-center dark:border-white/15 dark:bg-white/[0.03]">
        <FileText className="mx-auto h-9 w-9 text-rice-muted dark:text-white/40" />
        <p className="mt-3 font-bold text-rice-forest dark:text-white">
          ยังไม่มีข้อมูลในหมวดนี้
        </p>
        <p className="mt-1 text-sm text-rice-muted dark:text-white/50">
          กด “เพิ่มรายการ” เพื่อสร้างข้อมูลแรก
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {items.map((item) => {
        const isPost = resource === "posts";
        const isPrice = resource === "prices";
        const post = isPost ? (item as AdminNewsPost) : null;
        const title = isPrice
          ? (item as AdminRicePrice).rice_type
          : (item as AdminNewsPost | AdminAlert | AdminRecommendation).title;
        const detail = isPost
          ? (item as AdminNewsPost).summary
          : resource === "alerts"
            ? (item as AdminAlert).description
            : isPrice
              ? `${formatCurrency(Number((item as AdminRicePrice).price_per_ton))} · ${(item as AdminRicePrice).market_name}`
              : (item as AdminRecommendation).description;
        const visibility = getVisibilityStatus(resource, item);

        return (
          <article
            key={item.id}
            className="flex flex-col gap-4 rounded-2xl border border-rice-forest/10 bg-white/75 p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${visibility.className}`}>
                  {visibility.label}
                </span>
                {post?.is_featured && (
                  <span className="rounded-full bg-rice-gold/25 px-2.5 py-1 text-[10px] font-bold text-amber-800 dark:text-rice-gold">
                    ข่าวเด่น
                  </span>
                )}
              </div>
              <h3 className="mt-2 truncate text-sm font-bold text-rice-forest dark:text-white">
                {title}
              </h3>
              <p className="mt-1 line-clamp-1 text-xs text-rice-muted dark:text-white/50">
                {detail}
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {post?.status === "draft" && (
                <button
                  type="button"
                  onClick={() => onPublish(post)}
                  disabled={publishingId === post.id}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {publishingId === post.id ? (
                    <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  เผยแพร่
                </button>
              )}
              <button
                type="button"
                onClick={() => onEdit(item)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rice-forest/10 px-3 py-2 text-xs font-bold text-rice-forest hover:bg-rice-mint/25 dark:border-white/10 dark:text-white"
              >
                <Pencil className="h-3.5 w-3.5" /> แก้ไข
              </button>
              <button
                type="button"
                onClick={() => onDelete(item)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200"
              >
                <Trash2 className="h-3.5 w-3.5" /> ลบ
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
