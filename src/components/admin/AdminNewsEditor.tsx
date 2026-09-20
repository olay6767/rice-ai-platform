"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  Bold,
  CalendarDays,
  CheckCircle2,
  Eye,
  GripVertical,
  ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  LoaderCircle,
  Plus,
  Redo2,
  Save,
  Send,
  Trash2,
  Underline,
  Undo2,
  Unlink,
  UploadCloud,
  X,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent,
} from "react";

import {
  serializeNewsContent,
  type NewsContentBlock,
  type NewsGalleryImage,
  type NewsTextAlign,
  type NewsTextRun,
} from "@/lib/infographic/news-content";

type NewsStatus = "draft" | "published";
type PreviewTab = "listing" | "detail";

interface LocalNewsImage {
  id: string;
  name: string;
  url: string;
  file: File;
  remoteUrl?: string;
}

interface ToastState {
  message: string;
  tone: "success" | "info" | "error";
}

const CATEGORIES = [
  "ทั้งหมด",
  "ความรู้เรื่องข้าว",
  "พันธุ์ข้าว",
  "โรคใบข้าว",
  "การปลูกและดูแล",
  "เกษตรอัจฉริยะ",
] as const;

type EditorCategory = (typeof CATEGORIES)[number];

const PUBLIC_CATEGORY_VALUES = {
  "ทั้งหมด": "rice-knowledge",
  "ความรู้เรื่องข้าว": "rice-knowledge",
  "พันธุ์ข้าว": "rice-variety",
  "โรคใบข้าว": "leaf-disease",
  "การปลูกและดูแล": "cultivation",
  "เกษตรอัจฉริยะ": "smart-farming",
} as const satisfies Record<EditorCategory, string>;

const DATABASE_CATEGORY_VALUES = {
  "ทั้งหมด": "knowledge",
  "ความรู้เรื่องข้าว": "knowledge",
  "พันธุ์ข้าว": "knowledge",
  "โรคใบข้าว": "disease",
  "การปลูกและดูแล": "knowledge",
  "เกษตรอัจฉริยะ": "knowledge",
} as const satisfies Record<EditorCategory, string>;

const fieldClass =
  "min-h-11 w-full rounded-xl border border-[#173b28]/12 bg-white px-3.5 py-2.5 text-sm text-[#173523] outline-none transition placeholder:text-[#718078] focus:border-[#347846]/55 focus:ring-4 focus:ring-[#beeecf]/45";

function todayInputValue(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatThaiDate(value: string): string {
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function publishDateTime(value: string): string {
  const selectedDate = value || todayInputValue();

  if (selectedDate === todayInputValue()) {
    return new Date().toISOString();
  }

  return new Date(`${selectedDate}T12:00:00+07:00`).toISOString();
}

function safeEditorLink(value: string | null): string | undefined {
  if (!value) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function safeEditorColor(value: string | null): string | undefined {
  if (!value) return undefined;
  const color = value.trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(color)
    ? color
    : undefined;
}

function collectTextRuns(
  node: Node,
  inherited: Omit<NewsTextRun, "text"> = {}
): NewsTextRun[] {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text ? [{ text, ...inherited }] : [];
  }

  if (!(node instanceof HTMLElement) || node.tagName === "IMG") return [];
  if (node.tagName === "BR") return [{ text: "\n", ...inherited }];

  const tag = node.tagName;
  const color = safeEditorColor(
    node.style.color || node.getAttribute("color")
  );
  const nextMarks: Omit<NewsTextRun, "text"> = {
    ...inherited,
    ...(["B", "STRONG"].includes(tag) ? { bold: true as const } : {}),
    ...(["I", "EM"].includes(tag) ? { italic: true as const } : {}),
    ...(tag === "U" ? { underline: true as const } : {}),
    ...(tag === "A" && safeEditorLink(node.getAttribute("href"))
      ? { link: safeEditorLink(node.getAttribute("href")) }
      : {}),
    ...(color ? { color } : {}),
  };

  return Array.from(node.childNodes).flatMap((child) =>
    collectTextRuns(child, nextMarks)
  );
}

function textAlignment(element: HTMLElement): NewsTextAlign | undefined {
  const value = element.style.textAlign || element.getAttribute("align") || "";
  return value === "left" || value === "center" || value === "right" || value === "justify"
    ? value
    : undefined;
}

function textLineHeight(element: HTMLElement): "1" | "1.5" | "2" | undefined {
  const value = element.style.lineHeight;
  return value === "1" || value === "1.5" || value === "2" ? value : undefined;
}

function editorBlocks(
  editor: HTMLDivElement | null,
  uploadedUrls: Map<string, string>
): NewsContentBlock[] {
  if (!editor) return [];
  const blocks: NewsContentBlock[] = [];

  for (const node of Array.from(editor.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent?.trim();
      if (text) blocks.push({ type: "paragraph", runs: [{ text }] });
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;

    if (node.tagName === "IMG") {
      const src = uploadedUrls.get(node.getAttribute("src") ?? "");
      if (src) blocks.push({ type: "image", src, alt: node.getAttribute("alt") ?? "ภาพประกอบข่าว" });
      continue;
    }

    if (node.tagName === "UL" || node.tagName === "OL") {
      const items = Array.from(node.children)
        .filter((child) => child.tagName === "LI")
        .map((child) => collectTextRuns(child));
      if (items.length) {
        blocks.push({ type: node.tagName === "UL" ? "bullet-list" : "numbered-list", items });
      }
      continue;
    }

    const runs = collectTextRuns(node);
    if (runs.some((run) => run.text.trim())) {
      blocks.push({
        type: /^H[1-6]$/.test(node.tagName) ? "heading" : "paragraph",
        ...(textAlignment(node) ? { align: textAlignment(node) } : {}),
        ...(textLineHeight(node) ? { lineHeight: textLineHeight(node) } : {}),
        runs,
      });
    }

    for (const image of Array.from(node.querySelectorAll("img"))) {
      const src = uploadedUrls.get(image.getAttribute("src") ?? "");
      if (src) blocks.push({ type: "image", src, alt: image.getAttribute("alt") ?? "ภาพประกอบข่าว" });
    }
  }

  return blocks;
}

async function responseData<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { data?: T; error?: { message?: string } }
    | null;
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error?.message ?? "ไม่สามารถบันทึกข้อมูลได้ กรุณาลองใหม่");
  }
  return payload.data;
}

function FieldLabel({
  children,
  required = false,
  hint,
}: {
  children: React.ReactNode;
  required?: boolean;
  hint?: string;
}) {
  return (
    <div className="mb-2 flex items-end justify-between gap-3">
      <label className="text-sm font-bold text-[#173523]">
        {children}
        {required ? <span className="ml-1 text-orange-600">*</span> : null}
      </label>
      {hint ? <span className="text-[11px] text-[#728078]">{hint}</span> : null}
    </div>
  );
}

function ToolbarButton({
  label,
  onAction,
  children,
}: {
  label: string;
  onAction: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onAction();
      }}
      className="grid h-9 w-9 place-items-center rounded-lg text-[#385747] transition hover:bg-[#e9f4e8] hover:text-[#0b2e1c]"
    >
      {children}
    </button>
  );
}

function UploadZone({
  title,
  description,
  multiple = false,
  dragActive,
  onDragActive,
  onFiles,
}: {
  title: string;
  description: string;
  multiple?: boolean;
  dragActive: boolean;
  onDragActive: (active: boolean) => void;
  onFiles: (files: File[]) => void;
}) {
  function acceptDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    onDragActive(false);
    onFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <label
      onDragEnter={(event) => {
        event.preventDefault();
        onDragActive(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={() => onDragActive(false)}
      onDrop={acceptDrop}
      className={`flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-5 py-6 text-center transition ${
        dragActive
          ? "border-orange-500 bg-orange-50 shadow-[0_12px_30px_rgba(234,88,12,0.12)]"
          : "border-[#315d42]/25 bg-[#fbfcf8] hover:border-[#5e8c4a]/55 hover:bg-[#f4f8ef]"
      }`}
    >
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8f2e4] text-[#315d42]">
        <UploadCloud className="h-5 w-5" />
      </span>
      <strong className="mt-3 text-sm text-[#173523]">{title}</strong>
      <span className="mt-1 text-xs text-[#728078]">{description}</span>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          onFiles(Array.from(event.target.files ?? []));
          event.currentTarget.value = "";
        }}
      />
    </label>
  );
}

function EmptyPreviewImage({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`grid place-items-center bg-[#edf2e8] text-[#6f8075] ${compact ? "h-40" : "h-64"}`}>
      <div className="text-center">
        <ImageIcon className="mx-auto h-7 w-7" />
        <p className="mt-2 text-xs font-semibold">ภาพปกข่าว</p>
      </div>
    </div>
  );
}

export default function AdminNewsEditor({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<EditorCategory>("ความรู้เรื่องข้าว");
  const [summary, setSummary] = useState("");
  const [publishDate, setPublishDate] = useState(todayInputValue);
  const [status, setStatus] = useState<NewsStatus>("draft");
  const [coverImage, setCoverImage] = useState<LocalNewsImage | null>(null);
  const [contentImages, setContentImages] = useState<LocalNewsImage[]>([]);
  const [contentHtml, setContentHtml] = useState("");
  const [previewTab, setPreviewTab] = useState<PreviewTab>("listing");
  const [coverDragActive, setCoverDragActive] = useState(false);
  const [galleryDragActive, setGalleryDragActive] = useState(false);
  const [draggedImageId, setDraggedImageId] = useState<string | null>(null);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const objectUrlsRef = useRef(new Set<string>());

  const canPublish = title.trim().length >= 3 && Boolean(coverImage);
  const previewTitle = title.trim() || "ชื่อข่าวของคุณจะแสดงตรงนี้";
  const previewSummary = summary.trim() || "คำอธิบายสั้นของข่าวจะอัปเดตทันทีเมื่อเริ่มกรอกข้อมูล";
  const formattedDate = useMemo(() => formatThaiDate(publishDate), [publishDate]);

  useEffect(() => {
    const urls = objectUrlsRef.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  function createLocalUrl(file: File): string {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.add(url);
    return url;
  }

  function revokeLocalUrl(url: string) {
    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }

  function setCoverFromFiles(files: File[]) {
    const file = files.find((candidate) => candidate.type.startsWith("image/"));
    if (!file) return;
    if (coverImage) revokeLocalUrl(coverImage.url);
    setCoverImage({
      id: crypto.randomUUID(),
      name: file.name,
      url: createLocalUrl(file),
      file,
    });
  }

  function addContentImages(files: File[]) {
    const next = files
      .filter((file) => file.type.startsWith("image/"))
      .map((file) => ({
         id: `${Date.now()}-${crypto.randomUUID()}`,
         name: file.name,
         url: createLocalUrl(file),
         file,
      }));
    if (next.length) setContentImages((current) => [...current, ...next]);
  }

  function removeContentImage(image: LocalNewsImage) {
    setContentImages((current) => current.filter((item) => item.id !== image.id));
    editorRef.current
      ?.querySelectorAll(`[data-local-image-id="${CSS.escape(image.id)}"]`)
      .forEach((node) => node.remove());
    setContentHtml(editorRef.current?.innerHTML ?? "");
    revokeLocalUrl(image.url);
  }

  function reorderImage(targetId: string) {
    if (!draggedImageId || draggedImageId === targetId) return;
    setContentImages((current) => {
      const fromIndex = current.findIndex((image) => image.id === draggedImageId);
      const toIndex = current.findIndex((image) => image.id === targetId);
      if (fromIndex < 0 || toIndex < 0) return current;
      const reordered = [...current];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered;
    });
    setDraggedImageId(null);
  }

  function saveEditorSelection() {
    const selection = window.getSelection();
    const editor = editorRef.current;
    if (!selection?.rangeCount || !editor) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  }

  function restoreEditorSelection() {
    const editor = editorRef.current;
    const range = savedRangeRef.current;
    if (!editor || !range || !editor.contains(range.commonAncestorContainer)) return;
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  function runEditorCommand(command: string, value?: string) {
    const editor = editorRef.current;
    editor?.focus();
    restoreEditorSelection();
    document.execCommand(command, false, value);
    setContentHtml(editor?.innerHTML ?? "");
    saveEditorSelection();
  }

  function applyLineHeight(value: "1" | "1.5" | "2") {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    restoreEditorSelection();

    let selection = window.getSelection();
    let node = selection?.rangeCount ? selection.getRangeAt(0).startContainer : null;
    let element = node instanceof HTMLElement ? node : node?.parentElement;
    let block = element?.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6,li");

    if (!block || !editor.contains(block)) {
      document.execCommand("formatBlock", false, "p");
      selection = window.getSelection();
      node = selection?.rangeCount ? selection.getRangeAt(0).startContainer : null;
      element = node instanceof HTMLElement ? node : node?.parentElement;
      block = element?.closest<HTMLElement>("p,h1,h2,h3,h4,h5,h6,li");
    }

    if (block && editor.contains(block)) {
      block.style.lineHeight = value;
    }
    setContentHtml(editor.innerHTML);
    saveEditorSelection();
  }

  function addLink() {
    const url = window.prompt("วางลิงก์ที่ต้องการแทรก");
    if (!url) return;
    const safeUrl = safeEditorLink(url);
    if (!safeUrl) {
      showToast("กรุณาใช้ลิงก์ที่ขึ้นต้นด้วย http:// หรือ https://", "error");
      return;
    }
    runEditorCommand("createLink", safeUrl);
  }

  function insertImageAtCursor(image: LocalNewsImage) {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();

    const range = savedRangeRef.current;
    const imageNode = document.createElement("img");
    imageNode.src = image.url;
    imageNode.alt = image.name;
    imageNode.dataset.localImageId = image.id;
    imageNode.className = "my-4 max-h-[420px] w-full rounded-xl object-cover";
    const spacer = document.createElement("p");
    spacer.appendChild(document.createElement("br"));

    if (range && editor.contains(range.commonAncestorContainer)) {
      range.deleteContents();
      range.insertNode(spacer);
      range.insertNode(imageNode);
      range.setStartAfter(spacer);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    } else {
      editor.append(imageNode, spacer);
    }

    setContentHtml(editor.innerHTML);
    setShowImagePicker(false);
    saveEditorSelection();
  }

  function showToast(message: string, tone: ToastState["tone"] = "success") {
    setToast({ message, tone });
  }

  async function uploadImage(image: LocalNewsImage): Promise<string> {
    if (image.remoteUrl) return image.remoteUrl;
    const formData = new FormData();
    formData.set("file", image.file);
    const response = await fetch("/api/admin/media", { method: "POST", body: formData });
    const uploaded = await responseData<{ publicUrl: string }>(response);
    return uploaded.publicUrl;
  }

  async function persist(nextStatus: NewsStatus) {
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      showToast("กรุณากรอกชื่อข่าวอย่างน้อย 3 ตัวอักษร", "error");
      return;
    }
    if (nextStatus === "published" && !coverImage) {
      showToast("กรุณาเพิ่มภาพปกก่อนเผยแพร่", "error");
      return;
    }

    setIsSaving(true);
    try {
      const [coverRemoteUrl, galleryRemoteUrls] = await Promise.all([
        coverImage ? uploadImage(coverImage) : Promise.resolve<string | null>(null),
        Promise.all(contentImages.map(uploadImage)),
      ]);
      const nextCover = coverImage && coverRemoteUrl
        ? { ...coverImage, remoteUrl: coverRemoteUrl }
        : coverImage;
      const nextImages = contentImages.map((image, index) => ({
        ...image,
        remoteUrl: galleryRemoteUrls[index],
      }));
      setCoverImage(nextCover);
      setContentImages(nextImages);

      const uploadedUrls = new Map(
        nextImages.map((image) => [image.url, image.remoteUrl ?? image.url])
      );
      const gallery: NewsGalleryImage[] = nextImages.map((image) => ({
        src: image.remoteUrl ?? image.url,
        alt: image.name,
      }));
      const body = serializeNewsContent(
        editorBlocks(editorRef.current, uploadedUrls),
        gallery,
        PUBLIC_CATEGORY_VALUES[category]
      );
      const publishedAt = nextStatus === "published"
        ? publishDateTime(publishDate)
        : null;
      const response = await fetch(
        savedPostId
          ? `/api/admin/content/posts/${savedPostId}`
          : "/api/admin/content/posts",
        {
          method: savedPostId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            summary: summary.trim() || trimmedTitle,
            body,
            category: DATABASE_CATEGORY_VALUES[category],
            sourceName: "Rice AI Platform",
            imageUrl: coverRemoteUrl,
            imageAlt: trimmedTitle,
            isFeatured: false,
            status: nextStatus,
            publishedAt,
          }),
        }
      );
      const saved = await responseData<{ id: string }>(response);
      setSavedPostId(saved.id);
      setStatus(nextStatus);
      onSaved?.();
      showToast(
        nextStatus === "published"
          ? "เผยแพร่ข่าวแล้ว ข่าวจะแสดงในหน้าอินโฟกราฟิกทันที"
          : "บันทึกฉบับร่างลงระบบแล้ว"
      );
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "ไม่สามารถบันทึกข่าวได้ กรุณาลองใหม่",
        "error"
      );
    } finally {
      setIsSaving(false);
    }
  }

  function saveDraft() {
    void persist("draft");
  }

  function publish() {
    if (!canPublish || isSaving) return;
    void persist("published");
  }

  function openPreview() {
    setPreviewTab("detail");
    showToast("อัปเดตตัวอย่างล่าสุดแล้ว", "info");
  }

  function preventToolbarBlur(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
  }

  return (
    <div className="relative text-[#173523]">
      {toast ? (
        <div className={`fixed right-5 top-5 z-[100] flex max-w-sm items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-[0_18px_45px_rgba(11,46,28,0.24)] ${toast.tone === "success" ? "bg-[#24633f]" : toast.tone === "error" ? "bg-rose-600" : "bg-[#3f6f8f]"}`}>
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {toast.message}
        </div>
      ) : null}

      <header className="mb-5 rounded-[20px] border border-[#173b28]/10 bg-[#fffdf8] p-4 shadow-[0_12px_34px_rgba(28,63,42,0.08)] sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={onClose} aria-label="กลับไปรายการข่าว" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#edf4e9] text-[#315d42] transition hover:bg-[#dfeeda]">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#5e8c4a]">News Editor</p>
              <h1 className="mt-0.5 truncate text-2xl font-bold tracking-tight text-[#0b2e1c]">สร้างข่าวสารใหม่</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} disabled={isSaving} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#315d42]/15 bg-white px-3.5 text-sm font-bold text-[#315d42] shadow-sm transition hover:bg-[#f2f7ef] disabled:cursor-not-allowed disabled:opacity-55">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} บันทึกฉบับร่าง
            </button>
            <button type="button" onClick={openPreview} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[#315d42]/15 bg-white px-3.5 text-sm font-bold text-[#315d42] shadow-sm transition hover:bg-[#f2f7ef]">
              <Eye className="h-4 w-4" /> ดูตัวอย่าง
            </button>
            <button type="button" onClick={publish} disabled={!canPublish || isSaving} title={!canPublish ? "กรุณากรอกชื่อข่าวอย่างน้อย 3 ตัวอักษรและเพิ่มภาพปก" : undefined} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-[#0b2e1c] px-4 text-sm font-bold text-white shadow-[0_10px_24px_rgba(11,46,28,0.18)] transition hover:bg-[#164d32] disabled:cursor-not-allowed disabled:opacity-40">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} เผยแพร่
            </button>
          </div>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-5">
          <section className="rounded-[18px] border border-[#173b28]/10 bg-white p-5 shadow-[0_10px_30px_rgba(28,63,42,0.06)] sm:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-orange-600">ข้อมูลข่าว</p>
                <h2 className="mt-1 text-lg font-bold text-[#0b2e1c]">รายละเอียดพื้นฐาน</h2>
              </div>
              <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>
                {status === "published" ? "Published" : "Draft"}
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <FieldLabel required>ชื่อข่าว</FieldLabel>
                <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={180} placeholder="กรอกชื่อข่าวสาร" className={fieldClass} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <FieldLabel>หมวดหมู่</FieldLabel>
                  <select value={category} onChange={(event) => setCategory(event.target.value as EditorCategory)} className={fieldClass}>
                    {CATEGORIES.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <FieldLabel>วันที่เผยแพร่</FieldLabel>
                  <input type="date" value={publishDate} onChange={(event) => setPublishDate(event.target.value)} className={fieldClass} />
                </div>
              </div>
              <div>
                <FieldLabel hint={`${summary.length}/300`}>คำอธิบายสั้น</FieldLabel>
                <textarea value={summary} onChange={(event) => setSummary(event.target.value)} maxLength={300} rows={4} placeholder="สรุปเนื้อหาข่าวให้น่าสนใจและกระชับ" className={`${fieldClass} resize-y`} />
              </div>
              <div>
                <FieldLabel>สถานะ</FieldLabel>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-[#f4f6f1] p-1.5">
                  {(["draft", "published"] as NewsStatus[]).map((item) => (
                    <button key={item} type="button" onClick={() => setStatus(item)} disabled={item === "published" && !canPublish} className={`min-h-10 rounded-lg text-sm font-bold transition ${status === item ? "bg-white text-[#0b2e1c] shadow-sm" : "text-[#728078] hover:text-[#315d42]"} disabled:cursor-not-allowed disabled:opacity-40`}>
                      {item === "draft" ? "Draft" : "Published"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[18px] border border-[#173b28]/10 bg-white p-5 shadow-[0_10px_30px_rgba(28,63,42,0.06)] sm:p-6">
            <p className="text-xs font-bold text-orange-600">ภาพประกอบ</p>
            <h2 className="mt-1 text-lg font-bold text-[#0b2e1c]">ภาพปก <span className="text-orange-600">*</span></h2>
            <div className="mt-4">
              {coverImage ? (
                <div className="relative overflow-hidden rounded-2xl bg-[#f4f6f1] shadow-sm">
                  {/* Blob URLs are local-only previews and intentionally use a native image element. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={coverImage.url} alt="ตัวอย่างภาพปก" className="aspect-[16/8] w-full object-cover" />
                  <div className="absolute right-3 top-3 flex gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-[#315d42] shadow-md backdrop-blur">
                      <ImageIcon className="h-3.5 w-3.5" /> เปลี่ยน
                      <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => setCoverFromFiles(Array.from(event.target.files ?? []))} />
                    </label>
                    <button type="button" onClick={() => { revokeLocalUrl(coverImage.url); setCoverImage(null); }} className="grid h-9 w-9 place-items-center rounded-lg bg-white/95 text-rose-600 shadow-md backdrop-blur" aria-label="ลบภาพปก">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <UploadZone title="ลากภาพปกมาวาง หรือคลิกเพื่อเลือกไฟล์" description="JPG, PNG หรือ WEBP · 1 รูป" dragActive={coverDragActive} onDragActive={setCoverDragActive} onFiles={setCoverFromFiles} />
              )}
            </div>
          </section>

          <section className="rounded-[18px] border border-[#173b28]/10 bg-white p-5 shadow-[0_10px_30px_rgba(28,63,42,0.06)] sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-orange-600">Media Library</p>
                <h2 className="mt-1 text-lg font-bold text-[#0b2e1c]">ภาพภายในข่าว</h2>
                <p className="mt-1 text-xs text-[#728078]">ลาก Thumbnail เพื่อเรียงลำดับ แล้วเลือกรูปเพื่อแทรกในเนื้อหา</p>
              </div>
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#edf4e9] px-3.5 text-sm font-bold text-[#315d42] transition hover:bg-[#dfeeda]">
                <Plus className="h-4 w-4" /> เพิ่มรูป
                <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={(event) => addContentImages(Array.from(event.target.files ?? []))} />
              </label>
            </div>

            <div className="mt-4">
              <UploadZone title="ลากหลายรูปมาวางได้พร้อมกัน" description="รูปจะอัปโหลดเข้า Storage เมื่อบันทึกหรือเผยแพร่" multiple dragActive={galleryDragActive} onDragActive={setGalleryDragActive} onFiles={addContentImages} />
            </div>

            {contentImages.length ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {contentImages.map((image, index) => (
                  <article key={image.id} draggable onDragStart={() => setDraggedImageId(image.id)} onDragEnd={() => setDraggedImageId(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => reorderImage(image.id)} className={`group relative overflow-hidden rounded-xl bg-[#f4f6f1] shadow-sm transition ${draggedImageId === image.id ? "opacity-45" : "opacity-100"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image.url} alt={image.name} className="aspect-square w-full object-cover" />
                    <span className="absolute left-2 top-2 grid h-7 w-7 cursor-grab place-items-center rounded-lg bg-white/90 text-[#315d42] shadow-sm"><GripVertical className="h-4 w-4" /></span>
                    <span className="absolute bottom-2 left-2 rounded-md bg-[#0b2e1c]/80 px-2 py-1 text-[10px] font-bold text-white">{index + 1}</span>
                    <button type="button" onClick={() => removeContentImage(image)} aria-label={`ลบ ${image.name}`} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg bg-white/95 text-rose-600 shadow-sm opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
                  </article>
                ))}
              </div>
            ) : null}
          </section>

          <section className="rounded-[18px] border border-[#173b28]/10 bg-white p-5 shadow-[0_10px_30px_rgba(28,63,42,0.06)] sm:p-6">
            <p className="text-xs font-bold text-orange-600">Content</p>
            <h2 className="mt-1 text-lg font-bold text-[#0b2e1c]">เนื้อหาข่าว</h2>

            <div className="mt-4 overflow-hidden rounded-2xl border border-[#173b28]/12 bg-white">
              <div className="overflow-x-auto border-b border-[#173b28]/10 bg-[#fbfcf8]">
                <div className="flex min-w-max items-center gap-1 p-2">
                  <select
                    defaultValue="p"
                    aria-label="รูปแบบข้อความ"
                    title="รูปแบบข้อความ"
                    onMouseDown={saveEditorSelection}
                    onChange={(event) => runEditorCommand("formatBlock", event.target.value)}
                    className="h-9 min-w-36 rounded-lg border border-[#173b28]/15 bg-white px-3 text-xs font-bold text-[#273c30] outline-none hover:border-[#315d42]/35 focus:ring-2 focus:ring-[#beeecf]"
                  >
                    <option value="p">ข้อความปกติ</option>
                    <option value="h2">หัวข้อใหญ่</option>
                    <option value="h3">หัวข้อย่อย</option>
                  </select>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <ToolbarButton label="ตัวหนา" onAction={() => runEditorCommand("bold")}><Bold className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="ตัวเอียง" onAction={() => runEditorCommand("italic")}><Italic className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="ขีดเส้นใต้" onAction={() => runEditorCommand("underline")}><Underline className="h-4 w-4" /></ToolbarButton>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <ToolbarButton label="รายการหัวข้อ" onAction={() => runEditorCommand("insertUnorderedList")}><List className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="รายการลำดับ" onAction={() => runEditorCommand("insertOrderedList")}><ListOrdered className="h-4 w-4" /></ToolbarButton>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <ToolbarButton label="ชิดซ้าย" onAction={() => runEditorCommand("justifyLeft")}><AlignLeft className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="กึ่งกลาง" onAction={() => runEditorCommand("justifyCenter")}><AlignCenter className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="ชิดขวา" onAction={() => runEditorCommand("justifyRight")}><AlignRight className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="เต็มแนว" onAction={() => runEditorCommand("justifyFull")}><AlignJustify className="h-4 w-4" /></ToolbarButton>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <ToolbarButton label="ลดย่อหน้า" onAction={() => runEditorCommand("outdent")}><IndentDecrease className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="เพิ่มย่อหน้า" onAction={() => runEditorCommand("indent")}><IndentIncrease className="h-4 w-4" /></ToolbarButton>
                  <select
                    defaultValue="1.5"
                    aria-label="ระยะห่างบรรทัด"
                    title="ระยะห่างบรรทัด"
                    onMouseDown={saveEditorSelection}
                    onChange={(event) => applyLineHeight(event.target.value as "1" | "1.5" | "2")}
                    className="h-9 rounded-lg border border-[#173b28]/15 bg-white px-2 text-xs font-bold text-[#385747] outline-none hover:border-[#315d42]/35 focus:ring-2 focus:ring-[#beeecf]"
                  >
                    <option value="1">1.0x</option>
                    <option value="1.5">1.5x</option>
                    <option value="2">2.0x</option>
                  </select>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <label
                    title="สีตัวอักษร"
                    aria-label="สีตัวอักษร"
                    onMouseDown={saveEditorSelection}
                    className="relative grid h-9 w-9 cursor-pointer place-items-center rounded-lg text-[#385747] transition hover:bg-[#e9f4e8]"
                  >
                    <span className="border-b-2 border-orange-500 px-1 text-sm font-bold leading-5">A</span>
                    <input
                      type="color"
                      defaultValue="#173523"
                      className="absolute inset-0 cursor-pointer opacity-0"
                      onChange={(event) => runEditorCommand("foreColor", event.target.value)}
                    />
                  </label>
                  <ToolbarButton label="เพิ่มลิงก์" onAction={addLink}><Link2 className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="ยกเลิกลิงก์" onAction={() => runEditorCommand("unlink")}><Unlink className="h-4 w-4" /></ToolbarButton>

                  <span className="mx-1 h-7 w-px bg-[#173b28]/12" />
                  <ToolbarButton label="ย้อนกลับ" onAction={() => runEditorCommand("undo")}><Undo2 className="h-4 w-4" /></ToolbarButton>
                  <ToolbarButton label="ทำซ้ำ" onAction={() => runEditorCommand("redo")}><Redo2 className="h-4 w-4" /></ToolbarButton>
                  <button type="button" onMouseDown={preventToolbarBlur} onClick={() => setShowImagePicker((current) => !current)} className={`ml-1 inline-flex h-9 items-center gap-2 rounded-lg px-3 text-xs font-bold transition ${showImagePicker ? "bg-[#315d42] text-white" : "text-[#315d42] hover:bg-[#e9f4e8]"}`}>
                    <ImageIcon className="h-4 w-4" /> รูปภาพ
                  </button>
                </div>
              </div>

              {showImagePicker ? (
                <div className="border-b border-[#173b28]/10 bg-[#f7f9f4] p-3">
                  <p className="mb-2 text-xs font-bold text-[#315d42]">เลือกรูปเพื่อแทรกตรง Cursor</p>
                  {contentImages.length ? (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {contentImages.map((image) => (
                        <button key={image.id} type="button" onMouseDown={preventToolbarBlur} onClick={() => insertImageAtCursor(image)} className="shrink-0 overflow-hidden rounded-lg ring-1 ring-[#315d42]/10 transition hover:ring-2 hover:ring-orange-500">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={image.url} alt={image.name} className="h-16 w-20 object-cover" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="rounded-lg bg-white px-3 py-4 text-center text-xs text-[#728078]">เพิ่มภาพภายในข่าวก่อน แล้วจึงเลือกแทรกในเนื้อหา</p>
                  )}
                </div>
              ) : null}

              <div className="relative">
                {!contentHtml ? <span className="pointer-events-none absolute left-4 top-4 text-sm text-[#8a958f]">เริ่มเขียนเนื้อหาข่าวที่นี่...</span> : null}
                <div ref={editorRef} contentEditable suppressContentEditableWarning role="textbox" aria-multiline="true" aria-label="เนื้อหาข่าว" onInput={(event) => setContentHtml(event.currentTarget.innerHTML)} onKeyUp={saveEditorSelection} onMouseUp={saveEditorSelection} onFocus={saveEditorSelection} className="admin-news-editor-content min-h-72 px-4 py-4 text-sm leading-7 text-[#273c30] outline-none sm:min-h-96 [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0b2e1c] [&_h3]:my-2.5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#173523] [&_img]:my-4 [&_img]:max-h-[420px] [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" />
              </div>
            </div>
          </section>
        </div>

        <aside className="xl:sticky xl:top-5">
          <section className="overflow-hidden rounded-[18px] border border-[#173b28]/10 bg-[#fffdf8] shadow-[0_16px_42px_rgba(28,63,42,0.10)]">
            <div className="border-b border-[#173b28]/10 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-orange-600">Live Preview</p>
                  <h2 className="mt-0.5 text-base font-bold text-[#0b2e1c]">ตัวอย่างแบบ Real-time</h2>
                </div>
                <Eye className="h-5 w-5 text-[#5e8c4a]" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-xl bg-[#edf2e8] p-1">
                <button type="button" onClick={() => setPreviewTab("listing")} className={`min-h-9 rounded-lg text-xs font-bold transition ${previewTab === "listing" ? "bg-white text-[#0b2e1c] shadow-sm" : "text-[#68766e]"}`}>หน้ารวมข่าว</button>
                <button type="button" onClick={() => setPreviewTab("detail")} className={`min-h-9 rounded-lg text-xs font-bold transition ${previewTab === "detail" ? "bg-white text-[#0b2e1c] shadow-sm" : "text-[#68766e]"}`}>หน้ารายละเอียด</button>
              </div>
            </div>

            <div className="max-h-[calc(100dvh-12rem)] overflow-y-auto p-4">
              {previewTab === "listing" ? (
                <article className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(28,63,42,0.10)]">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage.url} alt="ภาพปกตัวอย่าง" className="h-40 w-full object-cover" />
                  ) : <EmptyPreviewImage compact />}
                  <div className="p-4">
                    <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">{category}</span>
                    <h3 className="mt-3 line-clamp-2 text-lg font-bold leading-7 text-[#0b2e1c]">{previewTitle}</h3>
                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#64736a]">{previewSummary}</p>
                    <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#173b28]/8 pt-3 text-[10px] text-[#7c8981]">
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3" /> {formattedDate}</span>
                      <span>0 Views</span>
                    </div>
                    <button type="button" className="mt-4 w-full rounded-xl bg-[#343a36] px-4 py-2.5 text-xs font-bold text-white">ดูข่าว</button>
                  </div>
                </article>
              ) : (
                <article className="overflow-hidden rounded-2xl bg-white shadow-[0_10px_28px_rgba(28,63,42,0.10)]">
                  {coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverImage.url} alt="ภาพปกตัวอย่าง" className="h-56 w-full object-cover" />
                  ) : <EmptyPreviewImage />}
                  <div className="p-4 sm:p-5">
                    <span className="inline-flex rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700">{category}</span>
                    <h3 className="mt-3 text-xl font-bold leading-8 text-[#0b2e1c]">{previewTitle}</h3>
                    <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#7c8981]">
                      <span>{formattedDate}</span><span>0 Views</span><span>{status === "published" ? "Published" : "Draft"}</span>
                    </div>
                    {contentHtml ? (
                      <div className="admin-news-preview-content mt-5 text-sm leading-7 text-[#34483b] [&_a]:font-semibold [&_a]:text-sky-700 [&_a]:underline [&_h2]:my-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#0b2e1c] [&_h3]:my-2.5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#173523] [&_img]:my-4 [&_img]:max-h-[360px] [&_img]:w-full [&_img]:rounded-xl [&_img]:object-cover [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6" dangerouslySetInnerHTML={{ __html: contentHtml }} />
                    ) : (
                      <p className="mt-5 rounded-xl bg-[#f5f7f2] p-4 text-center text-xs leading-5 text-[#7c8981]">เนื้อหาข่าวจะแสดงที่นี่แบบ Real-time</p>
                    )}
                    {contentImages.length ? (
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {contentImages.map((image) => (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img key={image.id} src={image.url} alt={image.name} className="aspect-[4/3] w-full rounded-lg object-cover" />
                        ))}
                      </div>
                    ) : null}
                  </div>
                </article>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
