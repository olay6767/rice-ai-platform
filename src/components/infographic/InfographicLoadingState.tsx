import { LoaderCircle } from "lucide-react";

export default function InfographicLoadingState({
  label = "กำลังโหลดข่าวสาร…",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={`flex w-full flex-col items-center justify-center px-6 text-center ${
        compact ? "min-h-[360px]" : "min-h-[62dvh]"
      }`}
    >
      <span className="relative grid h-20 w-20 place-items-center rounded-full bg-white shadow-[0_16px_42px_rgba(30,75,48,0.16)] ring-1 ring-rice-forest/10 dark:bg-white/[0.08] dark:ring-white/10">
        <span
          aria-hidden="true"
          className="absolute inset-2 animate-spin rounded-full border-[3px] border-rice-mint border-r-transparent dark:border-rice-leaf-light dark:border-r-transparent"
        />
        <LoaderCircle
          aria-hidden="true"
          className="h-7 w-7 animate-spin text-rice-leaf dark:text-rice-mint-light"
        />
      </span>
      <p className="mt-5 font-heading text-base font-bold text-rice-forest dark:text-white">
        {label}
      </p>
      <p className="mt-1 text-sm text-rice-muted dark:text-white/55">
        รอสักครู่ ระบบกำลังเตรียมเนื้อหาให้คุณ
      </p>
    </div>
  );
}
