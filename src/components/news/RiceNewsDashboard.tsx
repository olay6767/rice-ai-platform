"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BellRing,
  BookOpenCheck,
  CalendarDays,
  ChevronRight,
  CloudRain,
  CloudSun,
  Droplets,
  Leaf,
  MapPin,
  ShieldAlert,
  Sprout,
  Sun,
  TrendingUp,
  Wind,
} from "lucide-react";
import { useEffect, useState } from "react";

type NewsCategory =
  | "all"
  | "weather"
  | "disease"
  | "price"
  | "knowledge";

interface NewsItem {
  id: string;
  category: Exclude<NewsCategory, "all">;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  image: string;
  imageAlt: string;
  isFeatured?: boolean;
}

interface LiveFeed {
  posts: Array<{
    id: string;
    title: string;
    summary: string;
    category: "weather" | "disease" | "pest" | "price" | "knowledge" | "disaster";
    source_name: string;
    image_url: string | null;
    image_alt: string;
    is_featured: boolean;
    published_at: string;
  }>;
  alerts: Array<{
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
    area_name: string;
  }>;
  prices: Array<{
    id: string;
    rice_type: string;
    price_per_ton: number | string;
    trend: "up" | "down" | "steady";
    change_percent: number | string;
    market_name: string;
    observed_at: string;
  }>;
  recommendations: Array<{
    id: string;
    title: string;
    description: string;
    priority: "normal" | "important";
  }>;
}

const CATEGORY_OPTIONS: Array<{
  id: NewsCategory;
  label: string;
  icon: typeof CloudSun;
}> = [
  { id: "all", label: "ทั้งหมด", icon: BookOpenCheck },
  { id: "weather", label: "อากาศและภัยพิบัติ", icon: CloudRain },
  { id: "disease", label: "โรคและแมลง", icon: ShieldAlert },
  { id: "price", label: "ราคาข้าว", icon: TrendingUp },
  { id: "knowledge", label: "คำแนะนำ", icon: Sprout },
];

// ข้อมูลตัวอย่าง: ภายหลังสามารถแทนที่ด้วยข้อมูลและรูปภาพจาก Admin ได้
const MOCK_NEWS: NewsItem[] = [
  {
    id: "storm-watch",
    category: "weather",
    title: "เฝ้าระวังฝนหนักและลมกระโชกแรงในพื้นที่เสี่ยง",
    summary:
      "เกษตรกรควรตรวจทางระบายน้ำ ค้ำยันต้นข้าวที่ออกรวง และติดตามประกาศในพื้นที่อย่างใกล้ชิด",
    source: "ศูนย์ติดตามสภาพอากาศ Rice AI",
    publishedAt: "วันนี้ · 08:30 น.",
    image: "/images/news/storm-risk-infographic.png",
    imageAlt: "อินโฟกราฟิกแผนที่ความเสี่ยงพายุในประเทศไทย",
    isFeatured: true,
  },
  {
    id: "flood-impact",
    category: "weather",
    title: "เตรียมรับมือน้ำหลาก ลดความเสียหายต่อพื้นที่เกษตร",
    summary:
      "สำรวจคันนา วางแผนสูบน้ำ และย้ายเครื่องมือเกษตรขึ้นที่สูงก่อนฝนตกต่อเนื่อง",
    source: "สรุปความเสี่ยงภัยพิบัติ",
    publishedAt: "วันนี้ · 07:45 น.",
    image: "/images/news/flood-impact-infographic.png",
    imageAlt: "อินโฟกราฟิกความเสียหายจากภัยพิบัติในประเทศไทย",
  },
  {
    id: "blast-warning",
    category: "disease",
    title: "พบสภาพอากาศเอื้อต่อโรคไหม้ข้าวในบางพื้นที่",
    summary:
      "หลีกเลี่ยงการใส่ปุ๋ยไนโตรเจนมากเกินไป และสำรวจใบข้าวช่วงเช้าเพื่อพบอาการระยะแรก",
    source: "ศูนย์เฝ้าระวังโรคข้าว",
    publishedAt: "เมื่อวาน · 16:20 น.",
    image: "/images/news/rice-disease-warning.webp",
    imageAlt: "ใบข้าวสำหรับข่าวแจ้งเตือนโรคข้าว",
  },
  {
    id: "price-update",
    category: "price",
    title: "สรุปราคาข้าวเปลือกรายสัปดาห์สำหรับวางแผนขายผลผลิต",
    summary:
      "เปรียบเทียบแนวโน้มราคาและคุณภาพเมล็ด เพื่อเลือกช่วงเวลาจำหน่ายที่เหมาะสม",
    source: "ข้อมูลราคาตัวอย่าง",
    publishedAt: "เมื่อวาน · 11:10 น.",
    image: "/images/news/rice-price.webp",
    imageAlt: "เมล็ดข้าวและผลผลิตข้าว",
  },
  {
    id: "water-management",
    category: "knowledge",
    title: "วางแผนน้ำในนาช่วงฝนทิ้งช่วงอย่างไรให้ข้าวไม่เครียด",
    summary:
      "รักษาระดับน้ำให้เหมาะกับระยะการเจริญเติบโต และบันทึกปริมาณฝนเพื่อวางแผนรอบถัดไป",
    source: "คลังความรู้เกษตรกร",
    publishedAt: "2 วันที่แล้ว",
    image: "/images/news/rice-weather.webp",
    imageAlt: "นาข้าวและสภาพอากาศ",
  },
  {
    id: "cost-management",
    category: "knowledge",
    title: "4 จุดตรวจต้นทุนก่อนเริ่มฤดูกาลเพาะปลูก",
    summary:
      "ตรวจเมล็ดพันธุ์ ปุ๋ย น้ำมัน และค่าแรงล่วงหน้า เพื่อจัดงบให้พอดีกับแผนการผลิต",
    source: "คำแนะนำจาก Rice AI",
    publishedAt: "3 วันที่แล้ว",
    image: "/images/news/reduce-farm-cost.webp",
    imageAlt: "เกษตรกรตรวจสอบต้นทุนการผลิตข้าว",
  },
];

const FALLBACK_ALERTS = [
  { id: "rain", tone: "rose" as const, title: "ฝนสะสมสูง", description: "ติดตามระดับน้ำในแปลงและทางระบายน้ำ" },
  { id: "blast", tone: "amber" as const, title: "เสี่ยงโรคไหม้ข้าว", description: "พบสภาพความชื้นสูงต่อเนื่อง" },
  { id: "weather", tone: "sky" as const, title: "อากาศประจำพื้นที่", description: "เลือกจังหวัดเพื่อรับข้อมูลที่ตรงกับแปลง" },
];

const FALLBACK_RECOMMENDATION = {
  title: "เตรียมแปลงให้ระบายน้ำได้ก่อนฝนมา",
  steps: [
    "เปิดทางน้ำเข้า–ออก และกำจัดวัชพืชบริเวณคันนา",
    "งดใส่ปุ๋ยก่อนมีฝนหนัก เพื่อลดการสูญเสียธาตุอาหาร",
    "บันทึกสภาพแปลงหลังฝน เพื่อใช้วางแผนรอบถัดไป",
  ],
};

function categoryStyle(category: NewsItem["category"]): string {
  switch (category) {
    case "weather":
      return "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200";
    case "disease":
      return "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200";
    case "price":
      return "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200";
    default:
      return "bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light";
  }
}

function categoryLabel(category: NewsItem["category"]): string {
  return CATEGORY_OPTIONS.find((item) => item.id === category)?.label ?? "ข่าวสาร";
}

function toNewsCategory(category: LiveFeed["posts"][number]["category"]): NewsItem["category"] {
  if (category === "pest") return "disease";
  if (category === "disaster") return "weather";
  return category;
}

function defaultImageFor(category: NewsItem["category"]): string {
  switch (category) {
    case "weather":
      return "/images/news/storm-risk-infographic.png";
    case "disease":
      return "/images/news/rice-disease-warning.webp";
    case "price":
      return "/images/news/rice-price.webp";
    default:
      return "/images/news/rice-weather.webp";
  }
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "อัปเดตล่าสุด";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function RiceNewsDashboard() {
  const [activeCategory, setActiveCategory] = useState<NewsCategory>("all");
  const [liveFeed, setLiveFeed] = useState<LiveFeed | null>(null);

  useEffect(() => {
    let active = true;

    async function loadLiveFeed(): Promise<void> {
      try {
        const response = await fetch("/api/news/feed", { cache: "no-store" });
        const payload = await readJsonResponse<{ data?: LiveFeed }>(response);

        if (active && response.ok && payload.data) {
          setLiveFeed(payload.data);
        }
      } catch {
        // หากยังไม่ได้ติดตั้ง migration จะใช้ข้อมูลตัวอย่างต่อไปโดยไม่ขัดจังหวะผู้ใช้
      }
    }

    void loadLiveFeed();

    function refreshWhenVisible(): void {
      if (document.visibilityState === "visible") {
        void loadLiveFeed();
      }
    }

    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  const publishedNews = (liveFeed?.posts ?? []).map((post): NewsItem => {
    const category = toNewsCategory(post.category);

    return {
      id: post.id,
      category,
      title: post.title,
      summary: post.summary,
      source: post.source_name,
      publishedAt: formatPublishedAt(post.published_at),
      image: post.image_url || defaultImageFor(category),
      imageAlt: post.image_alt || post.title,
      isFeatured: post.is_featured,
    };
  });
  const newsItems = liveFeed === null ? MOCK_NEWS : publishedNews;
  const featured = newsItems.find((item) => item.isFeatured) ?? newsItems[0] ?? null;
  const visibleNews = newsItems.filter(
    (item) => activeCategory === "all" || item.category === activeCategory
  );
  const primaryAlert = liveFeed?.alerts[0];
  const displayedAlerts = liveFeed?.alerts.length
    ? liveFeed.alerts.slice(0, 3).map((alert) => ({
        id: alert.id,
        tone: alert.severity === "high" ? "rose" as const : alert.severity === "medium" ? "amber" as const : "sky" as const,
        title: alert.title,
        description: `${alert.area_name} · ${alert.description}`,
      }))
    : FALLBACK_ALERTS;
  const primaryRecommendation = liveFeed?.recommendations[0];
  const recommendationSteps = primaryRecommendation
    ? primaryRecommendation.description.split(/\n|•/).map((item) => item.trim()).filter(Boolean).slice(0, 3)
    : FALLBACK_RECOMMENDATION.steps;

  return (
    <main className="relative isolate overflow-hidden py-8 sm:py-12 lg:py-14">
      <div
        aria-hidden="true"
        className="ambient-orb -left-32 top-8 h-80 w-80 bg-rice-mint/40 dark:bg-rice-leaf/10"
      />
      <div
        aria-hidden="true"
        className="ambient-orb -right-28 top-96 h-96 w-96 bg-rice-gold/15 dark:bg-rice-gold/[0.04]"
      />

      <div className="dashboard-container relative z-10">
        <header className="mb-7 flex flex-col gap-5 lg:mb-9 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-rice-leaf/20 bg-white/75 px-3 py-1.5 text-xs font-bold text-rice-forest shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.06] dark:text-rice-mint-light">
              <BellRing className="h-3.5 w-3.5 text-rice-gold" />
              ศูนย์ข้อมูลข่าวสาร Rice AI
            </div>
            <h1 className="font-heading text-3xl font-bold tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
              ข่าวสารเพื่อการจัดการข้าว
              <span className="block text-rice-leaf dark:text-rice-mint-light">
                อ่านง่าย ตัดสินใจได้ทันเวลา
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-rice-muted sm:text-base dark:text-white/60">
              รวมข่าวเด่น สภาพอากาศ โรคและแมลง ราคาข้าว และคำแนะนำสำหรับเกษตรกรในหน้าเดียว
            </p>
          </div>

          <div className="inline-flex items-center gap-2 self-start rounded-2xl border border-rice-forest/10 bg-white/70 px-4 py-3 text-xs font-semibold text-rice-forest shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/[0.05] dark:text-white lg:self-auto">
            <CalendarDays className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" />
            {liveFeed ? "ข้อมูลจากผู้ดูแลระบบ" : "ข้อมูลตัวอย่าง · อัปเดตวันนี้ 08:30 น."}
          </div>
        </header>

        <nav
          aria-label="หมวดหมู่ข่าว"
          className="mb-5 flex gap-2 overflow-x-auto pb-1"
        >
          {CATEGORY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = activeCategory === option.id;

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setActiveCategory(option.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-bold transition sm:text-sm ${
                  isActive
                    ? "border-rice-forest bg-rice-forest text-white shadow-sm dark:border-rice-mint-light dark:bg-rice-mint-light dark:text-rice-dark"
                    : "border-rice-forest/10 bg-white/70 text-rice-forest hover:border-rice-leaf/35 hover:bg-rice-mint/20 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.1]"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </nav>

        <section
          aria-label="ข่าวเด่นและสรุปข้อมูลสำคัญ"
          className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]"
        >
          {featured ? (
            <Link
              href={`/news/${featured.id}`}
              aria-label={`อ่านข่าว: ${featured.title}`}
              className="group relative block min-h-[430px] overflow-hidden rounded-[2rem] bg-rice-dark shadow-[0_20px_60px_rgba(11,46,28,0.2)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/35"
            >
              <Image
                src={featured.image}
                alt={featured.imageAlt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 64vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-rice-dark via-rice-dark/65 to-rice-dark/10" />
              <div className="absolute inset-x-0 bottom-0 p-6 sm:p-8">
                <span className="inline-flex rounded-full bg-rice-gold px-3 py-1 text-xs font-bold text-rice-dark">
                  ข่าวเด่น · {categoryLabel(featured.category)}
                </span>
                <h2 className="mt-4 max-w-2xl font-heading text-2xl font-bold leading-tight text-white sm:text-3xl">
                  {featured.title}
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-white/75">
                  {featured.summary}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-semibold text-rice-mint-light">
                  <span>{featured.source}</span>
                  <span className="h-1 w-1 rounded-full bg-rice-mint-light/60" />
                  <span>{featured.publishedAt}</span>
                  <span className="inline-flex items-center gap-1">
                    อ่านสรุป <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ) : (
            <section className="flex min-h-[430px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-rice-forest/20 bg-white/60 p-8 text-center shadow-sm dark:border-white/15 dark:bg-white/[0.035]">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light">
                <BookOpenCheck className="h-7 w-7" />
              </span>
              <h2 className="mt-5 font-heading text-xl font-bold text-rice-forest dark:text-white">
                ยังไม่มีข่าวที่เผยแพร่
              </h2>
              <p className="mt-2 max-w-md text-sm leading-6 text-rice-muted dark:text-white/50">
                ข่าวฉบับร่างจะยังไม่แสดงในหน้านี้ กรุณาเผยแพร่ข่าวจากระบบผู้ดูแลก่อน
              </p>
            </section>
          )}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <section className="glass-card overflow-hidden p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-rice-muted dark:text-white/45">
                    สภาพอากาศวันนี้
                  </p>
                  <h2 className="mt-1 font-heading text-xl font-bold text-rice-forest dark:text-white">
                    อุดรธานี
                  </h2>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200">
                  <CloudSun className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-5 flex items-end justify-between">
                <span className="font-heading text-4xl font-bold tracking-tight text-rice-forest dark:text-white">
                  31°
                </span>
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700 dark:bg-sky-400/10 dark:text-sky-200">
                  ฝน 40%
                </span>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2 border-t border-rice-forest/8 pt-4 text-center text-[11px] font-semibold text-rice-muted dark:border-white/8 dark:text-white/50">
                <span className="inline-flex flex-col items-center gap-1"><Droplets className="h-3.5 w-3.5 text-sky-600" />ความชื้น 74%</span>
                <span className="inline-flex flex-col items-center gap-1"><Wind className="h-3.5 w-3.5 text-rice-leaf" />ลม 12 กม./ชม.</span>
                <span className="inline-flex flex-col items-center gap-1"><Sun className="h-3.5 w-3.5 text-rice-gold" />UV ปานกลาง</span>
              </div>
            </section>

            <section className="rounded-3xl border border-rose-200 bg-rose-50 p-5 dark:border-rose-400/20 dark:bg-rose-400/10">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-sm">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold text-rose-700 dark:text-rose-200">
                    แจ้งเตือนโรคและแมลง
                  </p>
                  <h2 className="mt-1 text-base font-bold leading-6 text-rice-forest dark:text-white">
                    {primaryAlert?.title ?? "ระวังโรคไหม้ข้าวในแปลงที่มีความชื้นสูง"}
                  </h2>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-rose-800/80 dark:text-rose-100/75">
                {primaryAlert?.description ?? "สำรวจใบข้าวทุก 3–5 วัน และใช้ระบบตรวจโรคข้าวเมื่อพบจุดผิดปกติ"}
              </p>
              <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 dark:text-rose-200">
                ดูคำแนะนำ <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </section>
          </div>
        </section>

        <section className="mt-5">
          <article className="rounded-3xl bg-rice-forest p-5 text-white shadow-[0_18px_45px_rgba(11,46,28,0.18)] sm:p-6 dark:bg-white/[0.07]">
            <div className="flex items-center gap-2 text-rice-mint-light">
              <Sprout className="h-4 w-4" />
              <span className="text-xs font-bold">คำแนะนำสำหรับวันนี้</span>
            </div>
            <h2 className="mt-3 font-heading text-xl font-bold leading-snug">
              {primaryRecommendation?.title ?? FALLBACK_RECOMMENDATION.title}
            </h2>
            <ol className="mt-4 space-y-3 text-sm leading-6 text-white/75">
              {recommendationSteps.map((step, index) => (
                <li key={`${step}-${index}`} className="flex gap-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-rice-mint-light">{index + 1}</span>{step}</li>
              ))}
            </ol>
          </article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)]">
          <article className="glass-card p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-rice-leaf dark:text-rice-mint-light">อัปเดตล่าสุด</p>
                <h2 className="mt-1 font-heading text-xl font-bold text-rice-forest dark:text-white">
                  ข่าวและความรู้สำหรับเกษตรกร
                </h2>
              </div>
              <span className="text-xs font-semibold text-rice-muted dark:text-white/45">
                {visibleNews.length.toLocaleString("th-TH")} รายการ
              </span>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {visibleNews.filter((item) => !item.isFeatured).map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  aria-label={`อ่านข่าว: ${item.title}`}
                  className="group overflow-hidden rounded-2xl border border-rice-forest/8 bg-white/60 transition hover:-translate-y-0.5 hover:border-rice-leaf/25 hover:shadow-lg dark:border-white/8 dark:bg-white/[0.035]"
                >
                  <div className="relative h-36 overflow-hidden">
                    <Image
                      src={item.image}
                      alt={item.imageAlt}
                      fill
                      sizes="(max-width: 640px) 100vw, 40vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${categoryStyle(item.category)}`}>
                        {categoryLabel(item.category)}
                      </span>
                      <span className="text-[10px] font-semibold text-rice-muted dark:text-white/40">
                        {item.publishedAt}
                      </span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6 text-rice-forest dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-rice-muted dark:text-white/50">
                      {item.summary}
                    </p>
                    <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-rice-leaf dark:text-rice-mint-light">
                      อ่านข่าว <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
              {visibleNews.filter((item) => !item.isFeatured).length === 0 && (
                <p className="rounded-2xl border border-dashed border-rice-forest/15 p-6 text-center text-sm text-rice-muted dark:border-white/10 dark:text-white/50 sm:col-span-2">
                  ยังไม่มีข่าวอื่นในหมวดนี้
                </p>
              )}
            </div>
          </article>

          <aside className="space-y-5">
            <section className="glass-card p-5">
              <div className="flex items-center gap-2">
                <BellRing className="h-4 w-4 text-rose-600 dark:text-rose-300" />
                <h2 className="font-heading text-base font-bold text-rice-forest dark:text-white">
                  การแจ้งเตือนสำคัญ
                </h2>
              </div>
              <div className="mt-4 space-y-3">
                {displayedAlerts.map((alert) => (
                  <AlertItem key={alert.id} tone={alert.tone} icon={alert.tone === "rose" ? AlertTriangle : alert.tone === "amber" ? Leaf : MapPin} title={alert.title} description={alert.description} />
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-3xl border border-rice-gold/25 bg-rice-gold/10 p-5 dark:border-rice-gold/15 dark:bg-rice-gold/[0.06]">
              <p className="text-xs font-bold text-amber-800 dark:text-rice-gold">อินโฟกราฟิกประจำวัน</p>
              <h2 className="mt-2 font-heading text-lg font-bold leading-7 text-rice-forest dark:text-white">
                ติดตามความเสี่ยงจากพายุและน้ำหลากก่อนวางแผนงานในนา
              </h2>
              <p className="mt-3 text-xs leading-5 text-rice-muted dark:text-white/50">
                {liveFeed ? "เนื้อหาข่าวและการแจ้งเตือนถูกจัดการจากหลังบ้านแล้ว" : "รูปตัวอย่างนี้พร้อมรองรับการเปลี่ยนโดยผู้ดูแลระบบในภายหลัง"}
              </p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-amber-800 dark:text-rice-gold">
                เปิดดูอินโฟกราฟิก <ArrowUpRight className="h-3.5 w-3.5" />
              </span>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}

function AlertItem({
  tone,
  icon: Icon,
  title,
  description,
}: {
  tone: "rose" | "amber" | "sky";
  icon: typeof AlertTriangle;
  title: string;
  description: string;
}) {
  const toneClass = {
    rose: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-200",
    amber: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    sky: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-2xl bg-rice-surface-soft/70 p-3 dark:bg-white/[0.035]">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-xs font-bold text-rice-forest dark:text-white">{title}</p>
        <p className="mt-1 text-[11px] leading-5 text-rice-muted dark:text-white/45">{description}</p>
      </div>
    </div>
  );
}
