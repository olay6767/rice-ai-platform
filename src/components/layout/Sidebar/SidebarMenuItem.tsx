"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  MouseEvent,
  ReactNode,
} from "react";

import type { SidebarMenuEntry } from "./SidebarMenu";

export interface SidebarMenuItemProps
  extends Omit<ComponentPropsWithoutRef<"li">, "children"> {
  /**
   * ข้อมูลรายการเมนู
   */
  item: SidebarMenuEntry;

  /**
   * เมนูตรงกับหน้าปัจจุบันหรือไม่
   */
  active?: boolean;

  /**
   * Sidebar อยู่ในสถานะย่อหรือไม่
   */
  collapsed?: boolean;

  /**
   * แสดงคำอธิบายใต้ชื่อเมนู
   */
  showDescription?: boolean;

  /**
   * แสดง Badge
   */
  showBadge?: boolean;

  /**
   * แสดงแถบสถานะ Active ด้านซ้าย
   */
  showActiveIndicator?: boolean;

  /**
   * แสดงไอคอน External Link
   */
  showExternalIcon?: boolean;

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนู
   */
  onNavigate?: (item: SidebarMenuEntry) => void;

  /**
   * เนื้อหาเพิ่มเติมด้านขวาของเมนู
   */
  trailingContent?: ReactNode;
}

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * ตรวจสอบว่า Badge สามารถแสดงได้หรือไม่
 */
function hasBadgeValue(badge: ReactNode): boolean {
  return badge !== undefined && badge !== null && badge !== false;
}

/**
 * Sidebar menu item สำหรับใช้งานร่วมกับ SidebarMenu
 */
export default function SidebarMenuItem({
  item,
  active = false,
  collapsed = false,
  showDescription = true,
  showBadge = true,
  showActiveIndicator = true,
  showExternalIcon = true,
  onNavigate,
  trailingContent,
  className,
  ...listItemProps
}: SidebarMenuItemProps) {
  const Icon = item.icon;

  const isDisabled = Boolean(item.disabled);
  const isExternal = Boolean(item.external);
  const badgeVisible =
    showBadge && hasBadgeValue(item.badge);

  const accessibleLabel = collapsed
    ? item.description
      ? `${item.label}: ${item.description}`
      : item.label
    : undefined;

  const tooltipText = collapsed
    ? item.description
      ? `${item.label} — ${item.description}`
      : item.label
    : item.disabled
      ? `${item.label} — ยังไม่เปิดใช้งาน`
      : item.description;

  const handleNavigate = (
    event: MouseEvent<HTMLAnchorElement>
  ): void => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onNavigate?.(item);
  };

  const content = (
    <>
      {/* Icon */}
      <span
        aria-hidden="true"
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center",
          "rounded-lg transition-colors duration-200",

          active
            ? [
                "bg-green-100 text-green-700",
                "dark:bg-green-900/60 dark:text-green-300",
              ].join(" ")
            : [
                "text-gray-500",
                "group-hover:bg-gray-200/70",
                "group-hover:text-gray-800",
                "dark:text-gray-400",
                "dark:group-hover:bg-gray-800",
                "dark:group-hover:text-gray-100",
              ].join(" ")
        )}
      >
        <Icon
          className="h-5 w-5"
          strokeWidth={active ? 2.25 : 2}
        />
      </span>

      {/* Label และ Description */}
      {!collapsed && (
        <span className="min-w-0 flex-1">
          <span className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 flex-1 truncate">
              {item.label}
            </span>

            {badgeVisible && (
              <span
                data-slot="sidebar-menu-badge"
                className={cn(
                  "inline-flex min-w-5 shrink-0 items-center",
                  "justify-center rounded-full px-1.5 py-0.5",
                  "text-[10px] font-semibold leading-none",

                  active
                    ? [
                        "bg-green-200 text-green-800",
                        "dark:bg-green-800 dark:text-green-100",
                      ].join(" ")
                    : [
                        "bg-gray-200 text-gray-700",
                        "dark:bg-gray-700 dark:text-gray-100",
                      ].join(" ")
                )}
              >
                {item.badge}
              </span>
            )}
          </span>

          {showDescription && item.description && (
            <span
              className={cn(
                "mt-0.5 block truncate text-xs font-normal",

                active
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
      )}

      {/* Badge ในโหมด Sidebar ย่อ */}
      {collapsed && badgeVisible && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute right-1 top-1",
            "inline-flex min-h-4 min-w-4 items-center",
            "justify-center rounded-full px-1",
            "bg-red-500 text-[9px] font-bold",
            "leading-none text-white",
            "ring-2 ring-white",
            "dark:ring-gray-950"
          )}
        >
          {item.badge}
        </span>
      )}

      {/* Trailing content */}
      {!collapsed && trailingContent && (
        <span
          data-slot="sidebar-menu-trailing"
          className="flex shrink-0 items-center"
        >
          {trailingContent}
        </span>
      )}

      {/* External link icon */}
      {!collapsed &&
        isExternal &&
        showExternalIcon &&
        !trailingContent && (
          <ExternalLink
            aria-hidden="true"
            className={cn(
              "h-4 w-4 shrink-0",
              active
                ? "text-green-500 dark:text-green-400"
                : "text-gray-400 dark:text-gray-500"
            )}
          />
        )}

      {/* Active indicator */}
      {active && showActiveIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute left-0 top-1/2",
            "h-6 w-1 -translate-y-1/2",
            "rounded-r-full",
            "bg-green-600 dark:bg-green-400"
          )}
        />
      )}

      {active && <span className="sr-only">หน้าปัจจุบัน</span>}

      {isExternal && (
        <span className="sr-only">เปิดในแท็บใหม่</span>
      )}
    </>
  );

  const itemClassName = cn(
    "group relative flex min-h-11 w-full items-center",
    "rounded-xl text-sm font-medium",
    "transition-colors duration-200",

    collapsed
      ? "justify-center px-1.5"
      : "gap-2.5 px-3 py-2",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-green-500",
    "focus-visible:ring-offset-1",
    "focus-visible:ring-offset-white",
    "dark:focus-visible:ring-offset-gray-950",

    active
      ? [
          "bg-green-50 text-green-700",
          "dark:bg-green-950/50 dark:text-green-300",
        ].join(" ")
      : [
          "text-gray-600",
          "hover:bg-gray-100 hover:text-gray-950",
          "dark:text-gray-300",
          "dark:hover:bg-gray-900 dark:hover:text-white",
        ].join(" "),

    isDisabled && [
      "cursor-not-allowed opacity-50",
      "hover:bg-transparent hover:text-gray-600",
      "dark:hover:bg-transparent dark:hover:text-gray-300",
    ].join(" ")
  );

  return (
    <li
      {...listItemProps}
      data-component="sidebar-menu-item"
      data-item-id={item.id}
      data-active={active ? "true" : "false"}
      data-collapsed={collapsed ? "true" : "false"}
      data-disabled={isDisabled ? "true" : "false"}
      data-external={isExternal ? "true" : "false"}
      className={cn("relative", className)}
    >
      {isDisabled ? (
        <span
          aria-disabled="true"
          aria-label={accessibleLabel ?? item.label}
          title={tooltipText}
          className={itemClassName}
        >
          {content}
        </span>
      ) : isExternal ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            accessibleLabel
              ? `${accessibleLabel} เปิดในแท็บใหม่`
              : `${item.label} เปิดในแท็บใหม่`
          }
          title={tooltipText}
          onClick={handleNavigate}
          className={itemClassName}
        >
          {content}
        </a>
      ) : (
        <Link
          href={item.href}
          prefetch={item.prefetch}
          aria-current={active ? "page" : undefined}
          aria-label={accessibleLabel}
          title={tooltipText}
          onClick={handleNavigate}
          className={itemClassName}
        >
          {content}
        </Link>
      )}
    </li>
  );
}