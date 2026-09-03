"use client";

import {
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import {
  CloudSun,
  FileImage,
  LayoutDashboard,
  ScanSearch,
  ShieldCheck,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import SidebarMenuItem from "./SidebarMenuItem";

export type SidebarMenuRole = "user" | "admin";

export interface SidebarMenuEntry {
  /**
   * ID ของรายการ ต้องไม่ซ้ำกัน
   */
  id: string;

  /**
   * ชื่อที่แสดงในเมนู
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
   * คำอธิบายเพิ่มเติม
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
   * สิทธิ์ที่สามารถเห็นเมนูนี้
   */
  roles?: SidebarMenuRole[];

  /**
   * Badge เช่น New หรือจำนวนรายการ
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
   * กำหนด Next.js prefetch
   */
  prefetch?: boolean | null;
}

export interface SidebarMenuSection {
  /**
   * ID ของกลุ่มเมนู ต้องไม่ซ้ำกัน
   */
  id: string;

  /**
   * ชื่อกลุ่มเมนู
   */
  label?: string;

  /**
   * รายการภายในกลุ่ม
   */
  items: SidebarMenuEntry[];
}

export interface SidebarMenuProps
  extends Omit<ComponentPropsWithoutRef<"nav">, "children"> {
  /**
   * กลุ่มรายการเมนู
   */
  sections?: SidebarMenuSection[];

  /**
   * Role ของผู้ใช้ปัจจุบัน
   */
  role?: SidebarMenuRole;

  /**
   * Sidebar อยู่ในสถานะย่อหรือไม่
   */
  collapsed?: boolean;

  /**
   * Pathname สำหรับทดสอบหรือควบคุมจากภายนอก
   *
   * ถ้าไม่ส่งมา จะใช้ usePathname()
   */
  pathname?: string;

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนู
   */
  onNavigate?: (item: SidebarMenuEntry) => void;

  /**
   * เรียกกำหนด Active Route แบบกำหนดเอง
   */
  isItemActive?: (
    pathname: string,
    item: SidebarMenuEntry
  ) => boolean;

  /**
   * แสดงคำอธิบายใต้ชื่อเมนู
   */
  showDescriptions?: boolean;

  /**
   * แสดง Badge
   */
  showBadges?: boolean;

  /**
   * แสดงเส้นแบ่งระหว่าง Section ตอน Sidebar ย่อ
   */
  showCollapsedSectionSeparators?: boolean;

  /**
   * เนื้อหาเมื่อไม่มีเมนูที่สามารถแสดงได้
   */
  emptyContent?: ReactNode;
}

const adminPortalUrl =
  process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim() || "http://localhost:3001";

export const DEFAULT_SIDEBAR_MENU_SECTIONS: SidebarMenuSection[] = [
  {
    id: "main",
    label: "เมนูหลัก",
    items: [
      {
        id: "dashboard",
        label: "แดชบอร์ด",
        href: "/dashboard",
        icon: LayoutDashboard,
        description: "ดูภาพรวมข้อมูลและสถิติ",
      },
      {
        id: "disease",
        label: "ตรวจโรคข้าว",
        href: "/disease",
        icon: ScanSearch,
        description: "วิเคราะห์ภาพโรคข้าวด้วย AI",
        matchPaths: [
          "/disease/history",
          "/disease/predictions",
        ],
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
          "/analytics/yield",
          "/analytics/diseases",
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
        label: "อินโฟกราฟิก",
        href: "/infographic",
        icon: FileImage,
        description: "สร้างรายงานและอินโฟกราฟิก",
      },
    ],
  },
  {
    id: "management",
    label: "การจัดการ",
    items: [
      {
        id: "admin",
        label: "ผู้ดูแลระบบ",
        href: adminPortalUrl,
        icon: ShieldCheck,
        description: "เปิดระบบจัดการผู้ใช้และข้อมูล",
        roles: ["admin"],
        external: true,
      },
    ],
  },
];

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * ปรับ Pathname ให้อยู่ในรูปแบบเดียวกัน
 *
 * /dashboard/ จะกลายเป็น /dashboard
 */
export function normalizeSidebarPathname(
  pathname: string
): string {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const normalizedPathname = pathname.replace(/\/+$/, "");

  return normalizedPathname || "/";
}

/**
 * ตรวจสอบว่าเมนูตรงกับ Pathname ปัจจุบันหรือไม่
 */
export function isSidebarMenuPathActive(
  pathname: string,
  item: SidebarMenuEntry
): boolean {
  if (item.disabled || item.external) {
    return false;
  }

  const currentPath =
    normalizeSidebarPathname(pathname);

  const itemPath =
    normalizeSidebarPathname(item.href);

  if (item.exact) {
    return currentPath === itemPath;
  }

  const matchablePaths = [
    itemPath,
    ...(item.matchPaths ?? []).map(
      normalizeSidebarPathname
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

/**
 * กรอง Section และรายการเมนูตาม Role
 */
export function filterSidebarSectionsByRole(
  sections: SidebarMenuSection[],
  role: SidebarMenuRole
): SidebarMenuSection[] {
  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) {
          return true;
        }

        return item.roles.includes(role);
      }),
    }))
    .filter((section) => section.items.length > 0);
}

export default function SidebarMenu({
  sections = DEFAULT_SIDEBAR_MENU_SECTIONS,
  role = "user",
  collapsed = false,
  pathname: providedPathname,
  onNavigate,
  isItemActive = isSidebarMenuPathActive,
  showDescriptions = true,
  showBadges = true,
  showCollapsedSectionSeparators = true,
  emptyContent,
  className,
  "aria-label": ariaLabel = "เมนูหลัก",
  ...navProps
}: SidebarMenuProps) {
  const currentPathname = usePathname();
  const generatedId = useId().replace(/:/g, "");

  const pathname =
    providedPathname ?? currentPathname ?? "/";

  const visibleSections = useMemo(() => {
    return filterSidebarSectionsByRole(
      sections,
      role
    );
  }, [sections, role]);

  if (visibleSections.length === 0) {
    if (!emptyContent) {
      return null;
    }

    return (
      <nav
        {...navProps}
        aria-label={ariaLabel}
        data-component="sidebar-menu"
        data-empty="true"
        data-collapsed={collapsed ? "true" : "false"}
        className={cn("w-full", className)}
      >
        {emptyContent}
      </nav>
    );
  }

  return (
    <nav
      {...navProps}
      aria-label={ariaLabel}
      data-component="sidebar-menu"
      data-empty="false"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn("w-full", className)}
    >
      {visibleSections.map((section, sectionIndex) => {
        const sectionTitleId =
          `sidebar-section-${generatedId}-${section.id}`;

        const showSeparator =
          collapsed &&
          showCollapsedSectionSeparators &&
          sectionIndex > 0;

        return (
          <section
            key={section.id}
            aria-labelledby={
              section.label && !collapsed
                ? sectionTitleId
                : undefined
            }
            data-component="sidebar-menu-section"
            data-section-id={section.id}
            className={cn(
              sectionIndex > 0 &&
                !collapsed &&
                "mt-6",

              showSeparator && [
                "mt-3 border-t",
                "border-gray-200 pt-3",
                "dark:border-gray-800",
              ].join(" ")
            )}
          >
            {section.label && !collapsed && (
              <h2
                id={sectionTitleId}
                className={cn(
                  "mb-2 px-3",
                  "text-[11px] font-semibold",
                  "uppercase tracking-wider",
                  "text-gray-400",
                  "dark:text-gray-500"
                )}
              >
                {section.label}
              </h2>
            )}

            <ul
              role="list"
              aria-label={
                collapsed
                  ? section.label
                  : undefined
              }
              className="space-y-1"
            >
              {section.items.map((item) => {
                const active = isItemActive(
                  pathname,
                  item
                );

                return (
                  <SidebarMenuItem
                    key={item.id}
                    item={item}
                    active={active}
                    collapsed={collapsed}
                    showDescription={
                      showDescriptions
                    }
                    showBadge={showBadges}
                    onNavigate={onNavigate}
                  />
                );
              })}
            </ul>
          </section>
        );
      })}
    </nav>
  );
}
