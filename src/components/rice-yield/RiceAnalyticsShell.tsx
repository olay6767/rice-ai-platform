import { BadgeDollarSign, MapPinned } from "lucide-react";
import Image from "next/image";
import { Suspense, type ReactNode } from "react";

import RiceAnalyticsNav from "./RiceAnalyticsNav";

export default function RiceAnalyticsShell({
  children,
  title,
  description,
  context = "yield",
  eyebrow,
  notice,
  heroImage,
  heroImageAlt,
  heroImageMode = "split",
  heroImagePosition,
}: {
  children: ReactNode;
  title: string;
  description: string;
  context?: "yield" | "price";
  eyebrow?: string;
  notice?: string | null;
  heroImage?: string;
  heroImageAlt?: string;
  heroImageMode?: "split" | "background";
  heroImagePosition?: string;
}) {
  const ContextIcon = context === "price" ? BadgeDollarSign : MapPinned;

  if (heroImage && heroImageMode === "background") {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[#f7f8f3] pb-14 text-[#11251a] sm:pb-20 dark:bg-[#07140c] dark:text-white">
        <section className="relative isolate overflow-hidden bg-[#f8f1e4] dark:bg-[#1a120c]">
          <Image
            src={heroImage}
            alt={heroImageAlt ?? ""}
            fill
            preload
            sizes="100vw"
            className="-z-20 object-cover object-center opacity-60 dark:opacity-35"
            style={
              heroImagePosition
                ? { objectPosition: heroImagePosition }
                : undefined
            }
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-10 bg-gradient-to-r from-[#fbf8f0] via-[#f8f3e9]/95 to-[#fff0d5]/25 dark:from-[#17110c] dark:via-[#17110c]/94 dark:to-[#4a2a12]/35"
          />
          <div className="dashboard-container relative py-8 sm:py-12">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-emerald-800 shadow-sm sm:text-xs dark:bg-white/10 dark:text-emerald-200">
                  <ContextIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {eyebrow ?? "Rice Yield Thailand · 77 จังหวัด"}
                  </span>
                </div>
                <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-950/65 sm:text-base sm:leading-7 dark:text-white/65">
                  {description}
                </p>
              </div>
              {notice !== null && notice ? (
                <p className="max-w-md rounded-2xl bg-amber-50/90 px-4 py-3 text-xs leading-5 text-amber-950 shadow-sm sm:leading-6 dark:bg-amber-200/10 dark:text-amber-100">
                  {notice}
                </p>
              ) : null}
            </div>
            <nav
              aria-label="เมนูวิเคราะห์ผลผลิตข้าว"
              className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-7 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              <Suspense fallback={<div className="h-11" />}>
                <RiceAnalyticsNav />
              </Suspense>
            </nav>
          </div>
        </section>
        <div className="dashboard-container py-5 sm:py-10">{children}</div>
      </main>
    );
  }

  if (heroImage) {
    return (
      <main className="min-h-dvh overflow-x-hidden bg-[linear-gradient(180deg,#fbfdf8_0%,#f3f8e9_42%,#fffdf5_100%)] pb-14 text-[#173523] sm:pb-20">
        <section className="bg-[#f2f6eb] pb-1 pt-5 sm:pt-8">
          <div className="dashboard-container">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(112deg,#f8fbf2_0%,#eaf4e5_46%,#fff0c8_100%)] shadow-[0_24px_64px_rgba(37,75,49,0.17)] sm:rounded-[2.25rem]">
              <div className="grid min-h-[390px] lg:min-h-[350px] lg:grid-cols-[0.92fr_1.08fr]">
                <div className="relative z-10 flex flex-col justify-center px-6 py-9 sm:px-10 sm:py-12 lg:px-12">
                  <div className="mb-4 inline-flex w-fit max-w-full items-center gap-2 rounded-lg bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-emerald-800 shadow-sm sm:text-xs">
                    <ContextIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {eyebrow ?? "Rice Yield Thailand · 77 จังหวัด"}
                    </span>
                  </div>
                  <h1 className="max-w-2xl text-[2.2rem] font-bold leading-[1.12] tracking-tight text-[#143c25] sm:text-5xl lg:text-[3.35rem]">
                    {title}
                  </h1>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-emerald-950/65 sm:text-base">
                    {description}
                  </p>
                  {notice !== null && notice ? (
                    <p className="mt-5 max-w-lg bg-[#fff5bf] px-4 py-3 text-xs leading-5 text-[#5e5014] shadow-sm">
                      {notice}
                    </p>
                  ) : null}
                </div>

                <div className="pointer-events-none relative min-h-56 bg-[radial-gradient(circle_at_58%_47%,rgba(255,255,255,0.92)_0%,rgba(255,243,202,0.72)_42%,transparent_73%)] sm:min-h-72 lg:-ml-24 lg:min-h-full">
                  <div className="absolute inset-x-[12%] inset-y-[15%] rounded-full bg-[#e5b84f]/20 blur-3xl" />
                  <Image
                    src={heroImage}
                    alt={heroImageAlt ?? ""}
                    fill
                    preload
                    sizes="(max-width: 1023px) 100vw, 55vw"
                    className="object-contain object-center drop-shadow-[0_24px_32px_rgba(35,68,46,0.14)]"
                  />
                  <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-[#eaf4e5] to-transparent lg:w-36" />
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fff0c8]/80 to-transparent" />
                </div>
              </div>
            </div>

            <nav
              aria-label="เมนูวิเคราะห์ผลผลิตข้าว"
              className="-mx-4 mt-5 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:mx-0 sm:mt-7 sm:px-0 [&::-webkit-scrollbar]:hidden"
            >
              <Suspense fallback={<div className="h-11" />}>
                <RiceAnalyticsNav appearance="light" />
              </Suspense>
            </nav>
          </div>
        </section>
        <div className="dashboard-container py-6 sm:py-10">{children}</div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f7f8f3] pb-14 text-[#11251a] sm:pb-20 dark:bg-[#07140c] dark:text-white">
      <section className="border-b border-emerald-950/10 bg-gradient-to-br from-[#e9f6e9] via-[#f8f8f2] to-[#f5edd4] dark:border-white/10 dark:from-[#0b2e1c] dark:via-[#08170e] dark:to-[#251f0e]">
        <div className="dashboard-container py-6 sm:py-12">
          <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-700/15 bg-white/65 px-3 py-1 text-[11px] font-semibold text-emerald-800 sm:text-xs dark:border-emerald-300/20 dark:bg-white/5 dark:text-emerald-200">
                <ContextIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {eyebrow ?? "Rice Yield Thailand · 77 จังหวัด"}
                </span>
              </div>
              <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-950/65 sm:text-base sm:leading-7 dark:text-white/65">
                {description}
              </p>
            </div>
            {notice !== null ? (
              <p className="max-w-md rounded-2xl border border-amber-700/15 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-950 sm:leading-6 dark:border-amber-200/15 dark:bg-amber-200/10 dark:text-amber-100">
                {notice ?? "ผลผลิตเป็นข้อมูลรายปีเท่านั้น ส่วนภูมิอากาศ NDVI และความชื้นในดินเป็นข้อมูลรายเดือน"}
              </p>
            ) : null}
          </div>
          <nav aria-label="เมนูวิเคราะห์ผลผลิตข้าว" className="-mx-4 mt-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-7 sm:px-0 [&::-webkit-scrollbar]:hidden">
            <Suspense fallback={<div className="h-11" />}>
              <RiceAnalyticsNav />
            </Suspense>
          </nav>
        </div>
      </section>
      <div className="dashboard-container py-5 sm:py-10">{children}</div>
    </main>
  );
}

export function RicePanel({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-2xl border border-emerald-950/10 bg-white p-4 shadow-[0_16px_50px_rgba(11,46,28,0.06)] sm:rounded-3xl sm:p-6 dark:border-white/10 dark:bg-[#0d2014] ${className}`}
    >
      <div className="mb-4 flex min-w-0 flex-col gap-2.5 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight sm:text-2xl">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs leading-5 text-emerald-950/55 sm:text-sm dark:text-white/55">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function RiceEmptyState({ message }: { message: string }) {
  return (
    <div className="flex min-h-48 items-center justify-center rounded-2xl border border-dashed border-emerald-950/15 bg-emerald-50/30 px-6 text-center text-sm text-emerald-950/55 dark:border-white/15 dark:bg-white/[0.03] dark:text-white/55">
      {message}
    </div>
  );
}

export function RiceLoadingState({ label = "กำลังโหลดข้อมูล…" }: { label?: string }) {
  return (
    <div aria-live="polite" className="grid min-h-48 place-items-center">
      <div className="flex items-center gap-3 text-sm text-emerald-950/60 dark:text-white/60">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-emerald-700/20 border-t-emerald-700 dark:border-emerald-200/20 dark:border-t-emerald-200" />
        {label}
      </div>
    </div>
  );
}

export function RiceErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-rose-300 bg-rose-50 p-5 text-sm text-rose-900 dark:border-rose-300/20 dark:bg-rose-300/10 dark:text-rose-100">
      <p>{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 min-h-10 rounded-xl bg-rose-900 px-4 font-semibold text-white dark:bg-rose-100 dark:text-rose-950"
        >
          ลองใหม่
        </button>
      ) : null}
    </div>
  );
}
