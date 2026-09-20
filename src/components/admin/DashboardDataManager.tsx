"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AlertTriangle, Archive, CheckCircle2, ChevronDown, Copy, Database, Eye, EyeOff, FilePenLine, FolderOpen, History, Layers3, LoaderCircle, Plus, RefreshCw, ShieldCheck, Star, Trash2, UploadCloud } from "lucide-react";
import type { AdminDashboardVersion, DashboardDatasetType, DatasetSummary } from "@/lib/admin/dashboard-types";
import ImportPanel from "./dashboard/ImportPanel";
import { DataBrowser, VersionHistory } from "./dashboard/DataBrowser";
import { API, Dialog, Field, Notice, StatusBadge, button, date, errorText, input, muted, panel, primary, request } from "./dashboard/shared";

type View = "overview" | "import" | "data" | "history";
type Modal =
  | {kind:"create";source?:AdminDashboardVersion}
  | {kind:"edit";target:AdminDashboardVersion}
  | {kind:"action";action:"publish" | "unpublish" | "default" | "archive" | "restore" | "delete";target:AdminDashboardVersion};
const actionTitles = {publish:"เปิดการเผยแพร่",unpublish:"ปิดการเผยแพร่",default:"เปลี่ยนเวอร์ชันเริ่มต้น",archive:"เก็บเวอร์ชันเข้าคลัง",restore:"คืนเวอร์ชันจากคลัง",delete:"ลบเวอร์ชันถาวร"};

export default function DashboardDataManager() {
  const [versions, setVersions] = useState<AdminDashboardVersion[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View | null>(null);
  const [importType, setImportType] = useState<DashboardDatasetType>("yearly-yield");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const selected = versions.find(version => version.id === selectedId);
  const defaultVersion = versions.find(version => version.is_default);
  const activeView = view ?? "overview";

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
      setView(null);
    }
  }

  const totalRows = (version: AdminDashboardVersion) =>
    version.datasets.reduce((sum, item) => sum + item.count, 0);
  const canPublish = Boolean(selected?.datasets.find(item => item.type === "yearly-yield")?.count)
    && selected?.predictionMismatchCount === 0
    && (selected?.datasets.find(item => item.type === "yield-predictions")?.models.length ?? 0) <= 1;

  return (
    <section className="min-w-0 space-y-4 text-[var(--app-text)]" aria-label="ศูนย์จัดการ Dashboard">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-rice-leaf dark:text-rice-mint-light">Dashboard dataset</p>
          <h2 className="mt-1 text-2xl font-bold leading-snug">จัดการข้อมูลผลผลิตข้าว</h2>
          <p className={muted + " mt-1 max-w-2xl"}>เลือกเวอร์ชัน แล้วนำเข้า ตรวจข้อมูล หรือเผยแพร่จากพื้นที่ทำงานเดียว</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={button} disabled={loading} onClick={() => setReload(key => key + 1)}>
            <RefreshCw aria-hidden className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />รีเฟรช
          </button>
          <button type="button" className={primary} disabled={loading || Boolean(error)} onClick={() => setModal({ kind: "create" })}>
            <Plus aria-hidden className="h-4 w-4" />สร้างเวอร์ชัน
          </button>
        </div>
      </header>

      {error && <Notice error>{error}</Notice>}
      {success && <Notice>{success}</Notice>}
      {loading && !versions.length && <p className={muted} role="status">กำลังโหลดเวอร์ชันและสรุปข้อมูล…</p>}
      {!loading && !error && !versions.length && <div className={panel}><p className={muted}>ยังไม่มีเวอร์ชัน เริ่มจาก “สร้างเวอร์ชัน” แล้วนำเข้าไฟล์ CSV</p></div>}

      {versions.length > 0 && (
        <>
          <section className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4 sm:p-5" aria-label="เลือกเวอร์ชันข้อมูล">
            <div className="grid gap-4 lg:grid-cols-[minmax(280px,1fr)_minmax(0,1.35fr)] lg:items-end">
              <label className="grid gap-1.5 text-sm font-semibold">
                <span className="flex items-center gap-2"><Layers3 aria-hidden className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />เวอร์ชันที่กำลังจัดการ</span>
                <select className={input} value={selectedId} disabled={loading} onChange={event => { setSelectedId(event.target.value); setSuccess(""); setView(null); }}>
                  {versions.map(version => <option key={version.id} value={version.id}>{version.status === "draft" ? "ฉบับร่าง" : version.status === "published" ? "เผยแพร่แล้ว" : "เก็บในคลัง"} · {version.label}</option>)}
                </select>
              </label>
              <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-border)] sm:grid-cols-4">
                {[
                  ["ทั้งหมด", versions.length.toLocaleString()],
                  ["ฉบับร่าง", versions.filter(version => version.status === "draft").length.toLocaleString()],
                  ["เผยแพร่", versions.filter(version => version.status === "published").length.toLocaleString()],
                  ["ค่าเริ่มต้น", defaultVersion?.label ?? "ยังไม่มี"],
                ].map(([label, value]) => <div key={label} className="min-w-0 bg-[var(--app-surface-soft)] px-3 py-2.5"><dt className="text-[11px] text-[var(--app-text-muted)]">{label}</dt><dd className="mt-0.5 truncate text-sm font-bold" title={value}>{value}</dd></div>)}
              </dl>
            </div>
          </section>

          {selected && (
            <div className="min-w-0 space-y-4" aria-busy={loading}>
              <section className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)]" aria-label="พื้นที่ทำงานของเวอร์ชันที่เลือก">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0">
                      <StatusBadge status={selected.status} isDefault={selected.is_default} />
                      <h3 className="mt-2 break-words text-xl font-bold leading-snug sm:text-2xl">{selected.label}</h3>
                      <p className={muted + " mt-1 max-w-3xl whitespace-pre-wrap break-words"}>{selected.description || "ยังไม่ได้ใส่รายละเอียดเวอร์ชัน"}</p>
                      <p className="mt-2 text-xs text-[var(--app-text-muted)]">{selected.version_key} · {totalRows(selected).toLocaleString()} แถว · อัปเดต {date(selected.updated_at)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      {selected.status === "draft" && <button type="button" className={primary} disabled={loading} onClick={() => setView("import")}><UploadCloud aria-hidden className="h-4 w-4" />นำเข้าข้อมูล</button>}
                      {selected.status === "draft" && <button type="button" className={button} disabled={loading || !canPublish} title={!canPublish ? "ตรวจความพร้อมในแท็บภาพรวมก่อนเผยแพร่" : undefined} onClick={() => setModal({ kind: "action", action: "publish", target: selected })}><Eye aria-hidden className="h-4 w-4" />เผยแพร่</button>}
                      {selected.status === "published" && <button type="button" className={primary} disabled={loading} onClick={() => setView("data")}><Database aria-hidden className="h-4 w-4" />ดูข้อมูล</button>}
                      {selected.status !== "draft" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "create", source: selected })}><Copy aria-hidden className="h-4 w-4" />คัดลอกเป็นฉบับร่าง</button>}
                    </div>
                  </div>

                  <details className="group mt-4 border-t border-[var(--app-border)] pt-3">
                    <summary className="flex w-fit cursor-pointer list-none items-center gap-2 py-1 text-sm font-semibold text-[var(--app-text-secondary)] [&::-webkit-details-marker]:hidden">
                      ตัวเลือกเวอร์ชันและรายละเอียด <ChevronDown aria-hidden className="h-4 w-4 transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 rounded-xl bg-[var(--app-surface-soft)] p-3.5">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "edit", target: selected })}><FilePenLine aria-hidden className="h-4 w-4" />แก้ไขรายละเอียด</button>
                        {selected.status === "draft" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "create", source: selected })}><Copy aria-hidden className="h-4 w-4" />คัดลอกเป็นฉบับร่าง</button>}
                        {selected.status === "published" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "unpublish", target: selected })}><EyeOff aria-hidden className="h-4 w-4" />ปิดการเผยแพร่</button>}
                        {selected.status === "published" && !selected.is_default && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "default", target: selected })}><Star aria-hidden className="h-4 w-4" />ตั้งเป็นค่าเริ่มต้น</button>}
                        {selected.status !== "archived" && <button type="button" className={button} disabled={loading || selected.is_default} title={selected.is_default ? "เปลี่ยนค่าเริ่มต้นเป็นเวอร์ชันอื่นก่อน" : "ซ่อนจากผู้ใช้โดยเก็บข้อมูลไว้"} onClick={() => setModal({ kind: "action", action: "archive", target: selected })}><Archive aria-hidden className="h-4 w-4" />เก็บเข้าคลัง</button>}
                        {selected.status === "archived" && <button type="button" className={button} disabled={loading} onClick={() => setModal({ kind: "action", action: "restore", target: selected })}><FolderOpen aria-hidden className="h-4 w-4" />คืนจากคลัง</button>}
                        {selected.status !== "published" && !selected.is_default && <button type="button" className={button + " border-rose-500/35 text-rose-700 enabled:hover:bg-rose-50 dark:text-rose-200 dark:enabled:hover:bg-rose-500/10"} disabled={loading} onClick={() => setModal({ kind: "action", action: "delete", target: selected })}><Trash2 aria-hidden className="h-4 w-4" />ลบถาวร</button>}
                      </div>
                      <dl className="mt-3 grid gap-2 border-t border-[var(--app-border)] pt-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        {[["แก้ไขครั้งที่", String(selected.revision)], ["สร้างเมื่อ", date(selected.created_at)], ["อัปเดตล่าสุด", date(selected.updated_at)], ["เผยแพร่เมื่อ", date(selected.published_at)]].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[var(--app-text-muted)]">{label}</dt><dd className="mt-1 break-words font-medium text-[var(--app-text-secondary)]">{value}</dd></div>)}
                      </dl>
                    </div>
                  </details>
                </div>

                <div className="overflow-x-auto border-t border-[var(--app-border)] bg-[var(--app-surface-soft)] px-2 sm:px-4" role="tablist" aria-label="จัดการข้อมูลในเวอร์ชัน">
                  <div className="flex min-w-max gap-1">
                    {[
                      { id: "overview", label: "ภาพรวม", icon: Layers3 },
                      { id: "import", label: "นำเข้าข้อมูล", icon: UploadCloud },
                      { id: "data", label: "ตรวจข้อมูล", icon: Database },
                      { id: "history", label: "ประวัติ", icon: History },
                    ].map(item => (
                      <button key={item.id} id={`dashboard-tab-${item.id}`} type="button" role="tab" aria-selected={activeView === item.id} aria-controls="dashboard-tab-content"
                        className={`relative flex min-h-12 items-center gap-2 px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-rice-leaf ${activeView === item.id ? "text-rice-forest after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:rounded-full after:bg-rice-leaf dark:text-rice-mint-light dark:after:bg-rice-mint-light" : "text-[var(--app-text-muted)] hover:text-[var(--app-text)]"}`}
                        onClick={() => setView(item.id as View)}>
                        <item.icon aria-hidden className="h-4 w-4" />{item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <div id="dashboard-tab-content" role="tabpanel" aria-labelledby={`dashboard-tab-${activeView}`} className="min-w-0">
                {activeView === "overview" && <section className={panel + " space-y-4"}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div><h3 className="text-lg font-bold">ภาพรวมชุดข้อมูล</h3><p className={muted}>ตรวจจำนวนแถว พื้นที่ และความพร้อมก่อนเผยแพร่</p></div>
                    {selected.status === "draft" && <button type="button" className={button} onClick={() => setView("import")}><UploadCloud aria-hidden className="h-4 w-4" />จัดการไฟล์</button>}
                  </div>
                  <div className="grid gap-3 lg:grid-cols-3" aria-label="สรุปชุดข้อมูล">
                    {selected.datasets.map(dataset => <DatasetCard key={dataset.type} dataset={dataset} />)}
                  </div>
                  {selected.status === "draft" && <Readiness version={selected} />}
                  <details className="group rounded-xl border border-[var(--app-border)]">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                      วิธีอัปเดตข้อมูล 4 ขั้นตอน <ChevronDown aria-hidden className="h-4 w-4 text-[var(--app-text-muted)] transition-transform group-open:rotate-180" />
                    </summary>
                    <ol className="grid gap-2 border-t border-[var(--app-border)] p-3 sm:grid-cols-2 lg:grid-cols-4">
                      {["สร้างหรือคัดลอกฉบับร่าง", "เลือกไฟล์และตรวจข้อมูล", "ยืนยันบันทึก", "ตรวจความพร้อมและเผยแพร่"].map((label, index) => <li key={label} className="flex items-center gap-2.5 rounded-lg bg-[var(--app-surface-soft)] p-3 text-sm"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-rice-forest text-xs font-bold text-white dark:bg-rice-mint-light dark:text-rice-dark">{index + 1}</span>{label}</li>)}
                    </ol>
                  </details>
                </section>}
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
        </>
      )}
      {modal && <VersionModal modal={modal} versions={versions} onClose={() => setModal(null)} onSaved={(message,id)=>{saved(message,id);if (modal.kind === "action" && modal.action === "unpublish") setView("data");}} />}
    </section>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetSummary }) {
  const yearLabel = dataset.years.length > 4
    ? `${dataset.years[0]}–${dataset.years.at(-1)} · ${dataset.years.length} ปี`
    : dataset.years.join(", ") || "ยังไม่มีข้อมูล";
  const coverage = Math.min(
    100,
    Math.round((dataset.provinceCount / 77) * 100)
  );

  return (
    <article className="min-w-0 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-rice-mint/30 text-rice-leaf dark:bg-rice-leaf/15 dark:text-rice-mint-light">
          <Database aria-hidden className="h-4 w-4" />
        </span>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${dataset.count > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300"}`}>
          {dataset.count > 0
            ? <CheckCircle2 aria-hidden className="h-3.5 w-3.5" />
            : <AlertTriangle aria-hidden className="h-3.5 w-3.5" />}
          {dataset.count > 0 ? "มีข้อมูล" : "รอนำเข้า"}
        </span>
      </div>
      <h4 className="text-sm font-semibold leading-6">{dataset.label}</h4>
      <p className="mt-1.5 text-2xl font-bold tabular-nums">{dataset.count.toLocaleString()} <span className="text-xs font-normal text-[var(--app-text-muted)]">แถว</span></p>
      <div className="mt-3 flex items-center justify-between text-xs">
        <span className="text-[var(--app-text-secondary)]">ครอบคลุมจังหวัด</span>
        <span className="font-semibold tabular-nums">{dataset.provinceCount} / 77</span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--app-surface-soft)]">
        <span className="block h-full rounded-full bg-rice-leaf dark:bg-rice-mint-light" style={{ width: `${coverage}%` }} />
      </div>
      <p className="mt-3 text-xs leading-5 text-[var(--app-text-secondary)]">ปี ค.ศ. {yearLabel}</p>
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
  return <div className="rounded-2xl border border-rice-leaf/20 bg-rice-mint/10 p-4 text-sm leading-6">
    <h4 className="flex items-center gap-2 font-bold"><ShieldCheck aria-hidden className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />ความพร้อมก่อนเผยแพร่</h4>
    <ul className="mt-2.5 space-y-1.5 border-t border-rice-leaf/15 pt-2.5 text-[var(--app-text-secondary)]">
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
    {modal.kind !== "action" && <><Field label="ชื่อเวอร์ชันที่ผู้ใช้เห็น"><input className={input} value={label} onChange={event=>setLabel(event.target.value)} required minLength={2} maxLength={120} disabled={busy}/></Field><Field label="รายละเอียด / แหล่งข้อมูล / สิ่งที่เปลี่ยน"><textarea className={input} value={description} onChange={event=>setDescription(event.target.value)} rows={4} maxLength={500} disabled={busy}/></Field><p className="text-right text-xs text-[var(--app-text-muted)]">{description.length} / 500</p></>}
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
