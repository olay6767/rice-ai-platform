"use client";

import { Moon, Sun } from "lucide-react";

const ADMIN_THEME_STORAGE_KEY =
  "rice-ai-admin-theme";

interface AdminThemeToggleProps {
  variant?: "header" | "surface";
  showLabel?: boolean;
}

export default function AdminThemeToggle({
  variant = "surface",
  showLabel = true,
}: AdminThemeToggleProps) {
  function toggleTheme() {
    const root = document.documentElement;
    const nextTheme = root.classList.contains(
      "dark"
    )
      ? "light"
      : "dark";

    root.classList.toggle(
      "dark",
      nextTheme === "dark"
    );

    try {
      window.localStorage.setItem(
        ADMIN_THEME_STORAGE_KEY,
        nextTheme
      );
    } catch {
      // ธีมยังเปลี่ยนได้ แม้เบราว์เซอร์จะปิด localStorage
    }
  }

  const variantClassName =
    variant === "header"
      ? "border-white/10 bg-white/[0.08] text-white hover:bg-white/[0.14]"
      : "border-[var(--app-border-strong)] bg-[var(--app-surface)] text-[var(--app-text-secondary)] hover:bg-[var(--app-surface-soft)] hover:text-[var(--app-text)]";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="สลับโหมดกลางวันและกลางคืน"
      title="สลับโหมดกลางวันและกลางคืน"
      className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-2xl border px-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rice-mint ${variantClassName}`}
    >
      <Sun
        aria-hidden="true"
        className="h-4 w-4 dark:hidden"
      />
      <Moon
        aria-hidden="true"
        className="hidden h-4 w-4 dark:block"
      />

      {showLabel && (
        <span>
          <span className="dark:hidden">
            โหมดกลางวัน
          </span>
          <span className="hidden dark:inline">
            โหมดกลางคืน
          </span>
        </span>
      )}
    </button>
  );
}
