import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { BRAND_LOGO_SRC } from "@/lib/brand-logo";

export interface FooterProps
  extends Omit<ComponentPropsWithoutRef<"footer">, "children"> {
  brandName?: string;
  description?: ReactNode;
  showCTA?: boolean;
  ctaHeading?: ReactNode;
  ctaDescription?: ReactNode;
  ctaHref?: string;
  ctaLabel?: string;
}

const FOOTER_GROUPS = [
  {
    id: "tools",
    title: "เครื่องมือใน SmartRiceHub",
    links: [
      { label: "แดชบอร์ดผลผลิตข้าว", href: "/dashboard" },
      { label: "ตรวจโรคข้าวจากภาพ", href: "/disease" },
      { label: "สภาพอากาศ", href: "/analytics/weather" },
      { label: "แชตบอต", href: "/chatbot" },
      { label: "บันทึกรายรับและรายจ่าย", href: "/finance" },
      { label: "ข่าวสารและอินโฟกราฟิก", href: "/infographic" },
    ],
  },
  {
    id: "getting-started",
    title: "เริ่มต้นใช้งาน",
    links: [
      { label: "รู้จักเครื่องมือทั้งหมด", href: "/#home-features" },
      { label: "วิธีใช้งาน", href: "/#how-it-works" },
      { label: "เข้าสู่ระบบ", href: "/login" },
      { label: "บัญชีของฉัน", href: "/profile" },
    ],
  },
];

const FOCUS_STYLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#527953] focus-visible:ring-offset-4 focus-visible:ring-offset-[#faf9f6]";

export default function Footer({
  id = "site-footer",
  brandName = "SmartRiceHub",
  description = "ข้อมูลผลผลิตข้าว การตรวจโรคจากภาพ สภาพอากาศ และเครื่องมือบันทึกการเงินสำหรับผู้ปลูกข้าว ในที่เดียว",
  showCTA = false,
  ctaHeading = "เริ่มต้นด้วยภาพใบข้าวของคุณ",
  ctaDescription = "อัปโหลดภาพเพื่อดูผลคาดการณ์โรคข้าวและระดับความมั่นใจจาก AI",
  ctaHref = "/disease",
  ctaLabel = "เริ่มตรวจโรคข้าว",
  className,
  ...footerProps
}: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer
      {...footerProps}
      id={id}
      data-component="site-footer"
      className={`border-t border-[#e1e6dc] bg-[#faf9f6] text-[#0b2e1c] ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        {showCTA && (
          <div className="mt-10 flex flex-col gap-5 rounded-2xl border border-[#e1e6dc] bg-white p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#0b2e1c]">
                {ctaHeading}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#5b6a61]">
                {ctaDescription}
              </p>
            </div>
            <Link
              href={ctaHref}
              className={`inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#0b2e1c] px-5 text-sm font-semibold text-white transition-colors hover:bg-[#244b35] ${FOCUS_STYLE}`}
            >
              {ctaLabel}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )}

        <div className="grid gap-9 py-10 sm:py-12 lg:grid-cols-[1.2fr_1.5fr] lg:gap-20">
          <div className="max-w-sm">
            <Link
              href="/"
              aria-label={`กลับไปหน้าแรก ${brandName}`}
              className={`inline-flex items-center gap-3 rounded-lg ${FOCUS_STYLE}`}
            >
              <Image
                src={BRAND_LOGO_SRC}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
              <span className="font-heading text-xl font-bold tracking-tight text-[#0b2e1c]">
                {brandName}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-7 text-[#5b6a61]">
              {description}
            </p>
          </div>

          <nav
            aria-label="ลิงก์ส่วนท้ายเว็บไซต์"
            className="grid grid-cols-2 gap-6 sm:gap-10"
          >
            {FOOTER_GROUPS.map((group) => (
              <div key={group.id}>
                <h2 className="text-sm font-semibold text-[#0b2e1c]">
                  {group.title}
                </h2>
                <ul className="mt-3 space-y-1">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className={`group inline-flex min-h-10 items-center gap-1 rounded text-sm leading-6 text-[#5b6a61] transition-colors hover:text-[#0b2e1c] ${FOCUS_STYLE}`}
                      >
                        {link.label}
                        <ArrowUpRight
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#e1e6dc] py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-6 text-[#69756d]">
            © {currentYear} {brandName}. สงวนลิขสิทธิ์
          </p>
          <Link
            href="/#home-hero"
            className={`inline-flex min-h-10 w-fit items-center gap-2 rounded text-xs font-medium text-[#52675a] hover:text-[#0b2e1c] ${FOCUS_STYLE}`}
          >
            กลับไปด้านบนหน้าแรก
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5 -rotate-90" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
