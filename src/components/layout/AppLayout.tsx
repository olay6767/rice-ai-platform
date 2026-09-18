"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CloudSun,
  FileImage,
  Home,
  ScanSearch,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import {
  useMemo,
  type ComponentPropsWithoutRef,
  type MouseEvent,
  type ReactNode,
} from "react";

export type BottomNavigationRole = "user" | "admin";

export interface BottomNavigationItem {
  /**
   * ID ต้องไม่ซ้ำกัน
   */
  id: string;

  /**
   * ชื่อเมนู
   */
  label: string;

  /**
   * URL ปลายทาง
   */
  href: string;

  /**
   * ไอคอนจาก lucide-react
   */
  icon: LucideIcon;

  /**
   * คำอธิบายสำหรับ Accessibility
   */
  description?: string;

  /**
   * ตรวจ Active Route แบบตรงทั้งหมด
   */
  exact?: boolean;

  /**
   * เส้นทางเพิ่มเติมที่ถือว่าเมนูนี้ Active
   */
  matchPaths?: string[];

  /**
   * Role ที่สามารถเห็นเมนู
   */
  roles?: BottomNavigationRole[];

  /**
   * Badge เช่น จำนวนแจ้งเตือน
   */
  badge?: ReactNode;

  /**
   * ปิดการใช้งาน
   */
  disabled?: boolean;

  /**
   * เปิดในแท็บใหม่
   */
  external?: boolean;

  /**
   * แสดงเป็นปุ่มหลักที่เด่นกว่ารายการอื่น
   */
  featured?: boolean;

  /**
   * ควบคุม Next.js prefetch
   */
  prefetch?: boolean | null;
}

export interface BottomNavigationProps
  extends Omit<
    ComponentPropsWithoutRef<"nav">,
    "children"
  > {
  /**
   * รายการเมนู
   */
  items?: BottomNavigationItem[];

  /**
   * Role ของผู้ใช้
   */
  role?: BottomNavigationRole;

  /**
   * Pathname สำหรับควบคุมจากภายนอก
   *
   * ถ้าไม่ส่งมา จะใช้ usePathname()
   */
  pathname?: string;

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนู
   */
  onNavigate?: (
    item: BottomNavigationItem
  ) => void;

  /**
   * ซ่อน Bottom Navigation
   */
  hidden?: boolean;

  /**
   * ซ่อนใน Route ที่กำหนด
   *
   * ตัวอย่าง:
   * ["/login", "/register"]
   */
  hiddenPaths?: string[];

  /**
   * ซ่อนเมื่อ URL ขึ้นต้นด้วย Route ที่กำหนด
   */
  hiddenPathPrefixes?: string[];

  /**
   * แสดง Badge
   */
  showBadges?: boolean;

  /**
   * แสดงข้อความใต้ไอคอน
   */
  showLabels?: boolean;

  /**
   * แสดงเฉพาะหน้าจอเล็กกว่า lg
   */
  mobileOnly?: boolean;
}

export const DEFAULT_BOTTOM_NAVIGATION_ITEMS: BottomNavigationItem[] =
  [
    {
      id: "dashboard",
      label: "หน้าหลัก",
      href: "/dashboard",
      icon: Home,
      description: "ไปหน้าแดชบอร์ด",
      matchPaths: ["/analytics/rice-price"],
    },
    {
      id: "analytics",
      label: "สภาพอากาศ",
      href: "/analytics/weather",
      icon: CloudSun,
      description: "ดูพยากรณ์อากาศ ฝน และความชื้น",
      matchPaths: [
        "/analytics/production",
        "/analytics/export",
        "/analytics/weather",
        "/analytics/drought",
        "/analytics/flood",
        "/analytics/overview",
        "/analytics/storm",
        "/analytics/yield",
        "/analytics/diseases",
      ],
    },
    {
      id: "disease",
      label: "ตรวจโรค",
      href: "/disease",
      icon: ScanSearch,
      description: "ตรวจโรคข้าวจากรูปภาพด้วย AI",
      featured: true,
      matchPaths: [
        "/disease/history",
        "/disease/predictions",
      ],
    },
    {
      id: "finance",
      label: "การเงิน",
      href: "/finance",
      icon: WalletCards,
      description: "จัดการรายรับ รายจ่าย และกำไร",
      matchPaths: [
        "/finance/transactions",
        "/finance/seasons",
        "/finance/reports",
      ],
    },
    {
      id: "infographic",
      label: "รายงาน",
      href: "/infographic",
      icon: FileImage,
      description: "สร้างรายงานและอินโฟกราฟิก",
    },
  ];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function normalizePathname(
  pathname: string
): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  return pathname.replace(/\/+$/, "") || "/";
}

export function isBottomNavigationPathActive(
  pathname: string,
  item: BottomNavigationItem
): boolean {
  if (item.disabled || item.external) {
    return false;
  }

  const currentPath =
    normalizePathname(pathname);

  const itemPath =
    normalizePathname(item.href);

  if (item.exact) {
    return currentPath === itemPath;
  }

  const matchablePaths = [
    itemPath,
    ...(item.matchPaths ?? []).map(
      normalizePathname
    ),
  ];

  return matchablePaths.some((path) => {
    if (path === "/") {
      return currentPath === "/";
    }

    return (
      currentPath === path ||
      currentPath.startsWith(`${path}/`)
    );
  });
}

function shouldHideOnCurrentPath(
  pathname: string,
  hiddenPaths: string[],
  hiddenPathPrefixes: string[]
): boolean {
  const currentPath =
    normalizePathname(pathname);

  const matchesExactPath =
    hiddenPaths.some((path) => {
      return (
        normalizePathname(path) === currentPath
      );
    });

  if (matchesExactPath) {
    return true;
  }

  return hiddenPathPrefixes.some((prefix) => {
    const normalizedPrefix =
      normalizePathname(prefix);

    return (
      currentPath === normalizedPrefix ||
      currentPath.startsWith(
        `${normalizedPrefix}/`
      )
    );
  });
}

function hasBadgeValue(
  badge: ReactNode
): boolean {
  return (
    badge !== undefined &&
    badge !== null &&
    badge !== false
  );
}

export default function BottomNavigation({
  items = DEFAULT_BOTTOM_NAVIGATION_ITEMS,
  role = "user",
  pathname: providedPathname,
  onNavigate,

  hidden = false,
  hiddenPaths = [
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
  hiddenPathPrefixes = ["/admin"],

  showBadges = true,
  showLabels = true,
  mobileOnly = true,

  className,
  "aria-label": ariaLabel =
    "เมนูนำทางด้านล่าง",
  ...navProps
}: BottomNavigationProps) {
  const currentPathname = usePathname();

  const pathname =
    providedPathname ??
    currentPathname ??
    "/";

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (
        !item.roles ||
        item.roles.length === 0
      ) {
        return true;
      }

      return item.roles.includes(role);
    });
  }, [items, role]);

  const isHiddenByPath =
    shouldHideOnCurrentPath(
      pathname,
      hiddenPaths,
      hiddenPathPrefixes
    );

  if (
    hidden ||
    isHiddenByPath ||
    visibleItems.length === 0
  ) {
    return null;
  }

  return (
    <nav
      {...navProps}
      aria-label={ariaLabel}
      data-component="bottom-navigation"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50",
        "border-t border-gray-200/90",
        "bg-white/95",
        "shadow-[0_-4px_20px_rgba(0,0,0,0.06)]",
        "backdrop-blur-md",

        "supports-[backdrop-filter]:bg-white/85",

        "dark:border-gray-800/90",
        "dark:bg-gray-950/95",
        "dark:supports-[backdrop-filter]:bg-gray-950/85",

        mobileOnly && "lg:hidden",

        className
      )}
    >
      <ul
        role="list"
        style={{
          gridTemplateColumns: `repeat(${visibleItems.length}, minmax(0, 1fr))`,
        }}
        className={cn(
          "mx-auto grid",
          "min-h-16 max-w-xl",
          "px-1",
          "pb-[env(safe-area-inset-bottom)]"
        )}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;

          const active =
            isBottomNavigationPathActive(
              pathname,
              item
            );

          const badgeVisible =
            showBadges &&
            hasBadgeValue(item.badge);

          const itemClassName = cn(
            "group relative flex min-w-0",
            "flex-col items-center justify-center",
            "gap-0.5 rounded-xl",
            "px-1 py-1.5",
            "text-xs font-medium",
            "transition-colors duration-200",

            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-inset",
            "focus-visible:ring-green-500",

            item.featured
              ? "-mt-5"
              : "mt-0",

            active
              ? [
                  "text-green-700",
                  "dark:text-green-300",
                ].join(" ")
              : [
                  "text-gray-500",
                  "hover:text-gray-950",
                  "dark:text-gray-400",
                  "dark:hover:text-white",
                ].join(" "),

            item.disabled &&
              [
                "cursor-not-allowed",
                "opacity-45",
                "hover:text-gray-500",
                "dark:hover:text-gray-400",
              ].join(" ")
          );

          const content = (
            <>
              <span
                aria-hidden="true"
                className={cn(
                  "relative flex shrink-0",
                  "items-center justify-center",
                  "transition-[transform,background-color,color]",
                  "duration-200",

                  item.featured
                    ? [
                        "h-14 w-14 rounded-full",
                        "border-4 border-white",
                        "shadow-lg",
                        "dark:border-gray-950",
                      ].join(" ")
                    : "h-8 w-10 rounded-xl",

                  item.featured &&
                    active &&
                    [
                      "bg-green-600",
                      "text-white",
                      "shadow-green-600/25",
                    ].join(" "),

                  item.featured &&
                    !active &&
                    [
                      "bg-green-600",
                      "text-white",
                      "hover:bg-green-700",
                      "shadow-green-600/20",
                    ].join(" "),

                  !item.featured &&
                    active &&
                    [
                      "bg-green-100",
                      "text-green-700",
                      "dark:bg-green-950",
                      "dark:text-green-300",
                    ].join(" "),

                  !item.featured &&
                    !active &&
                    [
                      "text-gray-500",
                      "group-hover:bg-gray-100",
                      "group-hover:text-gray-950",
                      "dark:text-gray-400",
                      "dark:group-hover:bg-gray-900",
                      "dark:group-hover:text-white",
                    ].join(" "),

                  !item.disabled &&
                    "group-active:scale-95"
                )}
              >
                <Icon
                  strokeWidth={
                    active ? 2.4 : 2
                  }
                  className={cn(
                    item.featured
                      ? "h-6 w-6"
                      : "h-5 w-5"
                  )}
                />

                {badgeVisible && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute",
                      "inline-flex min-h-4 min-w-4",
                      "items-center justify-center",
                      "rounded-full bg-red-500",
                      "px-1 text-[9px]",
                      "font-bold leading-none",
                      "text-white",
                      "ring-2 ring-white",
                      "dark:ring-gray-950",

                      item.featured
                        ? "-right-0.5 -top-0.5"
                        : "right-0 top-0"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </span>

              {showLabels && (
                <span
                  className={cn(
                    "block max-w-full truncate",
                    item.featured && "mt-0.5",
                    active
                      ? "font-semibold"
                      : "font-medium"
                  )}
                >
                  {item.label}
                </span>
              )}

              {active && (
                <>
                  {!item.featured && (
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute bottom-0",
                        "h-0.5 w-6",
                        "rounded-full",
                        "bg-green-600",
                        "dark:bg-green-400"
                      )}
                    />
                  )}

                  <span className="sr-only">
                    หน้าปัจจุบัน
                  </span>
                </>
              )}

              {item.external && (
                <span className="sr-only">
                  เปิดในแท็บใหม่
                </span>
              )}
            </>
          );

          const handleClick = (
            event: MouseEvent<HTMLAnchorElement>
          ): void => {
            if (item.disabled) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }

            onNavigate?.(item);
          };

          return (
            <li
              key={item.id}
              className="relative min-w-0"
            >
              {item.disabled ? (
                <span
                  aria-disabled="true"
                  aria-label={`${item.label} ยังไม่เปิดใช้งาน`}
                  title={`${item.description ?? item.label} — ยังไม่เปิดใช้งาน`}
                  className={itemClassName}
                >
                  {content}
                </span>
              ) : item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${item.label} เปิดในแท็บใหม่`}
                  title={
                    item.description ??
                    item.label
                  }
                  onClick={handleClick}
                  className={itemClassName}
                >
                  {content}
                </a>
              ) : (
                <Link
                  href={item.href}
                  prefetch={item.prefetch}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                  aria-label={item.label}
                  title={
                    item.description ??
                    item.label
                  }
                  onClick={handleClick}
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
  );
}
