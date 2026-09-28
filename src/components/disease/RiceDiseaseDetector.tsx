"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  RefreshCcw,
  Rocket,
  Upload,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
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
import { getDiseaseGuidance } from "@/lib/disease/advice";
import { MODEL_CLASS_LABELS } from "@/lib/disease/types";
import type {
  DiseaseApiError,
  DiseasePrediction,
  DiseasePredictionApiSuccess,
  DiseasePredictionStatus,
} from "@/lib/disease/types";

import styles from "./RiceDiseaseDetector.module.css";

const MAX_FILE_SIZE = 4 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

interface PhoneFrameProps {
  children: ReactNode;
  label: string;
  testId: string;
}

function PhoneFrame({ children, label, testId }: PhoneFrameProps) {
  return (
    <div className={styles.phoneWrap}>
      <span aria-hidden="true" className={styles.phoneMuteButton} />
      <span aria-hidden="true" className={styles.phoneVolumeButton} />
      <span aria-hidden="true" className={styles.phonePowerButton} />

      <div
        aria-label={label}
        data-testid={testId}
        className={styles.phoneFrame}
      >
        <div className={styles.phoneScreen}>
          <div
            aria-label="แถบสถานะโทรศัพท์"
            className={styles.phoneStatusBar}
          >
            <span>9:41</span>
            <span
              data-testid={`${testId}-dynamic-island`}
              aria-hidden="true"
              className={styles.dynamicIsland}
            />
            <span className={styles.phoneSignal}>
              <span>5G</span>
              <span className={styles.phoneBattery}>
                <span />
              </span>
            </span>
          </div>

          <div className={styles.phoneBody}>{children}</div>
          <span aria-hidden="true" className={styles.homeIndicator} />
        </div>
      </div>
    </div>
  );
}

function formatPercent(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
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
      return "bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-white/75";
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

export default function RiceDiseaseDetector() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [result, setResult] = useState<DiseasePrediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (!result) return;

    const frame = window.requestAnimationFrame(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [result]);

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
      setError("ไฟล์ภาพต้องมีขนาดไม่เกิน 4 MB");
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

      const payload = await readJsonResponse<DiseasePredictionApiSuccess>(response);

      if (!payload.data) {
        throw new Error("ระบบวิเคราะห์ภาพส่งผลลัพธ์ไม่สมบูรณ์");
      }

      setResult(payload.data);
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
        <h1 className="sr-only">Rice Leaf AI</h1>

        <section
          aria-labelledby="disease-guide-title"
          className="mx-auto mb-8 grid w-full max-w-[560px] grid-cols-[minmax(0,1fr)_112px] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_164px] sm:gap-3 lg:ml-auto lg:mr-0"
        >
          <div className="relative rounded-xl bg-white p-4 shadow-[0_14px_40px_rgba(20,42,29,0.12)] dark:bg-[#102319]">
            <span
              aria-hidden="true"
              className="absolute right-[-8px] top-1/2 h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-white bg-white dark:border-[#102319] dark:bg-[#102319]"
            />
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rice-natural dark:text-rice-mint-light">
              <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
              ผู้ช่วย Rice Leaf AI
            </span>
            <h2
              id="disease-guide-title"
              className="mt-1.5 font-heading text-lg font-bold text-rice-dark dark:text-white"
            >
              หลักการและวิธีใช้
            </h2>
            <p className="mt-2 text-xs leading-5 text-rice-muted dark:text-white/65">
              <strong className="text-rice-forest dark:text-rice-mint-light">หลักการ:</strong>{" "}
              ระบบตรวจว่าเป็นใบข้าวก่อน แล้วจึงจำแนกใบปกติหรือโรคที่รองรับ พร้อมแสดงค่าความมั่นใจ
            </p>
            <ol className="mt-2 space-y-1 text-xs leading-5 text-rice-muted dark:text-white/65">
              <li><strong className="text-[#8a6519] dark:text-rice-gold">1.</strong> เตรียมภาพใบข้าวที่ชัดเจนไว้ในเครื่อง</li>
              <li><strong className="text-[#8a6519] dark:text-rice-gold">2.</strong> อัปโหลดไฟล์แล้วกดเริ่มวิเคราะห์</li>
              <li><strong className="text-[#8a6519] dark:text-rice-gold">3.</strong> อ่านผลและตรวจสภาพแปลงประกอบ</li>
            </ol>
            <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-amber-800 dark:text-amber-200">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              อัปโหลดไฟล์จากเครื่องได้ แต่ยังไม่รองรับการเปิดกล้องถ่ายภาพโดยตรง
            </p>
          </div>

          <div className={styles.mascotStage} aria-hidden="true">
            <span className={styles.rocketTrail} />
            <div className={styles.mascotLanding}>
              <Image
                src="/images/14.png"
                alt=""
                width={210}
                height={248}
                preload
                sizes="(max-width: 639px) 112px, 164px"
                className="h-auto w-full max-w-[164px] drop-shadow-[0_18px_22px_rgba(11,46,28,0.22)]"
              />
            </div>
            <span className={styles.landingShadow} />
          </div>
        </section>

        <section className="flex justify-center">
          <PhoneFrame label="หน้าจออัปโหลดและผลวิเคราะห์โรคข้าว" testId="iphone-disease-frame">
            <Card
              variant="elevated"
              radius="md"
              className="flex h-full w-full shrink-0 flex-col rounded-none bg-white shadow-none [&>span:first-child]:hidden dark:bg-[#0d2014]"
              style={{ border: "none", borderRadius: 0, boxShadow: "none" }}
            >
              <CardHeader
                divider
                className="gap-3 px-4 pb-4 pt-3 sm:px-5 sm:pb-5 sm:pt-4"
                action={
                  selectedFile ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.mustardGhostButton}
                      startIcon={<X />}
                      onClick={clearSelectedFile}
                    >
                      เปลี่ยนภาพ
                    </Button>
                  ) : undefined
                }
              >
                <div className="flex items-start gap-3">
                  <CardIcon
                    variant="gold"
                    size="md"
                    className={styles.mustardIcon}
                  >
                    <Image
                      src="/images/36.png"
                      alt=""
                      width={435}
                      height={435}
                      className="h-7 w-7 brightness-0 invert"
                    />
                  </CardIcon>
                  <div>
                    <CardTitle>อัปโหลดภาพใบข้าว</CardTitle>
                    <CardDescription>
                      รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 4 MB
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col px-4 pb-4 pt-5 sm:px-5 sm:pb-5">
                <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4">
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
                    <div className={`${styles.mustardPreview} overflow-hidden rounded-xl border bg-rice-surface-soft dark:bg-white/[0.04]`}>
                      <div className="relative aspect-[4/3]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={previewUrl}
                          alt="ภาพใบข้าวที่เลือกสำหรับตรวจโรค"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className={`${styles.mustardPreviewDivider} flex items-center justify-between gap-3 border-t px-3 py-3`}>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-rice-text dark:text-white">
                            {selectedFile?.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-rice-muted dark:text-white/55">
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
                            className: `${styles.mustardOutlineButton} shrink-0 cursor-pointer`,
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
                      className={`${styles.mustardDropZone} group flex min-h-96 flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 sm:px-6`}
                    >
                      <span className={`${styles.mustardUploadIcon} flex h-16 w-16 items-center justify-center rounded-xl bg-white shadow-card transition-transform group-hover:-translate-y-1 dark:bg-white/10`}>
                        <Upload className="h-7 w-7" aria-hidden="true" />
                      </span>
                      <span className="mt-5 font-heading text-lg font-semibold text-rice-dark dark:text-white">
                        เลือกภาพใบข้าว
                      </span>
                      <span
                        id="rice-leaf-image-help"
                        className="mt-2 max-w-xs text-sm leading-6 text-rice-muted dark:text-white/60"
                      >
                        ใช้ภาพที่มีแสงเพียงพอ เห็นบริเวณรอยโรคชัด และไม่เบลอ
                      </span>
                    </label>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-400/20 dark:bg-red-400/10 dark:text-red-100"
                    >
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      <p>{error}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    size="lg"
                    fullWidth
                    className={`${styles.mustardButton} mt-auto`}
                    loading={isAnalyzing}
                    loadingText="กำลังวิเคราะห์ภาพ..."
                    startIcon={
                      <Image
                        src="/images/37.png"
                        alt=""
                        width={435}
                        height={435}
                        className="h-5 w-5 brightness-0 invert"
                      />
                    }
                  >
                    เริ่มวิเคราะห์โรคข้าว
                  </Button>
                </form>
              </CardContent>
            </Card>
            {result && (
              <div ref={resultRef} className="w-full shrink-0 scroll-mt-10">
              <Card
                variant="elevated"
                radius="md"
                className="w-full rounded-none bg-white text-rice-text shadow-none [&>span:first-child]:hidden dark:bg-[#102019] dark:text-white"
                style={{ border: "none", borderRadius: 0, boxShadow: "none" }}
              >
                <CardHeader className="px-4 pb-3 pt-3 sm:px-5 sm:pt-4">
                  <div className="flex items-center gap-3">
                    <CardIcon
                      variant={
                        result.status === "Rice Leaf"
                          ? "neutral"
                          : result.status === "Uncertain"
                            ? "gold"
                            : "danger"
                      }
                      size="sm"
                    >
                      {result.status === "Rice Leaf" ? (
                        <CheckCircle2 />
                      ) : (
                        <AlertTriangle />
                      )}
                    </CardIcon>
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${getStatusClasses(result.status)}`}>
                        {getStatusLabel(result.status)}
                      </span>
                      <CardTitle className="mt-1.5 text-base">
                        {result.prediction?.diseaseTh || "ไม่สามารถยืนยันว่าเป็นใบข้าว"}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 px-4 pb-5 pt-2 sm:px-5">
                  {diseaseGuidance && (
                    <div
                      aria-label="คำแนะนำการดูแลเบื้องต้น"
                      className="rounded-lg bg-white p-3 shadow-[0_8px_24px_rgba(20,42,29,0.10)] dark:bg-white/[0.06]"
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 dark:text-white/55">
                        คำแนะนำสั้น ๆ
                      </p>
                      <p className="mt-1 text-sm font-bold">{diseaseGuidance.title}</p>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-white/65">
                        {diseaseGuidance.summary}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2.5">
                    <div className="rounded-lg bg-slate-50 p-3 shadow-sm dark:bg-white/[0.05]">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-white/55">ความมั่นใจของผลลัพธ์</p>
                      <p className="mt-1 font-heading text-xl font-bold">
                        {result.prediction
                          ? formatPercent(result.prediction.confidence)
                          : "—"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-3 shadow-sm dark:bg-white/[0.05]">
                      <p className="text-[11px] font-medium text-slate-500 dark:text-white/55">โอกาสที่เป็นใบข้าว</p>
                      <p className="mt-1 font-heading text-xl font-bold">
                        {formatPercent(result.riceProbability)}
                      </p>
                    </div>
                  </div>

                  {relevantProbabilities.length > 0 && (
                    <div className="rounded-lg bg-slate-50 p-3 shadow-sm dark:bg-white/[0.05]">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="text-xs font-bold">ความเป็นไปได้ของโรค</p>
                        <span className="shrink-0 text-[10px] font-medium text-slate-500 dark:text-white/55">แสดงสูงสุด 3 กลุ่ม</span>
                      </div>
                      <div className="mt-2.5 space-y-2.5">
                        {relevantProbabilities.map(([label, probability]) => (
                          <div key={label}>
                            <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
                              <span className="min-w-0 truncate font-medium">
                                {MODEL_CLASS_LABELS[label] ?? label}
                              </span>
                              <span>{formatPercent(probability)}</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-[3px] bg-slate-200 dark:bg-white/15">
                              <div
                                className="h-full rounded-[3px] bg-slate-800 dark:bg-white/75"
                                style={{ width: `${Math.max(0, Math.min(100, probability * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      {sortedProbabilities.length > relevantProbabilities.length && (
                        <p className="mt-2.5 text-[10px] leading-4 text-slate-500 dark:text-white/50">
                          ซ่อนกลุ่มที่มีคะแนนต่ำมากเพื่อให้อ่านผลได้ง่ายขึ้น
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              </div>
            )}
          </PhoneFrame>
        </section>

      </div>
    </main>
  );
}
