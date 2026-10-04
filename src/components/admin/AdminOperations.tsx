"use client";

import {
  Archive,
  Bot,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Crown,
  Database,
  Download,
  Eye,
  EyeOff,
  FilePenLine,
  FileSpreadsheet,
  FolderOpen,
  History,
  ImageUp,
  Layers3,
  LoaderCircle,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Power,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import DashboardDataManager from "@/components/admin/DashboardDataManager";
import AgriculturalDatasetImport from "@/components/admin/AgriculturalDatasetImport";
import GovernedDatasetRecords from "@/components/admin/GovernedDatasetRecords";
import { Dialog, Field, button, download, errorText, input, panel, primary, request } from "@/components/admin/dashboard/shared";
import type {
  AdminAiModel,
  AdminDisease,
  AdminRole,
  AdminUser,
  AdminUserDetails,
} from "@/lib/admin/types";

const mainSiteUrl = (
  process.env.NEXT_PUBLIC_MAIN_SITE_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  "http://localhost:3000"
).replace(/\/+$/, "");

function Empty({ children }: { children: string }) {
  return <p className="rounded-2xl border border-dashed border-[var(--app-border)] bg-[var(--app-surface-soft)] p-8 text-center text-sm text-[var(--app-text-secondary)]">{children}</p>;
}

function Busy() {
  return <div className="flex min-h-48 items-center justify-center"><LoaderCircle className="mr-2 h-5 w-5 animate-spin" />กำลังโหลด...</div>;
}

function Notice({ message, success = false }: { message: string; success?: boolean }) {
  return <div role={success ? "status" : "alert"} className={`rounded-xl border p-3 text-sm ${success ? "border-emerald-300/40 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200" : "border-rose-300/40 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"}`}>{message}</div>;
}

function date(value: string | null) {
  return value ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" }) : "ยังไม่เคยเข้าสู่ระบบ";
}

function roleLabel(role: AdminRole): string {
  if (role === "superadmin") return "Super Admin";
  if (role === "admin") return "Admin";
  return "User";
}

function RoleBadge({ role }: { role: AdminRole }) {
  const tone = role === "superadmin"
    ? "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-200"
    : role === "admin"
      ? "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200"
      : "bg-[var(--app-surface-soft)] text-[var(--app-text-secondary)]";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>
      {role === "superadmin" && <Crown aria-hidden="true" className="h-3.5 w-3.5" />}
      {roleLabel(role)}
    </span>
  );
}

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl bg-[var(--app-surface-soft)] p-3.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-[var(--app-text-muted)]">
        <Icon aria-hidden="true" className="h-4 w-4" />
        {label}
      </p>
      <p className="mt-1.5 break-words text-sm font-semibold">{value || "ยังไม่ระบุ"}</p>
    </div>
  );
}

export function UsersPanel({
  viewerId,
  viewerRole,
}: {
  viewerId: string;
  viewerRole: "admin" | "superadmin";
}) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [details, setDetails] = useState<AdminUserDetails | null>(null);
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const isSuperAdmin = viewerRole === "superadmin";

  useEffect(() => {
    let active = true;

    request<AdminUser[]>("/api/admin/users")
      .then((data) => { if (active) setUsers(data); })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, []);

  const filtered = useMemo(
    () => users.filter((user) =>
      user.email.toLowerCase().includes(search.trim().toLowerCase())
    ),
    [search, users]
  );

  async function update(
    user: AdminUser,
    changes: { role?: AdminRole; disabled?: boolean }
  ) {
    const action = changes.role
      ? `เปลี่ยนสิทธิ์เป็น ${roleLabel(changes.role)}`
      : `${changes.disabled ? "ปิด" : "เปิด"}บัญชี`;

    if (!window.confirm(`ยืนยัน${action}สำหรับ ${user.email}?`)) return false;

    setBusyId(user.id);
    setError("");
    setSuccess("");

    try {
      const updated = await request<AdminUser>("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, ...changes }),
      });

      setUsers((current) => current.map((item) =>
        item.id === updated.id ? updated : item
      ));
      setDetails((current) => current?.id === updated.id
        ? { ...current, ...updated }
        : current
      );
      setSuccess(`${action}สำเร็จ`);
      return true;
    } catch (cause) {
      setError(errorText(cause));
      return false;
    } finally {
      setBusyId(null);
    }
  }

  async function openDetails(user: AdminUser) {
    setDetailLoadingId(user.id);
    setError("");
    setSuccess("");

    try {
      setDetails(await request<AdminUserDetails>(
        `/api/admin/users?id=${encodeURIComponent(user.id)}`
      ));
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setDetailLoadingId(null);
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">จัดการบัญชี</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold">ผู้ใช้งาน</h2>
            {isSuperAdmin && <RoleBadge role="superadmin" />}
          </div>
        </div>
        <label className="relative w-full sm:max-w-sm">
          <Search aria-hidden="true" className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-text-muted)]" />
          <input
            className={input + " pl-10"}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ค้นหาอีเมล"
          />
        </label>
      </div>

      <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-4 text-sm leading-6 text-[var(--app-text-secondary)]">
        {isSuperAdmin
          ? "Super Admin ดูข้อมูลโปรไฟล์และแปลงนา รวมถึงเปลี่ยน Role ได้ โดยระบบจะบันทึกทุกการเปลี่ยนแปลงใน Activity Log"
          : "Admin ทั่วไปดูรายการและจัดการสถานะบัญชี User ได้ แต่ดูข้อมูลส่วนตัวหรือเปลี่ยน Role ไม่ได้"}
      </div>

      {error && <Notice message={error} />}
      {success && <Notice message={success} success />}

      <div className={panel + " overflow-hidden !p-0"}>
        {loading ? (
          <Busy />
        ) : !filtered.length ? (
          <Empty>ไม่พบผู้ใช้งาน</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-rice-mint/25 dark:bg-white/[0.05]">
                <tr>
                  {["อีเมล", "Role", "สถานะ", "วันที่สมัคร", "Last Login", "จัดการ"].map((label) => (
                    <th key={label} className="p-4 font-bold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const isSelf = user.id === viewerId;
                  const canChangeStatus = !isSelf && (isSuperAdmin || user.role === "user");

                  return (
                    <tr key={user.id} className="border-t border-[var(--app-border)] transition-colors hover:bg-[var(--app-surface-soft)]">
                      <td className="p-4 font-semibold">{user.email}</td>
                      <td className="p-4">
                        {isSuperAdmin ? (
                          <select
                            aria-label={`สิทธิ์ของ ${user.email}`}
                            className={input + " min-h-10 min-w-40 py-1.5"}
                            value={user.role}
                            disabled={busyId === user.id || isSelf}
                            onChange={(event) => void update(user, {
                              role: event.target.value as AdminRole,
                            })}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                            <option value="superadmin">Super Admin</option>
                          </select>
                        ) : (
                          <RoleBadge role={user.role} />
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${user.disabled ? "bg-rose-100 text-rose-700 dark:bg-rose-400/10 dark:text-rose-200" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200"}`}>
                          {user.disabled ? "ปิดใช้งาน" : "ใช้งานได้"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-4">{date(user.createdAt)}</td>
                      <td className="whitespace-nowrap p-4">{date(user.lastSignInAt)}</td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              className={button}
                              disabled={detailLoadingId !== null}
                              onClick={() => void openDetails(user)}
                            >
                              {detailLoadingId === user.id
                                ? <LoaderCircle className="h-4 w-4 animate-spin" />
                                : <Eye className="h-4 w-4" />}
                              รายละเอียด
                            </button>
                          )}
                          <button
                            type="button"
                            className={button}
                            disabled={busyId === user.id || !canChangeStatus}
                            title={!canChangeStatus ? "บัญชีนี้ต้องจัดการโดย Super Admin และห้ามปิดบัญชีตนเอง" : undefined}
                            onClick={() => void update(user, { disabled: !user.disabled })}
                          >
                            {busyId === user.id
                              ? <LoaderCircle className="h-4 w-4 animate-spin" />
                              : <Power className="h-4 w-4" />}
                            {user.disabled ? "Enable" : "Disable"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-[var(--app-text-muted)]">
        ระบบไม่อนุญาต Hard Delete ผู้ใช้งาน เพื่อรักษาประวัติข้อมูลและ Audit Log
      </p>

      {detailLoadingId && !details && (
        <div role="status" className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4 backdrop-blur-sm">
          <div className={panel + " flex items-center gap-3"}>
            <LoaderCircle className="h-5 w-5 animate-spin" /> กำลังโหลดข้อมูลผู้ใช้...
          </div>
        </div>
      )}

      {details && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-details-title"
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-3 backdrop-blur-sm sm:p-6"
        >
          <div className="mx-auto my-3 w-full max-w-4xl rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-2xl sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-200">
                  <UserRound aria-hidden="true" className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 id="user-details-title" className="text-xl font-bold">รายละเอียดผู้ใช้งาน</h3>
                    <RoleBadge role={details.role} />
                  </div>
                  <p className="mt-1 break-all text-sm text-[var(--app-text-muted)]">{details.email}</p>
                </div>
              </div>
              <button
                type="button"
                className={button + " px-3"}
                aria-label="ปิดรายละเอียดผู้ใช้งาน"
                onClick={() => setDetails(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && <div className="mt-4"><Notice message={error} /></div>}
            {success && <div className="mt-4"><Notice message={success} success /></div>}

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <DetailItem icon={UserRound} label="ชื่อ–นามสกุล" value={details.fullName} />
              <DetailItem icon={Phone} label="เบอร์โทร" value={details.phone} />
              <DetailItem icon={Mail} label="อีเมล" value={details.email} />
              <DetailItem icon={MapPin} label="ที่อยู่" value={[details.district, details.province].filter(Boolean).join(", ") || null} />
              <DetailItem icon={MapPin} label="ชื่อฟาร์ม" value={details.farmName} />
              <DetailItem icon={CalendarDays} label="ยืนยันอีเมลเมื่อ" value={date(details.emailConfirmedAt)} />
              <DetailItem icon={CalendarDays} label="สมัครเมื่อ" value={date(details.createdAt)} />
              <DetailItem icon={CalendarDays} label="เข้าสู่ระบบล่าสุด" value={date(details.lastSignInAt)} />
              <DetailItem icon={CalendarDays} label="แก้ไขบัญชีล่าสุด" value={date(details.updatedAt)} />
            </div>

            <section className="mt-6">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-bold">ข้อมูลแปลงนา</h4>
                <span className="rounded-full bg-[var(--app-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--app-text-muted)]">
                  {details.farmFields.length.toLocaleString("th-TH")} แปลง
                </span>
              </div>
              {details.farmFields.length ? (
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  {details.farmFields.map((field) => (
                    <article key={field.id} className="rounded-2xl border border-[var(--app-border)] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h5 className="font-bold">{field.name}</h5>
                          <p className="mt-1 text-xs text-[var(--app-text-muted)]">
                            {[field.subdistrict, field.district, field.province].filter(Boolean).join(" · ")}
                          </p>
                        </div>
                        {field.isPrimary && (
                          <span className="rounded-full bg-rice-mint/40 px-2.5 py-1 text-[10px] font-bold text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light">
                            แปลงหลัก
                          </span>
                        )}
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                        <div><dt className="text-[var(--app-text-muted)]">พื้นที่</dt><dd className="mt-1 font-semibold">{field.areaRai.toLocaleString("th-TH")} ไร่</dd></div>
                        <div><dt className="text-[var(--app-text-muted)]">พันธุ์ข้าว</dt><dd className="mt-1 font-semibold">{field.riceVariety || "—"}</dd></div>
                        <div><dt className="text-[var(--app-text-muted)]">วันปลูก</dt><dd className="mt-1 font-semibold">{field.plantingDate || "—"}</dd></div>
                        <div><dt className="text-[var(--app-text-muted)]">คาดว่าเก็บเกี่ยว</dt><dd className="mt-1 font-semibold">{field.expectedHarvestDate || "—"}</dd></div>
                      </dl>
                      {field.latitude !== null && field.longitude !== null && (
                        <p className="mt-3 text-xs text-[var(--app-text-muted)]">
                          พิกัด {field.latitude}, {field.longitude}
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl bg-[var(--app-surface-soft)] p-5 text-sm text-[var(--app-text-muted)]">
                  ผู้ใช้นี้ยังไม่มีข้อมูลแปลงนา
                </p>
              )}
            </section>
          </div>
        </div>
      )}
    </section>
  );
}

type AgricultureCategory = "yield" | "price" | "flood" | "drought" | "storm";
type GovernedDatasetType = "rice_price" | "flood" | "drought" | "storm";
type DatasetValidation = {
  rowCount?: number;
  provinceCount?: number;
  minYear?: number;
  maxYear?: number;
  missingCount?: number;
  duplicateCount?: number;
  unknownProvinceCount?: number;
};
type DatasetVersion = {
  id: string;
  version_key: string;
  label: string;
  description: string;
  status: "draft" | "published" | "archived";
  is_default: boolean;
  source_name: string;
  source_url: string | null;
  revision: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  record_count: number;
  import_files: Array<{
    file_name: string;
    file_type: string;
    row_count: number;
    validation_summary: DatasetValidation;
    imported_at: string;
  }>;
  recent_events: Array<{ action: string; summary: string; created_at: string }>;
};
type DatasetResponse = {
  type: GovernedDatasetType;
  versions: DatasetVersion[];
  canSetDefault: boolean;
};

const AGRI_TABS: Array<{ id: AgricultureCategory; label: string }> = [
  { id: "yield", label: "ผลผลิตข้าว" },
  { id: "price", label: "ราคาข้าว" },
  { id: "flood", label: "น้ำท่วม" },
  { id: "drought", label: "ภัยแล้ง" },
  { id: "storm", label: "พายุ" },
];
const DATASET_TYPE: Record<Exclude<AgricultureCategory, "yield">, GovernedDatasetType> = {
  price: "rice_price",
  flood: "flood",
  drought: "drought",
  storm: "storm",
};

function statusLabel(status: DatasetVersion["status"], isDefault: boolean) {
  if (isDefault) return "เผยแพร่แล้ว · ค่าเริ่มต้น";
  if (status === "published") return "เผยแพร่แล้ว";
  if (status === "archived") return "เก็บในคลัง";
  return "ฉบับร่าง";
}

function datasetDate(value: string | null) {
  return value
    ? new Date(value).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })
    : "ยังไม่เผยแพร่";
}

type DatasetWorkspaceView = "overview" | "import" | "data" | "history";
type DatasetVersionModal =
  | { kind: "create" }
  | { kind: "edit"; target: DatasetVersion }
  | { kind: "delete"; target: DatasetVersion };

function DatasetVersionManager({ category }: { category: Exclude<AgricultureCategory, "yield"> }) {
  const type = DATASET_TYPE[category];
  const [data, setData] = useState<DatasetResponse | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<DatasetWorkspaceView>("overview");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [modal, setModal] = useState<DatasetVersionModal | null>(null);
  const selected = data?.versions.find((version) => version.id === selectedId) ?? null;
  const defaultVersion = data?.versions.find((version) => version.is_default) ?? null;
  const canImport = selected?.status === "draft" && selected.record_count === 0;
  const canInspect = Boolean(selected?.record_count);

  async function load(preferredId?: string) {
    setLoading(true);
    setError("");
    try {
      const result = await request<DatasetResponse>(`/api/admin/datasets?type=${type}`);
      setData(result);
      const nextSelectedId = preferredId && result.versions.some((version) => version.id === preferredId)
        ? preferredId
        : result.versions.some((version) => version.id === selectedId)
          ? selectedId
          : result.versions.find((version) => version.is_default)?.id ?? result.versions[0]?.id ?? "";
      setSelectedId(nextSelectedId);
      const nextSelected = result.versions.find((version) => version.id === nextSelectedId) ?? null;
      if ((view === "import" && (nextSelected?.status !== "draft" || nextSelected.record_count > 0))
        || (view === "data" && !nextSelected?.record_count)) {
        setView("overview");
      }
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;
    request<DatasetResponse>(`/api/admin/datasets?type=${type}`)
      .then((result) => {
        if (!active) return;
        setData(result);
        setSelectedId(result.versions.find((version) => version.is_default)?.id ?? result.versions[0]?.id ?? "");
      })
      .catch((cause) => { if (active) setError(errorText(cause)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [type]);

  async function changeVersion(version: DatasetVersion, action: string, label: string) {
    if (!window.confirm(`ยืนยัน${label} “${version.label}”?`)) return;
    setBusy(version.id);
    setError("");
    setSuccess("");
    try {
      await request("/api/admin/datasets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: version.id, revision: version.revision, action }),
      });
      setSuccess(`${label}สำเร็จ`);
      await load(version.id);
      setView("overview");
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(null);
    }
  }

  async function exportExcel(version: DatasetVersion) {
    setExporting(true);
    setError("");
    try {
      const safeKey = version.version_key.replace(/[^a-z0-9._-]/gi, "_");
      await download(
        `/api/admin/datasets?mode=export&type=${encodeURIComponent(type)}&versionId=${encodeURIComponent(version.id)}`,
        `${type}_${safeKey}.xlsx`
      );
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setExporting(false);
    }
  }

  return <div className="min-w-0 space-y-4">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint-light">Governed dataset</p>
        <h3 className="mt-1 text-2xl font-bold">จัดการเวอร์ชันข้อมูล{AGRI_TABS.find((tab) => tab.id === category)?.label}</h3>
        <p className="mt-1 text-sm text-[var(--app-text-secondary)]">สร้างและเลือกเวอร์ชัน แล้วนำเข้า แก้ไข ตรวจสอบ หรือเผยแพร่จากพื้นที่ทำงานเดียว</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <button type="button" className={button} onClick={() => void load()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />รีเฟรช</button>
        <button type="button" className={primary} disabled={loading} onClick={() => { setError(""); setSuccess(""); setModal({ kind: "create" }); }}><Plus className="h-4 w-4" />สร้างเวอร์ชัน</button>
      </div>
    </header>
    {error && <Notice message={error} />}
    {success && <Notice message={success} success />}
    {loading && !data?.versions.length ? <Busy /> : !data?.versions.length ? <Empty>ยังไม่มีเวอร์ชันข้อมูล กด “สร้างเวอร์ชัน” เพื่อเริ่มต้น</Empty> : <>
      <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5" aria-label="เลือกเวอร์ชันข้อมูล">
        <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.35fr)] lg:items-end">
          <label className="grid gap-1.5 text-sm font-semibold">
            <span className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />เวอร์ชันที่กำลังจัดการ</span>
            <select className={input} value={selectedId} disabled={loading} onChange={(event) => { setSelectedId(event.target.value); setError(""); setSuccess(""); setView("overview"); }}>
              {data.versions.map((version) => <option key={version.id} value={version.id}>{statusLabel(version.status, version.is_default)} · {version.label}</option>)}
            </select>
          </label>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-border)] sm:grid-cols-4">
            {[
              ["ทั้งหมด", data.versions.length.toLocaleString("th-TH")],
              ["ฉบับร่าง", data.versions.filter((version) => version.status === "draft").length.toLocaleString("th-TH")],
              ["เผยแพร่", data.versions.filter((version) => version.status === "published").length.toLocaleString("th-TH")],
              ["ค่าเริ่มต้น", defaultVersion?.label ?? "ยังไม่มี"],
            ].map(([label, value]) => <div key={label} className="min-w-0 bg-[var(--app-surface-soft)] px-3 py-2.5"><dt className="text-[11px] text-[var(--app-text-muted)]">{label}</dt><dd className="mt-0.5 truncate text-sm font-bold" title={value}>{value}</dd></div>)}
          </dl>
        </div>
      </section>

      {selected && <div className="min-w-0 space-y-4">
        <section className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]" aria-label="พื้นที่ทำงานของเวอร์ชันที่เลือก">
          <div className="p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${selected.status === "published" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200" : selected.status === "draft" ? "bg-amber-100 text-amber-900 dark:bg-amber-400/10 dark:text-amber-200" : "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/60"}`}>{statusLabel(selected.status, selected.is_default)}</span></div>
                <h4 className="mt-2 break-words text-xl font-bold sm:text-2xl">{selected.label}</h4>
                <p className="mt-1 max-w-3xl whitespace-pre-wrap break-words text-sm text-[var(--app-text-secondary)]">{selected.description || "ยังไม่ได้ใส่รายละเอียดเวอร์ชัน"}</p>
                <p className="mt-2 text-xs text-[var(--app-text-muted)]">{selected.version_key} · {selected.record_count.toLocaleString("th-TH")} แถว · อัปเดต {datasetDate(selected.updated_at)}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {canInspect && <button type="button" className={button} disabled={loading || exporting} onClick={() => void exportExcel(selected)}>{exporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}{exporting ? "กำลังเตรียม Excel…" : "ดาวน์โหลด Excel"}</button>}
                {canImport && <button type="button" className={primary} disabled={loading} onClick={() => setView("import")}><UploadCloud className="h-4 w-4" />นำเข้าข้อมูล</button>}
                {canInspect && <button type="button" className={primary} disabled={loading} onClick={() => setView("data")}><Database className="h-4 w-4" />ดูข้อมูล</button>}
                {selected.status === "draft" && <button type="button" className={button} disabled={busy === selected.id || selected.record_count === 0} onClick={() => void changeVersion(selected, "publish", "เผยแพร่")}><Eye className="h-4 w-4" />เผยแพร่</button>}
                {selected.status === "draft" && data.canSetDefault && <button type="button" className={button} disabled={busy === selected.id || selected.record_count === 0} onClick={() => void changeVersion(selected, "publish-default", "เผยแพร่และตั้งเป็นค่าเริ่มต้น")}><Star className="h-4 w-4" />เผยแพร่เป็นค่าเริ่มต้น</button>}
                {selected.status === "published" && !selected.is_default && data.canSetDefault && <button type="button" className={button} disabled={busy === selected.id} onClick={() => void changeVersion(selected, "default", "ตั้งเป็นค่าเริ่มต้น")}><Star className="h-4 w-4" />ตั้งเป็นค่าเริ่มต้น</button>}
                {selected.status === "published" && !selected.is_default && <button type="button" className={button} disabled={busy === selected.id} onClick={() => void changeVersion(selected, "unpublish", "เปิดเวอร์ชันเพื่อแก้ไขข้อมูล")}><EyeOff className="h-4 w-4" />เปิดแก้ไขข้อมูล</button>}
                {selected.status === "archived" && <button type="button" className={button} disabled={busy === selected.id} onClick={() => void changeVersion(selected, "restore", "คืนจากคลัง")}><FolderOpen className="h-4 w-4" />คืนจากคลัง</button>}
              </div>
            </div>

            <details className="group mt-4 border-t border-[var(--app-border)] pt-3">
              <summary className="flex w-fit cursor-pointer list-none items-center gap-2 py-1 text-sm font-semibold text-[var(--app-text-secondary)] [&::-webkit-details-marker]:hidden">ตัวเลือกเวอร์ชันและรายละเอียด <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" /></summary>
              <div className="mt-3 rounded-xl bg-[var(--app-surface-soft)] p-3.5">
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "edit", target: selected })}><FilePenLine className="h-4 w-4" />แก้ไขรายละเอียด</button>
                  {selected.status !== "archived" && <button type="button" className={button} disabled={loading || selected.is_default} title={selected.is_default ? "เปลี่ยนค่าเริ่มต้นเป็นเวอร์ชันอื่นก่อน" : "เก็บเวอร์ชันไว้โดยไม่แสดงต่อผู้ใช้"} onClick={() => void changeVersion(selected, "archive", "เก็บเข้าคลัง")}><Archive className="h-4 w-4" />เก็บเข้าคลัง</button>}
                  <button type="button" className={`${button} border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10`} disabled={loading} title={selected.is_default ? "ต้องเลือกเวอร์ชันเผยแพร่อื่นเป็นค่าเริ่มต้นทดแทนก่อนลบ" : "ลบเวอร์ชันและข้อมูลภายใน"} onClick={() => setModal({ kind: "delete", target: selected })}><Trash2 className="h-4 w-4" />ลบเวอร์ชัน</button>
                </div>
                <dl className="mt-3 grid gap-2 border-t border-[var(--app-border)] pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                  {[["แก้ไขครั้งที่", String(selected.revision)], ["สร้างเมื่อ", datasetDate(selected.created_at)], ["อัปเดตล่าสุด", datasetDate(selected.updated_at)], ["เผยแพร่เมื่อ", datasetDate(selected.published_at)]].map(([label, value]) => <div key={label}><dt className="text-[var(--app-text-muted)]">{label}</dt><dd className="mt-1 break-words font-medium text-[var(--app-text-secondary)]">{value}</dd></div>)}
                </dl>
              </div>
            </details>
          </div>

          <div className="overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2 sm:px-4" role="tablist" aria-label="จัดการข้อมูลในเวอร์ชัน">
            <div className="flex min-w-max gap-1">
              {[
                { id: "overview", label: "ภาพรวม", icon: Layers3 },
                ...(canImport ? [{ id: "import", label: "นำเข้าข้อมูล", icon: UploadCloud }] : []),
                ...(canInspect ? [{ id: "data", label: "ตรวจข้อมูล", icon: Database }] : []),
                { id: "history", label: "ประวัติ", icon: History },
              ].map((item) => <button key={item.id} type="button" role="tab" aria-selected={view === item.id} className={`relative flex min-h-12 items-center gap-2 px-3 text-sm font-semibold transition-colors ${view === item.id ? "text-rice-forest after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-rice-leaf dark:text-rice-mint-light" : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"}`} onClick={() => setView(item.id as DatasetWorkspaceView)}><item.icon className="h-4 w-4" />{item.label}</button>)}
            </div>
          </div>
        </section>

        {view === "overview" && <DatasetVersionOverview version={selected} />}
        {view === "import" && canImport && <section className={panel}><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-rice-mint/45 text-rice-forest"><FileSpreadsheet className="h-5 w-5" /></span><div><h4 className="font-bold">นำเข้าไฟล์ในเวอร์ชัน “{selected.label}”</h4><p className="mt-1 text-sm text-[var(--app-text-secondary)]">ตรวจตัวอย่างก่อนบันทึก ข้อมูลจะถูกบันทึกไว้ในเวอร์ชันนี้</p></div></div><AgriculturalDatasetImport key={`${selected.id}:${selected.revision}`} type={type} version={selected} onSaved={() => load(selected.id)} /></section>}
        {view === "data" && canInspect && <GovernedDatasetRecords key={`${selected.id}:${selected.revision}`} type={type} versionId={selected.id} versionLabel={selected.label} revision={selected.revision} />}
        {view === "history" && <section className={panel}><h4 className="font-bold">ประวัติเวอร์ชัน</h4>{selected.recent_events.length ? <ol className="mt-4 divide-y divide-[var(--app-border)]">{selected.recent_events.map((event, index) => <li key={`${event.created_at}:${index}`} className="py-3"><p className="font-semibold">{event.summary}</p><p className="mt-1 text-xs text-[var(--app-text-muted)]">{event.action} · {datasetDate(event.created_at)}</p></li>)}</ol> : <p className="mt-3 text-sm text-[var(--app-text-secondary)]">ยังไม่มีประวัติการเปลี่ยนแปลง</p>}</section>}
      </div>}
    </>}
    {modal && <DatasetVersionDialog type={type} modal={modal} versions={data?.versions ?? []} canSetDefault={Boolean(data?.canSetDefault)} onClose={() => setModal(null)} onSaved={async (message, id) => { setModal(null); setSuccess(message); setError(""); await load(id); setView("overview"); }} />}
  </div>;
}

function DatasetVersionOverview({ version }: { version: DatasetVersion }) {
  const validation = version.import_files[0]?.validation_summary ?? {};
  return <section className={panel}>
    <div><h4 className="text-lg font-bold">ภาพรวมชุดข้อมูล</h4><p className="mt-1 text-sm text-[var(--app-text-secondary)]">ตรวจจำนวนแถว ช่วงปี แหล่งข้อมูล และไฟล์ที่นำเข้าในเวอร์ชันนี้</p></div>
    <dl className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-xl bg-[var(--app-surface-soft)] p-3"><dt className="text-xs text-[var(--app-text-muted)]">จำนวนข้อมูล</dt><dd className="mt-1 text-xl font-bold">{version.record_count.toLocaleString("th-TH")}</dd></div>
      <div className="rounded-xl bg-[var(--app-surface-soft)] p-3"><dt className="text-xs text-[var(--app-text-muted)]">จังหวัด</dt><dd className="mt-1 text-xl font-bold">{validation.provinceCount ?? "—"}</dd></div>
      <div className="rounded-xl bg-[var(--app-surface-soft)] p-3"><dt className="text-xs text-[var(--app-text-muted)]">ช่วงปี ค.ศ.</dt><dd className="mt-1 text-xl font-bold">{validation.minYear && validation.maxYear ? `${validation.minYear}–${validation.maxYear}` : "—"}</dd></div>
      <div className="rounded-xl bg-[var(--app-surface-soft)] p-3"><dt className="text-xs text-[var(--app-text-muted)]">ปัญหา Validation</dt><dd className="mt-1 text-xl font-bold">{(validation.missingCount ?? 0) + (validation.unknownProvinceCount ?? 0)}</dd></div>
    </dl>
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--app-border)] p-3"><p className="text-xs font-bold">แหล่งข้อมูล</p><p className="mt-2 text-sm text-[var(--app-text-secondary)]">{version.source_name || "ยังไม่ระบุ"}</p>{version.source_url && <a className="mt-1 block break-all text-sm text-rice-leaf underline" href={version.source_url} target="_blank" rel="noreferrer">{version.source_url}</a>}</div>
      <div className="rounded-xl border border-[var(--app-border)] p-3"><p className="text-xs font-bold">ไฟล์ต้นทาง</p>{version.import_files.length ? <div className="mt-2 flex flex-wrap gap-2">{version.import_files.map((file, index) => <span key={`${file.file_name}:${file.imported_at}:${index}`} className="rounded-full bg-[var(--app-surface-soft)] px-3 py-1 text-xs text-[var(--app-text-secondary)]">{file.file_name} · {file.row_count.toLocaleString("th-TH")} แถว</span>)}</div> : <p className="mt-2 text-sm text-[var(--app-text-secondary)]">ยังไม่มีไฟล์นำเข้า</p>}</div>
    </div>
  </section>;
}

function DatasetVersionDialog({ type, modal, versions, canSetDefault, onClose, onSaved }: {
  type: GovernedDatasetType;
  modal: DatasetVersionModal;
  versions: DatasetVersion[];
  canSetDefault: boolean;
  onClose: () => void;
  onSaved: (message: string, id?: string) => Promise<void>;
}) {
  const target = modal.kind === "create" ? null : modal.target;
  const [key, setKey] = useState("");
  const [label, setLabel] = useState(target?.label ?? "");
  const [description, setDescription] = useState(target?.description ?? "");
  const [sourceName, setSourceName] = useState(target?.source_name ?? "");
  const [sourceUrl, setSourceUrl] = useState(target?.source_url ?? "");
  const [deleteKey, setDeleteKey] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [replacementId, setReplacementId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const title = modal.kind === "create" ? "สร้างเวอร์ชัน" : modal.kind === "edit" ? "แก้ไขรายละเอียดเวอร์ชัน" : "ลบเวอร์ชัน";
  const needsReplacement = modal.kind === "delete" && modal.target.is_default;
  const replacementOptions = modal.kind === "delete"
    ? versions.filter((version) => version.id !== modal.target.id && version.status === "published")
    : [];
  const deleteDisabled = modal.kind === "delete" && (
    !confirmed
    || deleteKey !== modal.target.version_key
    || (needsReplacement && (!canSetDefault || !replacementId))
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (modal.kind === "create") {
        const created = await request<{ id: string }>("/api/admin/datasets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, key, label, description, sourceName, sourceUrl }),
        });
        await onSaved("สร้างเวอร์ชันแล้ว พร้อมนำเข้าข้อมูลและตรวจสอบก่อนเผยแพร่", created.id);
        return;
      }
      await request("/api/admin/datasets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          id: modal.target.id,
          revision: modal.target.revision,
          action: modal.kind === "delete" ? "delete" : "edit",
          label,
          description,
          sourceName,
          sourceUrl,
          replacementId: modal.kind === "delete" && modal.target.is_default ? replacementId : undefined,
        }),
      });
      await onSaved(modal.kind === "delete" ? (modal.target.is_default ? "ลบเวอร์ชันและตั้งค่าเริ่มต้นทดแทนแล้ว" : "ลบเวอร์ชันและข้อมูลภายในแล้ว") : "แก้ไขรายละเอียดเวอร์ชันแล้ว", modal.kind === "edit" ? modal.target.id : undefined);
    } catch (cause) {
      setError(errorText(cause));
    } finally {
      setBusy(false);
    }
  }

  return <Dialog title={title} onClose={onClose} busy={busy}><form onSubmit={submit} className="space-y-4">
    {modal.kind === "delete" ? <>
      <Notice message={modal.target.status === "published" ? "เวอร์ชันนี้เผยแพร่อยู่ การลบจะนำข้อมูลและไฟล์อ้างอิงออกจากระบบทันที โดยเก็บประวัติการลบไว้สำหรับตรวจสอบ" : "การลบจะนำข้อมูลและไฟล์อ้างอิงของเวอร์ชันนี้ออกจากระบบ โดยเก็บประวัติการลบไว้สำหรับตรวจสอบ"} />
      <p className="text-lg font-bold">{modal.target.label}</p>
      {needsReplacement && !canSetDefault && <Notice message="เวอร์ชันนี้เป็นค่าเริ่มต้น เฉพาะ Super Admin เท่านั้นที่เลือกค่าเริ่มต้นทดแทนและลบเวอร์ชันนี้ได้" />}
      {needsReplacement && canSetDefault && replacementOptions.length === 0 && <Notice message="ต้องเผยแพร่เวอร์ชันอื่นของข้อมูลประเภทนี้ก่อน จึงจะใช้เป็นค่าเริ่มต้นทดแทนและลบเวอร์ชันนี้ได้" />}
      {needsReplacement && canSetDefault && replacementOptions.length > 0 && <Field label="เวอร์ชันค่าเริ่มต้นทดแทน"><select className={input} required value={replacementId} disabled={busy} onChange={(event) => setReplacementId(event.target.value)}><option value="">เลือกเวอร์ชันเผยแพร่</option>{replacementOptions.map((version) => <option key={version.id} value={version.id}>{version.label} · {version.version_key}</option>)}</select><p className="mt-1.5 text-xs leading-5 text-[var(--app-text-muted)]">ระบบจะตั้งเวอร์ชันที่เลือกเป็นค่าเริ่มต้นก่อนลบ เพื่อให้หน้า User มีข้อมูลใช้งานต่อเนื่อง</p></Field>}
      <Field label={`พิมพ์รหัสเวอร์ชัน “${modal.target.version_key}” เพื่อยืนยัน`}><input autoFocus className={input} value={deleteKey} disabled={busy} autoComplete="off" spellCheck={false} onChange={(event) => setDeleteKey(event.target.value)} /></Field>
      <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" className="mt-1 h-5 w-5 accent-rice-leaf" checked={confirmed} disabled={busy} onChange={(event) => setConfirmed(event.target.checked)} />ตรวจสอบแล้วและยืนยันลบเวอร์ชันนี้</label>
    </> : <>
      {modal.kind === "create" && <Field label="รหัสเวอร์ชัน (เปลี่ยนภายหลังไม่ได้)"><input autoFocus className={input} required minLength={2} maxLength={50} pattern="[a-z0-9][a-z0-9._-]{1,49}" placeholder="เช่น rice-price-2027-v1" value={key} disabled={busy} onChange={(event) => setKey(event.target.value.toLowerCase())} /></Field>}
      <Field label="ชื่อเวอร์ชัน"><input className={input} required minLength={2} maxLength={120} value={label} disabled={busy} onChange={(event) => setLabel(event.target.value)} /></Field>
      <Field label="รายละเอียด / สิ่งที่เปลี่ยน"><textarea className={input} rows={4} maxLength={1000} value={description} disabled={busy} onChange={(event) => setDescription(event.target.value)} /></Field>
      <Field label="ชื่อแหล่งข้อมูล"><input className={input} maxLength={200} value={sourceName} disabled={busy} onChange={(event) => setSourceName(event.target.value)} /></Field>
      <Field label="URL แหล่งข้อมูล (ถ้ามี)"><input className={input} type="url" maxLength={1000} value={sourceUrl ?? ""} disabled={busy} onChange={(event) => setSourceUrl(event.target.value)} /></Field>
      {modal.kind === "create" && <p className="text-sm leading-6 text-[var(--app-text-secondary)]">เวอร์ชันใหม่จะยังไม่แสดงต่อผู้ใช้ จนกว่าจะนำเข้าข้อมูลและกดเผยแพร่</p>}
    </>}
    {error && <Notice message={error} />}
    <div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={onClose}>ยกเลิก</button><button type="submit" className={modal.kind === "delete" ? `${button} border-rose-500/35 text-rose-700 dark:text-rose-200` : primary} disabled={busy || deleteDisabled}>{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{busy ? "กำลังบันทึก..." : modal.kind === "delete" ? "ลบเวอร์ชัน" : modal.kind === "create" ? "สร้างเวอร์ชัน" : "บันทึกการแก้ไข"}</button></div>
  </form></Dialog>;
}

export function AgriculturalDataPanel() {
  const [active, setActive] = useState<AgricultureCategory>("yield");
  return <section className="space-y-4">
    <div><p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">ฐานข้อมูล</p><h2 className="text-2xl font-bold">ข้อมูลการเกษตร</h2><p className="mt-1 text-sm text-[var(--app-text-secondary)]">ข้อมูลทุกหมวดมี Draft, Published, Default, Source และ Audit แยกจากกัน</p></div>
    <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface-soft)] p-1.5" role="tablist" aria-label="หมวดข้อมูลการเกษตร">
      <div className="flex min-w-max gap-1">{AGRI_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} className={`min-h-10 rounded-xl px-4 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-rice-leaf ${active === tab.id ? "bg-rice-forest text-white shadow-sm dark:bg-rice-mint-light dark:text-rice-dark" : "text-[var(--app-text-secondary)] hover:bg-[var(--app-surface)] hover:text-[var(--app-text)]"}`} onClick={() => setActive(tab.id)}>{tab.label}</button>)}</div>
    </div>
    {active === "yield" ? <DashboardDataManager /> : <DatasetVersionManager key={active} category={active} />}
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
  return <section className="space-y-5"><div><p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">Forecast & AI</p><h2 className="text-2xl font-bold">จัดการโมเดล</h2></div>{error && <Notice message={error} />}{loading ? <Busy /> : !models.length ? <Empty>ยังไม่มีข้อมูลโมเดล</Empty> : <div className="grid gap-4 xl:grid-cols-2">{models.map((model) => <article key={model.model_version} className={panel}><div className="flex items-start justify-between gap-3"><span className="rounded-xl bg-rice-mint/40 p-3 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light"><Bot className="h-6 w-6" /></span><div className="flex flex-wrap justify-end gap-2">{model.is_active && <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">Active</span>}<span className={`rounded-full px-3 py-1 text-xs font-bold ${model.is_visible ? "bg-sky-100 text-sky-700 dark:bg-sky-400/10 dark:text-sky-200" : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-white/60"}`}>{model.is_visible ? "แสดงหน้า User" : "ซ่อน"}</span></div></div><h3 className="mt-4 text-lg font-bold">{model.model_name}</h3><p className="text-xs text-[var(--app-text-muted)]">Version {model.model_version} · {model.target}</p><dl className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{[["Accuracy", ["accuracy", "Accuracy"]], ["MAE", ["mae", "MAE"]], ["RMSE", ["rmse", "RMSE"]], ["R²", ["r2", "r_squared", "R²"]]].map(([label, keys]) => <div key={label as string} className="rounded-xl bg-[var(--app-surface-soft)] p-3 text-center"><dt className="text-[10px] text-[var(--app-text-muted)]">{label as string}</dt><dd className="mt-1 font-bold">{metric(model, keys as string[])}</dd></div>)}</dl><div className="mt-5 flex flex-wrap gap-2"><button className={model.is_active ? button : primary} disabled={model.is_active} onClick={() => void update(model, { active: true })}><CheckCircle2 className="h-4 w-4" />{model.is_active ? "โมเดลปัจจุบัน" : "ตั้งเป็น Active"}</button><button className={button} onClick={() => void update(model, { visible: !model.is_visible })}><Power className="h-4 w-4" />{model.is_visible ? "ปิด Forecast" : "เปิด Forecast"}</button><a className={button} href={`${mainSiteUrl}/analytics/yield`} target="_blank" rel="noreferrer">ดู Forecast</a></div></article>)}</div>}</section>;
}

export function DiseasesPanel() {
  const [items, setItems] = useState<AdminDisease[]>([]);
  const [draft, setDraft] = useState({ diseaseCode: "", nameTh: "", nameEn: "", imageUrl: "", symptoms: "", causes: "", prevention: "", treatment: "", isActive: true });
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
  function edit(item: AdminDisease) { setEditing(item.id); setDraft({ diseaseCode: item.disease_code, nameTh: item.name_th, nameEn: item.name_en, imageUrl: item.image_url ?? "", symptoms: item.symptoms, causes: item.causes, prevention: item.prevention, treatment: item.treatment, isActive: item.is_active }); setOpen(true); }
  async function save(event: FormEvent) { event.preventDefault(); if (!editing) return; try { await request("/api/admin/diseases", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, id: editing }) }); setOpen(false); await load(); } catch (cause) { setError(errorText(cause)); } }
  async function upload(file: File) { const body = new FormData(); body.append("file", file); try { const data = await request<{ publicUrl: string }>("/api/admin/media", { method: "POST", body }); setDraft((current) => ({ ...current, imageUrl: data.publicUrl })); } catch (cause) { setError(errorText(cause)); } }
  return <section className="space-y-5"><div><p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">Rice Disease</p><h2 className="text-2xl font-bold">จัดการโรคข้าว</h2><p className="mt-1 text-sm text-[var(--app-text-secondary)]">Class ทั้ง 6 รายการผูกกับลำดับผลลัพธ์ของโมเดล จึงแก้ได้เฉพาะชื่อ รายละเอียด รูป และสถานะการแสดงผล</p></div>{error && <Notice message={error} />}{open && <form onSubmit={save} className={panel + " space-y-4"}><div className="flex items-center justify-between"><h3 className="font-bold">แก้ไขข้อมูลโรค</h3><button type="button" className={button} onClick={() => setOpen(false)}><X className="h-4 w-4" /></button></div><div className="grid gap-3 md:grid-cols-2"><input className={input} disabled value={draft.diseaseCode} aria-label="รหัส Class จากโมเดล" /><input className={input} required value={draft.nameTh} onChange={(event) => setDraft({ ...draft, nameTh: event.target.value })} placeholder="ชื่อโรคภาษาไทย" /><input className={input} required value={draft.nameEn} onChange={(event) => setDraft({ ...draft, nameEn: event.target.value })} placeholder="ชื่อโรคภาษาอังกฤษ" /><div className="flex gap-2"><input className={input} value={draft.imageUrl} onChange={(event) => setDraft({ ...draft, imageUrl: event.target.value })} placeholder="URL รูป" /><label className={button + " cursor-pointer px-3"}><ImageUp className="h-4 w-4" /><input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} /></label></div>{[["symptoms", "อาการ"], ["causes", "สาเหตุ"], ["prevention", "วิธีป้องกัน"], ["treatment", "วิธีรักษา"]].map(([key, label]) => <textarea key={key} className={input} rows={3} value={draft[key as keyof typeof draft] as string} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} placeholder={label} />)}</div><label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} />เปิดใช้งาน</label><button className={primary} type="submit"><Save className="h-4 w-4" />บันทึก</button></form>}{loading ? <Busy /> : !items.length ? <Empty>ยังไม่มีรายการโรค</Empty> : <div className="grid gap-3">{items.map((item) => <article key={item.id} className={panel + " flex flex-col gap-4 sm:flex-row sm:items-center"}>{item.image_url ? <Image unoptimized src={item.image_url} alt="" width={96} height={80} className="h-20 w-24 rounded-xl object-cover" /> : <span className="flex h-20 w-24 items-center justify-center rounded-xl bg-rice-mint/30 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light"><ShieldCheck className="h-7 w-7" /></span>}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.name_th}</h3><span className="text-xs text-[var(--app-text-muted)]">{item.name_en}</span><span className="rounded-full bg-[var(--app-surface-soft)] px-2 py-1 text-[10px] text-[var(--app-text-secondary)]">{item.disease_code}</span>{!item.is_active && <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] text-slate-600 dark:bg-white/10 dark:text-white/60">ปิดใช้งาน</span>}</div><p className="mt-1 line-clamp-2 text-xs text-[var(--app-text-secondary)]">{item.symptoms || "ยังไม่มีรายละเอียดอาการ"}</p><p className="mt-2 text-xs font-bold text-rice-leaf dark:text-rice-mint-light">ตรวจพบ {item.detection_count.toLocaleString("th-TH")} ครั้ง</p></div><button className={button} onClick={() => edit(item)}><Pencil className="h-4 w-4" />แก้ไข</button></article>)}</div>}<div className={panel}><h3 className="font-bold">Disease Model</h3><p className="mt-1 text-sm text-[var(--app-text-secondary)]">โมเดลและ Class Order จัดการผ่านกระบวนการ Model Release เท่านั้น หน้า Admin นี้ไม่แก้ไฟล์โมเดล Threshold หรือ Preprocessing</p><a href="http://127.0.0.1:8000/health" target="_blank" rel="noreferrer" className={button + " mt-3"}>ตรวจสถานะ Disease Model</a></div></section>;
}

type ActivityItem = { id: string; admin: string; action: string; resource_type: string; summary: string; created_at: string };
export function ActivityPanel() {
  const [items, setItems] = useState<ActivityItem[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  useEffect(() => { request<ActivityItem[]>("/api/admin/activity").then(setItems).catch((cause) => setError(errorText(cause))).finally(() => setLoading(false)); }, []);
  return <section className="space-y-5"><div><p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">Audit</p><h2 className="text-2xl font-bold">Activity Log</h2></div>{error && <Notice message={error} />}{loading ? <Busy /> : !items.length ? <Empty>ยังไม่มีกิจกรรม</Empty> : <div className={panel + " overflow-x-auto !p-0"}><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-rice-mint/25 dark:bg-white/[0.05]"><tr>{["Admin", "Action", "Target", "Date / Time"].map((label) => <th key={label} className="p-4">{label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-[var(--app-border)] transition-colors hover:bg-[var(--app-surface-soft)]"><td className="p-4 font-semibold">{item.admin}</td><td className="p-4">{item.summary}</td><td className="p-4"><span className="rounded-full bg-[var(--app-surface-soft)] px-2.5 py-1 text-xs text-[var(--app-text-secondary)]">{item.resource_type}</span></td><td className="p-4 whitespace-nowrap">{date(item.created_at)}</td></tr>)}</tbody></table></div>}</section>;
}
