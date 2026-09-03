"use client";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Eye, Grid3X3, List, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  adminPostToArticle,
  categoryLabel,
  formatArticleDate,
  INFOGRAPHIC_CATEGORIES,
  PREVIEW_INFOGRAPHIC_ARTICLES,
  type AdminPostSummary,
  type InfographicArticle,
} from "@/lib/infographic/articles";

type ViewMode = "grid" | "list";
type CategoryFilter = (typeof INFOGRAPHIC_CATEGORIES)[number]["id"];

interface NewsFeedResponse {
  data?: {
    posts?: AdminPostSummary[];
  };
}

function ArticleMeta({ article }: { article: InfographicArticle }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-rice-muted dark:text-white/55">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        {formatArticleDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <Eye aria-hidden="true" className="h-4 w-4" />
        {article.viewCount.toLocaleString("th-TH")} ครั้ง
      </span>
    </div>
  );
}

function GridCard({ article }: { article: InfographicArticle }) {
  return (
    <Link
      href={`/infographic/${article.id}`}
      className="group overflow-hidden rounded-[1.5rem] border border-rice-forest/10 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 dark:border-white/10 dark:bg-white/[0.055]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-rice-surface-soft">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="p-5 sm:p-6">
        <h2 className="line-clamp-2 font-heading text-xl font-bold leading-8 text-rice-forest dark:text-white">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-rice-muted dark:text-white/60">
          {article.summary}
        </p>
        <div className="mt-5">
          <ArticleMeta article={article} />
        </div>
        <span className="mt-4 inline-flex rounded-full border border-rice-forest/10 px-3 py-1.5 text-xs font-semibold text-rice-forest dark:border-white/10 dark:text-rice-mint-light">
          {categoryLabel(article.category)}
        </span>
      </div>
    </Link>
  );
}

function ListCard({ article }: { article: InfographicArticle }) {
  return (
    <Link
      href={`/infographic/${article.id}`}
      className="group flex flex-col overflow-hidden rounded-[1.5rem] border border-rice-forest/10 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 sm:flex-row dark:border-white/10 dark:bg-white/[0.055]"
    >
      <div className="relative aspect-[16/10] shrink-0 overflow-hidden bg-rice-surface-soft sm:aspect-auto sm:w-64 lg:w-80">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(max-width: 639px) 100vw, 320px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-5 sm:p-6">
        <h2 className="line-clamp-2 font-heading text-xl font-bold leading-8 text-rice-forest sm:text-2xl dark:text-white">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-rice-muted dark:text-white/60">
          {article.summary}
        </p>
        <div className="mt-4">
          <ArticleMeta article={article} />
        </div>
        <span className="mt-4 inline-flex w-fit rounded-full border border-rice-forest/10 px-3 py-1.5 text-xs font-semibold text-rice-forest dark:border-white/10 dark:text-rice-mint-light">
          {categoryLabel(article.category)}
        </span>
      </div>
    </Link>
  );
}

export default function InfographicNewsBrowser() {
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [adminPosts, setAdminPosts] = useState<AdminPostSummary[] | null>(null);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const response = await fetch("/api/news/feed", { cache: "no-store" });
        const payload = (await response.json()) as NewsFeedResponse;

        if (active && response.ok) {
          setAdminPosts(payload.data?.posts ?? []);
        }
      } catch {
        // คงข้อมูลตัวอย่างไว้เมื่อฐานข้อมูลยังไม่พร้อม
      }
    }

    void loadPosts();

    return () => {
      active = false;
    };
  }, []);

  const articles = useMemo(() => {
    const source = adminPosts?.length
      ? adminPosts.map(adminPostToArticle)
      : PREVIEW_INFOGRAPHIC_ARTICLES;

    return [...source].sort(
      (left, right) =>
        Date.parse(right.publishedAt) - Date.parse(left.publishedAt)
    );
  }, [adminPosts]);

  const visibleArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("th-TH");

    return articles.filter((article) => {
      const matchesCategory =
        activeCategory === "all" || article.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        `${article.title} ${article.summary}`
          .toLocaleLowerCase("th-TH")
          .includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, articles, query]);

  return (
    <main className="py-8 sm:py-12 lg:py-14">
      <div className="dashboard-container">
        <header className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="font-heading text-4xl font-bold tracking-[-0.035em] text-rice-forest sm:text-5xl dark:text-white">
            ข่าวสาร
          </h1>
          <label className="relative block w-full lg:w-[380px]">
            <span className="sr-only">ค้นหาข่าวสาร</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rice-muted dark:text-white/45"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาที่นี่"
              className="min-h-12 w-full rounded-full border border-rice-forest/10 bg-white pl-12 pr-5 text-sm text-rice-forest outline-none transition placeholder:text-rice-muted/75 focus:border-rice-leaf focus:ring-4 focus:ring-rice-leaf/10 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-white/40"
            />
          </label>
        </header>

        <div className="mt-7 flex items-start justify-between gap-4 border-b border-rice-forest/10 pb-6 dark:border-white/10">
          <nav
            aria-label="หมวดหมู่ข่าวสาร"
            className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1"
          >
            {INFOGRAPHIC_CATEGORIES.map((category) => {
              const isActive = activeCategory === category.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setActiveCategory(category.id)}
                  className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
                    isActive
                      ? "border-rice-forest bg-rice-forest text-white dark:border-rice-mint-light dark:bg-rice-mint-light dark:text-rice-dark"
                      : "border-rice-forest/10 bg-white text-rice-forest hover:border-rice-leaf/40 dark:border-white/10 dark:bg-white/[0.055] dark:text-white"
                  }`}
                >
                  {category.label}
                </button>
              );
            })}
          </nav>

          <div className="flex shrink-0 items-center rounded-full border border-rice-forest/10 bg-white p-1 dark:border-white/10 dark:bg-white/[0.055]">
            <button
              type="button"
              aria-label="แสดงแบบตาราง"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={`grid h-9 w-9 place-items-center rounded-full transition ${
                viewMode === "grid"
                  ? "bg-rice-forest text-white dark:bg-rice-mint-light dark:text-rice-dark"
                  : "text-rice-muted hover:text-rice-forest dark:text-white/50 dark:hover:text-white"
              }`}
            >
              <Grid3X3 aria-hidden="true" className="h-4 w-4" />
            </button>
            <span
              aria-hidden="true"
              className="mx-1 h-5 w-px bg-rice-forest/15 dark:bg-white/15"
            />
            <button
              type="button"
              aria-label="แสดงแบบรายการ"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`grid h-9 w-9 place-items-center rounded-full transition ${
                viewMode === "list"
                  ? "bg-rice-forest text-white dark:bg-rice-mint-light dark:text-rice-dark"
                  : "text-rice-muted hover:text-rice-forest dark:text-white/50 dark:hover:text-white"
              }`}
            >
              <List aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>

        <section
          aria-label="รายการข่าวสาร"
          className={
            viewMode === "grid"
              ? "mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "mt-8 flex flex-col gap-5"
          }
        >
          {visibleArticles.map((article) =>
            viewMode === "grid" ? (
              <GridCard key={article.id} article={article} />
            ) : (
              <ListCard key={article.id} article={article} />
            )
          )}
        </section>
      </div>
    </main>
  );
}
