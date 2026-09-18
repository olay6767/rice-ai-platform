"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Eye, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
      className="group flex min-h-[650px] flex-col overflow-hidden rounded-[1.5rem] border border-rice-forest/10 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.09)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 dark:border-white/10 dark:bg-white/[0.055]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-rice-surface-soft">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        <h2 className="line-clamp-2 font-heading text-xl font-bold leading-8 text-rice-forest dark:text-white">
          {article.title}
        </h2>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-rice-muted dark:text-white/60">
          {article.summary}
        </p>
        <div className="mt-5">
          <ArticleMeta article={article} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <span className="text-xs font-semibold text-rice-muted dark:text-white/50">
            {categoryLabel(article.category)}
          </span>
          <span className="inline-flex min-h-9 items-center rounded-full bg-zinc-800 px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(24,24,27,0.2)] transition group-hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900">
            ดูข่าวสาร
          </span>
        </div>
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
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold text-rice-muted dark:text-white/50">
            {categoryLabel(article.category)}
          </span>
          <span className="inline-flex min-h-9 items-center rounded-full bg-zinc-800 px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(24,24,27,0.2)] transition group-hover:bg-zinc-900 dark:bg-zinc-200 dark:text-zinc-900">
            ดูข่าวสาร
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function InfographicNewsBrowser() {
  const [activeCategory, setActiveCategory] =
    useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [adminPosts, setAdminPosts] = useState<AdminPostSummary[] | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const activeCategoryIndex = Math.max(
    0,
    INFOGRAPHIC_CATEGORIES.findIndex(
      (category) => category.id === activeCategory
    )
  );

  useEffect(() => {
    if (isSearchOpen) {
      searchInputRef.current?.focus();
    }
  }, [isSearchOpen]);

  useEffect(() => {
    let active = true;

    async function loadPosts() {
      try {
        const response = await fetch("/api/news/feed", { cache: "no-store" });
        const payload = await readJsonResponse<NewsFeedResponse>(response);

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
          <div
            className={`relative h-12 overflow-hidden rounded-xl bg-white shadow-[0_8px_22px_rgba(15,23,42,0.1)] ring-1 ring-inset ring-slate-200/80 transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:bg-white/[0.09] dark:ring-white/15 ${isSearchOpen || query ? "w-full lg:w-[380px]" : "w-12"}`}
          >
            {isSearchOpen || query ? (
              <label className="relative block h-full w-full">
                <span className="sr-only">ค้นหาข่าวสาร</span>
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-700 dark:text-white/70"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onBlur={() => {
                    if (!query.trim()) setIsSearchOpen(false);
                  }}
                  placeholder="ค้นหาที่นี่"
                  className="h-full w-full bg-transparent pl-12 pr-5 text-sm text-rice-forest outline-none placeholder:text-zinc-400 dark:text-white dark:placeholder:text-white/40"
                />
              </label>
            ) : (
              <button
                type="button"
                aria-label="เปิดช่องค้นหาข่าวสาร"
                onClick={() => setIsSearchOpen(true)}
                className="grid h-12 w-12 place-items-center text-zinc-800 transition hover:scale-105 dark:text-white"
              >
                <Search aria-hidden="true" className="h-5 w-5" />
              </button>
            )}
          </div>
        </header>

        <div className="mt-7 flex items-start justify-between gap-4 border-b border-rice-forest/10 pb-6 dark:border-white/10">
          <nav
            aria-label="หมวดหมู่ข่าวสาร"
            className="min-w-0 flex-1 overflow-x-auto pb-2"
          >
            <div className="relative flex w-max gap-2">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 w-32 rounded-xl bg-amber-100/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_7px_20px_rgba(251,191,36,0.2)] ring-1 ring-inset ring-white/80 backdrop-blur-lg transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-amber-200/15 dark:ring-white/15"
                style={{ transform: `translateX(${activeCategoryIndex * 136}px)` }}
              >
                <span className="absolute left-4 top-1.5 h-2 w-6 rounded-full bg-white/75 blur-[1px]" />
              </span>
              {INFOGRAPHIC_CATEGORIES.map((category) => {
                const isActive = activeCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory(category.id)}
                    className={`relative z-10 min-h-10 w-32 shrink-0 rounded-xl px-3 text-sm font-semibold transition-colors duration-300 ${
                      isActive
                        ? "text-amber-950 dark:text-amber-100"
                        : "bg-white/75 text-rice-forest shadow-[0_5px_16px_rgba(15,23,42,0.06)] hover:text-amber-800 dark:bg-white/[0.055] dark:text-white"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="flex shrink-0 items-center">
            <button
              type="button"
              aria-label="แสดงแบบตาราง"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
              className={`grid h-11 w-11 place-items-center transition hover:scale-110 ${viewMode === "grid" ? "opacity-100" : "opacity-45 hover:opacity-75"}`}
            >
              <Image
                src="/images/49.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 scale-125 object-contain dark:invert"
              />
            </button>
            <span
              aria-hidden="true"
              className="mx-1 h-7 w-px bg-zinc-400/80 dark:bg-white/35"
            />
            <button
              type="button"
              aria-label="แสดงแบบรายการ"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
              className={`grid h-11 w-11 place-items-center transition hover:scale-110 ${viewMode === "list" ? "opacity-100" : "opacity-45 hover:opacity-75"}`}
            >
              <Image
                src="/images/50.png"
                alt=""
                width={40}
                height={40}
                className="h-10 w-10 scale-125 object-contain dark:invert"
              />
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
