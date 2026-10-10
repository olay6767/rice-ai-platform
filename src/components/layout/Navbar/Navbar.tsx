"use client";

import {
  useCallback,
  useId,
  useState,
  type ComponentPropsWithoutRef,
} from "react";
import NavbarActions, {
  type NavbarSearchVisibility,
} from "./NavbarActions";
import NavbarLogo from "./NavbarLogo";
import NavbarMenu from "./NavbarMenu";
import NavbarMobile from "./NavbarMobile";

/**
 * Role ที่ระบบรองรับ
 */
export type NavbarUserRole = "user" | "admin";

/**
 * ข้อมูลผู้ใช้ที่ Navbar ต้องใช้
 *
 * ในอนาคตสามารถนำข้อมูลจาก Supabase profiles
 * มาแปลงให้อยู่ในรูปแบบนี้ได้
 */
export interface NavbarUser {
  id: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role?: NavbarUserRole;
}

/**
 * Props หลักของ Navbar
 */
export interface NavbarProps
  extends Omit<ComponentPropsWithoutRef<"header">, "children"> {
  /**
   * ข้อมูลผู้ใช้ปัจจุบัน
   *
   * null หมายถึงยังไม่ได้เข้าสู่ระบบ
   */
  user?: NavbarUser | null;

  /**
   * จำนวนการแจ้งเตือนที่ยังไม่ได้อ่าน
   */
  unreadNotificationCount?: number;

  /**
   * ฟังก์ชันออกจากระบบ
   *
   * สามารถส่ง Supabase signOut เข้ามาได้
   */
  onSignOut?: () => void | Promise<void>;

  /**
   * แสดงช่องค้นหา
   */
  showSearch?: boolean;

  /**
   * กำหนด Responsive ของช่องค้นหา
   */
  searchVisibility?: NavbarSearchVisibility;

  /**
   * แสดงปุ่มแจ้งเตือน
   */
  showNotifications?: boolean;

  /**
   * แสดงข้อมูลโปรไฟล์
   */
  showProfile?: boolean;

  /**
   * แสดงเส้นคั่นก่อนโปรไฟล์
   */
  showProfileSeparator?: boolean;

  /**
   * แสดงเมนู Navigation บน Desktop
   */
  showDesktopMenu?: boolean;

  /**
   * แสดงปุ่มเมนูบน Mobile
   */
  showMobileMenu?: boolean;

  /**
   * กำหนดความกว้างสูงสุดของ Navbar
   */
  fluid?: boolean;
}

/**
 * รวม Tailwind className
 */
function cn(
  ...classNames: Array<string | null | undefined | false>
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * ป้องกันจำนวน Notification ผิดรูปแบบ
 */
function normalizeNotificationCount(count: number): number {
  if (!Number.isFinite(count)) {
    return 0;
  }

  return Math.max(0, Math.floor(count));
}

/**
 * Navbar หลักของ Rice AI Platform
 */
export default function Navbar({
  user = null,
  unreadNotificationCount = 0,
  onSignOut,

  showSearch = true,
  searchVisibility = "wide",
  showNotifications = true,
  showProfile = true,
  showProfileSeparator = true,
  showDesktopMenu = true,
  showMobileMenu = true,

  fluid = false,

  className,
  "aria-label": ariaLabel = "แถบนำทางหลัก",
  ...headerProps
}: NavbarProps) {
  const generatedId = useId();

  /**
   * useId อาจมีเครื่องหมาย :
   * จึงลบออกก่อนนำไปใช้เป็น HTML id
   */
  const mobileNavigationId = `navbar-mobile-${generatedId.replace(
    /:/g,
    ""
  )}`;

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const safeNotificationCount =
    normalizeNotificationCount(
      unreadNotificationCount
    );

  const userRole: NavbarUserRole =
    user?.role ?? "user";

  /**
   * เปลี่ยนสถานะเมนูมือถือ
   */
  const handleMobileMenuChange = useCallback(
    (open: boolean) => {
      setIsMobileMenuOpen(open);
    },
    []
  );

  return (
    <header
      {...headerProps}
      aria-label={ariaLabel}
      data-component="navbar"
      data-mobile-menu-open={
        isMobileMenuOpen ? "true" : "false"
      }
      className={cn(
        "sticky top-0 z-50 w-full",
        "border-b border-gray-200/80",
        "bg-white/95 shadow-sm",
        "backdrop-blur-md",
        "supports-[backdrop-filter]:bg-white/80",

        "dark:border-gray-800/80",
        "dark:bg-gray-950/95",
        "dark:supports-[backdrop-filter]:bg-gray-950/80",

        className
      )}
    >
      <div
        className={cn(
          "flex h-16 w-full items-center",
          "justify-between gap-2",
          "px-3 sm:px-4 lg:px-6 xl:px-8",

          !fluid &&
            "mx-auto max-w-screen-2xl"
        )}
      >
        {/* Left section */}
        <div
          className={cn(
            "flex min-w-0 shrink-0",
            "items-center gap-1 sm:gap-2"
          )}
        >
          {showMobileMenu && (
            <NavbarMobile
              id={mobileNavigationId}
              open={isMobileMenuOpen}
              onOpenChange={
                handleMobileMenuChange
              }
              user={user}
              notificationCount={
                safeNotificationCount
              }
              onSignOut={onSignOut}
              showNotifications={
                showNotifications
              }
              showUserSection={showProfile}
            />
          )}

          <NavbarLogo />
        </div>

        {/* Desktop navigation */}
        {showDesktopMenu && (
          <div
            className={cn(
              "hidden min-w-0 flex-1",
              "items-center justify-center",
              "px-3 lg:flex xl:px-6"
            )}
          >
            <NavbarMenu role={userRole} />
          </div>
        )}

        {/* Right actions */}
        <NavbarActions
          user={user}
          unreadNotificationCount={
            safeNotificationCount
          }
          onSignOut={onSignOut}
          showSearch={showSearch}
          searchVisibility={searchVisibility}
          showNotifications={
            showNotifications
          }
          showProfile={showProfile}
          showProfileSeparator={
            showProfileSeparator
          }
        />
      </div>

      {/* Accessibility live status */}
      <span
        id={`${mobileNavigationId}-status`}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isMobileMenuOpen
          ? "เปิดเมนูนำทางบนโทรศัพท์แล้ว"
          : "ปิดเมนูนำทางบนโทรศัพท์แล้ว"}
      </span>
    </header>
  );
}
