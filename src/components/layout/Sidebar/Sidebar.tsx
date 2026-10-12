"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  LogIn,
  LogOut,
  Settings,
  UserPlus,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { BRAND_LOGO_SRC } from "@/lib/brand-logo";

import SidebarMenu, {
  DEFAULT_SIDEBAR_MENU_SECTIONS,
  type SidebarMenuEntry,
  type SidebarMenuRole,
  type SidebarMenuSection,
} from "./SidebarMenu";

export type SidebarUserRole = SidebarMenuRole;

export interface SidebarUser {
  /**
   * ID ของผู้ใช้จาก Supabase Auth
   */
  id: string;

  /**
   * ชื่อที่แสดงใน Sidebar
   */
  fullName: string;

  /**
   * อีเมลผู้ใช้งาน
   */
  email: string;

  /**
   * URL รูปโปรไฟล์
   */
  avatarUrl?: string | null;

  /**
   * สิทธิ์ผู้ใช้งาน
   */
  role?: SidebarUserRole;
}

export interface SidebarProps
  extends Omit<ComponentPropsWithoutRef<"aside">, "children"> {
  /**
   * ข้อมูลผู้ใช้ปัจจุบัน
   *
   * null หมายถึงยังไม่ได้เข้าสู่ระบบ
   */
  user?: SidebarUser | null;

  /**
   * Section และรายการเมนู
   */
  sections?: SidebarMenuSection[];

  /**
   * Controlled collapsed state
   */
  collapsed?: boolean;

  /**
   * ค่าเริ่มต้นกรณี Uncontrolled
   */
  defaultCollapsed?: boolean;

  /**
   * เรียกเมื่อ Sidebar ถูกย่อหรือขยาย
   */
  onCollapsedChange?: (collapsed: boolean) => void;

  /**
   * บันทึกสถานะย่อ/ขยายใน localStorage
   */
  persistCollapsed?: boolean;

  /**
   * localStorage key
   */
  collapsedStorageKey?: string;

  /**
   * แสดงปุ่มย่อและขยาย
   */
  showCollapseButton?: boolean;

  /**
   * แสดงส่วนข้อมูลผู้ใช้
   */
  showUserSection?: boolean;

  /**
   * แสดงเมนูตั้งค่า
   */
  showSettings?: boolean;

  /**
   * แสดงปุ่มออกจากระบบ
   */
  showSignOut?: boolean;

  /**
   * ฟังก์ชันออกจากระบบ
   */
  onSignOut?: () => void | Promise<void>;

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนูหลัก
   */
  onNavigate?: (item: SidebarMenuEntry) => void;

  /**
   * เนื้อหาเพิ่มเติมก่อน Footer
   */
  footerContent?: ReactNode;

  /**
   * URL ของโลโก้
   */
  logoHref?: string;

  /**
   * URL หน้าโปรไฟล์
   */
  profileHref?: string;

  /**
   * URL หน้าตั้งค่า
   */
  settingsHref?: string;

  /**
   * ชื่อระบบ
   */
  brandName?: string;

  /**
   * คำอธิบายใต้ชื่อระบบ
   */
  brandSubtitle?: string;

  /**
   * ซ่อน Sidebar บนหน้าจอขนาดเล็ก
   */
  desktopOnly?: boolean;
}

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

function isPathActive(
  pathname: string,
  href: string
): boolean {
  const currentPath = normalizePathname(pathname);
  const targetPath = normalizePathname(href);

  if (targetPath === "/") {
    return currentPath === "/";
  }

  return (
    currentPath === targetPath ||
    currentPath.startsWith(`${targetPath}/`)
  );
}

function getDisplayName(user: SidebarUser): string {
  const fullName = user.fullName?.trim();

  if (fullName) {
    return fullName;
  }

  const emailName = user.email.split("@")[0];

  return emailName || "ผู้ใช้งาน";
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

export default function Sidebar({
  user = null,
  sections = DEFAULT_SIDEBAR_MENU_SECTIONS,

  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,

  persistCollapsed = true,
  collapsedStorageKey = "rice-ai-sidebar-collapsed",

  showCollapseButton = true,
  showUserSection = true,
  showSettings = true,
  showSignOut = true,

  onSignOut,
  onNavigate,
  footerContent,

  logoHref = "/dashboard",
  profileHref = "/profile",
  settingsHref = "/settings",

  brandName = "SmartRiceHub",
  brandSubtitle = "ระบบเกษตรอัจฉริยะ",

  desktopOnly = true,

  className,
  "aria-label": ariaLabel = "เมนูด้านข้าง",
  ...asideProps
}: SidebarProps) {
  const pathname = usePathname();

  const [internalCollapsed, setInternalCollapsed] =
    useState(defaultCollapsed);

  const [isHydrated, setIsHydrated] =
    useState(false);

  const [isSigningOut, setIsSigningOut] =
    useState(false);

  const [signOutError, setSignOutError] =
    useState<string | null>(null);

  const isControlled =
    controlledCollapsed !== undefined;

  const collapsed =
    controlledCollapsed ?? internalCollapsed;

  const userRole: SidebarUserRole =
    user?.role ?? "user";

  const displayName = user
    ? getDisplayName(user)
    : "";

  const initials = user
    ? getInitials(displayName)
    : "";

  const settingsActive = isPathActive(
    pathname,
    settingsHref
  );

  const profileActive = isPathActive(
    pathname,
    profileHref
  );

  const setCollapsed = useCallback(
    (nextCollapsed: boolean) => {
      if (!isControlled) {
        setInternalCollapsed(nextCollapsed);
      }

      onCollapsedChange?.(nextCollapsed);

      if (persistCollapsed) {
        try {
          window.localStorage.setItem(
            collapsedStorageKey,
            String(nextCollapsed)
          );
        } catch {
          // localStorage อาจถูกปิดโดย Browser
        }
      }
    },
    [
      collapsedStorageKey,
      isControlled,
      onCollapsedChange,
      persistCollapsed,
    ]
  );

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  /**
   * โหลดสถานะ Sidebar จาก localStorage
   */
  /* Persisted UI preference is only available after the component reaches the browser. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (persistCollapsed && !isControlled) {
      try {
        const storedValue =
          window.localStorage.getItem(
            collapsedStorageKey
          );

        if (storedValue === "true") {
          setInternalCollapsed(true);
        }

        if (storedValue === "false") {
          setInternalCollapsed(false);
        }
      } catch {
        // localStorage อาจถูกปิดโดย Browser
      }
    }

    setIsHydrated(true);
  }, [
    collapsedStorageKey,
    isControlled,
    persistCollapsed,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * ซิงก์สถานะ Sidebar ระหว่างหลายแท็บ
   */
  useEffect(() => {
    if (!persistCollapsed || isControlled) {
      return;
    }

    const handleStorage = (
      event: StorageEvent
    ) => {
      if (
        event.key !== collapsedStorageKey ||
        event.newValue === null
      ) {
        return;
      }

      if (event.newValue === "true") {
        setInternalCollapsed(true);
      }

      if (event.newValue === "false") {
        setInternalCollapsed(false);
      }
    };

    window.addEventListener(
      "storage",
      handleStorage
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage
      );
    };
  }, [
    collapsedStorageKey,
    isControlled,
    persistCollapsed,
  ]);

  const handleSignOut = async (): Promise<void> => {
    if (!onSignOut || isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await onSignOut();
    } catch (error) {
      console.error(
        "Sidebar sign out failed:",
        error
      );

      setSignOutError(
        "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <aside
      {...asideProps}
      aria-label={ariaLabel}
      data-component="sidebar"
      data-collapsed={
        collapsed ? "true" : "false"
      }
      className={cn(
        "relative shrink-0 flex-col",
        "border-r border-gray-200",
        "bg-white",
        "dark:border-gray-800",
        "dark:bg-gray-950",

        "sticky top-16",
        "h-[calc(100dvh-4rem)]",

        "transition-[width] duration-300 ease-in-out",

        desktopOnly
          ? "hidden lg:flex"
          : "flex",

        collapsed ? "w-20" : "w-72",

        !isHydrated && "transition-none",

        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-16 shrink-0",
          "items-center",
          "border-b border-gray-200",
          "dark:border-gray-800",

          collapsed
            ? "justify-center px-2"
            : "px-4"
        )}
      >
        <Link
          href={logoHref}
          aria-label={brandName}
          title={
            collapsed ? brandName : undefined
          }
          className={cn(
            "flex min-w-0 items-center",
            "rounded-xl",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-green-500",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-white",
            "dark:focus-visible:ring-offset-gray-950",

            collapsed
              ? "justify-center"
              : "gap-3"
          )}
        >
          <span
            aria-hidden="true"
            className={cn(
              "relative h-10 w-10 shrink-0 overflow-hidden",
              "rounded-xl border border-green-900/10 bg-[#fff9e8] shadow-sm"
            )}
          >
            <Image
              src={BRAND_LOGO_SRC}
              alt=""
              fill
              sizes="40px"
              className="object-cover"
            />
          </span>

          {!collapsed && (
            <span className="min-w-0">
              <span
                className={cn(
                  "block truncate",
                  "text-sm font-bold",
                  "text-gray-950",
                  "dark:text-white"
                )}
              >
                {brandName}
              </span>

              <span
                className={cn(
                  "block truncate text-xs",
                  "text-gray-500",
                  "dark:text-gray-400"
                )}
              >
                {brandSubtitle}
              </span>
            </span>
          )}
        </Link>
      </div>

      {/* Collapse button */}
      {showCollapseButton && (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={
            collapsed
              ? "ขยายเมนูด้านข้าง"
              : "ย่อเมนูด้านข้าง"
          }
          aria-expanded={!collapsed}
          title={
            collapsed
              ? "ขยายเมนู"
              : "ย่อเมนู"
          }
          className={cn(
            "absolute -right-3 top-5 z-10",
            "inline-flex h-7 w-7",
            "items-center justify-center",
            "rounded-full border",
            "border-gray-200 bg-white",
            "text-gray-500 shadow-sm",
            "transition-colors",

            "hover:border-green-300",
            "hover:text-green-700",

            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-green-500",

            "dark:border-gray-700",
            "dark:bg-gray-900",
            "dark:text-gray-400",
            "dark:hover:border-green-700",
            "dark:hover:text-green-300"
          )}
        >
          {collapsed ? (
            <ChevronRight
              aria-hidden="true"
              className="h-4 w-4"
            />
          ) : (
            <ChevronLeft
              aria-hidden="true"
              className="h-4 w-4"
            />
          )}
        </button>
      )}

      {/* Main navigation */}
      <div
        className={cn(
          "min-h-0 flex-1",
          "overflow-y-auto overscroll-contain",

          collapsed
            ? "px-2 py-3"
            : "px-3 py-4"
        )}
      >
        <SidebarMenu
          sections={sections}
          role={userRole}
          collapsed={collapsed}
          showDescriptions
          showBadges
          onNavigate={onNavigate}
        />
      </div>

      {/* Custom footer */}
      {footerContent && (
        <div
          data-slot="sidebar-footer-content"
          className={cn(
            "shrink-0 border-t",
            "border-gray-200",
            "dark:border-gray-800",

            collapsed ? "p-2" : "p-3"
          )}
        >
          {footerContent}
        </div>
      )}

      {/* Settings */}
      {showSettings && user && (
        <div
          className={cn(
            "shrink-0",
            collapsed
              ? "px-2 pb-2"
              : "px-3 pb-2"
          )}
        >
          <Link
            href={settingsHref}
            aria-current={
              settingsActive
                ? "page"
                : undefined
            }
            aria-label={
              collapsed
                ? "ตั้งค่าระบบ"
                : undefined
            }
            title={
              collapsed
                ? "ตั้งค่าระบบ"
                : undefined
            }
            className={cn(
              "relative flex min-h-10",
              "items-center rounded-xl",
              "text-sm font-medium",
              "transition-colors",

              "focus-visible:outline-none",
              "focus-visible:ring-2",
              "focus-visible:ring-green-500",

              collapsed
                ? "justify-center px-2"
                : "gap-3 px-3",

              settingsActive
                ? [
                    "bg-green-50",
                    "text-green-700",
                    "dark:bg-green-950/50",
                    "dark:text-green-300",
                  ].join(" ")
                : [
                    "text-gray-600",
                    "hover:bg-gray-100",
                    "hover:text-gray-950",
                    "dark:text-gray-300",
                    "dark:hover:bg-gray-900",
                    "dark:hover:text-white",
                  ].join(" ")
            )}
          >
            <Settings
              aria-hidden="true"
              className="h-5 w-5 shrink-0"
            />

            {!collapsed && (
              <span className="truncate">
                ตั้งค่าระบบ
              </span>
            )}

            {settingsActive && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-0 top-1/2",
                  "h-6 w-1",
                  "-translate-y-1/2",
                  "rounded-r-full",
                  "bg-green-600",
                  "dark:bg-green-400"
                )}
              />
            )}
          </Link>
        </div>
      )}

      {/* User section */}
      {showUserSection && (
        <div
          className={cn(
            "shrink-0 border-t",
            "border-gray-200",
            "dark:border-gray-800",

            collapsed ? "p-2" : "p-3"
          )}
        >
          {user ? (
            <div className="space-y-2">
              {/* Profile */}
              <Link
                href={profileHref}
                aria-current={
                  profileActive
                    ? "page"
                    : undefined
                }
                aria-label={
                  collapsed
                    ? `โปรไฟล์ของ ${displayName}`
                    : undefined
                }
                title={
                  collapsed
                    ? displayName
                    : undefined
                }
                className={cn(
                  "relative flex items-center",
                  "rounded-xl",
                  "transition-colors",

                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",

                  collapsed
                    ? "justify-center p-1"
                    : "gap-3 p-2",

                  profileActive
                    ? [
                        "bg-green-50",
                        "dark:bg-green-950/50",
                      ].join(" ")
                    : [
                        "hover:bg-gray-100",
                        "dark:hover:bg-gray-900",
                      ].join(" ")
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative flex h-10 w-10",
                    "shrink-0 items-center",
                    "justify-center overflow-hidden",
                    "rounded-full",
                    "bg-green-100",
                    "text-xs font-bold",
                    "text-green-700",
                    "dark:bg-green-950",
                    "dark:text-green-300"
                  )}
                >
                  {user.avatarUrl ? (
                    // ใช้ img เพื่อรองรับ URL จาก Supabase Storage
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

                {!collapsed && (
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        "font-semibold",
                        profileActive
                          ? [
                              "text-green-700",
                              "dark:text-green-300",
                            ].join(" ")
                          : [
                              "text-gray-950",
                              "dark:text-white",
                            ].join(" ")
                      )}
                    >
                      {displayName}
                    </span>

                    <span
                      className={cn(
                        "block truncate text-xs",
                        "text-gray-500",
                        "dark:text-gray-400"
                      )}
                    >
                      {user.email}
                    </span>

                    <span
                      className={cn(
                        "mt-1 inline-flex",
                        "rounded-full px-2 py-0.5",
                        "text-[10px] font-medium",

                        user.role === "admin"
                          ? [
                              "bg-purple-100",
                              "text-purple-700",
                              "dark:bg-purple-950",
                              "dark:text-purple-300",
                            ].join(" ")
                          : [
                              "bg-green-100",
                              "text-green-700",
                              "dark:bg-green-950",
                              "dark:text-green-300",
                            ].join(" ")
                      )}
                    >
                      {user.role === "admin"
                        ? "ผู้ดูแลระบบ"
                        : "ผู้ใช้งาน"}
                    </span>
                  </span>
                )}

                {profileActive && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-0 top-1/2",
                      "h-6 w-1",
                      "-translate-y-1/2",
                      "rounded-r-full",
                      "bg-green-600",
                      "dark:bg-green-400"
                    )}
                  />
                )}
              </Link>

              {/* Sign-out error */}
              {signOutError && !collapsed && (
                <p
                  role="alert"
                  className={cn(
                    "rounded-lg",
                    "bg-red-50 px-3 py-2",
                    "text-xs text-red-700",
                    "dark:bg-red-950/50",
                    "dark:text-red-300"
                  )}
                >
                  {signOutError}
                </p>
              )}

              {/* Sign out */}
              {showSignOut && onSignOut && (
                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  aria-label={
                    collapsed
                      ? "ออกจากระบบ"
                      : undefined
                  }
                  title={
                    collapsed
                      ? "ออกจากระบบ"
                      : undefined
                  }
                  className={cn(
                    "flex h-10 w-full",
                    "items-center rounded-xl",
                    "text-sm font-medium",
                    "text-red-600",
                    "transition-colors",

                    "hover:bg-red-50",

                    "focus-visible:outline-none",
                    "focus-visible:ring-2",
                    "focus-visible:ring-red-500",

                    "disabled:cursor-not-allowed",
                    "disabled:opacity-60",

                    "dark:text-red-400",
                    "dark:hover:bg-red-950/50",

                    collapsed
                      ? "justify-center"
                      : "justify-center gap-2 px-3"
                  )}
                >
                  <LogOut
                    aria-hidden="true"
                    className="h-5 w-5 shrink-0"
                  />

                  {!collapsed && (
                    <span>
                      {isSigningOut
                        ? "กำลังออกจากระบบ..."
                        : "ออกจากระบบ"}
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {collapsed ? (
                <>
                  <Link
                    href="/login"
                    aria-label="เข้าสู่ระบบ"
                    title="เข้าสู่ระบบ"
                    className={cn(
                      "flex h-10 w-full",
                      "items-center justify-center",
                      "rounded-xl",
                      "text-gray-600",
                      "transition-colors",

                      "hover:bg-gray-100",
                      "hover:text-gray-950",

                      "focus-visible:outline-none",
                      "focus-visible:ring-2",
                      "focus-visible:ring-green-500",

                      "dark:text-gray-300",
                      "dark:hover:bg-gray-900",
                      "dark:hover:text-white"
                    )}
                  >
                    <LogIn
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </Link>

                  <Link
                    href="/register"
                    aria-label="สมัครสมาชิก"
                    title="สมัครสมาชิก"
                    className={cn(
                      "flex h-10 w-full",
                      "items-center justify-center",
                      "rounded-xl",
                      "bg-green-600",
                      "text-white",
                      "transition-colors",

                      "hover:bg-green-700",

                      "focus-visible:outline-none",
                      "focus-visible:ring-2",
                      "focus-visible:ring-green-500"
                    )}
                  >
                    <UserPlus
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </Link>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3 px-2">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-10 w-10 shrink-0",
                        "items-center justify-center",
                        "rounded-full",
                        "bg-gray-100",
                        "text-gray-500",
                        "dark:bg-gray-800",
                        "dark:text-gray-400"
                      )}
                    >
                      <CircleUserRound className="h-6 w-6" />
                    </span>

                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block text-sm font-semibold",
                          "text-gray-950",
                          "dark:text-white"
                        )}
                      >
                        ยังไม่ได้เข้าสู่ระบบ
                      </span>

                      <span
                        className={cn(
                          "block text-xs",
                          "text-gray-500",
                          "dark:text-gray-400"
                        )}
                      >
                        เข้าสู่ระบบเพื่อใช้งานทุกฟีเจอร์
                      </span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/login"
                      className={cn(
                        "inline-flex h-10",
                        "items-center justify-center",
                        "gap-2 rounded-lg",
                        "border border-gray-300",
                        "text-sm font-medium",
                        "text-gray-700",
                        "transition-colors",

                        "hover:bg-gray-100",

                        "focus-visible:outline-none",
                        "focus-visible:ring-2",
                        "focus-visible:ring-green-500",

                        "dark:border-gray-700",
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
                      href="/register"
                      className={cn(
                        "inline-flex h-10",
                        "items-center justify-center",
                        "gap-2 rounded-lg",
                        "bg-green-600",
                        "text-sm font-medium",
                        "text-white",
                        "transition-colors",

                        "hover:bg-green-700",

                        "focus-visible:outline-none",
                        "focus-visible:ring-2",
                        "focus-visible:ring-green-500"
                      )}
                    >
                      <UserPlus
                        aria-hidden="true"
                        className="h-4 w-4"
                      />

                      สมัคร
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
