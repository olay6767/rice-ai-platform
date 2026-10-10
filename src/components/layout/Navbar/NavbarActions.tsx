"use client";

import Link from "next/link";
import {
  Bell,
  LogIn,
  LogOut,
  Moon,
  Sun,
  UserPlus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";



export type NavbarActionsUserRole = "user" | "admin";

export interface NavbarActionsUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role?: NavbarActionsUserRole;
}

export type NavbarSearchVisibility =
  | "always"
  | "desktop"
  | "wide"
  | "hidden";

export interface NavbarActionsProps
  extends Omit<ComponentPropsWithoutRef<"div">, "children"> {
  user?: NavbarActionsUser | null;
  unreadNotificationCount?: number;
  onSignOut?: () => void | Promise<void>;

  showSearch?: boolean;
  searchVisibility?: NavbarSearchVisibility;

  showTheme?: boolean;
  showNotifications?: boolean;
  showProfile?: boolean;
  showProfileSeparator?: boolean;

  compact?: boolean;
  leadingActions?: ReactNode;
  trailingActions?: ReactNode;
}

type ThemeMode = "light" | "dark";

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

function normalizeNotificationCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
}

function formatNotificationCount(count: number): string {
  return count > 99 ? "99+" : String(count);
}

function getDisplayName(user: NavbarActionsUser): string {
  const fullName = user.fullName.trim();

  if (fullName) {
    return fullName;
  }

  return user.email.split("@")[0] || "ผู้ใช้งาน";
}

function getInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "U";
  }

  if (words.length === 1) {
    return words[0].charAt(0).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function getInitialTheme(): ThemeMode {
  if (typeof window === "undefined") {
    return "light";
  }

  try {
    const savedTheme =
      window.localStorage.getItem("rice-ai-theme");

    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
  } catch {
    // Browser อาจปิด localStorage
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function NavbarActions({
  user = null,
  unreadNotificationCount = 0,
  onSignOut,

  showSearch = false,
  searchVisibility = "wide",

  showTheme = true,
  showNotifications = true,
  showProfile = true,
  showProfileSeparator = false,

  compact = false,
  leadingActions,
  trailingActions,

  className,
  "aria-label": ariaLabel = "เครื่องมือบนแถบนำทาง",
  ...divProps
}: NavbarActionsProps) {
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] =
    useState<string | null>(null);

  const safeNotificationCount =
    normalizeNotificationCount(unreadNotificationCount);

  // คง props ไว้ใน public API ระหว่างที่ช่องค้นหาหลักยังไม่ได้แสดงใน NavbarActions
  void showSearch;
  void searchVisibility;

  const displayName = user ? getDisplayName(user) : "";
  const initials = user ? getInitials(displayName) : "";

  const hasMainActions =
    showTheme ||
    showNotifications ||
    showProfile;

  const hasAnyActions =
    Boolean(leadingActions) ||
    hasMainActions ||
    Boolean(trailingActions);

  /* Theme readiness intentionally begins after hydration because it depends on browser preferences. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const initialTheme = getInitialTheme();

    setTheme(initialTheme);

    document.documentElement.classList.toggle(
      "dark",
      initialTheme === "dark"
    );

    setIsThemeReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => {
      const nextTheme: ThemeMode =
        currentTheme === "dark" ? "light" : "dark";

      document.documentElement.classList.toggle(
        "dark",
        nextTheme === "dark"
      );

      try {
        window.localStorage.setItem(
          "rice-ai-theme",
          nextTheme
        );
      } catch {
        // Browser อาจปิด localStorage
      }

      return nextTheme;
    });
  }, []);

  const handleSignOut = async (): Promise<void> => {
    if (!onSignOut || isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await onSignOut();
    } catch (error) {
      console.error("Navbar sign out failed:", error);

      setSignOutError(
        "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  if (!hasAnyActions) {
    return null;
  }

  return (
    <div
      {...divProps}
      role="group"
      aria-label={ariaLabel}
      data-component="navbar-actions"
      data-compact={compact ? "true" : "false"}
      className={cn(
        "flex shrink-0 items-center justify-end",
        compact ? "gap-0.5" : "gap-1 sm:gap-2",
        className
      )}
    >
      {leadingActions && (
        <div
          data-slot="leading-actions"
          className={cn(
            "flex items-center",
            compact ? "gap-0.5" : "gap-1"
          )}
        >
          {leadingActions}
        </div>
      )}

      
      {showTheme && (
        <button
          type="button"
          disabled={!isThemeReady}
          onClick={toggleTheme}
          aria-label={
            theme === "dark"
              ? "เปลี่ยนเป็นธีมสว่าง"
              : "เปลี่ยนเป็นธีมมืด"
          }
          title={
            theme === "dark"
              ? "เปลี่ยนเป็นธีมสว่าง"
              : "เปลี่ยนเป็นธีมมืด"
          }
          className={cn(
            "inline-flex h-10 w-10 shrink-0",
            "items-center justify-center",
            "rounded-lg text-gray-600",
            "transition-colors",

            "hover:bg-gray-100",
            "hover:text-gray-950",

            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-green-500",

            "disabled:cursor-wait",
            "disabled:opacity-50",

            "dark:text-gray-300",
            "dark:hover:bg-gray-800",
            "dark:hover:text-white"
          )}
        >
          {theme === "dark" ? (
            <Sun
              aria-hidden="true"
              className="h-5 w-5"
            />
          ) : (
            <Moon
              aria-hidden="true"
              className="h-5 w-5"
            />
          )}
        </button>
      )}

      {showNotifications && user && (
        <Link
          href="/notifications"
          aria-label={
            safeNotificationCount > 0
              ? `การแจ้งเตือนที่ยังไม่ได้อ่าน ${safeNotificationCount} รายการ`
              : "การแจ้งเตือน"
          }
          title="การแจ้งเตือน"
          className={cn(
            "relative inline-flex h-10 w-10",
            "shrink-0 items-center justify-center",
            "rounded-lg text-gray-600",
            "transition-colors",

            "hover:bg-gray-100",
            "hover:text-gray-950",

            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-green-500",

            "dark:text-gray-300",
            "dark:hover:bg-gray-800",
            "dark:hover:text-white"
          )}
        >
          <Bell
            aria-hidden="true"
            className="h-5 w-5"
          />

          {safeNotificationCount > 0 && (
            <span
              aria-hidden="true"
              className={cn(
                "absolute -right-0.5 -top-0.5",
                "inline-flex min-h-5 min-w-5",
                "items-center justify-center",
                "rounded-full bg-red-500",
                "px-1 text-[10px]",
                "font-bold leading-none text-white",
                "ring-2 ring-white",
                "dark:ring-gray-950"
              )}
            >
              {formatNotificationCount(
                safeNotificationCount
              )}
            </span>
          )}
        </Link>
      )}

      {showProfile &&
  showProfileSeparator &&
  (showTheme ||
    (showNotifications && Boolean(user))) && (
          <span
            aria-hidden="true"
            className={cn(
              "hidden h-6 w-px shrink-0 sm:block",
              "bg-gray-200 dark:bg-gray-800"
            )}
          />
        )}

      {showProfile && (
        <>
          {user ? (
            <div className="flex items-center gap-1">
              <Link
                href="/profile"
                aria-label={`โปรไฟล์ของ ${displayName}`}
                title={displayName}
                className={cn(
                  "flex h-10 min-w-0 items-center",
                  "gap-2 rounded-xl px-1.5",
                  "transition-colors",

                  "hover:bg-gray-100",

                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",

                  "dark:hover:bg-gray-800"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 shrink-0",
                    "items-center justify-center",
                    "overflow-hidden rounded-full",
                    "bg-green-100 text-xs",
                    "font-bold text-green-700",
                    "dark:bg-green-950",
                    "dark:text-green-300"
                  )}
                >
                  {user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.avatarUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    initials
                  )}
                </span>

                <span
                  className={cn(
                    "hidden max-w-32 truncate",
                    "text-sm font-medium",
                    "text-gray-700 sm:block",
                    "dark:text-gray-200"
                  )}
                >
                  {displayName}
                </span>
              </Link>

              {onSignOut && (
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  aria-label="ออกจากระบบ"
                  title="ออกจากระบบ"
                  className={cn(
                    "inline-flex h-10 w-10",
                    "shrink-0 items-center justify-center",
                    "rounded-lg text-red-600",
                    "transition-colors",

                    "hover:bg-red-50",

                    "focus-visible:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-red-500",

                    "disabled:cursor-not-allowed",
                    "disabled:opacity-50",

                    "dark:text-red-400",
                    "dark:hover:bg-red-950/50"
                  )}
                >
                  <LogOut
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              <Link
                href="/login"
                className={cn(
                  "hidden h-10 items-center gap-2",
                  "rounded-lg px-3",
                  "text-sm font-medium",
                  "text-gray-700",
                  "transition-colors sm:inline-flex",

                  "hover:bg-gray-100",

                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",

                  "dark:text-gray-200",
                  "dark:hover:bg-gray-800"
                )}
              >
                <LogIn
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                เข้าสู่ระบบ
              </Link>

              <Link
                href="/login"
                className={cn(
                  "inline-flex h-10 items-center gap-2 sm:hidden",
                  "rounded-lg bg-green-600 px-3",
                  "text-sm font-medium text-white",
                  "transition-colors",

                  "hover:bg-green-700",

                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",
                  "focus-visible:ring-offset-2",

                  "dark:focus-visible:ring-offset-gray-950"
                )}
              >
                <LogIn
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                เข้าสู่ระบบ
              </Link>

              <Link
                href="/register"
                className={cn(
                  "hidden h-10 items-center gap-2 sm:inline-flex",
                  "rounded-lg bg-green-600 px-3",
                  "text-sm font-medium text-white",
                  "transition-colors",

                  "hover:bg-green-700",

                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",
                  "focus-visible:ring-offset-2",

                  "dark:focus-visible:ring-offset-gray-950"
                )}
              >
                <UserPlus
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                สมัครสมาชิก
              </Link>
            </div>
          )}
        </>
      )}

      {trailingActions && (
        <div
          data-slot="trailing-actions"
          className={cn(
            "flex items-center",
            compact ? "gap-0.5" : "gap-1"
          )}
        >
          {trailingActions}
        </div>
      )}

      {signOutError && (
        <span role="alert" className="sr-only">
          {signOutError}
        </span>
      )}
    </div>
  );
}
