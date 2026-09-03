import { MapPinned } from "lucide-react";
import { Suspense, type ReactNode } from "react";

import RiceAnalyticsNav from "./RiceAnalyticsNav";

export default function RiceAnalyticsShell({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-dvh overflow-x-hidden bg-[#f7f8f3] pb-14 text-[#11251a] sm:pb-20 dark:bg-[#07140c] dark:text-white">
      <section className="border-b border-emerald-950/10 bg-gradient-to-br from-[#e9f6e9] via-[#f8f8f2] to-[#f5edd4] dark:border-white/10 dark:from-[#0b2e1c] dark:via-[#08170e] dark:to-[#251f0e]">
        <div className="dashboard-container py-6 sm:py-12">
          <div className="flex flex-col gap-4 sm:gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-700/15 bg-white/65 px-3 py-1 text-[11px] font-semibold text-emerald-800 sm:text-xs dark:border-emerald-300/20 dark:bg-white/5 dark:text-emerald-200">
                <MapPinned aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">Rice Yield Thailand · 77 จังหวัด</span>
              </div>
              <h1 className="text-[2rem] font-bold leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
                {title}
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-950/65 sm:text-base sm:leading-7 dark:text-white/65">
                {description}
              </p>
            </div>
            <p className="max-w-md rounded-2xl border border-amber-700/15 bg-amber-50/80 px-4 py-3 text-xs leading-5 text-amber-950 sm:leading-6 dark:border-amber-200/15 dark:bg-amber-200/10 dark:text-amber-100">
              ผลผลิตเป็นข้อมูลรายปีเท่านั้น ส่วนภูมิอากาศ NDVI และความชื้นในดินเป็นข้อมูลรายเดือน
            </p>
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
