import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Bot,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

export interface FooterProps
  extends Omit<
    ComponentPropsWithoutRef<"footer">,
    "children"
  > {
  /**
   * ชื่อแบรนด์
   */
  brandName?: string;

  /**
   * คำอธิบายแบรนด์
   */
  description?: ReactNode;

  /**
   * เปิดหรือปิด CTA ด้านบน Footer
   */
  showCTA?: boolean;

  /**
   * หัวข้อ CTA
   */
  ctaHeading?: ReactNode;

  /**
   * คำอธิบาย CTA
   */
  ctaDescription?: ReactNode;

  /**
   * ลิงก์ปุ่ม CTA
   */
  ctaHref?: string;

  /**
   * ข้อความปุ่ม CTA
   */
  ctaLabel?: string;
}

interface FooterLinkItem {
  id: string;
  label: string;
  href: string;
}

interface FooterGroup {
  id: string;
  title: string;
  links: FooterLinkItem[];
}

interface FooterHighlight {
  id: string;
  label: string;
  icon: LucideIcon;
}

const FOOTER_GROUPS: FooterGroup[] = [
  {
    id: "platform",
    title: "แพลตฟอร์ม",
    links: [
      {
        id: "disease",
        label: "ตรวจโรคข้าว",
        href: "/disease",
      },
      {
        id: "farms",
        label: "จัดการแปลงนา",
        href: "/farms",
      },
      {
        id: "history",
        label: "ประวัติการตรวจ",
        href: "/history",
      },
      {
        id: "finance",
        label: "รายรับและรายจ่าย",
        href: "/finance",
      },
    ],
  },
  {
    id: "learn",
    title: "เรียนรู้เพิ่มเติม",
    links: [
      {
        id: "features",
        label: "ความสามารถของระบบ",
        href: "/#home-features",
      },
      {
        id: "how-it-works",
        label: "ขั้นตอนการใช้งาน",
        href: "/#how-it-works",
      },
      {
        id: "get-started",
        label: "เริ่มต้นใช้งาน",
        href: "/#home-cta",
      },
      {
        id: "about",
        label: "เกี่ยวกับ Rice AI",
        href: "/about",
      },
    ],
  },
  {
    id: "information",
    title: "ข้อมูลและการช่วยเหลือ",
    links: [
      {
        id: "contact",
        label: "ติดต่อทีมงาน",
        href: "/contact",
      },
      {
        id: "privacy",
        label: "นโยบายความเป็นส่วนตัว",
        href: "/privacy",
      },
      {
        id: "terms",
        label: "ข้อกำหนดการใช้งาน",
        href: "/terms",
      },
      {
        id: "help",
        label: "ศูนย์ช่วยเหลือ",
        href: "/help",
      },
    ],
  },
];

const FOOTER_HIGHLIGHTS: FooterHighlight[] = [
  {
    id: "rice-focused",
    label: "ออกแบบสำหรับการจัดการนาข้าว",
    icon: Wheat,
  },
  {
    id: "structured-data",
    label: "จัดเก็บข้อมูลอย่างเป็นระบบ",
    icon: ShieldCheck,
  },
  {
    id: "mobile-ready",
    label: "รองรับการใช้งานบนมือถือ",
    icon: Sprout,
  },
];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function FooterNavLink({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="
        group inline-flex min-h-8
        items-center gap-1.5
        text-sm text-white/55
        transition-colors duration-300
        hover:text-rice-mint
        focus-visible:rounded-md
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-rice-mint
        focus-visible:ring-offset-2
        focus-visible:ring-offset-rice-dark
      "
    >
      <span>{label}</span>

      <ArrowUpRight
        aria-hidden="true"
        className="
          h-3.5 w-3.5
          translate-y-0.5
          opacity-0
          transition-[opacity,transform]
          duration-300
          group-hover:translate-x-0.5
          group-hover:translate-y-0
          group-hover:opacity-100
        "
      />
    </Link>
  );
}

/**
 * Footer หลักของ Rice AI
 *
 * สามารถใช้ซ้ำได้ทุกหน้าโดยนำไปวางใน RootLayout
 * หรือ AppLayout
 */
export default function Footer({
  id = "site-footer",

  brandName = "Rice AI Platform",

  description = (
    <>
      แพลตฟอร์มเกษตรอัจฉริยะสำหรับวิเคราะห์โรคข้าว
      จัดการข้อมูลแปลงนา และติดตามประวัติการดูแล
      ให้อยู่ในที่เดียว
    </>
  ),

  showCTA = true,

  ctaHeading = (
    <>
      เริ่มดูแลแปลงนา
      <span className="text-rice-mint">
        {" "}
        ด้วยข้อมูลที่เป็นระบบ
      </span>
    </>
  ),

  ctaDescription = (
    <>
      เพิ่มข้อมูลแปลงนาและเริ่มตรวจโรคข้าวจากภาพ
      เพื่อสร้างประวัติการดูแลที่สามารถติดตามย้อนหลังได้
    </>
  ),

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
      className={cn(
        "relative isolate overflow-hidden",
        "bg-rice-dark text-white",
        className
      )}
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0 -z-20
          opacity-[0.04]
          [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
          [background-size:48px_48px]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-48 top-20 -z-10
          h-[460px] w-[460px]
          rounded-full
          bg-rice-leaf/20
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-48 bottom-0 -z-10
          h-[460px] w-[460px]
          rounded-full
          bg-rice-mint/10
          blur-3xl
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute right-[18%] top-[32%] -z-10
          h-64 w-64
          rounded-full
          bg-rice-gold/[0.07]
          blur-3xl
        "
      />

      <div
        className="
          mx-auto w-full max-w-7xl
          px-5 pb-8 pt-10
          sm:px-6 sm:pb-10 sm:pt-12
          lg:px-8 lg:pt-16
        "
      >
        {/* Footer CTA */}
        {showCTA && (
          <div
            className="
              relative overflow-hidden
              rounded-[2rem]
              border border-white/10
              bg-white/[0.065]
              p-5
              shadow-[0_24px_80px_rgba(0,0,0,0.2)]
              backdrop-blur-glass
              sm:p-7
              lg:p-8
            "
          >
            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute -right-20 -top-20
                h-72 w-72
                rounded-full
                bg-rice-mint/15
                blur-3xl
              "
            />

            <div
              aria-hidden="true"
              className="
                pointer-events-none
                absolute -bottom-24 left-[30%]
                h-64 w-64
                rounded-full
                bg-rice-leaf/15
                blur-3xl
              "
            />

            <div
              className="
                relative z-10
                flex flex-col gap-6
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div
                className="
                  flex max-w-3xl
                  items-start gap-4
                "
              >
                <span
                  className="
                    flex h-12 w-12
                    shrink-0 items-center
                    justify-center
                    rounded-2xl
                    bg-rice-mint
                    text-rice-dark
                    shadow-[0_12px_32px_rgba(190,238,207,0.18)]
                    sm:h-14 sm:w-14
                  "
                >
                  <Sparkles
                    aria-hidden="true"
                    className="h-6 w-6"
                  />
                </span>

                <div>
                  <p
                    className="
                      text-[10px] font-semibold
                      uppercase tracking-[0.15em]
                      text-rice-mint/70
                    "
                  >
                    Get started with Rice AI
                  </p>

                  <h2
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      leading-tight text-white
                      sm:text-2xl
                      lg:text-[1.75rem]
                    "
                  >
                    {ctaHeading}
                  </h2>

                  <p
                    className="
                      mt-3 max-w-2xl
                      text-sm leading-6
                      text-white/55
                    "
                  >
                    {ctaDescription}
                  </p>
                </div>
              </div>

              <Link
                href={ctaHref}
                className="
                  group inline-flex min-h-14
                  w-full shrink-0
                  items-center justify-center
                  gap-2.5 rounded-pill
                  bg-rice-mint
                  px-6 py-3
                  text-sm font-semibold
                  text-rice-dark
                  shadow-[0_12px_32px_rgba(190,238,207,0.16)]
                  transition-[transform,background-color,box-shadow]
                  duration-300
                  ease-premium
                  hover:-translate-y-0.5
                  hover:bg-rice-mint-light
                  hover:shadow-[0_16px_38px_rgba(190,238,207,0.22)]
                  active:translate-y-0
                  active:scale-[0.98]
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-white
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-rice-dark
                  sm:w-auto
                "
              >
                <ScanLine
                  aria-hidden="true"
                  className="h-5 w-5"
                />

                <span>{ctaLabel}</span>

                <ArrowRight
                  aria-hidden="true"
                  className="
                    h-4 w-4
                    transition-transform
                    duration-300
                    group-hover:translate-x-1
                  "
                />
              </Link>
            </div>
          </div>
        )}

        {/* Main footer content */}
        <div
          className="
            grid gap-12
            py-12
            sm:py-14
            lg:grid-cols-[minmax(280px,1.15fr)_minmax(0,1.85fr)]
            lg:gap-16
            lg:py-16
          "
        >
          {/* Brand */}
          <div className="max-w-md">
            <Link
              href="/"
              aria-label="กลับไปหน้าแรก Rice AI"
              className="
                group inline-flex
                items-center gap-3
                rounded-xl
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rice-mint
                focus-visible:ring-offset-4
                focus-visible:ring-offset-rice-dark
              "
            >
              <span
                className="
                  relative h-12 w-12
                  overflow-hidden rounded-2xl
                  transition-transform
                  duration-500
                  ease-premium
                  group-hover:rotate-3
                  group-hover:scale-105
                "
              >
                <Image
                  src="/logo/rice-ai-farmer-mark.png"
                  alt=""
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </span>

              <span>
                <span
                  className="
                    block font-heading
                    text-xl font-bold
                    tracking-[-0.025em]
                    text-white
                  "
                >
                  {brandName}
                </span>

                <span
                  className="
                    mt-0.5 block
                    text-[10px] font-semibold
                    uppercase tracking-[0.14em]
                    text-rice-mint/60
                  "
                >
                  Smart rice farming
                </span>
              </span>
            </Link>

            <p
              className="
                mt-5 max-w-sm
                text-sm leading-7
                text-white/50
              "
            >
              {description}
            </p>

            <div
              className="
                mt-6 inline-flex
                items-center gap-2
                rounded-pill
                border border-white/10
                bg-white/[0.055]
                px-3 py-2
                text-xs font-medium
                text-white/55
              "
            >
              <span
                aria-hidden="true"
                className="
                  relative flex h-2.5 w-2.5
                "
              >
                <span
                  className="
                    absolute inline-flex
                    h-full w-full
                    animate-ping
                    rounded-full
                    bg-rice-mint/50
                    opacity-75
                  "
                />

                <span
                  className="
                    relative inline-flex
                    h-2.5 w-2.5
                    rounded-full
                    bg-rice-mint
                  "
                />
              </span>

              ระบบพร้อมสำหรับการจัดการข้อมูลแปลงนา
            </div>

            <div
              className="
                mt-7 flex flex-wrap gap-2
              "
            >
              <Link
                href="/farms"
                className="
                  inline-flex min-h-10
                  items-center gap-2
                  rounded-pill
                  border border-white/10
                  bg-white/[0.055]
                  px-3.5 py-2
                  text-xs font-semibold
                  text-white/65
                  transition-colors duration-300
                  hover:border-rice-mint/25
                  hover:bg-rice-mint/10
                  hover:text-rice-mint
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-rice-mint
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-rice-dark
                "
              >
                <MapPin
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                เพิ่มแปลงนา
              </Link>

              <Link
                href="/disease"
                className="
                  inline-flex min-h-10
                  items-center gap-2
                  rounded-pill
                  border border-white/10
                  bg-white/[0.055]
                  px-3.5 py-2
                  text-xs font-semibold
                  text-white/65
                  transition-colors duration-300
                  hover:border-rice-mint/25
                  hover:bg-rice-mint/10
                  hover:text-rice-mint
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-rice-mint
                  focus-visible:ring-offset-2
                  focus-visible:ring-offset-rice-dark
                "
              >
                <Bot
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                เปิด Rice AI
              </Link>
            </div>
          </div>

          {/* Navigation */}
          <nav
            aria-label="ลิงก์ส่วนท้ายเว็บไซต์"
            className="
              grid gap-10
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {FOOTER_GROUPS.map((group) => (
              <div key={group.id}>
                <h3
                  className="
                    font-heading
                    text-sm font-semibold
                    text-white
                  "
                >
                  {group.title}
                </h3>

                <ul className="mt-4 space-y-2.5">
                  {group.links.map((link) => (
                    <li key={link.id}>
                      <FooterNavLink
                        href={link.href}
                        label={link.label}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        {/* Highlights */}
        <div
          className="
            grid gap-3
            border-y border-white/10
            py-5
            sm:grid-cols-3
          "
        >
          {FOOTER_HIGHLIGHTS.map(
            (highlight) => {
              const HighlightIcon =
                highlight.icon;

              return (
                <div
                  key={highlight.id}
                  className="
                    flex min-h-14
                    items-center gap-3
                    rounded-2xl
                    bg-white/[0.035]
                    px-4 py-3
                  "
                >
                  <span
                    className="
                      flex h-9 w-9
                      shrink-0 items-center
                      justify-center
                      rounded-xl
                      bg-rice-mint/10
                      text-rice-mint
                    "
                  >
                    <HighlightIcon
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <span
                    className="
                      text-xs leading-5
                      text-white/55
                    "
                  >
                    {highlight.label}
                  </span>
                </div>
              );
            }
          )}
        </div>

        {/* Bottom bar */}
        <div
          className="
            flex flex-col gap-5
            pt-7
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-xs text-white/40
              "
            >
              © {currentYear} {brandName}.
              สงวนลิขสิทธิ์
            </p>

            <p
              className="
                mt-2 max-w-3xl
                text-[11px] leading-5
                text-white/30
              "
            >
              ผลการวิเคราะห์จากระบบเป็นข้อมูลสนับสนุน
              ไม่ควรใช้แทนการวินิจฉัยหรือคำแนะนำจากนักวิชาการเกษตร
              และผู้เชี่ยวชาญทั้งหมด
            </p>
          </div>

          <Link
            href="/#home-hero"
            className="
              group inline-flex min-h-10
              w-fit shrink-0
              items-center gap-2
              rounded-pill
              border border-white/10
              bg-white/[0.045]
              px-3.5 py-2
              text-xs font-semibold
              text-white/50
              transition-colors duration-300
              hover:border-rice-mint/25
              hover:bg-rice-mint/10
              hover:text-rice-mint
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rice-mint
              focus-visible:ring-offset-2
              focus-visible:ring-offset-rice-dark
            "
          >
            กลับขึ้นด้านบน

            <ArrowRight
              aria-hidden="true"
              className="
                h-4 w-4
                -rotate-90
                transition-transform
                duration-300
                group-hover:-translate-y-0.5
              "
            />
          </Link>
        </div>
      </div>

      {/* Decorative bottom line */}
      <div
        aria-hidden="true"
        className="
          h-1 w-full
          bg-gradient-to-r
          from-rice-leaf
          via-rice-mint
          to-rice-gold
          opacity-70
        "
      />
    </footer>
  );
}
