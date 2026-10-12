"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronRight,
  ExternalLink,
  LogIn,
  LogOut,
  Menu,
  ShieldCheck,
  UserCircle,
  UserPlus,
  X,
} from "lucide-react";

import {
  DEFAULT_NAVBAR_MENU_ITEMS,
  isNavbarPathActive,
  type NavbarMenuItem,
} from "./NavbarMenu";

import type { NavbarUser } from "./Navbar";
import { BRAND_LOGO_SRC } from "@/lib/brand-logo";

export interface NavbarMobileProps
  extends Omit<
    ComponentPropsWithoutRef<"div">,
    "children" | "id"
  > {
  /**
   * ID ของ Mobile Drawer
   * ใช้ร่วมกับ aria-controls
   */
  id: string;

  /**
   * สถานะการเปิด Drawer
   */
  open: boolean;

  /**
   * เปลี่ยนสถานะ Drawer
   */
  onOpenChange: (open: boolean) => void;

  /**
   * ข้อมูลผู้ใช้ปัจจุบัน
   */
  user?: NavbarUser | null;

  /**
   * จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
   */
  notificationCount?: number;

  /**
   * ฟังก์ชันออกจากระบบ
   */
  onSignOut?: () => void | Promise<void>;

  /**
   * รายการเมนู
   */
  items?: NavbarMenuItem[];

  /**
   * แสดงส่วนแจ้งเตือนหรือไม่
   */
  showNotifications?: boolean;

  /**
   * แสดงส่วนข้อมูลผู้ใช้หรือไม่
   */
  showUserSection?: boolean;
}

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
  if (count > 99) {
    return "99+";
  }

  return String(count);
}

function getDisplayName(user: NavbarUser | null): string {
  if (!user) {
    return "";
  }

  const fullName = user.fullName?.trim();

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

function getFocusableElements(
  container: HTMLElement
): HTMLElement[] {
  const selector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "select:not([disabled])",
    "textarea:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  return Array.from(
    container.querySelectorAll<HTMLElement>(selector)
  ).filter((element) => {
    return (
      !element.hasAttribute("disabled") &&
      element.getAttribute("aria-hidden") !== "true" &&
      element.offsetParent !== null
    );
  });
}

export default function NavbarMobile({
  id,
  open,
  onOpenChange,
  user = null,
  notificationCount = 0,
  onSignOut,
  items = DEFAULT_NAVBAR_MENU_ITEMS,
  showNotifications = true,
  showUserSection = true,
  className,
  ...divProps
}: NavbarMobileProps) {
  const pathname = usePathname();

  const triggerRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(
    null
  );

  const [mounted, setMounted] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);
  const [isVisible, setIsVisible] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(
    null
  );

  const safeNotificationCount =
    normalizeNotificationCount(notificationCount);

  const notificationLabel =
    formatNotificationCount(safeNotificationCount);

  const displayName = getDisplayName(user);
  const initials = getInitials(displayName);

  const userRole = user?.role ?? "user";

  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!item.roles || item.roles.length === 0) {
        return true;
      }

      return item.roles.includes(userRole);
    });
  }, [items, userRole]);

  const closeMenu = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const toggleMenu = useCallback(() => {
    onOpenChange(!open);
  }, [onOpenChange, open]);

  /* Mount and animation state are intentionally staged for the client-only portal. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true);
  }, []);

  /*
   * จัดการ Animation ก่อน Mount/Unmount Drawer
   */
  useEffect(() => {
    let animationFrame: number | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (open) {
      setShouldRender(true);

      animationFrame = window.requestAnimationFrame(() => {
        setIsVisible(true);
      });
    } else {
      setIsVisible(false);

      timer = setTimeout(() => {
        setShouldRender(false);
      }, 200);
    }

    return () => {
      if (animationFrame !== undefined) {
        window.cancelAnimationFrame(animationFrame);
      }

      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [open]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /*
   * ปิด Drawer เมื่อเปลี่ยนหน้า
   */
  useEffect(() => {
    if (open) {
      closeMenu();
    }
    // ปิดเฉพาะตอน pathname เปลี่ยน
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /*
   * ล็อก Scroll และจัดการ Focus
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const triggerElement = triggerRef.current;

    if (document.activeElement instanceof HTMLElement) {
      previousActiveElementRef.current =
        document.activeElement;
    }

    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight =
      document.body.style.paddingRight;

    const scrollbarWidth =
      window.innerWidth -
      document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight =
        `${scrollbarWidth}px`;
    }

    const focusTimer = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 50);

    return () => {
      window.clearTimeout(focusTimer);

      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight =
        originalPaddingRight;

      const previousElement =
        previousActiveElementRef.current;

      if (
        previousElement &&
        document.contains(previousElement)
      ) {
        previousElement.focus();
      } else {
        triggerElement?.focus();
      }
    };
  }, [open]);

  /*
   * Escape และ Focus Trap
   */
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (
        event.key !== "Tab" ||
        !drawerRef.current
      ) {
        return;
      }

      const focusableElements =
        getFocusableElements(drawerRef.current);

      if (focusableElements.length === 0) {
        event.preventDefault();
        drawerRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement =
        focusableElements[focusableElements.length - 1];

      const activeElement = document.activeElement;

      if (
        event.shiftKey &&
        activeElement === firstElement
      ) {
        event.preventDefault();
        lastElement.focus();
      } else if (
        !event.shiftKey &&
        activeElement === lastElement
      ) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [open, closeMenu]);

  const handleTriggerKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>
  ) => {
    if (
      event.key === "ArrowDown" &&
      !open
    ) {
      event.preventDefault();
      onOpenChange(true);
    }
  };

  const handleSignOut = async () => {
    if (!onSignOut || isSigningOut) {
      return;
    }

    setIsSigningOut(true);
    setSignOutError(null);

    try {
      await onSignOut();
      closeMenu();
    } catch (error) {
      console.error(
        "Navbar mobile sign out failed:",
        error
      );

      setSignOutError(
        "ไม่สามารถออกจากระบบได้ กรุณาลองใหม่อีกครั้ง"
      );
    } finally {
      setIsSigningOut(false);
    }
  };

  const drawer = mounted && shouldRender
    ? createPortal(
        <div
          aria-hidden={!open}
          data-component="navbar-mobile-drawer"
          data-state={open ? "open" : "closed"}
          className="fixed inset-0 z-[100] lg:hidden"
        >
          {/* Overlay */}
          <button
            type="button"
            tabIndex={open ? 0 : -1}
            aria-label="ปิดเมนูนำทาง"
            onClick={closeMenu}
            className={cn(
              "absolute inset-0",
              "bg-gray-950/50 backdrop-blur-sm",
              "transition-opacity duration-200",
              isVisible
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            )}
          />

          {/* Drawer */}
          <aside
            ref={drawerRef}
            id={id}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descriptionId}
            tabIndex={-1}
            className={cn(
              "absolute inset-y-0 left-0",
              "flex h-full w-[min(88vw,360px)]",
              "flex-col overflow-hidden",
              "border-r border-gray-200",
              "bg-white shadow-2xl",
              "transition-transform duration-200 ease-out",
              "dark:border-gray-800 dark:bg-gray-950",
              isVisible
                ? "translate-x-0"
                : "-translate-x-full"
            )}
          >
            {/* Header */}
            <div
              className={cn(
                "flex min-h-16 items-center",
                "justify-between gap-3",
                "border-b border-gray-200",
                "px-4 pt-[env(safe-area-inset-top)]",
                "dark:border-gray-800"
              )}
            >
              <Link
                href="/"
                onClick={closeMenu}
                className={cn(
                  "group flex min-w-0 items-center gap-3",
                  "rounded-lg py-2",
                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500"
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "relative h-11 w-11 shrink-0",
                    "overflow-hidden rounded-xl"
                  )}
                >
                  <Image
                    src={BRAND_LOGO_SRC}
                    alt=""
                    fill
                    sizes="44px"
                    className="object-contain"
                  />
                </span>

                <span className="min-w-0">
                  <span
                    id={titleId}
                    className={cn(
                      "block truncate",
                      "text-base font-bold",
                      "text-gray-950",
                      "dark:text-white"
                    )}
                  >
                    SmartRiceHub
                  </span>

                  <span
                    id={descriptionId}
                    className={cn(
                      "block truncate text-xs",
                      "text-gray-500",
                      "dark:text-gray-400"
                    )}
                  >
                    ระบบผู้ช่วยเกษตรกรอัจฉริยะ
                  </span>
                </span>
              </Link>

              <button
                ref={closeButtonRef}
                type="button"
                onClick={closeMenu}
                aria-label="ปิดเมนู"
                className={cn(
                  "inline-flex h-10 w-10 shrink-0",
                  "items-center justify-center",
                  "rounded-lg",
                  "text-gray-500",
                  "transition-colors",
                  "hover:bg-gray-100",
                  "hover:text-gray-950",
                  "focus-visible:outline-none",
                  "focus-visible:ring-2",
                  "focus-visible:ring-green-500",
                  "dark:text-gray-400",
                  "dark:hover:bg-gray-800",
                  "dark:hover:text-white"
                )}
              >
                <X
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </button>
            </div>

            {/* Content */}
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
              {/* User */}
              {showUserSection && (
                <section
                  aria-label="ข้อมูลผู้ใช้งาน"
                  className={cn(
                    "border-b border-gray-200 p-4",
                    "dark:border-gray-800"
                  )}
                >
                  {user ? (
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className={cn(
                        "flex items-center gap-3",
                        "rounded-xl p-2",
                        "transition-colors",
                        "hover:bg-gray-100",
                        "focus-visible:outline-none",
                        "focus-visible:ring-2",
                        "focus-visible:ring-green-500",
                        "dark:hover:bg-gray-900"
                      )}
                    >
                      <span
                        aria-hidden="true"
                        style={
                          user.avatarUrl
                            ? {
                                backgroundImage: `url(${JSON.stringify(
                                  user.avatarUrl
                                )})`,
                              }
                            : undefined
                        }
                        className={cn(
                          "flex h-12 w-12 shrink-0",
                          "items-center justify-center",
                          "rounded-full",
                          "bg-green-100",
                          "bg-cover bg-center",
                          "text-sm font-bold",
                          "text-green-700",
                          "ring-2 ring-white",
                          "dark:bg-green-950",
                          "dark:text-green-300",
                          "dark:ring-gray-950"
                        )}
                      >
                        {!user.avatarUrl && initials}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block truncate",
                            "text-sm font-semibold",
                            "text-gray-950",
                            "dark:text-white"
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
                            "mt-1 inline-flex items-center",
                            "gap-1 rounded-full",
                            "px-2 py-0.5",
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
                          {user.role === "admin" && (
                            <ShieldCheck
                              aria-hidden="true"
                              className="h-3 w-3"
                            />
                          )}

                          {user.role === "admin"
                            ? "ผู้ดูแลระบบ"
                            : "ผู้ใช้งาน"}
                        </span>
                      </span>

                      <ChevronRight
                        aria-hidden="true"
                        className={cn(
                          "h-5 w-5 shrink-0",
                          "text-gray-400"
                        )}
                      />
                    </Link>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-11 w-11",
                            "items-center justify-center",
                            "rounded-full bg-gray-100",
                            "text-gray-500",
                            "dark:bg-gray-800",
                            "dark:text-gray-400"
                          )}
                        >
                          <UserCircle
                            aria-hidden="true"
                            className="h-7 w-7"
                          />
                        </span>

                        <span>
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
                          onClick={closeMenu}
                          className={cn(
                            "inline-flex h-10 items-center",
                            "justify-center gap-2",
                            "rounded-lg border",
                            "border-gray-300",
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
                          onClick={closeMenu}
                          className={cn(
                            "inline-flex h-10 items-center",
                            "justify-center gap-2",
                            "rounded-lg",
                            "bg-green-600",
                            "text-sm font-medium text-white",
                            "transition-colors",
                            "hover:bg-green-700",
                            "focus-visible:outline-none",
                            "focus-visible:ring-2",
                            "focus-visible:ring-green-500",
                            "focus-visible:ring-offset-2",
                            "dark:ring-offset-gray-950"
                          )}
                        >
                          <UserPlus
                            aria-hidden="true"
                            className="h-4 w-4"
                          />

                          สมัครสมาชิก
                        </Link>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Notification */}
              {showNotifications && user && (
                <section
                  aria-label="การแจ้งเตือน"
                  className="px-3 pt-3"
                >
                  <Link
                    href="/notifications"
                    onClick={closeMenu}
                    className={cn(
                      "flex min-h-11 items-center gap-3",
                      "rounded-lg px-3 py-2",
                      "text-sm font-medium",
                      "transition-colors",
                      isNavbarPathActive(pathname, {
                        id: "notifications",
                        label: "การแจ้งเตือน",
                        href: "/notifications",
                      })
                        ? [
                            "bg-green-50",
                            "text-green-700",
                            "dark:bg-green-950/50",
                            "dark:text-green-300",
                          ].join(" ")
                        : [
                            "text-gray-700",
                            "hover:bg-gray-100",
                            "dark:text-gray-200",
                            "dark:hover:bg-gray-900",
                          ].join(" ")
                    )}
                  >
                    <Bell
                      aria-hidden="true"
                      className="h-5 w-5 shrink-0"
                    />

                    <span className="flex-1">
                      การแจ้งเตือน
                    </span>

                    {safeNotificationCount > 0 && (
                      <span
                        aria-label={`${safeNotificationCount} รายการที่ยังไม่ได้อ่าน`}
                        className={cn(
                          "inline-flex min-w-6",
                          "items-center justify-center",
                          "rounded-full bg-red-500",
                          "px-1.5 py-0.5",
                          "text-[10px] font-bold",
                          "text-white"
                        )}
                      >
                        {notificationLabel}
                      </span>
                    )}
                  </Link>
                </section>
              )}

              {/* Navigation */}
              <nav
                aria-label="เมนูนำทางบนโทรศัพท์"
                className="flex-1 px-3 py-3"
              >
                <p
                  className={cn(
                    "mb-2 px-3",
                    "text-xs font-semibold uppercase",
                    "tracking-wider",
                    "text-gray-400",
                    "dark:text-gray-500"
                  )}
                >
                  เมนูหลัก
                </p>

                <ul role="list" className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      isNavbarPathActive(pathname, item);

                    const itemClassName = cn(
                      "group flex min-h-11",
                      "items-center gap-3",
                      "rounded-lg px-3 py-2",
                      "text-sm font-medium",
                      "transition-colors",
                      "focus-visible:outline-none",
                      "focus-visible:ring-2",
                      "focus-visible:ring-green-500",

                      isActive
                        ? [
                            "bg-green-50",
                            "text-green-700",
                            "dark:bg-green-950/50",
                            "dark:text-green-300",
                          ].join(" ")
                        : [
                            "text-gray-700",
                            "hover:bg-gray-100",
                            "dark:text-gray-200",
                            "dark:hover:bg-gray-900",
                          ].join(" "),

                      item.disabled &&
                        [
                          "cursor-not-allowed",
                          "opacity-50",
                          "hover:bg-transparent",
                          "dark:hover:bg-transparent",
                        ].join(" ")
                    );

                    const content = (
                      <>
                        {Icon && (
                          <Icon
                            aria-hidden="true"
                            strokeWidth={
                              isActive ? 2.25 : 2
                            }
                            className={cn(
                              "h-5 w-5 shrink-0",
                              isActive
                                ? [
                                    "text-green-600",
                                    "dark:text-green-400",
                                  ].join(" ")
                                : [
                                    "text-gray-500",
                                    "dark:text-gray-400",
                                  ].join(" ")
                            )}
                          />
                        )}

                        <span className="min-w-0 flex-1">
                          <span className="block truncate">
                            {item.label}
                          </span>

                          {item.description && (
                            <span
                              className={cn(
                                "mt-0.5 block truncate",
                                "text-xs font-normal",
                                isActive
                                  ? [
                                      "text-green-600/80",
                                      "dark:text-green-400/80",
                                    ].join(" ")
                                  : [
                                      "text-gray-400",
                                      "dark:text-gray-500",
                                    ].join(" ")
                              )}
                            >
                              {item.description}
                            </span>
                          )}
                        </span>

                        {item.badge !== undefined &&
                          item.badge !== null && (
                            <span
                              className={cn(
                                "inline-flex min-w-5",
                                "items-center justify-center",
                                "rounded-full",
                                "bg-gray-200",
                                "px-1.5 py-0.5",
                                "text-[10px] font-semibold",
                                "text-gray-700",
                                "dark:bg-gray-700",
                                "dark:text-gray-100"
                              )}
                            >
                              {item.badge}
                            </span>
                          )}

                        {item.external ? (
                          <ExternalLink
                            aria-hidden="true"
                            className="h-4 w-4 shrink-0"
                          />
                        ) : (
                          <ChevronRight
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4 shrink-0",
                              "transition-transform",
                              "group-hover:translate-x-0.5",
                              isActive
                                ? "text-green-500"
                                : "text-gray-400"
                            )}
                          />
                        )}
                      </>
                    );

                    return (
                      <li key={item.id}>
                        {item.disabled ? (
                          <span
                            aria-disabled="true"
                            className={itemClassName}
                          >
                            {content}
                          </span>
                        ) : item.external ? (
                          <a
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={closeMenu}
                            aria-label={`${item.label} เปิดในแท็บใหม่`}
                            className={itemClassName}
                          >
                            {content}
                          </a>
                        ) : (
                          <Link
                            href={item.href}
                            prefetch={item.prefetch}
                            onClick={closeMenu}
                            aria-current={
                              isActive
                                ? "page"
                                : undefined
                            }
                            className={itemClassName}
                          >
                            {content}
                          </Link>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </nav>
            </div>

            {/* Footer */}
            {user && onSignOut && (
              <footer
                className={cn(
                  "border-t border-gray-200",
                  "p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
                  "dark:border-gray-800"
                )}
              >
                {signOutError && (
                  <p
                    role="alert"
                    className={cn(
                      "mb-2 rounded-lg",
                      "bg-red-50 px-3 py-2",
                      "text-xs text-red-700",
                      "dark:bg-red-950/50",
                      "dark:text-red-300"
                    )}
                  >
                    {signOutError}
                  </p>
                )}

                <button
                  type="button"
                  disabled={isSigningOut}
                  onClick={handleSignOut}
                  className={cn(
                    "inline-flex h-11 w-full",
                    "items-center justify-center gap-2",
                    "rounded-lg",
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
                    "dark:hover:bg-red-950/50"
                  )}
                >
                  <LogOut
                    aria-hidden="true"
                    className="h-5 w-5"
                  />

                  {isSigningOut
                    ? "กำลังออกจากระบบ..."
                    : "ออกจากระบบ"}
                </button>
              </footer>
            )}
          </aside>
        </div>,
        document.body
      )
    : null;

  return (
    <div
      {...divProps}
      data-component="navbar-mobile"
      className={cn(
        "inline-flex lg:hidden",
        className
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={
          open ? "ปิดเมนูนำทาง" : "เปิดเมนูนำทาง"
        }
        aria-haspopup="dialog"
        aria-controls={id}
        aria-expanded={open}
        onClick={toggleMenu}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "relative inline-flex h-10 w-10",
          "items-center justify-center",
          "rounded-lg",
          "text-gray-600",
          "transition-colors",
          "hover:bg-gray-100",
          "hover:text-gray-950",
          "focus-visible:outline-none",
          "focus-visible:ring-2",
          "focus-visible:ring-green-500",
          "focus-visible:ring-offset-2",
          "focus-visible:ring-offset-white",
          "dark:text-gray-300",
          "dark:hover:bg-gray-800",
          "dark:hover:text-white",
          "dark:focus-visible:ring-offset-gray-950"
        )}
      >
        {open ? (
          <X
            aria-hidden="true"
            className="h-5 w-5"
          />
        ) : (
          <Menu
            aria-hidden="true"
            className="h-5 w-5"
          />
        )}

        {safeNotificationCount > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute right-1 top-1",
              "h-2 w-2 rounded-full",
              "bg-red-500",
              "ring-2 ring-white",
              "dark:ring-gray-950"
            )}
          />
        )}
      </button>

      {drawer}
    </div>
  );
}
