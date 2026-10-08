"use client";

import { Camera, CheckCircle2, ImagePlus, LoaderCircle, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

interface ProfileAvatarUploaderProps {
  avatarUrl: string;
  fullName: string;
  initials: string;
}

interface ApiErrorPayload {
  error?: { message?: string };
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export default function ProfileAvatarUploader({
  avatarUrl,
  fullName,
  initials,
}: ProfileAvatarUploaderProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [savedUrl, setSavedUrl] = useState(avatarUrl);
  const [previewUrl, setPreviewUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function resetSelection() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setMessage("");
    setError("");

    if (!file) return;
    if (!ACCEPTED_TYPES.has(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG และ WebP");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setError("รูปโปรไฟล์ต้องมีขนาดไม่เกิน 5 MB");
      event.target.value = "";
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  async function saveAvatar() {
    if (!selectedFile || busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const formData = new FormData();
      formData.set("file", selectedFile);
      const response = await fetch("/api/profile/avatar", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload & {
        data?: { avatarUrl?: string };
      };

      if (!response.ok || !payload.data?.avatarUrl) {
        throw new Error(payload.error?.message || "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
      }

      setSavedUrl(payload.data.avatarUrl);
      resetSelection();
      setMessage("บันทึกรูปโปรไฟล์แล้ว");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  async function removeAvatar() {
    if (busy) return;
    if (selectedFile) {
      resetSelection();
      return;
    }

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const payload = (await response.json().catch(() => ({}))) as ApiErrorPayload;
      if (!response.ok) {
        throw new Error(payload.error?.message || "ลบรูปโปรไฟล์ไม่สำเร็จ");
      }
      setSavedUrl("");
      setMessage("ลบรูปโปรไฟล์แล้ว");
      router.refresh();
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : "ลบรูปโปรไฟล์ไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  }

  const visibleUrl = previewUrl || savedUrl;

  return (
    <div className="flex w-full flex-col items-center gap-3 sm:w-auto sm:items-start">
      <div className="group relative h-28 w-28 shrink-0 overflow-hidden rounded-[2rem] bg-rice-mint text-rice-forest ring-4 ring-white/15 shadow-[0_18px_36px_rgba(0,0,0,0.18)] sm:h-32 sm:w-32">
        {visibleUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={visibleUrl} alt={`รูปโปรไฟล์ของ ${fullName}`} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-3xl font-bold">{initials}</span>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          aria-label="เลือกรูปโปรไฟล์"
          className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/65 via-transparent to-transparent pb-3 text-xs font-bold text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
        >
          <Camera className="mr-1.5 h-4 w-4" />
          เปลี่ยนรูป
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={chooseFile}
        disabled={busy}
        className="sr-only"
      />

      <div className="flex flex-wrap justify-center gap-2 sm:justify-start">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-3.5 text-xs font-bold text-rice-forest shadow-sm transition hover:bg-rice-mint-light disabled:opacity-55"
        >
          <ImagePlus className="h-4 w-4" />
          {savedUrl ? "เลือกรูปใหม่" : "เพิ่มรูป"}
        </button>
        {(savedUrl || selectedFile) && (
          <button
            type="button"
            onClick={removeAvatar}
            disabled={busy}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-55"
          >
            {selectedFile ? <X className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
            {selectedFile ? "ยกเลิก" : "ลบรูป"}
          </button>
        )}
      </div>

      {selectedFile && (
        <button
          type="button"
          onClick={saveAvatar}
          disabled={busy}
          className="inline-flex min-h-10 items-center gap-2 rounded-full bg-rice-gold px-4 text-xs font-bold text-rice-dark shadow-sm transition hover:bg-amber-300 disabled:opacity-55"
        >
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {busy ? "กำลังบันทึก..." : "บันทึกรูปนี้"}
        </button>
      )}

      <p className="max-w-44 text-center text-[10px] leading-4 text-white/55 sm:text-left">
        JPG, PNG หรือ WebP ไม่เกิน 5 MB
      </p>
      {message && <p role="status" className="text-xs font-semibold text-emerald-200">{message}</p>}
      {error && <p role="alert" className="max-w-52 text-center text-xs font-semibold text-rose-200 sm:text-left">{error}</p>}
    </div>
  );
}
