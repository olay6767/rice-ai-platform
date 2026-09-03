import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  buttonVariants,
} from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardIcon,
} from "@/components/ui/Card";

export interface HeroSectionProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "title"
  > {
  /**
   * หัวข้อหลักของ Hero
   */
  heading?: ReactNode;

  /**
   * คำอธิบายใต้หัวข้อ
   */
  description?: ReactNode;

  /**
   * เส้นทางของปุ่มหลัก
   */
  primaryHref?: string;

  /**
   * ข้อความของปุ่มหลัก
   */
  primaryLabel?: string;

  /**
   * เส้นทางของปุ่มรอง
   */
  secondaryHref?: string;

  /**
   * ข้อความของปุ่มรอง
   */
  secondaryLabel?: string;

  /**
   * แสดงตัวอย่าง Dashboard
   */
  showDashboardPreview?: boolean;

  /**
   * รูปแปลงนาภายใน Dashboard Preview
   *
   * รูปเริ่มต้นอยู่ใน:
   * public/images/home/rice-field.jpg
   */
  fieldImageSrc?: string;

  /**
   * Alt text ของรูปแปลงนา
   */
  fieldImageAlt?: string;
}

interface HeroBenefit {
  id: string;
  label: string;
}

interface FarmMetric {
  id: string;
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  iconVariant:
    | "green"
    | "mint"
    | "gold"
    | "neutral";
}

const HERO_BENEFITS: HeroBenefit[] = [
  {
    id: "disease-analysis",
    label: "วิเคราะห์โรคข้าวจากภาพ",
  },
  {
    id: "farm-health",
    label: "ติดตามสุขภาพแปลงนา",
  },
  {
    id: "mobile-ready",
    label: "ใช้งานง่ายบนมือถือ",
  },
];

const FARM_METRICS: FarmMetric[] = [
  {
    id: "crop-age",
    label: "อายุข้าว",
    value: "42 วัน",
    helper: "ระยะแตกกอ",
    icon: Sprout,
    iconVariant: "mint",
  },
  {
    id: "rain-chance",
    label: "โอกาสฝนตก",
    value: "68%",
    helper: "ช่วงเย็นวันนี้",
    icon: CloudRain,
    iconVariant: "gold",
  },
];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * สถานะ Rice AI Assistant
 *
 * แสดงเป็นส่วนหนึ่งของ Layout ปกติ
 * จึงไม่ลอยทับการ์ดอื่น
 */
function RiceAIStatus() {
  return (
    <div
      data-component="rice-ai-status"
      className="
        mt-4 flex min-h-[72px]
        w-full items-center
        justify-between gap-4
        rounded-[1.4rem]
        border border-white/80
        bg-white/80
        px-4 py-3
        shadow-glass
        backdrop-blur-glass
        dark:border-white/10
        dark:bg-white/[0.055]
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="
            relative flex h-11 w-11
            shrink-0 items-center
            justify-center rounded-2xl
            bg-rice-mint/55
            text-rice-forest
            dark:bg-rice-leaf/20
            dark:text-rice-mint
          "
        >
          <Bot
            aria-hidden="true"
            className="h-5 w-5"
          />

          <span
            aria-hidden="true"
            className="
              absolute right-1 top-1
              h-2.5 w-2.5
              rounded-full
              bg-[#4f9b5f]
              ring-2 ring-white
              dark:ring-[#102217]
            "
          />
        </span>

        <div className="min-w-0">
          <p
            className="
              text-[10px] font-semibold
              uppercase tracking-[0.12em]
              text-rice-muted/75
              dark:text-white/40
            "
          >
            Rice AI Assistant
          </p>

          <p
            className="
              mt-1 text-sm font-semibold
              leading-5 text-rice-dark
              dark:text-white
            "
          >
            พร้อมให้คำแนะนำเกี่ยวกับแปลงนา
          </p>
        </div>
      </div>

      <span
        className="
          hidden shrink-0
          items-center gap-1.5
          rounded-pill
          bg-rice-mint/45
          px-3 py-1.5
          text-xs font-semibold
          text-rice-forest
          sm:inline-flex
          dark:bg-rice-leaf/20
          dark:text-rice-mint
        "
      >
        <span
          aria-hidden="true"
          className="
            h-2 w-2 rounded-full
            bg-[#4f9b5f]
          "
        />

        ออนไลน์
      </span>
    </div>
  );
}

/**
 * Hero Section หน้าแรกของ Rice AI
 *
 * ตัวเลขและข้อมูลใน Dashboard Preview
 * เป็นข้อมูลตัวอย่างสำหรับแสดงดีไซน์หน้า Home
 */
export default function HeroSection({
  id = "home-hero",

  heading = (
    <>
      ดูแลนาข้าวอย่างฉลาด
      <span
        className="
          block text-rice-natural
          dark:text-rice-mint
        "
      >
        ด้วยข้อมูลและ AI
      </span>
    </>
  ),

  description = (
    <>
      วิเคราะห์โรคข้าว ติดตามสุขภาพแปลงนา
      และรับคำแนะนำที่เข้าใจง่าย
      เพื่อช่วยให้คุณตัดสินใจได้อย่างมั่นใจ
      ในทุกช่วงของการเพาะปลูก
    </>
  ),

  primaryHref = "/disease",
  primaryLabel = "เริ่มตรวจโรคข้าว",

  secondaryHref = "#home-features",
  secondaryLabel = "สำรวจแพลตฟอร์ม",

  showDashboardPreview = true,

  fieldImageSrc =
    "/images/home/rice-field.jpg",

  fieldImageAlt =
    "แปลงนาข้าวสีเขียวในช่วงเช้า",

  className,
  ...sectionProps
}: HeroSectionProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <section
      {...sectionProps}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-component="home-hero"
      className={cn(
        "relative isolate overflow-hidden",
        "bg-rice-ambient",
        "px-5 pb-20 pt-10",
        "sm:px-6 sm:pb-24 sm:pt-14",
        "lg:px-8 lg:pb-28 lg:pt-20",
        "dark:bg-rice-ambient-dark",
        className
      )}
    >
      {/* Ambient background */}
      <div
        aria-hidden="true"
        className="
          ambient-orb
          -left-28 top-16
          h-72 w-72
          bg-rice-mint/45
          dark:bg-rice-leaf/15
        "
      />

      <div
        aria-hidden="true"
        className="
          ambient-orb
          -right-24 top-44
          h-80 w-80
          bg-rice-gold/15
          animation-delay-400
          dark:bg-rice-gold/10
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0 -z-10
          opacity-[0.025]
          [background-image:linear-gradient(to_right,#0B2E1C_1px,transparent_1px),linear-gradient(to_bottom,#0B2E1C_1px,transparent_1px)]
          [background-size:40px_40px]
          dark:opacity-[0.035]
        "
      />

      <div
        className="
          relative mx-auto grid
          w-full max-w-content
          items-center gap-12
          lg:grid-cols-[minmax(0,0.9fr)_minmax(520px,1.1fr)]
          lg:gap-14
          xl:gap-20
        "
      >
        {/* Hero content */}
        <div className="mx-auto w-full max-w-xl lg:mx-0">
          <div
            className="
              inline-flex min-h-11
              animate-fade-in-up
              items-center gap-2
              rounded-pill
              border border-white/80
              bg-white/70
              px-4 py-2
              text-xs font-semibold
              text-rice-forest
              shadow-glass
              backdrop-blur-glass
              dark:border-white/10
              dark:bg-white/[0.06]
              dark:text-rice-mint-light
            "
          >
            <Sparkles
              aria-hidden="true"
              className="
                h-4 w-4 text-rice-leaf
              "
            />

            <span>
              ระบบเกษตรอัจฉริยะสำหรับคนปลูกข้าว
            </span>
          </div>

          <h1
            id={titleId}
            className="
              animation-delay-100
              mt-6 animate-fade-in-up
              font-heading text-display
              font-bold
              tracking-[-0.04em]
              text-rice-dark
              sm:text-[2.75rem]
              sm:leading-[1.05]
              lg:text-[3.75rem]
              xl:text-[4.25rem]
              dark:text-white
            "
          >
            {heading}
          </h1>

          <p
            id={descriptionId}
            className="
              animation-delay-200
              mt-6 max-w-lg
              animate-fade-in-up
              text-[15px] leading-7
              text-rice-muted
              sm:text-[17px]
              sm:leading-8
              dark:text-white/65
            "
          >
            {description}
          </p>

          <div
            className="
              animation-delay-300
              mt-8 flex
              animate-fade-in-up
              flex-col gap-3
              sm:flex-row
              sm:items-center
            "
          >
            <Link
              href={primaryHref}
              className={buttonVariants({
                variant: "primary",
                size: "xl",
                className:
                  "group w-full sm:w-auto",
              })}
            >
              <ScanLine
                aria-hidden="true"
                className="h-5 w-5"
              />

              <span>{primaryLabel}</span>

              <ArrowRight
                aria-hidden="true"
                className="
                  h-4 w-4
                  transition-transform
                  duration-300
                  ease-premium
                  group-hover:translate-x-1
                "
              />
            </Link>

            <Link
              href={secondaryHref}
              className={buttonVariants({
                variant: "secondary",
                size: "xl",
                className:
                  "w-full sm:w-auto",
              })}
            >
              <span>{secondaryLabel}</span>
            </Link>
          </div>

          <ul
            aria-label="ความสามารถหลักของ Rice AI"
            className="
              animation-delay-400
              mt-8 grid
              animate-fade-in-up
              gap-3 text-sm
              text-rice-muted
              sm:grid-cols-2
              dark:text-white/60
            "
          >
            {HERO_BENEFITS.map((benefit) => (
              <li
                key={benefit.id}
                className="
                  flex min-h-7
                  items-center gap-2.5
                "
              >
                <span
                  aria-hidden="true"
                  className="
                    inline-flex h-5 w-5
                    shrink-0 items-center
                    justify-center rounded-full
                    bg-rice-mint/55
                    text-rice-forest
                    dark:bg-rice-leaf/20
                    dark:text-rice-mint
                  "
                >
                  <Check
                    className="h-3 w-3"
                    strokeWidth={3}
                  />
                </span>

                <span>{benefit.label}</span>
              </li>
            ))}
          </ul>

          <div
            className="
              animation-delay-500
              mt-9 flex flex-wrap
              animate-fade-in-up
              items-center
              gap-x-6 gap-y-3
              border-t
              border-rice-forest/10
              pt-6 text-xs
              font-medium
              text-rice-muted
              dark:border-white/10
              dark:text-white/50
            "
          >
            <span
              className="
                inline-flex items-center gap-2
              "
            >
              <ShieldCheck
                aria-hidden="true"
                className="
                  h-4 w-4 text-rice-leaf
                "
              />

              ข้อมูลจัดเก็บอย่างเป็นระบบ
            </span>

            <span
              className="
                inline-flex items-center gap-2
              "
            >
              <Wheat
                aria-hidden="true"
                className="
                  h-4 w-4 text-rice-gold
                "
              />

              ออกแบบเพื่องานด้านข้าว
            </span>
          </div>
        </div>

        {/* Dashboard preview */}
        {showDashboardPreview && (
          <div
            aria-label="ตัวอย่างหน้าจอ Rice AI"
            className="
              animation-delay-200
              relative mx-auto
              w-full max-w-[650px]
              animate-scale-in
              lg:mx-0
            "
          >
            <div
              aria-hidden="true"
              className="
                absolute inset-x-12
                bottom-0 -z-10
                h-40 rounded-full
                bg-rice-natural/20
                blur-3xl
                dark:bg-rice-leaf/10
              "
            />

            <Card
              variant="glass"
              radius="3xl"
              className="
                border-white/85
                p-3 shadow-glass-lg
                sm:p-4
                dark:border-white/10
              "
            >
              <div
                className="
                  overflow-hidden
                  rounded-[1.9rem]
                  bg-rice-background/80
                  p-4 sm:p-5
                  dark:bg-rice-dark/65
                "
              >
                {/* Dashboard header */}
                <div
                  className="
                    flex items-start
                    justify-between gap-4
                  "
                >
                  <div className="min-w-0">
                    <p
                      className="
                        text-xs font-medium
                        text-rice-muted
                        dark:text-white/50
                      "
                    >
                      ภาพรวมแปลงนาตัวอย่าง
                    </p>

                    <h2
                      className="
                        mt-1 truncate
                        font-heading
                        text-mobile-heading
                        text-rice-dark
                        dark:text-white
                      "
                    >
                      Rice AI Farm
                    </h2>

                    <div
                      className="
                        mt-2 inline-flex
                        items-center gap-1.5
                        rounded-pill
                        bg-rice-mint/40
                        px-2.5 py-1
                        text-xs font-medium
                        text-rice-forest
                        dark:bg-rice-leaf/20
                        dark:text-rice-mint
                      "
                    >
                      <MapPin
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />

                      <span>สุพรรณบุรี</span>
                    </div>
                  </div>

                  <div
                    className="
                      flex h-12 w-12
                      shrink-0 items-center
                      justify-center
                      rounded-2xl
                      bg-rice-natural
                      text-white
                      shadow-primary
                      dark:bg-rice-mint-light
                      dark:text-rice-dark
                    "
                  >
                    <Wheat
                      aria-hidden="true"
                      className="h-6 w-6"
                    />
                  </div>
                </div>

                <div
                  className="
                    mt-5 grid gap-4
                    sm:grid-cols-2
                  "
                >
                  {/* Main field image */}
                  <div
                    className="
                      scan-overlay
                      relative min-h-[330px]
                      overflow-hidden
                      rounded-[2rem]
                      bg-rice-surface-soft
                      p-5
                      sm:col-span-2
                      lg:col-span-1
                      lg:min-h-[400px]
                    "
                  >
                    <Image
                      src={fieldImageSrc}
                      alt={fieldImageAlt}
                      fill
                      priority
                      sizes="
                        (max-width: 639px) 100vw,
                        (max-width: 1023px) 90vw,
                        520px
                      "
                      className="
                        object-cover object-center
                        transition-transform
                        duration-1000
                        ease-premium
                        hover:scale-[1.03]
                      "
                    />

                    <div
                      aria-hidden="true"
                      className="
                        absolute inset-0
                        bg-gradient-to-b
                        from-rice-dark/5
                        via-transparent
                        to-rice-dark/65
                      "
                    />

                    <div
                      aria-hidden="true"
                      className="
                        absolute -right-16 -top-16
                        h-56 w-56
                        rounded-full
                        bg-rice-gold/20
                        blur-3xl
                      "
                    />

                    {/* Weather */}
                    <div
                      className="
                        relative z-20
                        flex items-start
                        justify-between gap-3
                      "
                    >
                      <div
                        className="
                          rounded-2xl
                          border border-white/70
                          bg-white/82
                          px-4 py-3
                          shadow-card
                          backdrop-blur-glass
                        "
                      >
                        <div
                          className="
                            flex items-center gap-2
                          "
                        >
                          <CloudSun
                            aria-hidden="true"
                            className="
                              h-5 w-5
                              text-rice-gold
                            "
                          />

                          <span
                            className="
                              font-heading
                              text-lg font-semibold
                              text-rice-dark
                            "
                          >
                            29°C
                          </span>
                        </div>

                        <p
                          className="
                            mt-1 text-xs
                            text-rice-muted
                          "
                        >
                          มีเมฆบางส่วน
                        </p>
                      </div>

                      <div
                        className="
                          inline-flex min-h-10
                          items-center gap-2
                          rounded-pill
                          border border-white/70
                          bg-white/82
                          px-3 py-2
                          text-xs font-semibold
                          text-rice-forest
                          shadow-card
                          backdrop-blur-glass
                        "
                      >
                        <span
                          aria-hidden="true"
                          className="
                            h-2 w-2 rounded-full
                            bg-[#4f9b5f]
                          "
                        />

                        แปลง A1
                      </div>
                    </div>

                    {/* Field status */}
                    <div
                      className="
                        absolute bottom-5
                        left-5 right-5 z-20
                        rounded-[1.5rem]
                        border border-white/15
                        bg-rice-dark/88
                        p-4 text-white
                        shadow-floating
                        backdrop-blur-glass
                      "
                    >
                      <div
                        className="
                          flex items-center
                          justify-between gap-4
                        "
                      >
                        <div>
                          <p
                            className="
                              text-xs text-white/60
                            "
                          >
                            สถานะแปลงนา
                          </p>

                          <p
                            className="
                              mt-1 font-heading
                              text-sm font-semibold
                            "
                          >
                            สุขภาพโดยรวมอยู่ในเกณฑ์ดี
                          </p>
                        </div>

                        <div
                          className="
                            flex h-11 w-11
                            shrink-0 items-center
                            justify-center
                            rounded-2xl
                            bg-white/10
                          "
                        >
                          <Leaf
                            aria-hidden="true"
                            className="h-5 w-5"
                          />
                        </div>
                      </div>

                      <div
                        className="
                          mt-4 h-2.5
                          overflow-hidden
                          rounded-pill
                          bg-white/15
                        "
                      >
                        <div
                          className="
                            h-full w-[86%]
                            origin-left
                            animate-progress-grow
                            rounded-pill
                            bg-rice-mint
                          "
                        />
                      </div>

                      <div
                        className="
                          mt-2 flex
                          items-center
                          justify-between
                          text-xs text-white/60
                        "
                      >
                        <span>Crop health</span>
                        <span>86%</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Bento column */}
                  <div
                    className="
                      grid gap-4
                      sm:grid-cols-2
                      lg:grid-cols-1
                    "
                  >
                    {/* Crop health */}
                    <Card
                      variant="surface"
                      radius="2xl"
                      className="min-h-[176px]"
                    >
                      <CardContent>
                        <div
                          className="
                            flex items-start
                            justify-between gap-4
                          "
                        >
                          <div>
                            <p className="uppercase-label">
                              Crop health
                            </p>

                            <h3
                              className="
                                mt-2 font-heading
                                text-card-title
                                text-rice-dark
                                dark:text-white
                              "
                            >
                              สุขภาพข้าว
                            </h3>
                          </div>

                          <div
                            role="img"
                            aria-label="คะแนนสุขภาพข้าวตัวอย่าง 86 คะแนน"
                            className="
                              relative flex
                              h-[76px] w-[76px]
                              shrink-0 items-center
                              justify-center rounded-full
                              bg-[conic-gradient(#5E8C4A_0deg,#5E8C4A_309deg,#E6EBE5_309deg,#E6EBE5_360deg)]
                              dark:bg-[conic-gradient(#BEEECF_0deg,#BEEECF_309deg,rgba(255,255,255,0.08)_309deg,rgba(255,255,255,0.08)_360deg)]
                            "
                          >
                            <div
                              className="
                                flex h-[58px]
                                w-[58px]
                                items-center
                                justify-center
                                rounded-full bg-white
                                font-heading
                                text-lg font-bold
                                text-rice-dark
                                dark:bg-[#102217]
                                dark:text-white
                              "
                            >
                              86
                            </div>
                          </div>
                        </div>

                        <div
                          className="
                            mt-4 inline-flex
                            items-center gap-1.5
                            text-xs font-medium
                            text-[#347846]
                            dark:text-[#7fc993]
                          "
                        >
                          <TrendingUp
                            aria-hidden="true"
                            className="h-4 w-4"
                          />

                          เพิ่มขึ้น 8 คะแนน
                        </div>
                      </CardContent>
                    </Card>

                    {/* Soil moisture */}
                    <Card
                      variant="mint"
                      radius="2xl"
                    >
                      <CardContent>
                        <div
                          className="
                            flex items-start
                            justify-between gap-4
                          "
                        >
                          <div>
                            <p className="uppercase-label">
                              Soil moisture
                            </p>

                            <p
                              className="
                                mt-2 font-heading
                                text-2xl font-bold
                              "
                            >
                              72%
                            </p>
                          </div>

                          <CardIcon
                            variant="mint"
                            size="sm"
                          >
                            <Droplets />
                          </CardIcon>
                        </div>

                        <div
                          className="
                            mt-5 h-2.5
                            overflow-hidden
                            rounded-pill
                            bg-rice-forest/10
                            dark:bg-white/10
                          "
                        >
                          <div
                            className="
                              h-full w-[72%]
                              origin-left
                              animate-progress-grow
                              rounded-pill
                              bg-rice-natural
                              dark:bg-rice-mint
                            "
                          />
                        </div>

                        <p
                          className="
                            mt-2 text-xs
                            text-rice-muted
                            dark:text-white/55
                          "
                        >
                          ระดับความชื้นเหมาะสม
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Farm metrics */}
                <div
                  className="
                    mt-4 grid gap-3
                    sm:grid-cols-2
                  "
                >
                  {FARM_METRICS.map((metric) => {
                    const MetricIcon = metric.icon;

                    return (
                      <Card
                        key={metric.id}
                        variant="surface"
                        radius="2xl"
                      >
                        <CardContent
                          compact
                          className="
                            flex items-center
                            justify-between gap-4
                          "
                        >
                          <div className="min-w-0">
                            <p
                              className="
                                text-xs text-rice-muted
                                dark:text-white/50
                              "
                            >
                              {metric.label}
                            </p>

                            <p
                              className="
                                mt-1 font-heading
                                text-lg font-semibold
                                text-rice-dark
                                dark:text-white
                              "
                            >
                              {metric.value}
                            </p>

                            <p
                              className="
                                mt-0.5 truncate
                                text-xs
                                text-rice-muted/75
                                dark:text-white/40
                              "
                            >
                              {metric.helper}
                            </p>
                          </div>

                          <CardIcon
                            variant={metric.iconVariant}
                            size="sm"
                          >
                            <MetricIcon />
                          </CardIcon>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Disease and recommendation */}
                <div
                  className="
                    mt-4 grid gap-3
                    sm:grid-cols-2
                  "
                >
                  <Link
                    href="/disease"
                    className="
                      group rounded-card
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-rice-leaf
                      focus-visible:ring-offset-2
                      dark:focus-visible:ring-offset-rice-dark
                    "
                  >
                    <Card
                      variant="dark"
                      radius="xl"
                      interactive
                      fullHeight
                    >
                      <CardContent>
                        <div
                          className="
                            flex items-start
                            justify-between gap-4
                          "
                        >
                          <div>
                            <p
                              className="
                                text-xs font-semibold
                                uppercase tracking-[0.12em]
                                text-white/55
                              "
                            >
                              Disease scan
                            </p>

                            <h3
                              className="
                                mt-2 font-heading
                                text-lg font-semibold
                                text-white
                              "
                            >
                              ตรวจโรคข้าว
                            </h3>

                            <p
                              className="
                                mt-1 text-xs
                                leading-5 text-white/55
                              "
                            >
                              ถ่ายภาพใบข้าวเพื่อเริ่มวิเคราะห์
                            </p>
                          </div>

                          <span
                            className="
                              flex h-11 w-11
                              shrink-0 items-center
                              justify-center
                              rounded-2xl
                              bg-white/10
                            "
                          >
                            <ScanLine
                              aria-hidden="true"
                              className="h-5 w-5"
                            />
                          </span>
                        </div>

                        <div
                          className="
                            mt-5 inline-flex
                            items-center gap-2
                            text-xs font-semibold
                            text-rice-mint
                          "
                        >
                          เริ่มสแกน

                          <ArrowRight
                            aria-hidden="true"
                            className="
                              h-4 w-4
                              transition-transform
                              group-hover:translate-x-1
                            "
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>

                  <Card
                    variant="gold"
                    radius="xl"
                    fullHeight
                  >
                    <CardContent>
                      <div
                        className="
                          flex items-start
                          justify-between gap-4
                        "
                      >
                        <div className="min-w-0">
                          <p
                            className="
                              text-xs font-semibold
                              uppercase tracking-[0.12em]
                              text-rice-muted
                              dark:text-white/50
                            "
                          >
                            AI recommendation
                          </p>

                          <h3
                            className="
                              mt-2 font-heading
                              text-lg font-semibold
                              text-rice-dark
                              dark:text-white
                            "
                          >
                            คำแนะนำวันนี้
                          </h3>
                        </div>

                        <CardIcon
                          variant="gold"
                          size="sm"
                        >
                          <Bot />
                        </CardIcon>
                      </div>

                      <p
                        className="
                          mt-3 text-xs leading-5
                          text-rice-muted
                          dark:text-white/55
                        "
                      >
                        ควรตรวจสอบความชื้นช่วงเย็น
                        เนื่องจากมีโอกาสฝนตกสูง
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <RiceAIStatus />
              </div>
            </Card>
          </div>
        )}
      </div>
    </section>
  );
}