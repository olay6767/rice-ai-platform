import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Newspaper } from "lucide-react";

import {
  getMockNewsArticle,
  type PublicNewsCategory,
} from "@/lib/news/mock-articles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "อ่านข่าว",
  description: "ข่าวสารและความรู้สำหรับเกษตรกรจาก Rice AI",
};

type ArticleCategory = PublicNewsCategory | "pest" | "disaster";

interface NewsArticle {
  id: string;
  category: ArticleCategory;
  title: string;
  summary: string;
  body: string[];
  source: string;
  publishedAt: string;
  image: string;
  imageAlt: string;
}

function formatPublishedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "อัปเดตล่าสุด";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(date);
}

function categoryLabel(category: ArticleCategory): string {
  const labels: Record<ArticleCategory, string> = {
    weather: "สภาพอากาศและภัยพิบัติ",
    disease: "โรคข้าว",
    pest: "โรคและแมลง",
    price: "ราคาข้าว",
    knowledge: "ความรู้เกษตร",
    disaster: "ภัยพิบัติ",
  };

  return labels[category];
}

function categoryClass(category: ArticleCategory): string {
  if (category === "disease" || category === "pest") {
    return "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200";
  }

  if (category === "price") {
    return "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200";
  }

  if (category === "weather" || category === "disaster") {
    return "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-200";
  }

  return "bg-rice-mint/55 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light";
}

function defaultImageFor(category: ArticleCategory): string {
  if (category === "disease" || category === "pest") {
    return "/images/news/rice-disease-warning.webp";
  }

  if (category === "price") {
    return "/images/news/rice-price.webp";
  }

  if (category === "weather" || category === "disaster") {
    return "/images/news/storm-risk-infographic.png";
  }

  return "/images/news/rice-weather.webp";
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getArticle(id: string): Promise<NewsArticle | undefined> {
  const mockArticle = getMockNewsArticle(id);

  if (mockArticle) {
    return mockArticle;
  }

  if (!isUuid(id)) {
    return undefined;
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news_posts")
      .select(
        "id, title, summary, body, category, source_name, image_url, image_alt, published_at"
      )
      .eq("id", id)
      .maybeSingle();

    if (error || !data || !data.published_at) {
      return undefined;
    }

    const rawBody = typeof data.body === "string" ? data.body : "";
    const body = rawBody.trim()
      ? rawBody.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean)
      : [data.summary];
    const category = data.category as ArticleCategory;

    return {
      id: data.id,
      category,
      title: data.title,
      summary: data.summary,
      body,
      source: data.source_name,
      publishedAt: formatPublishedAt(data.published_at),
      image: data.image_url || defaultImageFor(category),
      imageAlt: data.image_alt || data.title,
    };
  } catch {
    return undefined;
  }
}

export default async function NewsArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) {
    notFound();
  }

  return (
    <main className="relative isolate overflow-hidden py-7 sm:py-12 lg:py-14">
      <div
        aria-hidden="true"
        className="ambient-orb -left-32 top-10 h-72 w-72 bg-rice-mint/35 dark:bg-rice-leaf/10"
      />
      <div className="dashboard-container relative z-10 max-w-5xl">
        <Link
          href="/news"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rice-forest/10 bg-white/75 px-3.5 text-sm font-bold text-rice-forest shadow-sm transition hover:bg-rice-mint/35 dark:border-white/10 dark:bg-white/[0.05] dark:text-white dark:hover:bg-white/[0.1]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          กลับไปหน้าข่าว
        </Link>

        <article className="mt-5 overflow-hidden rounded-[2rem] border border-white/70 bg-white/80 shadow-glass-lg backdrop-blur dark:border-white/10 dark:bg-white/[0.055]">
          <div className="relative aspect-[16/9] bg-rice-surface-soft sm:aspect-[16/7]">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 960px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-rice-dark/45 via-transparent to-transparent" />
          </div>

          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className={`rounded-full px-3 py-1.5 text-xs font-bold ${categoryClass(article.category)}`}>
                {categoryLabel(article.category)}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rice-muted dark:text-white/50">
                <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
                {article.publishedAt}
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl font-heading text-3xl font-bold leading-tight tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
              {article.title}
            </h1>
            <p className="mt-5 max-w-3xl border-l-4 border-rice-leaf/45 pl-4 text-base leading-8 text-rice-muted sm:text-lg dark:text-white/65">
              {article.summary}
            </p>

            <div className="mt-8 max-w-3xl space-y-5 text-base leading-8 text-rice-text dark:text-white/80">
              {article.body.map((paragraph, index) => (
                <p key={`${article.id}-${index}`}>{paragraph}</p>
              ))}
            </div>

            <footer className="mt-9 flex flex-col gap-3 border-t border-rice-forest/10 pt-5 text-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
              <span className="inline-flex items-center gap-2 font-semibold text-rice-muted dark:text-white/55">
                <Newspaper className="h-4 w-4 text-rice-leaf dark:text-rice-mint-light" aria-hidden="true" />
                แหล่งข้อมูล: {article.source}
              </span>
              <Link
                href="/news"
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-rice-forest px-4 text-sm font-bold text-white transition hover:bg-rice-dark dark:bg-rice-mint-light dark:text-rice-dark"
              >
                ดูข่าวเพิ่มเติม
              </Link>
            </footer>
          </div>
        </article>
      </div>
    </main>
  );
}
