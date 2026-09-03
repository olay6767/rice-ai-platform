"use client";

import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileImage,
  History,
  ImagePlus,
  Info,
  Leaf,
  LogIn,
  RefreshCcw,
  ScanSearch,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import {
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";

import Button, { buttonVariants } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardIcon,
  CardTitle,
} from "@/components/ui/Card";
import {
  DISEASE_GUIDANCE_REFERENCE,
  getDiseaseGuidance,
} from "@/lib/disease/advice";
import { MODEL_CLASS_LABELS } from "@/lib/disease/types";
import type {
  DiseaseApiError,
  DiseaseHistoryApiSuccess,
  DiseaseHistoryEntry,
  DiseasePrediction,
  DiseasePredictionApiSuccess,
  DiseasePredictionStatus,
} from "@/lib/disease/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface RiceDiseaseDetectorProps {
  isAuthenticated: boolean;
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ไม่ทราบเวลา";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getStatusLabel(status: DiseasePredictionStatus): string {
  switch (status) {
    case "Rice Leaf":
      return "วิเคราะห์สำเร็จ";
    case "Uncertain":
      return "ผลยังไม่ชัดเจน";
    case "Unknown":
      return "ไม่พบใบข้าว";
  }
}

function getStatusClasses(status: DiseasePredictionStatus): string {
  switch (status) {
    case "Rice Leaf":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200";
    case "Uncertain":
      return "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-100";
    case "Unknown":
      return "bg-red-100 text-red-800 dark:bg-red-400/15 dark:text-red-100";
  }
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as DiseaseApiError;

    if (payload.error?.message) {
      return payload.error.message;
    }
  } catch {
    // ใช้ข้อความสำรองด้านล่าง เมื่อ response ไม่ใช่ JSON
  }

  return "ไม่สามารถวิเคราะห์ภาพได้ กรุณาลองใหม่อีกครั้ง";
}

function getSortedProbabilities(
  prediction: DiseasePrediction
): Array<[string, number]> {
  if (!prediction.prediction) {
    return [];
  }

  return Object.entries(prediction.prediction.allProbabilities).sort(
    ([, firstProbability], [, secondProbability]) =>
      secondProbability - firstProbability
  );
}

export default function RiceDiseaseDetector({
  isAuthenticated,
}: RiceDiseaseDetectorProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DiseasePrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<DiseaseHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  function clearSelectedFile(): void {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function chooseFile(file: File | undefined): void {
    setError(null);
    setResult(null);

    if (!file) {
      return;
    }

    if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
      setError("รองรับเฉพาะไฟล์ JPG, PNG และ WEBP");
      return;
    }

    if (file.size === 0) {
      setError("ไฟล์ภาพว่างเปล่า กรุณาเลือกไฟล์ใหม่");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    chooseFile(event.target.files?.[0]);
  }

  async function loadHistory(): Promise<void> {
    if (!isAuthenticated || isLoadingHistory) {
      return;
    }

    setIsLoadingHistory(true);
    setHistoryError(null);

    try {
      const response = await fetch("/api/disease/predict", {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload =
        (await response.json()) as DiseaseHistoryApiSuccess;

      setHistory(Array.isArray(payload.data) ? payload.data : []);
      setHasLoadedHistory(true);
    } catch (historyLoadError) {
      setHistoryError(
        historyLoadError instanceof Error
          ? historyLoadError.message
          : "ไม่สามารถโหลดประวัติการตรวจโรคได้"
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!selectedFile || isAnalyzing) {
      if (!selectedFile) {
        setError("กรุณาเลือกภาพใบข้าวก่อนเริ่มวิเคราะห์");
      }

      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", selectedFile, selectedFile.name);

    try {
      const response = await fetch("/api/disease/predict", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload =
        (await response.json()) as DiseasePredictionApiSuccess;

      if (!payload.data) {
        throw new Error("ระบบวิเคราะห์ภาพส่งผลลัพธ์ไม่สมบูรณ์");
      }

      setResult(payload.data);

      if (isAuthenticated && payload.data.savedToHistory) {
        void loadHistory();
      }
    } catch (predictionError) {
      setError(
        predictionError instanceof Error
          ? predictionError.message
          : "ไม่สามารถวิเคราะห์ภาพได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  const sortedProbabilities = result
    ? getSortedProbabilities(result)
    : [];
  const relevantProbabilities = sortedProbabilities
    .filter(
      ([label, probability]) =>
        label === result?.prediction?.disease || probability >= 0.001
    )
    .slice(0, 3);
  const diseaseGuidance = result
    ? getDiseaseGuidance(result)
    : null;

  return (
    <main className="relative overflow-hidden bg-rice-background py-7 sm:py-14 dark:bg-[#07140c]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(ellipse_at_top,rgba(157,211,170,0.30),transparent_66%)] dark:bg-[radial-gradient(ellipse_at_top,rgba(63,126,76,0.22),transparent_66%)]"
      />

      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-rice-leaf/20 bg-rice-mint/35 px-3 py-1.5 text-xs font-semibold text-rice-forest sm:px-4 sm:py-2 sm:text-sm dark:border-rice-mint/20 dark:bg-rice-leaf/15 dark:text-rice-mint-light">
            <ScanSearch className="h-4 w-4" aria-hidden="true" />
            Rice Leaf AI · ResNet50
          </span>
          <h1 className="mt-5 font-heading text-3xl font-bold tracking-[-0.035em] text-rice-dark sm:text-5xl dark:text-white">
            ตรวจโรคข้าวจากภาพ
          </h1>
          <p className="mt-3 text-sm leading-6 text-rice-muted sm:mt-4 sm:text-lg sm:leading-7 dark:text-white/65">
            อัปโหลดภาพใบข้าวที่เห็นอาการชัดเจน เพื่อรับผลคาดการณ์จากระบบ AI พร้อมระดับความมั่นใจ
          </p>
        </section>

        <section className="mt-6 grid items-start gap-4 sm:mt-8 sm:gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <Card variant="elevated" overflow="visible" className="w-full">
            <CardHeader
              divider
              className="gap-3 px-4 py-4 sm:px-6 sm:py-6"
              action={
                selectedFile ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    startIcon={<X />}
                    onClick={clearSelectedFile}
                  >
                    เปลี่ยนภาพ
                  </Button>
                ) : undefined
              }
            >
              <div className="flex items-start gap-3">
                <CardIcon variant="green" size="md">
                  <ImagePlus />
                </CardIcon>
                <div>
                  <CardTitle>อัปโหลดภาพใบข้าว</CardTitle>
                  <CardDescription>
                    รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 10 MB
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                <input
                  ref={fileInputRef}
                  id="rice-leaf-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  aria-describedby="rice-leaf-image-help"
                  onClick={(event) => {
                    event.currentTarget.value = "";
                  }}
                  onChange={handleFileChange}
                />

                {previewUrl ? (
                  <div className="overflow-hidden rounded-2xl border border-rice-forest/10 bg-rice-surface-soft dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="relative aspect-[4/3]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt="ภาพใบข้าวที่เลือกสำหรับตรวจโรค"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="flex flex-col items-stretch gap-3 border-t border-rice-forest/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-rice-text dark:text-white">
                          {selectedFile?.name}
                        </p>
                        <p className="mt-0.5 text-xs text-rice-muted dark:text-white/55">
                          {selectedFile
                            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                            : ""}
                        </p>
                      </div>
                      <label
                        htmlFor="rice-leaf-image"
                        className={buttonVariants({
                          variant: "outline",
                          size: "sm",
                          className: "w-full cursor-pointer sm:w-auto",
                        })}
                      >
                        <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                        เลือกใหม่
                      </label>
                    </div>
                  </div>
                ) : (
                  <label
                    htmlFor="rice-leaf-image"
                    className="group flex min-h-56 w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-rice-leaf/35 bg-rice-mint/[0.13] px-4 text-center transition-colors hover:border-rice-leaf/70 hover:bg-rice-mint/25 focus-within:outline-none focus-within:ring-2 focus-within:ring-rice-leaf focus-within:ring-offset-2 sm:min-h-72 sm:px-6 dark:border-rice-mint/25 dark:bg-rice-leaf/[0.08] dark:hover:border-rice-mint/50 dark:hover:bg-rice-leaf/15"
                  >
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-rice-natural shadow-card transition-transform group-hover:-translate-y-1 dark:bg-white/10 dark:text-rice-mint-light">
                      <Upload className="h-7 w-7" aria-hidden="true" />
                    </span>
                    <span className="mt-4 font-heading text-lg font-semibold text-rice-dark sm:mt-5 dark:text-white">
                      เลือกภาพใบข้าว
                    </span>
                    <span
                      id="rice-leaf-image-help"
                      className="mt-2 max-w-sm text-sm leading-6 text-rice-muted dark:text-white/60"
                    >
                      ถ่ายในที่มีแสงเพียงพอ โฟกัสบริเวณที่มีรอยโรค และหลีกเลี่ยงภาพเบลอ
                    </span>
                  </label>
                )}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <p>{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  size="lg"
                  fullWidth
                  loading={isAnalyzing}
                  loadingText="กำลังวิเคราะห์ภาพ..."
                  startIcon={<ScanSearch />}
                >
                  เริ่มวิเคราะห์โรคข้าว
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="w-full space-y-4 sm:space-y-6">
            <Card variant="warning">
              <CardContent className="flex gap-3 px-4 py-4 sm:px-6 sm:py-6">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-200" aria-hidden="true" />
                <div>
                  <p className="font-semibold">ขอบเขตของโมเดล</p>
                  <p className="mt-1 text-sm leading-6 opacity-85">
                    โมเดลนี้รองรับใบข้าวปกติ โรคกาบใบแห้ง โรคขอบใบแห้ง โรคใบจุดสีน้ำตาล โรคไหม้ข้าว และโรคไหม้คอรวงเท่านั้น ยังไม่รองรับโรคเมล็ดด่าง
                  </p>
                </div>
              </CardContent>
            </Card>

            {result ? (
              <Card
                variant={
                  result.status === "Rice Leaf"
                    ? "success"
                    : result.status === "Uncertain"
                      ? "warning"
                      : "danger"
                }
              >
                <CardHeader divider className="px-4 py-4 sm:px-6 sm:py-6">
                  <div className="flex items-start gap-3">
                    <CardIcon
                      variant={
                        result.status === "Rice Leaf"
                          ? "green"
                          : result.status === "Uncertain"
                            ? "gold"
                            : "danger"
                      }
                      size="md"
                    >
                      {result.status === "Rice Leaf" ? (
                        <CheckCircle2 />
                      ) : (
                        <AlertTriangle />
                      )}
                    </CardIcon>
                    <div>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClasses(result.status)}`}>
                        {getStatusLabel(result.status)}
                      </span>
                      <CardTitle className="mt-2">
                        {result.prediction?.diseaseTh || "ไม่สามารถยืนยันว่าเป็นใบข้าว"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-6">
                  <p className="text-sm leading-6 opacity-90">
                    {result.message ||
                      "ผลนี้เป็นการคาดการณ์จากระบบ AI ควรตรวจสอบสภาพแปลงและปรึกษาเจ้าหน้าที่เกษตรก่อนตัดสินใจจัดการโรค"}
                  </p>

                  {diseaseGuidance && (
                    <details
                      aria-label="คำแนะนำการดูแลเบื้องต้น"
                      className="group overflow-hidden rounded-2xl border border-current/15 bg-white/45 dark:bg-black/10"
                    >
                      <summary className="flex cursor-pointer list-none items-start gap-3 p-3.5 outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-current/35 sm:p-4">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-current/10">
                          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-bold uppercase tracking-[0.14em] opacity-65">
                            คำแนะนำการดูแลเบื้องต้น
                          </span>
                          <span className="mt-1 block text-base font-bold">
                            {diseaseGuidance.title}
                          </span>
                          <span className="mt-1 block line-clamp-2 text-sm leading-6 opacity-80">
                            {diseaseGuidance.summary}
                          </span>
                          <span className="mt-2 block text-xs font-bold underline underline-offset-4 opacity-80">
                            แตะเพื่อดูวิธีดูแลและข้อควรระวัง
                          </span>
                        </span>
                        <ChevronDown className="mt-1 h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden="true" />
                      </summary>

                      <div className="border-t border-current/10 px-3.5 pb-3.5 pt-4 sm:px-4 sm:pb-4">
                        <p className="text-sm font-bold">ควรทำตอนนี้</p>
                        <ol className="mt-2 space-y-2 text-sm leading-6 opacity-90">
                          {diseaseGuidance.actions.map((action, index) => (
                            <li key={action} className="flex gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-current/10 text-[11px] font-bold">
                                {index + 1}
                              </span>
                              <span className="min-w-0 break-words">{action}</span>
                            </li>
                          ))}
                        </ol>

                        <div className="mt-4 rounded-xl border border-current/10 bg-current/[0.04] p-3 text-sm leading-6">
                          <p className="font-bold">ข้อควรหลีกเลี่ยง</p>
                          <p className="mt-1 opacity-85">{diseaseGuidance.avoid}</p>
                        </div>

                        <div className="mt-3 flex items-start gap-2.5 text-sm leading-6">
                          <AlertTriangle className="mt-1 h-4 w-4 shrink-0" aria-hidden="true" />
                          <p>
                            <span className="font-bold">ควรขอคำแนะนำเพิ่มเติม: </span>
                            {diseaseGuidance.escalation}
                          </p>
                        </div>

                        <a
                          href={DISEASE_GUIDANCE_REFERENCE.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-4 inline-flex break-words text-left text-xs font-bold underline decoration-current/35 underline-offset-4 transition-opacity hover:opacity-70"
                        >
                          อ่าน {DISEASE_GUIDANCE_REFERENCE.label}
                        </a>
                      </div>
                    </details>
                  )}

                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <div className="rounded-xl bg-white/60 p-3.5 sm:p-4 dark:bg-black/15">
                      <p className="text-xs font-medium opacity-70">ความมั่นใจของผลลัพธ์</p>
                      <p className="mt-1 font-heading text-xl font-bold sm:text-2xl">
                        {result.prediction
                          ? formatPercent(result.prediction.confidence)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-xl bg-white/60 p-3.5 sm:p-4 dark:bg-black/15">
                      <p className="text-xs font-medium opacity-70">โอกาสที่เป็นใบข้าว</p>
                      <p className="mt-1 font-heading text-xl font-bold sm:text-2xl">
                        {formatPercent(result.riceProbability)}
                      </p>
                    </div>
                  </div>

                  {relevantProbabilities.length > 0 && (
                    <div className="rounded-2xl border border-current/10 bg-white/35 p-3.5 sm:p-4 dark:bg-black/[0.08]">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-sm font-bold">ความเป็นไปได้ของโรค</p>
                        <span className="shrink-0 text-[11px] font-medium opacity-65">แสดงสูงสุด 3 กลุ่ม</span>
                      </div>
                      <div className="mt-3 space-y-3">
                        {relevantProbabilities.map(([label, probability]) => (
                          <div key={label}>
                            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
                              <span className="min-w-0 truncate font-medium">
                                {MODEL_CLASS_LABELS[label] ?? label}
                              </span>
                              <span>{formatPercent(probability)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-black/10 dark:bg-white/15">
                              <div
                                className="h-full rounded-full bg-current"
                                style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {sortedProbabilities.length > relevantProbabilities.length && (
                        <p className="mt-3 text-[11px] leading-5 opacity-65">
                          ซ่อนกลุ่มที่มีคะแนนต่ำมากเพื่อให้อ่านผลได้ง่ายขึ้น
                        </p>
                      )}
                    </div>
                  )}

                  {isAuthenticated && result.savedToHistory && (
                    <p className="flex items-center gap-2 text-xs font-medium opacity-80">
                      <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                      บันทึกผลตรวจไว้ในประวัติของคุณแล้ว
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card variant="soft">
              <CardContent className="flex min-h-56 flex-col items-center justify-center px-5 text-center sm:min-h-72 sm:px-8">
                  <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rice-mint/50 text-rice-natural dark:bg-rice-leaf/20 dark:text-rice-mint-light">
                    <Leaf className="h-7 w-7" aria-hidden="true" />
                  </span>
                  <h2 className="mt-4 font-heading text-xl font-semibold text-rice-dark dark:text-white">
                    รอผลการวิเคราะห์
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-rice-muted dark:text-white/60">
                    เลือกภาพและกดเริ่มวิเคราะห์ ผลคาดการณ์พร้อม Confidence Score จะแสดงตรงนี้
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>

        <section className="mt-4 sm:mt-6">
          {isAuthenticated ? (
            <Card variant="default">
              <CardHeader
                divider
                className="gap-3 px-4 py-4 sm:px-6 sm:py-6"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    loading={isLoadingHistory}
                    loadingText="กำลังโหลด"
                    startIcon={<History />}
                    onClick={() => void loadHistory()}
                  >
                    {hasLoadedHistory ? "รีเฟรชประวัติ" : "ดูประวัติ"}
                  </Button>
                }
              >
                <div className="flex items-start gap-3">
                  <CardIcon variant="mint" size="md">
                    <History />
                  </CardIcon>
                  <div>
                    <CardTitle>ประวัติการตรวจโรค</CardTitle>
                    <CardDescription>
                      บันทึกเฉพาะผลลัพธ์ ไม่เก็บภาพที่อัปโหลด
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="px-4 py-4 sm:px-6 sm:py-6">
                {historyError ? (
                  <p role="alert" className="text-sm text-rice-error dark:text-red-300">
                    {historyError}
                  </p>
                ) : !hasLoadedHistory ? (
                  <p className="text-sm text-rice-muted dark:text-white/60">
                    กด “ดูประวัติ” เพื่อโหลดผลตรวจล่าสุดของคุณ
                  </p>
                ) : history.length === 0 ? (
                  <p className="text-sm text-rice-muted dark:text-white/60">
                    ยังไม่มีประวัติการตรวจโรค
                  </p>
                ) : (
                  <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {history.map((item) => (
                      <li
                        key={item.id}
                        className="rounded-xl border border-rice-forest/10 bg-rice-surface-soft p-4 dark:border-white/10 dark:bg-white/[0.04]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-rice-text dark:text-white">
                              {item.diseaseTh || "ไม่พบใบข้าว"}
                            </p>
                            <p className="mt-1 text-xs text-rice-muted dark:text-white/55">
                              {formatDateTime(item.createdAt)}
                            </p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-bold ${getStatusClasses(item.status)}`}>
                            {getStatusLabel(item.status)}
                          </span>
                        </div>
                        <p className="mt-3 text-sm text-rice-muted dark:text-white/65">
                          Confidence: {item.confidence === null ? "—" : formatPercent(item.confidence)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card variant="outlined">
              <CardContent className="flex flex-col items-stretch justify-between gap-4 px-4 py-4 sm:flex-row sm:items-center sm:px-6 sm:py-6">
                <div className="flex items-start gap-3">
                  <FileImage className="mt-0.5 h-5 w-5 text-rice-natural dark:text-rice-mint-light" aria-hidden="true" />
                  <p className="max-w-2xl text-sm leading-6 text-rice-muted dark:text-white/65">
                    คุณสามารถตรวจภาพได้ทันทีโดยไม่ต้องเข้าสู่ระบบ แต่หากเข้าสู่ระบบ ระบบจะบันทึกผลตรวจเพื่อให้กลับมาดูภายหลังได้
                  </p>
                </div>
                <Link
                  href="/login"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                  }) + " w-full justify-center sm:w-auto"}
                >
                  <LogIn aria-hidden="true" />
                  <span>เข้าสู่ระบบ</span>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </main>
  );
}
