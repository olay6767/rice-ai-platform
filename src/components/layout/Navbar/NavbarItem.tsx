"use client";

import Link from "next/link";
import type {
  ComponentPropsWithoutRef,
  KeyboardEvent,
  MouseEvent,
  ReactNode,
} from "react";
import type { LucideIcon } from "lucide-react";

export type NavbarItemRole = "user" | "admin";

export interface NavbarItemData {
  /**
   * รหัสประจำเมนู ต้องไม่ซ้ำกัน
   */
  id: string;

  /**
   * ข้อความที่แสดงบนเมนู
   */
  label: string;

  /**
   * URL ปลายทาง
   */
  href: string;

  /**
   * ไอคอนจาก lucide-react
   */
  icon?: LucideIcon;

  /**
   * คำอธิบายเมนู
   */
  description?: string;

  /**
   * ตรวจเส้นทางแบบตรงทั้งหมด
   */
  exact?: boolean;

  /**
   * เส้นทางอื่นที่นับว่าเมนูนี้กำลัง Active
   */
  matchPaths?: string[];

  /**
   * สิทธิ์ที่สามารถเห็นเมนู
   */
  roles?: NavbarItemRole[];

  /**
   * Badge เช่น New หรือจำนวนแจ้งเตือน
   */
  badge?: ReactNode;

  /**
   * ปิดการใช้งานเมนู
   */
  disabled?: boolean;

  /**
   * เปิด URL ในแท็บใหม่
   */
  external?: boolean;

  /**
   * เปิดหรือปิด Next.js prefetch
   */
  prefetch?: boolean | null;
}

export interface NavbarItemProps
  extends Omit<ComponentPropsWithoutRef<"li">, "children"> {
  /**
   * ข้อมูลรายการเมนู
   */
  item: NavbarItemData;

  /**
   * เมนูปัจจุบันกำลัง Active หรือไม่
   */
  active?: boolean;

  /**
   * แสดงไอคอน
   */
  showIcon?: boolean;

  /**
   * แสดงชื่อเมนู
   */
  showLabel?: boolean;

  /**
   * แสดงเส้น Active ด้านล่าง
   */
  showActiveIndicator?: boolean;

  /**
   * รูปแบบเมนู
   */
  variant?: "default" | "compact";

  /**
   * เรียกเมื่อผู้ใช้เลือกเมนู
   */
  onNavigate?: (item: NavbarItemData) => void;
}

function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

export default function NavbarItem({
  item,
  active = false,
  showIcon = true,
  showLabel = true,
  showActiveIndicator = true,
  variant = "default",
  onNavigate,
  className,
  ...listItemProps
}: NavbarItemProps) {
  const Icon = item.icon;

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

  const handleKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>
  ): void => {
    if (!item.disabled) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const itemClassName = cn(
    "group relative inline-flex items-center justify-center",
    "whitespace-nowrap rounded-lg font-medium",
    "transition-colors duration-200",

    variant === "compact"
      ? "h-9 gap-1 px-2 text-xs"
      : "h-10 gap-1.5 px-2.5 text-sm xl:px-3",

    "focus-visible:outline-none",
    "focus-visible:ring-2",
    "focus-visible:ring-green-500",
    "focus-visible:ring-offset-2",
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
          "dark:hover:bg-gray-800 dark:hover:text-white",
        ].join(" "),

    item.disabled &&
      [
        "cursor-not-allowed opacity-50",
        "hover:bg-transparent hover:text-gray-600",
        "dark:hover:bg-transparent",
        "dark:hover:text-gray-300",
      ].join(" ")
  );

  const content = (
    <>
      {showIcon && Icon && (
        <Icon
          aria-hidden="true"
          strokeWidth={active ? 2.25 : 2}
          className={cn(
            "shrink-0 transition-transform duration-200",

            variant === "compact"
              ? "h-4 w-4"
              : "h-[18px] w-[18px]",

            !item.disabled && "group-hover:scale-105",

            active
              ? "text-green-600 dark:text-green-400"
              : "text-gray-500 dark:text-gray-400"
          )}
        />
      )}

      {showLabel && (
        <span className="max-w-28 truncate">
          {item.label}
        </span>
      )}

      {item.badge !== undefined && item.badge !== null && (
        <span
          aria-label={`ข้อมูลเพิ่มเติม ${String(item.badge)}`}
          className={cn(
            "ml-0.5 inline-flex min-w-5 items-center",
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

      {active && showActiveIndicator && (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-x-2 -bottom-[13px]",
            "h-0.5 rounded-full",
            "bg-green-600 dark:bg-green-400"
          )}
        />
      )}

      {active && (
        <span className="sr-only">
          หน้าปัจจุบัน
        </span>
      )}

      {item.external && (
        <span className="sr-only">
          เปิดในแท็บใหม่
        </span>
      )}
    </>
  );

  return (
    <li
      {...listItemProps}
      data-component="navbar-item"
      data-active={active ? "true" : "false"}
      data-disabled={item.disabled ? "true" : "false"}
      className={cn("shrink-0", className)}
    >
      {item.external ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={
            item.disabled
              ? `${item.label} ยังไม่เปิดใช้งาน`
              : `${item.label} เปิดในแท็บใหม่`
          }
          aria-current={active ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          tabIndex={item.disabled ? -1 : undefined}
          title={item.description ?? item.label}
          className={itemClassName}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {content}
        </a>
      ) : (
        <Link
          href={item.href}
          prefetch={item.prefetch}
          aria-label={
            item.disabled
              ? `${item.label} ยังไม่เปิดใช้งาน`
              : item.label
          }
          aria-current={active ? "page" : undefined}
          aria-disabled={item.disabled || undefined}
          tabIndex={item.disabled ? -1 : undefined}
          title={item.description ?? item.label}
          className={itemClassName}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        >
          {content}
        </Link>
      )}
    </li>
  );
}