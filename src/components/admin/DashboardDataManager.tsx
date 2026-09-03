"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Archive, ChevronDown, Copy, Database, Eye, EyeOff, FilePenLine, FolderOpen, History, Layers3, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck, Star, Trash2, UploadCloud } from "lucide-react";
import type { AdminDashboardVersion, DashboardDatasetType, DatasetSummary, VersionStatus } from "@/lib/admin/dashboard-types";
import ImportPanel from "./dashboard/ImportPanel";
import { DataBrowser, VersionHistory } from "./dashboard/DataBrowser";
import { API, Dialog, Field, Notice, StatusBadge, button, date, errorText, input, muted, panel, primary, request } from "./dashboard/shared";

type View = "import" | "data" | "history";
type Modal =
  | {kind:"create";source?:AdminDashboardVersion}
  | {kind:"edit";target:AdminDashboardVersion}
  | {kind:"action";action:"publish" | "unpublish" | "default" | "archive" | "restore" | "delete";target:AdminDashboardVersion};
const actionTitles = {publish:"เปิดการเผยแพร่",unpublish:"ปิดการเผยแพร่",default:"เปลี่ยนเวอร์ชันเริ่มต้น",archive:"เก็บเวอร์ชันเข้าคลัง",restore:"คืนเวอร์ชันจากคลัง",delete:"ลบเวอร์ชันถาวร"};

export default function DashboardDataManager() {
  const [versions, setVersions] = useState<AdminDashboardVersion[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<VersionStatus | "all">("all");
  const [view, setView] = useState<View | null>(null);
  const [importType, setImportType] = useState<DashboardDatasetType>("yearly-yield");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const selected = versions.find(version => version.id === selectedId);
  const defaultVersion = versions.find(version => version.is_default);
  const activeView = view ?? (selected?.status === "draft" ? "import" : "data");
  const displayed = versions.filter(version =>
    (statusFilter === "all" || version.status === statusFilter) &&
    (version.label + " " + version.version_key).toLowerCase().includes(search.trim().toLowerCase())
  );

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const data = await request<{ versions: AdminDashboardVersion[] }>(API, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setVersions(data.versions);
        setSelectedId(current => data.versions.some(item => item.id === current)
          ? current
          : data.versions.find(item => item.is_default)?.id ?? data.versions[0]?.id ?? "");
      } catch (error) {
        if (!controller.signal.aborted) setError(errorText(error));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [reload]);

  function saved(message: string, id?: string) {
    setSuccess(message);
    setError("");
    setReload(key => key + 1);
    setModal(null);
    if (id) {
      setSelectedId(id);
      setSearch("");
      setStatusFilter("all");
      setView(null);
    }
  }

  const totalRows = (version: AdminDashboardVersion) =>
    version.datasets.reduce((sum, item) => sum + item.count, 0);
  const canPublish = Boolean(selected?.datasets.find(item => item.type === "yearly-yield")?.count)
    && selected?.predictionMismatchCount === 0
    && (selected?.datasets.find(item => item.type === "yield-predictions")?.models.length ?? 0) <= 1;

  return (
    <section className="min-w-0 space-y-6 text-[var(--app-text)]" aria-label="ศูนย์จัดการ Dashboard">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-wider text-rice-leaf dark:text-rice-mint-light">จัดการชุดข้อมูลและเวอร์ชัน</p>
          <h2 className="mt-2 text-2xl font-bold leading-snug sm:text-3xl">อัปเดตข้อมูล Dashboard</h2>
          <p className={muted + " mt-2 max-w-2xl"}>ตรวจสอบข้อมูลจากทีมวิจัยให้พร้อม ก่อนเผยแพร่ให้ผู้ใช้เลือกดู</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={button} disabled={loading} onClick={() => setReload(key => key + 1)}>
            <RefreshCw aria-hidden className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />รีเฟรช
          </button>
          <button type="button" className={primary + " flex-1 sm:flex-none"} disabled={loading || Boolean(error)} onClick={() => setModal({ kind: "create" })}>
            <Plus aria-hidden className="h-4 w-4" />สร้างเวอร์ชันใหม่
          </button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: "เวอร์ชันทั้งหมด", value: String(versions.length), icon: Layers3 },
          { label: "ฉบับร่าง", value: String(versions.filter(v => v.status === "draft").length), icon: FilePenLine },
          { label: "เผยแพร่ให้ผู้ใช้", value: String(versions.filter(v => v.status === "published").length), icon: Eye },
          { label: "เวอร์ชันเริ่มต้น", value: defaultVersion?.label ?? "ยังไม่ได้กำหนด", icon: Star },
        ].map(item => (
          <article key={item.label} className={panel}>
            <div className="flex items-center justify-between gap-2">
              <p className={muted}>{item.label}</p>
              <item.icon aria-hidden className="h-4 w-4 shrink-0 text-rice-leaf dark:text-rice-mint-light" />
            </div>
            <p className="mt-3 break-words text-2xl font-bold leading-tight tabular-nums sm:text-3xl">{loading && !versions.length ? "…" : item.value}</p>
          </article>
        ))}
      </div>

      <details className="group rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3">
        <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2"><ShieldCheck aria-hidden className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />ขั้นตอนการอัปเดตข้อมูล</span>
          <ChevronDown aria-hidden className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
        </summary>
        <ol className="mt-4 grid gap-3 border-t border-[var(--app-border)] pt-4 sm:grid-cols-2 lg:grid-cols-4">
          {["สร้างหรือคัดลอกฉบับร่าง", "เลือกไฟล์และตรวจข้อมูล", "ยืนยันบันทึกในฉบับร่าง", "ตรวจความพร้อมและเผยแพร่"].map((label, index) => (
            <li key={label} className="flex items-center gap-3 text-sm leading-6">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rice-forest text-xs font-bold text-white dark:bg-rice-mint-light dark:text-rice-dark">{index + 1}</span>{label}
            </li>
          ))}
        </ol>
      </details>

      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {loading && !versions.length && <p className={muted} role="status">กำลังโหลดเวอร์ชันและสรุปข้อมูล…</p>}
      {!loading && !error && !versions.length && <div className={panel}><p className={muted}>ยังไม่มีเวอร์ชัน เริ่มจาก “สร้างเวอร์ชันใหม่” แล้วนำเข้าไฟล์ CSV</p></div>}

      {versions.length > 0 && (
        <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
          <aside className={panel + " xl:sticky xl:top-6"} aria-label="เลือกเวอร์ชันที่ต้องการจัดการ">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-bold"><Layers3 aria-hidden className="h-4 w-4" />เลือกเวอร์ชัน</h3>
              <span className="text-xs text-[var(--app-text-muted)]">{versions.length} รายการ</span>
            </div>
            <label className="relative block">
              <Search aria-hidden className="pointer-events-none absolute left-3 top-4 h-4 w-4 text-[var(--app-text-muted)]" />
              <input className={input + " pl-9"} aria-label="ค้นหาเวอร์ชัน" placeholder="ค้นหาชื่อหรือรหัสเวอร์ชัน" value={search} onChange={event => setSearch(event.target.value)} />
            </label>
            <select className={input + " mt-2"} aria-label="กรองสถานะเวอร์ชัน" value={statusFilter} onChange={event => setStatusFilter(event.target.value as VersionStatus | "all")}>
              <option value="all">ทุกสถานะ</option><option value="draft">ฉบับร่าง</option><option value="published">เผยแพร่แล้ว</option><option value="archived">เก็บในคลัง</option>
            </select>
            <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 xl:max-h-[520px] xl:grid-cols-1">
              {displayed.map(version => (
                <button key={version.id} type="button" disabled={loading} aria-pressed={selectedId === version.id}
                  className={`min-w-0 rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-rice-leaf ${selectedId === version.id ? "border-rice-leaf bg-rice-mint/20 dark:border-rice-mint-light/60 dark:bg-rice-leaf/15" : "border-[var(--app-border)] hover:bg-[var(--app-surface-soft)]"}`}
                  onClick={() => { setSelectedId(version.id); setSuccess(""); setView(null); }}>
                  <StatusBadge status={version.status} isDefault={version.is_default} />
                  <p className="mt-3 break-words text-base font-bold leading-6">{version.label}</p>
                  <p className="mt-1 break-all font-mono text-xs text-[var(--app-text-muted)]">{version.version_key}</p>
                  <p className="mt-3 text-xs text-[var(--app-text-secondary)]">{totalRows(version).toLocaleString()} แถวข้อมูล</p>
                </button>
              ))}
              {!displayed.length && <p className={muted + " py-4"}>ไม่พบเวอร์ชันตามเงื่อนไข</p>}
            </div>
          </aside>

          {selected && (
            <div className="min-w-0 space-y-5" aria-busy={loading}>
              <section className={panel} aria-label="รายละเอียดเวอร์ชันที่เลือก">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <StatusBadge status={selected.status} isDefault={selected.is_default} />
                    <h3 className="mt-3 break-words text-2xl font-bold leading-snug">{selected.label}</h3>
                    <p className={muted + " mt-2 whitespace-pre-wrap break-words"}>{selected.description || "ยังไม่ได้ใส่รายละเอียดเวอร์ชัน"}</p>
                  </div>
                  <span className="hidden rounded-xl bg-rice-mint/30 p-3 text-rice-forest sm:block dark:bg-rice-leaf/15 dark:text-rice-mint-light"><ShieldCheck aria-hidden className="h-6 w-6" /></span>
                </div>
                <p className="mt-4 text-sm text-[var(--app-text-secondary)]">
                  {selected.status === "draft" ? "ปิดการเผยแพร่ · แก้ไขรายแถวหรือนำเข้าไฟล์ได้ ผู้ใช้ยังมองไม่เห็นรุ่นนี้" : selected.status === "published" ? "เปิดการเผยแพร่ · ผู้ใช้เลือกดูได้ ปิดการเผยแพร่เพื่อแก้ข้อมูลในรุ่นเดิมได้" : "เก็บข้อมูลไว้ในคลัง · ยังไม่แสดงในตัวเลือกของผู้ใช้"}
                </p>
                <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--app-border)] pt-5">
                  <button type="button" className={selected.status === "published" ? primary : button} disabled={loading} onClick={() => setModal({ kind: "create", source: selected })}><Copy aria-hidden className="h-4 w-4" />คัดลอกเป็นฉบับร่าง</button>
                  {selected.status === "draft" && <button type="button" className={primary} disabled={loading || !canPublish} onClick={() => setModal({ kind: "action", action: "publish", target: selected })}><Eye aria-hidden className="h-4 w-4" />เปิดการเผยแพร่</button>}
                  {selected.status === "published" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "unpublish", target: selected })}><EyeOff aria-hidden className="h-4 w-4" />ปิดการเผยแพร่</button>}
                  {selected.status === "draft" && <button type="button" className={button} disabled={loading} onClick={() => setView("data")}><FilePenLine aria-hidden className="h-4 w-4" />แก้ไขข้อมูลในตาราง</button>}
                  <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "edit", target: selected })}><FilePenLine aria-hidden className="h-4 w-4" />แก้ไขรายละเอียด</button>
                  {selected.status === "published" && !selected.is_default && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "default", target: selected })}><Star aria-hidden className="h-4 w-4" />ตั้งเป็นค่าเริ่มต้น</button>}
                  {selected.status !== "archived" && <button type="button" className={button} disabled={loading || selected.is_default} title={selected.is_default ? "เปลี่ยนค่าเริ่มต้นเป็นเวอร์ชันอื่นก่อน" : "ซ่อนจากผู้ใช้โดยเก็บข้อมูลไว้"} onClick={() => setModal({ kind: "action", action: "archive", target: selected })}><Archive aria-hidden className="h-4 w-4" />เก็บเข้าคลัง</button>}
                  {selected.status === "archived" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "restore", target: selected })}><FolderOpen aria-hidden className="h-4 w-4" />คืนจากคลัง</button>}
                  {selected.status !== "published" && !selected.is_default && <button type="button" className={button + " border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10"} disabled={loading} onClick={() => setModal({ kind: "action", action: "delete", target: selected })}><Trash2 aria-hidden className="h-4 w-4" />ลบถาวร</button>}
                </div>
                <details className="mt-4 text-sm">
                  <summary className="w-fit cursor-pointer py-1 font-medium text-[var(--app-text-secondary)]">วันที่และข้อมูลเวอร์ชัน</summary>
                  <dl className="mt-3 grid gap-3 rounded-xl bg-[var(--app-background)] p-4 sm:grid-cols-2">
                    {[
                      ["รหัสเวอร์ชัน", selected.version_key], ["ครั้งที่แก้ไข", String(selected.revision)],
                      ["สร้างเมื่อ", date(selected.created_at)], ["อัปเดตล่าสุด", date(selected.updated_at)],
                      ["เผยแพร่เมื่อ", date(selected.published_at)],
                    ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-xs text-[var(--app-text-muted)]">{label}</dt><dd className="mt-1 break-words leading-6">{value}</dd></div>)}
                  </dl>
                </details>
              </section>

              <section aria-label="สรุปชุดข้อมูล" className="grid gap-3 md:grid-cols-3">
                {selected.datasets.map(dataset => <DatasetCard key={dataset.type} dataset={dataset} />)}
              </section>
              {selected.status === "draft" && <Readiness version={selected} />}

              <div className="grid grid-cols-3 gap-1 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-1.5" role="tablist" aria-label="จัดการข้อมูลในเวอร์ชัน">
                {[
                  { id: "data", label: "ข้อมูลที่บันทึก", icon: Database },
                  { id: "import", label: "นำเข้าไฟล์", icon: UploadCloud },
                  { id: "history", label: "ประวัติการอัปเดต", icon: History },
                ].map(item => (
                  <button key={item.id} id={`dashboard-tab-${item.id}`} type="button" role="tab" aria-selected={activeView === item.id} aria-controls="dashboard-tab-content"
                    className={`${activeView === item.id ? primary : button} min-w-0 flex-col px-2 sm:flex-row sm:px-3`}
                    onClick={() => setView(item.id as View)}>
                    <item.icon aria-hidden className="h-4 w-4" /><span className="text-center">{item.label}</span>
                  </button>
                ))}
              </div>
              <div id="dashboard-tab-content" role="tabpanel" aria-labelledby={`dashboard-tab-${activeView}`} className="min-w-0">
                {activeView === "import" && <ImportPanel key={selected.id + ":" + selected.revision} version={selected}
                  type={importType} onTypeChange={setImportType}
                  onCreateDraft={() => setModal({kind:"create",source:selected})}
                  onUnpublish={() => setModal({kind:"action",action:"unpublish",target:selected})}
                  onSaved={message => saved(message)} />}
                {activeView === "data" && <DataBrowser key={selected.id} version={selected} onSaved={message => saved(message)} onUnpublish={() => setModal({kind:"action",action:"unpublish",target:selected})} onCreateDraft={() => setModal({kind:"create",source:selected})} />}
                {activeView === "history" && <VersionHistory key={selected.id} version={selected} />}
              </div>
            </div>
          )}
        </div>
      )}
      {modal && <VersionModal modal={modal} versions={versions} onClose={() => setModal(null)} onSaved={(message,id)=>{saved(message,id);if (modal.kind === "action" && modal.action === "unpublish") setView("data");}} />}
    </section>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetSummary }) {
  const yearLabel = dataset.years.length > 4
    ? `${dataset.years[0]}–${dataset.years.at(-1)} · ${dataset.years.length} ปี`
    : dataset.years.join(", ") || "ยังไม่มีข้อมูล";
  return (
    <article className={panel}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <Database aria-hidden className="h-5 w-5 text-rice-leaf dark:text-rice-mint-light" />
        <span className="text-xs text-[var(--app-text-secondary)]">{dataset.count > 0 ? "มีข้อมูล" : "ยังไม่ได้นำเข้า"}</span>
      </div>
      <h4 className="text-sm font-semibold leading-6">{dataset.label}</h4>
      <p className="mt-2 text-3xl font-bold tabular-nums">{dataset.count.toLocaleString()} <span className="text-sm font-normal text-[var(--app-text-muted)]">แถว</span></p>
      <p className={muted + " mt-3"}>{dataset.provinceCount} / 77 จังหวัด</p>
      <p className="mt-1 text-sm leading-6 text-[var(--app-text-secondary)]">ปี ค.ศ. {yearLabel}</p>
      {dataset.years.length > 4 && <details className="mt-2 text-xs leading-6"><summary className="w-fit cursor-pointer font-semibold text-rice-natural dark:text-rice-mint-light">ดูปีทั้งหมด</summary><p className="mt-2 text-[var(--app-text-secondary)]">{dataset.years.join(", ")}</p></details>}
      {dataset.missingMonths > 0 && <p className="mt-3 text-xs leading-6 text-amber-700 dark:text-amber-200">ขาด {dataset.missingMonths} เดือนจากคู่จังหวัด/ปีที่มีอยู่</p>}
      {dataset.models.length > 0 && <p className="mt-3 break-words border-t border-[var(--app-border)] pt-3 text-xs leading-6 text-[var(--app-text-secondary)]">โมเดล: {dataset.models.join(", ")}</p>}
    </article>
  );
}

function Readiness({version}: {version:AdminDashboardVersion}) {
  const yearly = version.datasets.find(item=>item.type === "yearly-yield");
  const monthly = version.datasets.find(item=>item.type === "monthly-environment");
  const predictions = version.datasets.find(item=>item.type === "yield-predictions");
  return <div className="rounded-xl border border-rice-leaf/20 bg-rice-mint/15 p-4 text-sm leading-6">
    <h4 className="font-bold">ความพร้อมก่อนเผยแพร่</h4>
    <ul className="mt-2 list-disc space-y-1 pl-5">
      <li>{yearly?.count ? "มีข้อมูลผลผลิตรายปีแล้ว" : "ต้องนำเข้าผลผลิตรายปีก่อน จึงจะเผยแพร่ได้"}</li>
      {!monthly?.count && <li>ยังไม่มีสภาพแวดล้อมรายเดือน — ผู้ใช้จะไม่เห็นค่าฝน อุณหภูมิ และ NDVI ของรุ่นนี้</li>}
      {!predictions?.count && <li>ยังไม่มีผลพยากรณ์ — กราฟและแผนที่จะไม่มีค่าพยากรณ์ของรุ่นนี้</li>}
      {version.predictionMismatchCount > 0 && <li className="font-semibold text-rose-700 dark:text-rose-200">ต้องแก้ข้อมูลพยากรณ์ {version.predictionMismatchCount} แถวที่ไม่มีผลผลิตรายปีตรงกันก่อนเผยแพร่</li>}
      {(predictions?.models.length ?? 0) > 1 && <li className="font-semibold text-rose-700 dark:text-rose-200">พบมากกว่าหนึ่งโมเดล ต้องแยกเป็นคนละเวอร์ชันก่อนเผยแพร่</li>}
      {(yearly?.provinceCount ?? 0) < 77 && <li>เป็นข้อมูลบางจังหวัด พื้นที่ที่ไม่มีข้อมูลจะไม่ถูกแทนด้วยค่า 0</li>}
    </ul>
  </div>;
}

function VersionModal({modal,versions,onClose,onSaved}: {modal:Modal;versions:AdminDashboardVersion[];onClose:()=>void;onSaved:(message:string,id?:string)=>void}) {
  const [key,setKey] = useState("");
  const [label,setLabel] = useState(modal.kind === "edit" ? modal.target.label : modal.kind === "create" && modal.source ? modal.source.label+" (ฉบับปรับปรุง)" : "");
  const [description,setDescription] = useState(modal.kind === "edit" ? modal.target.description : modal.kind === "create" ? modal.source?.description ?? "" : "");
  const [makeDefault,setMakeDefault] = useState(false);
  const [confirmed,setConfirmed] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [replacementId,setReplacementId] = useState("");
  const [deleteKey,setDeleteKey] = useState("");
  const otherPublished = versions.filter(version=>version.status === "published" && modal.kind === "action" && version.id !== modal.target.id);
  const needsReplacement = modal.kind === "action" && modal.action === "unpublish" && modal.target.is_default && otherPublished.length > 0;
  const title = modal.kind === "create" ? modal.source ? "คัดลอกเป็นเวอร์ชันใหม่" : "สร้างฉบับร่างใหม่" : modal.kind === "edit" ? "แก้ไขรายละเอียดเวอร์ชัน" : actionTitles[modal.action];
  async function submit(event:FormEvent) {
    event.preventDefault();setBusy(true);setError("");
    try {
      const body = modal.kind === "create" ? {action:"create",versionKey:key,label,description,sourceId:modal.source?.id}
        : {action:modal.kind === "edit" ? "edit" : modal.action === "publish" && makeDefault ? "publish-default" : modal.action,versionId:modal.target.id,revision:modal.target.revision,label,description,replacementVersionId:needsReplacement ? replacementId : null};
      const result = await request<{id:string}>(API,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      onSaved(title+"สำเร็จ"+(modal.kind === "create" ? " • ยังไม่แสดงต่อผู้ใช้จนกว่าจะเผยแพร่" : ""),modal.kind === "action" && modal.action === "delete" ? undefined : result.id);
    } catch(error) {setError(errorText(error));} finally {setBusy(false);}
  }
  return <Dialog title={title} onClose={onClose} busy={busy}><form onSubmit={submit} className="space-y-4">
    {modal.kind === "create" && <><p className={muted}>{modal.source ? `คัดลอกข้อมูลทั้ง 3 ประเภทจาก “${modal.source.label}” เวอร์ชันต้นฉบับไม่เปลี่ยนแปลง` : "เริ่มด้วยฉบับร่างว่าง ผู้ใช้จะยังมองไม่เห็นเวอร์ชันนี้"}</p><Field label="รหัสเวอร์ชัน (เปลี่ยนภายหลังไม่ได้)"><input autoFocus className={input} value={key} disabled={busy} required minLength={2} maxLength={50} pattern="[a-z0-9][a-z0-9._-]{1,49}" placeholder="เช่น yield-2026-v2" onChange={event=>setKey(event.target.value.toLowerCase())}/></Field></>}
    {modal.kind !== "action" && <><Field label="ชื่อเวอร์ชันที่ผู้ใช้เห็น"><input className={input} value={label} onChange={event=>setLabel(event.target.value)} required minLength={2} maxLength={120} disabled={busy}/></Field><Field label="รายละเอียด / แหล่งข้อมูล / สิ่งที่เปลี่ยน"><textarea className={input} value={description} onChange={event=>setDescription(event.target.value)} rows={4} maxLength={500} disabled={busy}/></Field><p className="text-right text-xs text-rice-muted">{description.length} / 500</p></>}
    {modal.kind === "action" && <>
      <p className="text-lg font-bold">{modal.target.label}</p>
      <p className={muted}>{modal.action === "publish" ? "เวอร์ชันนี้จะปรากฏในตัวเลือกของผู้ใช้ หากต้องการแก้ข้อมูลอีกให้ปิดการเผยแพร่หรือคัดลอกเป็นฉบับร่าง" : modal.action === "unpublish" ? "หยุดแสดงเวอร์ชันนี้ต่อผู้ใช้ เพื่อแก้ข้อมูลในรุ่นเดิมได้โดยไม่ต้องสร้างรุ่นใหม่" : modal.action === "default" ? "ผู้ใช้ที่ไม่ได้เลือกเวอร์ชันจะเห็นรุ่นนี้เป็นค่าเริ่มต้น รุ่นเดิมยังอยู่และเลือกกลับได้" : modal.action === "archive" ? "เวอร์ชันนี้จะไม่อยู่ในตัวเลือกของผู้ใช้และลิงก์เดิมจะเปิดไม่ได้ ข้อมูลไม่ถูกลบ สามารถคืนจากคลังได้ภายหลัง" : modal.action === "delete" ? "ข้อมูลทั้งสามชุดและประวัติการแก้ไขของเวอร์ชันนี้จะถูกลบถาวรจาก Dashboard ไม่สามารถกู้คืนผ่านหน้า Admin ได้" : modal.target.published_at ? "เวอร์ชันนี้จะกลับมาอยู่ในตัวเลือกของผู้ใช้" : "คืนเป็นฉบับร่างเพื่ออัปโหลดและแก้ไขต่อ ยังไม่แสดงต่อผู้ใช้จนกว่าจะเผยแพร่"}</p>
      {modal.action === "publish" && <><Readiness version={modal.target}/><label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={makeDefault} disabled={busy} onChange={event=>{setMakeDefault(event.target.checked);setConfirmed(false);}} className="h-5 w-5 accent-rice-leaf"/>กำหนดเป็นเวอร์ชันเริ่มต้นด้วย</label></>}
    </>}
    {modal.kind === "action" && modal.action === "unpublish" && <div className="space-y-3"><Notice>ข้อมูลไม่ถูกลบ รุ่นนี้จะกลับเป็นฉบับร่างและแก้ไขได้ ผู้ใช้จะไม่เห็นรุ่นนี้จนกว่าจะเปิดการเผยแพร่อีกครั้ง</Notice>{needsReplacement && <Field label="เวอร์ชันเริ่มต้นสำหรับผู้ใช้ระหว่างแก้ไข"><select className={input} value={replacementId} required disabled={busy} onChange={event=>{setReplacementId(event.target.value);setConfirmed(false);}}><option value="">เลือกเวอร์ชันทดแทน</option>{otherPublished.map(version=><option key={version.id} value={version.id}>{version.label}</option>)}</select></Field>}{otherPublished.length === 0 && <Notice error>นี่คือเวอร์ชันสุดท้ายที่เผยแพร่ หากปิด ผู้ใช้จะยังไม่มีข้อมูล Dashboard ให้ดูจนกว่าจะเผยแพร่รุ่นใดรุ่นหนึ่งอีกครั้ง</Notice>}</div>}
    {modal.kind === "action" && modal.action === "delete" && <div className="space-y-3"><Notice error>ลบแล้วกู้คืนจากหน้านี้ไม่ได้ ระบบจะเก็บเฉพาะบันทึกว่ามีการลบเวอร์ชันใด เมื่อใด และโดยผู้ดูแลคนใด</Notice><Field label={`พิมพ์รหัสเวอร์ชัน “${modal.target.version_key}” เพื่อยืนยัน`}><input autoFocus className={input} value={deleteKey} onChange={event=>setDeleteKey(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false}/></Field></div>}
    {modal.kind === "action" && modal.action === "publish" && !versions.some(version=>version.status === "published") && <Notice>รุ่นนี้จะเป็นเวอร์ชันเริ่มต้น เนื่องจากยังไม่มีรุ่นอื่นที่เผยแพร่</Notice>}
    {modal.kind === "action" && <label className="flex items-start gap-3 text-sm leading-6"><input type="checkbox" checked={confirmed} disabled={busy} onChange={event=>setConfirmed(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-rice-leaf"/>ตรวจสอบผลกระทบแล้วและยืนยันการดำเนินการ</label>}
    {error && <Notice error>{error}</Notice>}
    <div className="flex justify-end gap-2"><button type="button" className={button} disabled={busy} onClick={onClose}>ยกเลิก</button><button className={modal.kind === "action" && modal.action === "delete" ? button + " border-rose-500/35 text-rose-700 dark:text-rose-200" : primary} disabled={busy || (modal.kind === "action" && !confirmed) || (needsReplacement && !replacementId) || (modal.kind === "action" && modal.action === "delete" && deleteKey !== modal.target.version_key)}>{busy && <LoaderCircle className="h-4 w-4 animate-spin"/>}{busy ? "กำลังดำเนินการ…" : modal.kind === "action" && modal.action === "delete" ? "ลบเวอร์ชันถาวร" : modal.kind === "action" ? "ยืนยัน" : "บันทึก"}</button></div>
  </form></Dialog>;
}
