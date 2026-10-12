"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot,
  ChartNoAxesCombined,
  CloudSun,
  Newspaper,
  ScanLine,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  MouseEventHandler,
  ReactNode,
} from "react";

/**
 * Role ที่ NavbarMenu รองรับ
 */
export type NavbarMenuRole = "user" | "admin";

/**
 * รูปแบบรายการเมนู
 */
export interface NavbarMenuItem {
  /**
   * ID ต้องไม่ซ้ำกัน
   */
  id: string;

  /**
   * ชื่อที่แสดงบน Navbar
   */
  label: string;

  /**
   * URL ปลายทาง
   */
  href: string;

  /**
   * Icon จาก lucide-react
   */
  icon?: LucideIcon;

  /**
   * คำอธิบายสำหรับ Accessibility และ Tooltip
   */
  description?: string;

  /**
   * กำหนดให้ตรงกับ URL แบบเต็มเท่านั้น
   *
   * ตัวอย่าง:
   * exact: true
   * /dashboard จะ active เฉพาะ /dashboard
   *
   * exact: false
   * /dashboard และ /dashboard/report จะ active
   */
  exact?: boolean;

  /**
   * URL เพิ่มเติมที่ต้องการให้เมนูนี้ Active
   */
  matchPaths?: string[];

  /**
   * Role ที่มองเห็นเมนูนี้
   */
  roles?: NavbarMenuRole[];

  /**
   * Badge ด้านขวาของชื่อเมนู
   */
  badge?: ReactNode;

  /**
   * ปิดการใช้งานเมนู
   */
  disabled?: boolean;

  /**
   * เปิดลิงก์ในแท็บใหม่
   */
  external?: boolean;

  /**
   * ตั้งค่าการ Prefetch ของ Next.js
   */
  prefetch?: boolean | null;
}

/**
 * Props ของ NavbarMenu
 */
export interface NavbarMenuProps
  extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  /**
   * รายการเมนู
   * ถ้าไม่ส่งมา จะใช้ DEFAULT_NAVBAR_MENU_ITEMS
   */
  items?: NavbarMenuItem[];

  /**
   * Role ของผู้ใช้ปัจจุบัน
   */
  role?: NavbarMenuRole;

  /**
   * แสดง Icon หรือไม่
   */
  showIcons?: boolean;

  /**
   * แสดงชื่อเมนูหรือไม่
   */
  showLabels?: boolean;

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนู
   */
  onNavigate?: (item: NavbarMenuItem) => void;
}

/**
 * รายการเมนูเริ่มต้นของ Rice AI Platform
 *
 * Route Group เช่น (platform) จะไม่ปรากฏใน URL
 * ดังนั้น href ใช้ /dashboard ไม่ใช่ /(platform)/dashboard
 */
const adminPortalUrl =
  process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim() || "http://localhost:3001";

export const DEFAULT_NAVBAR_MENU_ITEMS: NavbarMenuItem[] = [
  {
    id: "dashboard",
    label: "แดชบอร์ด",
    href: "/dashboard",
    icon: ChartNoAxesCombined,
    description: "วิเคราะห์ผลผลิตข้าวรายจังหวัด แผนที่ และข้อมูลวิจัย",
    matchPaths: [
      "/analytics/yield/monthly",
      "/analytics/yield/compare",
      "/analytics/yield/research",
      "/analytics/yield/about-data",
      "/analytics/yield/province",
    ],
  },
  {
    id: "disease",
    label: "ตรวจโรค",
    href: "/disease",
    icon: ScanLine,
    description: "ตรวจและจำแนกโรคข้าวด้วย AI",
    matchPaths: ["/disease/history", "/disease/predictions"],
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
      "/analytics/diseases",
    ],
  },
  {
    id: "chatbot",
    label: "แชตบอต",
    href: "/chatbot",
    icon: Bot,
    description: "ถามคำถามเกี่ยวกับการปลูกและดูแลข้าว",
  },
  {
    id: "finance",
    label: "การเงิน",
    href: "/finance",
    icon: Wallet,
    description: "จัดการรายรับ รายจ่าย และกำไรของฟาร์ม",
    matchPaths: [
      "/finance/transactions",
      "/finance/seasons",
      "/finance/reports",
    ],
  },
  {
    id: "infographic",
    label: "อินโฟกราฟิก",
    href: "/infographic",
    icon: Newspaper,
    description: "อ่านข่าวสารและความรู้เกี่ยวกับข้าว ค้นหาตามเรื่องและหมวดหมู่",
  },
  {
    id: "admin",
    label: "ผู้ดูแล",
    href: adminPortalUrl,
    icon: ShieldCheck,
    description: "เปิดระบบจัดการสำหรับผู้ดูแล",
    roles: ["admin"],
    external: true,
  },
];

/**
 * รวม Tailwind className
 */
function combineClassNames(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * ปรับ pathname ให้อยู่ในรูปแบบเดียวกัน
 *
 * /dashboard/ -> /dashboard
 * / -> /
 */
function normalizePathname(pathname: string): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const normalizedPathname = pathname.replace(/\/+$/, "");

  return normalizedPathname || "/";
}

/**
 * ตรวจสอบว่า Path ปัจจุบันตรงกับ Path ของเมนูหรือไม่
 */
export function isNavbarPathActive(
  pathname: string,
  item: NavbarMenuItem
): boolean {
  if (item.external || item.disabled) {
    return false;
  }

  const currentPath = normalizePathname(pathname);
  const itemPath = normalizePathname(item.href);

  /*
   * กรณี exact ต้องตรงกันทั้งหมด
   */
  if (item.exact) {
    return currentPath === itemPath;
  }

  /*
   * ตรวจ href หลักและ matchPaths เพิ่มเติม
   */
  const pathsToMatch = [
    itemPath,
    ...(item.matchPaths ?? []).map(normalizePathname),
  ];

  return pathsToMatch.some((path) => {
    if (path === "/") {
      return currentPath === "/";
    }

    return currentPath === path || currentPath.startsWith(`${path}/`);
  });
}

/**
 * เมนู Navigation หลักบน Desktop
 */
export default function NavbarMenu({
  items = DEFAULT_NAVBAR_MENU_ITEMS,
  role = "user",
  showIcons = true,
  showLabels = true,
  onNavigate,
  className,
  "aria-label": ariaLabel = "เมนูนำทางหลัก",
  ...navProps
}: NavbarMenuProps) {
  const pathname = usePathname();

  /**
   * กรองเมนูตาม Role
   */
  const visibleItems = items.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }

    return item.roles.includes(role);
  });

  /**
   * สร้าง Click Handler โดยไม่เรียก onNavigate
   * เมื่อเมนูถูกปิดใช้งาน
   */
  const createClickHandler = (
    item: NavbarMenuItem
  ): MouseEventHandler<HTMLAnchorElement> => {
    return () => {
      if (!item.disabled) {
        onNavigate?.(item);
      }
    };
  };

  return (
    <nav
      {...navProps}
      aria-label={ariaLabel}
      data-component="navbar-menu"
      className={combineClassNames(
        "min-w-0",
        className
      )}
    >
      <ul
        role="list"
        className={combineClassNames(
          "flex min-w-0 items-center",
          "gap-0.5 xl:gap-1"
        )}
      >
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = isNavbarPathActive(pathname, item);

          const commonClassName = combineClassNames(
            "group relative inline-flex h-10 items-center justify-center",
            "gap-1.5 whitespace-nowrap rounded-lg",
            "px-2.5 xl:px-3",
            "text-sm font-medium",
            "transition-colors duration-200",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-green-500",
            "focus-visible:ring-offset-2",
            "focus-visible:ring-offset-white",
            "dark:focus-visible:ring-offset-gray-950",

            isActive
              ? [
                  "bg-green-50 text-green-700",
                  "dark:bg-green-950/50 dark:text-green-300",
                ].join(" ")
              : [
                  "text-gray-600",
                  "hover:bg-gray-100 hover:text-gray-950",
                  "dark:text-gray-300",
                  "dark:hover:bg-gray-800 dark:hover:text-white",
                ].join(" "),

            item.disabled &&
              [
                "cursor-not-allowed opacity-50",
                "hover:bg-transparent hover:text-gray-600",
                "dark:hover:bg-transparent dark:hover:text-gray-300",
              ].join(" ")
          );

          const content = (
            <>
              {showIcons && Icon && (
                <Icon
                  aria-hidden="true"
                  className={combineClassNames(
                    "h-[18px] w-[18px] shrink-0",
                    "transition-transform duration-200",
                    !item.disabled && "group-hover:scale-105",
                    isActive
                      ? "text-green-600 dark:text-green-400"
                      : "text-gray-500 dark:text-gray-400"
                  )}
                  strokeWidth={isActive ? 2.25 : 2}
                />
              )}

              {showLabels && (
                <span className="truncate">{item.label}</span>
              )}

              {item.badge !== undefined && item.badge !== null && (
                <span
                  className={combineClassNames(
                    "ml-0.5 inline-flex min-w-5 items-center",
                    "justify-center rounded-full",
                    "bg-gray-200 px-1.5 py-0.5",
                    "text-[10px] font-semibold leading-none",
                    "text-gray-700",
                    "dark:bg-gray-700 dark:text-gray-100"
                  )}
                >
                  {item.badge}
                </span>
              )}

              {isActive && (
                <>
                  <span
                    aria-hidden="true"
                    className={combineClassNames(
                      "absolute inset-x-2 -bottom-[13px]",
                      "h-0.5 rounded-full bg-green-600",
                      "dark:bg-green-400"
                    )}
                  />

                  <span className="sr-only">
                    หน้าปัจจุบัน
                  </span>
                </>
              )}
            </>
          );

          return (
            <li key={item.id} className="shrink-0">
              {item.disabled ? (
                <span
                  aria-disabled="true"
                  title={`${item.description ?? item.label} — ยังไม่เปิดใช้งาน`}
                  className={commonClassName}
                >
                  {content}
                </span>
              ) : item.external ? (
                <a
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={item.description}
                  aria-label={`${item.label} เปิดในแท็บใหม่`}
                  className={commonClassName}
                  onClick={createClickHandler(item)}
                >
                  {content}

                  <span className="sr-only">
                    เปิดในแท็บใหม่
                  </span>
                </a>
              ) : (
                <Link
                  href={item.href}
                  prefetch={item.prefetch}
                  title={item.description}
                  aria-current={isActive ? "page" : undefined}
                  className={commonClassName}
                  onClick={createClickHandler(item)}
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
