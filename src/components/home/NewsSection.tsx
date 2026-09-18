import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CloudRain,
  Newspaper,
  ShieldAlert,
  Sparkles,
  Sprout,
  Tags,
  TrendingUp,
  WalletCards,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  Card,
  CardContent,
  CardIcon,
} from "@/components/ui/Card";

export interface NewsSectionProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "title"
  > {
  /**
   * ข้อความขนาดเล็กเหนือหัวข้อ
   */
  eyebrow?: ReactNode;

  /**
   * หัวข้อหลักของหน้าข่าว
   */
  heading?: ReactNode;

  /**
   * คำอธิบายใต้หัวข้อ
   */
  description?: ReactNode;
}

type NewsTone =
  | "green"
  | "mint"
  | "gold"
  | "neutral";

interface NewsCategory {
  id: string;
  label: string;
  href: string;
}

interface NewsItem {
  id: string;
  category: string;
  title: string;
  description: string;
  publishedAt: string;
  source: string;
  image: string;
  imageAlt: string;
  href: string;
  badge?: string;
  icon: LucideIcon;
  tone: NewsTone;
  imageFit?: "cover" | "contain";
}

const NEWS_CATEGORIES: NewsCategory[] = [
  {
    id: "all",
    label: "ทั้งหมด",
    href: "/news",
  },
  {
    id: "rice-price",
    label: "ราคาข้าว",
    href: "/news?category=rice-price",
  },
  {
    id: "rice-disease",
    label: "โรคและศัตรูข้าว",
    href: "/news?category=rice-disease",
  },
  {
    id: "weather",
    label: "สภาพอากาศ",
    href: "/news?category=weather",
  },
  {
    id: "farmer-support",
    label: "สิทธิประโยชน์",
    href: "/news?category=farmer-support",
  },
  {
    id: "technology",
    label: "เทคโนโลยีเกษตร",
    href: "/news?category=technology",
  },
  {
    id: "knowledge",
    label: "ความรู้การทำนา",
    href: "/news?category=knowledge",
  },
];

const FEATURED_NEWS: NewsItem = {
  id: "rice-disease-management",
  category: "โรคและศัตรูข้าว",
  title:
    "แนวทางรับมือโรคข้าว 5 ชนิดที่ควรเฝ้าระวัง",
  description:
    "เรียนรู้อาการและแนวทางจัดการโรคไหม้ข้าว โรคขอบใบแห้ง โรคกาบใบแห้ง โรคใบจุดสีน้ำตาล และโรคเมล็ดด่าง เพื่อช่วยให้ตรวจพบความผิดปกติและวางแผนดูแลแปลงได้เร็วขึ้น",
  publishedAt: "บทความความรู้",
  source: "Rice AI",
  image:
    "/images/news/rice-disease-management.webp",
  imageAlt:
    "แนวทางรับมือโรคข้าว 5 ชนิด พร้อมวิธีสังเกตและวิธีจัดการเบื้องต้น",
  href: "/news/rice-disease-management",
  badge: "ข่าวแนะนำ",
  icon: ShieldAlert,
  tone: "green",
  imageFit: "contain",
};

const NEWS_ITEMS: NewsItem[] = [
  {
    id: "rice-disease-warning",
    category: "โรคและศัตรูข้าว",
    title:
      "สังเกตอาการโรคข้าว 5 ชนิดก่อนลุกลามในแปลง",
    description:
      "ตรวจสอบแผลบนใบ กาบใบ โคนต้น และเมล็ด เพื่อค้นหาความผิดปกติและเริ่มจัดการได้เร็วขึ้น",
    publishedAt: "คู่มือเฝ้าระวัง",
    source: "Rice AI",
    image:
      "/images/news/rice-disease-warning.webp",
    imageAlt:
      "เตือนภัยโรคข้าว 5 ชนิดที่ควรเฝ้าระวังในแปลงนา",
    href: "/news/rice-disease-warning",
    badge: "เตือนภัย",
    icon: ShieldAlert,
    tone: "green",
    imageFit: "contain",
  },
  {
    id: "rice-price",
    category: "ราคาข้าว",
    title:
      "ติดตามราคาข้าวก่อนวางแผนขายผลผลิต",
    description:
      "ตรวจสอบราคา วันที่อัปเดต และแหล่งข้อมูล เพื่อใช้ประกอบการตัดสินใจเกี่ยวกับช่วงเวลาจำหน่ายผลผลิต",
    publishedAt: "อัปเดตตามแหล่งข้อมูล",
    source: "ข้อมูลตลาดข้าว",
    image: "/images/news/rice-price.webp",
    imageAlt:
      "เมล็ดข้าวและผลผลิตข้าวสำหรับข้อมูลราคาตลาด",
    href: "/news/rice-price",
    badge: "ข้อมูลตลาด",
    icon: TrendingUp,
    tone: "gold",
    imageFit: "cover",
  },
  {
    id: "rice-weather",
    category: "สภาพอากาศ",
    title:
      "วางแผนงานในแปลงด้วยข้อมูลฝนและสภาพอากาศ",
    description:
      "ตรวจสอบแนวโน้มฝนก่อนให้น้ำ ใส่ปุ๋ย พ่นสาร หรือทำกิจกรรมสำคัญภายในแปลงนา",
    publishedAt: "พยากรณ์การเกษตร",
    source: "ข้อมูลสภาพอากาศ",
    image: "/images/news/rice-weather.webp",
    imageAlt:
      "แปลงนาข้าวภายใต้สภาพอากาศสำหรับการวางแผนเกษตร",
    href: "/news/rice-weather",
    badge: "สภาพอากาศ",
    icon: CloudRain,
    tone: "mint",
    imageFit: "cover",
  },
  {
    id: "farmer-support",
    category: "สิทธิประโยชน์",
    title:
      "ติดตามโครงการช่วยเหลือและสิทธิสำหรับเกษตรกร",
    description:
      "รวมข้อมูลการขึ้นทะเบียน โครงการสนับสนุน และช่วงเวลาที่เกษตรกรควรตรวจสอบ",
    publishedAt: "ตรวจสอบเงื่อนไขล่าสุด",
    source: "ข่าวเกษตรกร",
    image:
      "/images/news/farmer-support.webp",
    imageAlt:
      "เกษตรกรในแปลงนาสำหรับข่าวโครงการช่วยเหลือ",
    href: "/news/farmer-support",
    badge: "สิทธิประโยชน์",
    icon: WalletCards,
    tone: "neutral",
    imageFit: "cover",
  },
  {
    id: "rice-technology",
    category: "เทคโนโลยีเกษตร",
    title:
      "เทคโนโลยีที่ช่วยลดต้นทุนและเพิ่มประสิทธิภาพการทำนา",
    description:
      "ทำความรู้จักเครื่องมือ เครื่องจักร และระบบข้อมูลที่ช่วยให้วางแผนการผลิตได้เป็นระบบมากขึ้น",
    publishedAt: "บทความเทคโนโลยี",
    source: "Rice AI",
    image:
      "/images/news/rice-technology.webp",
    imageAlt:
      "เทคโนโลยีและเครื่องจักรสำหรับการทำนาข้าว",
    href: "/news/rice-technology",
    badge: "เทคโนโลยี",
    icon: Sparkles,
    tone: "mint",
    imageFit: "cover",
  },
  {
    id: "reduce-farm-cost",
    category: "ความรู้การทำนา",
    title:
      "แนวทางลดต้นทุนโดยไม่ลดคุณภาพของผลผลิต",
    description:
      "เริ่มจากการวางแผนเมล็ดพันธุ์ ปุ๋ย น้ำ และแรงงานให้เหมาะกับพื้นที่และระยะการเจริญเติบโต",
    publishedAt: "บทความความรู้",
    source: "Rice AI",
    image:
      "/images/news/reduce-farm-cost.webp",
    imageAlt:
      "แปลงนาข้าวสำหรับบทความลดต้นทุนการผลิต",
    href: "/news/reduce-farm-cost",
    badge: "ลดต้นทุน",
    icon: Sprout,
    tone: "gold",
    imageFit: "cover",
  },
];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function getToneClasses(
  tone: NewsTone
): string {
  const toneClasses: Record<
    NewsTone,
    string
  > = {
    green:
      "bg-rice-natural text-white",

    mint:
      "bg-rice-mint/90 text-rice-forest dark:bg-rice-leaf/30 dark:text-rice-mint",

    gold:
      "bg-rice-gold/90 text-rice-dark dark:bg-rice-gold/25 dark:text-rice-gold",

    neutral:
      "bg-white/90 text-rice-muted dark:bg-rice-dark/80 dark:text-white/70",
  };

  return toneClasses[tone];
}

function NewsMetadata({
  publishedAt,
  source,
  dark = false,
}: {
  publishedAt: string;
  source: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        `
          flex flex-wrap items-center
          gap-x-4 gap-y-2 text-xs
        `,
        dark
          ? "text-white/50"
          : "text-rice-muted/70 dark:text-white/45"
      )}
    >
      <span
        className="
          inline-flex items-center gap-1.5
        "
      >
        <CalendarDays
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />

        {publishedAt}
      </span>

      <span
        className="
          inline-flex items-center gap-1.5
        "
      >
        <Newspaper
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />

        {source}
      </span>
    </div>
  );
}

/**
 * ส่วนรายการข่าวทั้งหมด
 *
 * ใช้ในหน้า /news เท่านั้น
 * ส่วนสไลด์ข่าวหน้า Home ใช้ NewsSliderSection
 */
export default function NewsSection({
  id = "news-section",

  eyebrow = "ศูนย์ข่าวและความรู้",

  heading = (
    <>
      ข่าวสารสำหรับคนปลูกข้าว
      <span
        className="
          block text-rice-natural
          dark:text-rice-mint
        "
      >
        รวมข้อมูลสำคัญไว้ในที่เดียว
      </span>
    </>
  ),

  description = (
    <>
      ติดตามข่าวราคาข้าว การเตือนภัยโรค
      สภาพอากาศ สิทธิประโยชน์
      เทคโนโลยีการเกษตร และบทความความรู้
      ที่ช่วยประกอบการวางแผนในแต่ละรอบปลูก
    </>
  ),

  className,
  ...sectionProps
}: NewsSectionProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <section
      {...sectionProps}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-component="news-section"
      className={cn(
        "relative isolate overflow-hidden",
        "bg-rice-background",
        "px-5 py-16",
        "sm:px-6 sm:py-20",
        "lg:px-8 lg:py-24",
        "dark:bg-[#07140c]",
        className
      )}
    >
      {/* Background decoration */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-36 top-20 -z-10
          h-96 w-96 rounded-full
          bg-rice-mint/30 blur-3xl
          dark:bg-rice-leaf/10
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-36 bottom-20 -z-10
          h-96 w-96 rounded-full
          bg-rice-gold/15 blur-3xl
          dark:bg-rice-gold/[0.06]
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0 -z-20
          opacity-[0.022]
          [background-image:linear-gradient(to_right,#0B2E1C_1px,transparent_1px),linear-gradient(to_bottom,#0B2E1C_1px,transparent_1px)]
          [background-size:48px_48px]
          dark:opacity-[0.035]
        "
      />

      <div className="mx-auto w-full max-w-7xl">
        {/* Page header */}
        <header
          className="
            grid items-end gap-8
            lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.65fr)]
          "
        >
          <div className="max-w-3xl">
            <div
              className="
                inline-flex min-h-10
                items-center gap-2
                rounded-pill
                border border-rice-forest/10
                bg-white/75
                px-4 py-2
                text-xs font-semibold
                text-rice-forest
                shadow-card
                backdrop-blur-glass
                dark:border-white/10
                dark:bg-white/[0.055]
                dark:text-rice-mint
              "
            >
              <Sparkles
                aria-hidden="true"
                className="h-4 w-4 text-rice-leaf"
              />

              <span>{eyebrow}</span>
            </div>

            <h1
              id={titleId}
              className="
                mt-6 font-heading
                text-[2.25rem] font-bold
                leading-[1.12]
                tracking-[-0.04em]
                text-rice-dark
                sm:text-[3rem]
                lg:text-[3.75rem]
                dark:text-white
              "
            >
              {heading}
            </h1>
          </div>

          <p
            id={descriptionId}
            className="
              max-w-xl text-[15px]
              leading-7 text-rice-muted
              sm:text-base sm:leading-8
              lg:justify-self-end
              dark:text-white/60
            "
          >
            {description}
          </p>
        </header>

        {/* Category navigation */}
        <nav
          aria-label="หมวดหมู่ข่าว"
          className="
            mt-10 flex gap-2
            overflow-x-auto pb-2
            [scrollbar-width:none]
            [&::-webkit-scrollbar]:hidden
          "
        >
          {NEWS_CATEGORIES.map(
            (category, index) => (
              <Link
                key={category.id}
                href={category.href}
                className={cn(
                  `
                    inline-flex min-h-10
                    shrink-0 items-center
                    rounded-pill border
                    px-4 py-2
                    text-xs font-semibold
                    transition-[transform,border-color,background-color,color]
                    duration-300
                    hover:-translate-y-0.5
                    active:translate-y-0
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-rice-leaf
                    focus-visible:ring-offset-2
                    dark:focus-visible:ring-offset-[#07140c]
                  `,
                  index === 0
                    ? `
                      border-rice-natural
                      bg-rice-natural
                      text-white
                    `
                    : `
                      border-rice-forest/10
                      bg-white/75
                      text-rice-muted
                      hover:border-rice-leaf/30
                      hover:bg-white
                      hover:text-rice-forest
                      dark:border-white/10
                      dark:bg-white/[0.055]
                      dark:text-white/55
                      dark:hover:bg-white/[0.09]
                      dark:hover:text-rice-mint
                    `
                )}
              >
                {category.label}
              </Link>
            )
          )}
        </nav>

        {/* Featured article */}
        <article
          className="
            group mt-10
            overflow-hidden rounded-[2rem]
            bg-rice-dark shadow-floating
            sm:rounded-[2.25rem]
          "
        >
          <div
            className="
              grid min-h-[650px]
              lg:min-h-[570px]
              lg:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]
            "
          >
            <Link
              href={FEATURED_NEWS.href}
              aria-label={`อ่านข่าว: ${FEATURED_NEWS.title}`}
              className="
                relative min-h-[340px]
                overflow-hidden
                bg-[#edf4ec]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-inset
                focus-visible:ring-rice-mint
                lg:min-h-full
              "
            >
              <Image
                src={FEATURED_NEWS.image}
                alt={FEATURED_NEWS.imageAlt}
                fill
                priority
                sizes="
                  (max-width: 1023px) 100vw,
                  760px
                "
                className={cn(
                  `
                    object-center
                    transition-transform
                    duration-1000
                    ease-premium
                    group-hover:scale-[1.02]
                  `,
                  FEATURED_NEWS.imageFit ===
                    "contain"
                    ? "object-contain"
                    : "object-cover"
                )}
              />

              <div
                aria-hidden="true"
                className="
                  absolute inset-0
                  bg-gradient-to-b
                  from-rice-dark/5
                  via-transparent
                  to-rice-dark/45
                  lg:bg-gradient-to-r
                  lg:from-transparent
                  lg:via-transparent
                  lg:to-rice-dark/65
                "
              />

              <div
                className="
                  absolute left-4 top-4
                  flex flex-wrap gap-2
                  sm:left-6 sm:top-6
                "
              >
                <span
                  className="
                    inline-flex min-h-9
                    items-center gap-1.5
                    rounded-pill
                    border border-white/20
                    bg-rice-dark/75
                    px-3 py-1.5
                    text-[11px] font-semibold
                    text-white shadow-card
                    backdrop-blur-glass
                  "
                >
                  <ShieldAlert
                    aria-hidden="true"
                    className="
                      h-3.5 w-3.5
                      text-rice-mint
                    "
                  />

                  {FEATURED_NEWS.category}
                </span>

                {FEATURED_NEWS.badge && (
                  <span
                    className="
                      inline-flex min-h-9
                      items-center
                      rounded-pill
                      bg-rice-mint
                      px-3 py-1.5
                      text-[11px] font-semibold
                      text-rice-dark shadow-card
                    "
                  >
                    {FEATURED_NEWS.badge}
                  </span>
                )}
              </div>
            </Link>

            <div
              className="
                relative flex flex-col
                justify-center overflow-hidden
                p-5 text-white
                sm:p-8
                lg:p-10
                xl:p-12
              "
            >
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute -right-24 -top-24
                  h-80 w-80 rounded-full
                  bg-rice-mint/15 blur-3xl
                "
              />

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute -bottom-28 -left-20
                  h-72 w-72 rounded-full
                  bg-rice-leaf/20 blur-3xl
                "
              />

              <div className="relative">
                <p
                  className="
                    text-[10px] font-semibold
                    uppercase tracking-[0.16em]
                    text-rice-mint/70
                  "
                >
                  Featured story
                </p>

                <div className="mt-3">
                  <NewsMetadata
                    publishedAt={
                      FEATURED_NEWS.publishedAt
                    }
                    source={FEATURED_NEWS.source}
                    dark
                  />
                </div>

                <h2
                  className="
                    mt-5 font-heading
                    text-2xl font-semibold
                    leading-tight
                    tracking-[-0.025em]
                    text-white
                    sm:text-[2rem]
                    lg:text-[2.3rem]
                  "
                >
                  {FEATURED_NEWS.title}
                </h2>

                <p
                  className="
                    mt-4 text-sm leading-7
                    text-white/60
                    sm:text-[15px]
                  "
                >
                  {FEATURED_NEWS.description}
                </p>

                <Link
                  href={FEATURED_NEWS.href}
                  className="
                    group/button mt-7
                    inline-flex min-h-12
                    items-center justify-center
                    gap-2 rounded-pill
                    bg-rice-mint
                    px-5 py-2.5
                    text-sm font-semibold
                    text-rice-dark
                    shadow-card
                    transition-[transform,background-color]
                    duration-300
                    hover:-translate-y-0.5
                    hover:bg-rice-mint-light
                    active:translate-y-0
                    active:scale-[0.98]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-white
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-rice-dark
                  "
                >
                  อ่านรายละเอียด

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      h-4 w-4
                      transition-transform
                      duration-300
                      group-hover/button:translate-x-1
                    "
                  />
                </Link>
              </div>
            </div>
          </div>
        </article>

        {/* News list heading */}
        <div
          className="
            mt-16 flex flex-col
            gap-4
            sm:flex-row
            sm:items-end
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-[10px] font-semibold
                uppercase tracking-[0.14em]
                text-rice-natural
                dark:text-rice-mint
              "
            >
              Latest stories
            </p>

            <h2
              className="
                mt-2 font-heading
                text-2xl font-semibold
                text-rice-dark
                sm:text-3xl
                dark:text-white
              "
            >
              ข่าวและบทความล่าสุด
            </h2>
          </div>

          <p
            className="
              max-w-lg text-sm leading-6
              text-rice-muted
              dark:text-white/50
            "
          >
            ตรวจสอบวันที่เผยแพร่ แหล่งข้อมูล
            และเงื่อนไขล่าสุดก่อนนำข้อมูลไปใช้งาน
          </p>
        </div>

        {/* News cards */}
        <div
          className="
            mt-8 grid gap-5
            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          {NEWS_ITEMS.map((item) => {
            const NewsIcon = item.icon;

            return (
              <article
                key={item.id}
                className="group"
              >
                <Card
                  variant="surface"
                  radius="3xl"
                  fullHeight
                  interactive
                  className="overflow-hidden"
                >
                  <CardContent
                    className="
                      flex h-full flex-col p-0
                    "
                  >
                    <Link
                      href={item.href}
                      aria-label={`อ่านข่าว: ${item.title}`}
                      className="
                        relative block
                        aspect-[16/10]
                        overflow-hidden
                        bg-rice-surface-soft
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-inset
                        focus-visible:ring-rice-leaf
                      "
                    >
                      <Image
                        src={item.image}
                        alt={item.imageAlt}
                        fill
                        sizes="
                          (max-width: 767px) 100vw,
                          (max-width: 1023px) 50vw,
                          420px
                        "
                        className={cn(
                          `
                            object-center
                            transition-transform
                            duration-700
                            ease-premium
                            group-hover:scale-[1.04]
                          `,
                          item.imageFit ===
                            "contain"
                            ? "object-contain"
                            : "object-cover"
                        )}
                      />

                      <div
                        aria-hidden="true"
                        className="
                          absolute inset-0
                          bg-gradient-to-t
                          from-rice-dark/50
                          via-transparent
                          to-transparent
                        "
                      />

                      {item.badge && (
                        <span
                          className={cn(
                            `
                              absolute bottom-4 left-4
                              inline-flex min-h-8
                              items-center
                              rounded-pill
                              px-3 py-1
                              text-[10px] font-semibold
                              shadow-card
                              backdrop-blur-glass
                            `,
                            getToneClasses(
                              item.tone
                            )
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>

                    <div
                      className="
                        flex flex-1 flex-col
                        p-5 sm:p-6
                      "
                    >
                      <div
                        className="
                          flex items-start
                          justify-between gap-4
                        "
                      >
                        <span
                          className="
                            inline-flex items-center
                            gap-1.5 text-[10px]
                            font-semibold uppercase
                            tracking-[0.12em]
                            text-rice-muted/70
                            dark:text-white/40
                          "
                        >
                          <Tags
                            aria-hidden="true"
                            className="h-3.5 w-3.5"
                          />

                          {item.category}
                        </span>

                        <CardIcon
                          variant={item.tone}
                          size="sm"
                        >
                          <NewsIcon />
                        </CardIcon>
                      </div>

                      <Link
                        href={item.href}
                        className="
                          mt-4 rounded-md
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-rice-leaf
                        "
                      >
                        <h3
                          className="
                            font-heading
                            text-xl font-semibold
                            leading-snug
                            text-rice-dark
                            transition-colors
                            group-hover:text-rice-natural
                            dark:text-white
                            dark:group-hover:text-rice-mint
                          "
                        >
                          {item.title}
                        </h3>
                      </Link>

                      <p
                        className="
                          mt-3 line-clamp-3
                          text-sm leading-6
                          text-rice-muted
                          dark:text-white/50
                        "
                      >
                        {item.description}
                      </p>

                      <div className="mt-auto pt-6">
                        <NewsMetadata
                          publishedAt={
                            item.publishedAt
                          }
                          source={item.source}
                        />
                      </div>

                      <Link
                        href={item.href}
                        className="
                          group/link mt-5
                          inline-flex min-h-10
                          w-fit items-center gap-2
                          rounded-pill
                          text-xs font-semibold
                          text-rice-natural
                          transition-colors
                          hover:text-rice-dark
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-rice-leaf
                          focus-visible:ring-offset-2
                          dark:text-rice-mint
                          dark:hover:text-white
                        "
                      >
                        อ่านข่าว

                        <ArrowRight
                          aria-hidden="true"
                          className="
                            h-4 w-4
                            transition-transform
                            duration-300
                            group-hover/link:translate-x-1
                          "
                        />
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </article>
            );
          })}
        </div>

        {/* Newsletter-style footer */}
        <div
          className="
            relative mt-12 overflow-hidden
            rounded-[2rem]
            bg-rice-dark p-5
            text-white shadow-floating
            sm:p-8
          "
        >
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -right-24 -top-24
              h-72 w-72 rounded-full
              bg-rice-mint/15 blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -bottom-28 -left-20
              h-72 w-72 rounded-full
              bg-rice-leaf/20 blur-3xl
            "
          />

          <div
            className="
              relative flex flex-col
              gap-6
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
                "
              >
                <Wheat
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              </span>

              <div>
                <h2
                  className="
                    font-heading
                    text-xl font-semibold
                    text-white
                    sm:text-2xl
                  "
                >
                  ข่าวสารเพื่อประกอบการตัดสินใจ
                </h2>

                <p
                  className="
                    mt-2 max-w-2xl
                    text-sm leading-6
                    text-white/55
                  "
                >
                  เนื้อหาในหน้าข่าวเป็นข้อมูลสนับสนุน
                  ควรตรวจสอบวันที่ แหล่งที่มา
                  และคำแนะนำจากหน่วยงานหรือผู้เชี่ยวชาญก่อนนำไปใช้
                </p>
              </div>
            </div>

            <Link
              href="/"
              className="
                group inline-flex min-h-12
                w-full shrink-0
                items-center justify-center
                gap-2 rounded-pill
                border border-white/15
                bg-white/[0.07]
                px-5 py-2.5
                text-sm font-semibold
                text-white
                backdrop-blur-glass
                transition-[transform,background-color,border-color]
                duration-300
                hover:-translate-y-0.5
                hover:border-white/25
                hover:bg-white/[0.11]
                active:translate-y-0
                active:scale-[0.98]
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rice-mint
                focus-visible:ring-offset-2
                focus-visible:ring-offset-rice-dark
                sm:w-auto
              "
            >
              กลับหน้าแรก

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
      </div>
    </section>
  );
}