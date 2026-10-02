"use client";

import { readJsonResponse } from "@/lib/http/json";

import Image from "next/image";
import Link from "next/link";
import {
  CalendarDays,
  Eye,
  Grid2X2,
  List,
  Search,
  X,
} from "lucide-react";
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
import InfographicLoadingState from "./InfographicLoadingState";

type ViewMode = "grid" | "list";
type CategoryFilter = (typeof INFOGRAPHIC_CATEGORIES)[number]["id"];

interface NewsFeedResponse {
  data?: {
    posts?: AdminPostSummary[];
  };
}

function ArticleMeta({
  article,
  compact = false,
}: {
  article: InfographicArticle;
  compact?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs font-medium text-rice-muted sm:gap-x-4 dark:text-white/55">
      <span className="inline-flex items-center gap-1.5">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        {formatArticleDate(article.publishedAt)}
      </span>
      <span
        className={`items-center gap-1.5 ${compact ? "hidden sm:inline-flex" : "inline-flex"}`}
      >
        <Eye aria-hidden="true" className="h-4 w-4" />
        {article.viewCount.toLocaleString("th-TH")} ครั้ง
      </span>
    </div>
  );
}

function GridCard({
  article,
  eager = false,
}: {
  article: InfographicArticle;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/infographic/${article.id}`}
      className="group flex min-h-0 flex-col overflow-hidden rounded-[1.35rem] border border-rice-forest/10 bg-white shadow-[0_10px_28px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_rgba(15,23,42,0.14)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 sm:min-h-[650px] sm:rounded-[1.5rem] dark:border-white/10 dark:bg-white/[0.055]"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-rice-surface-soft sm:aspect-[4/5]">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col p-4 sm:p-6">
        <h2 className="line-clamp-2 font-heading text-lg font-bold leading-7 text-rice-forest sm:text-xl sm:leading-8 dark:text-white">
          {article.title}
        </h2>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-rice-muted sm:mt-2 dark:text-white/60">
          {article.summary}
        </p>
        <div className="mt-3 sm:mt-5">
          <ArticleMeta article={article} />
        </div>
        <div className="mt-4 flex items-end justify-between gap-3 sm:mt-auto sm:pt-5">
          <span className="rounded-full bg-rice-surface-soft px-3 py-1.5 text-xs font-semibold text-rice-muted dark:bg-white/[0.07] dark:text-white/55">
            {categoryLabel(article.category)}
          </span>
          <span className="inline-flex min-h-10 items-center rounded-full bg-rice-forest px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(24,24,27,0.16)] transition group-hover:bg-rice-leaf dark:bg-rice-mint-light dark:text-rice-dark">
            ดูข่าวสาร
          </span>
        </div>
      </div>
    </Link>
  );
}

function ListCard({
  article,
  eager = false,
}: {
  article: InfographicArticle;
  eager?: boolean;
}) {
  return (
    <Link
      href={`/infographic/${article.id}`}
      className="group grid grid-cols-[112px_minmax(0,1fr)] overflow-hidden rounded-2xl border border-rice-forest/10 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 sm:flex sm:flex-row sm:rounded-[1.5rem] dark:border-white/10 dark:bg-white/[0.055]"
    >
      <div className="relative min-h-[156px] shrink-0 overflow-hidden bg-rice-surface-soft sm:min-h-0 sm:w-64 lg:w-80">
        <Image
          src={article.image}
          alt={article.imageAlt}
          fill
          loading={eager ? "eager" : "lazy"}
          sizes="(max-width: 639px) 112px, 320px"
          className="object-cover transition duration-500 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center p-3.5 sm:p-6">
        <h2 className="line-clamp-2 font-heading text-base font-bold leading-6 text-rice-forest sm:text-2xl sm:leading-8 dark:text-white">
          {article.title}
        </h2>
        <p className="mt-2 hidden line-clamp-2 text-sm leading-6 text-rice-muted sm:block dark:text-white/60">
          {article.summary}
        </p>
        <div className="mt-2.5 sm:mt-4">
          <ArticleMeta article={article} compact />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-3 sm:mt-4">
          <span className="line-clamp-1 text-[11px] font-semibold text-rice-leaf sm:text-xs dark:text-rice-mint-light">
            {categoryLabel(article.category)}
          </span>
          <span className="hidden min-h-9 items-center rounded-full bg-rice-forest px-4 text-xs font-bold text-white shadow-[0_8px_18px_rgba(24,24,27,0.16)] transition group-hover:bg-rice-leaf sm:inline-flex dark:bg-rice-mint-light dark:text-rice-dark">
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
  const [adminPosts, setAdminPosts] = useState<AdminPostSummary[] | null>(null);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);

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
      } finally {
        if (active) setIsLoadingPosts(false);
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

  const hasActiveFilters = activeCategory !== "all" || Boolean(query.trim());

  return (
    <main className="py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-12 sm:pb-12 lg:py-14">
      <div className="dashboard-container">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-[-0.035em] text-rice-forest sm:text-5xl dark:text-white">
              ข่าวสาร
            </h1>
            <p className="mt-1.5 max-w-xl text-sm leading-6 text-rice-muted sm:mt-2 dark:text-white/55">
              ข่าว ความรู้ และแนวทางดูแลนาข้าวที่อ่านง่ายในทุกวัน
            </p>
          </div>
          <label className="relative block h-12 w-full lg:w-[380px]">
            <span className="sr-only">ค้นหาข่าวสาร</span>
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rice-leaf dark:text-rice-mint-light"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ค้นหาข่าวหรือความรู้เรื่องข้าว"
              className="h-full w-full rounded-2xl bg-white pl-12 pr-12 text-sm text-rice-forest shadow-[0_8px_22px_rgba(15,23,42,0.08)] outline-none ring-1 ring-inset ring-rice-forest/10 transition focus:ring-2 focus:ring-rice-leaf/35 [&::-webkit-search-cancel-button]:appearance-none dark:bg-white/[0.09] dark:text-white dark:ring-white/15 dark:placeholder:text-white/40"
            />
            {query ? (
              <button
                type="button"
                aria-label="ล้างคำค้นหา"
                onClick={() => setQuery("")}
                className="absolute right-1.5 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-xl text-rice-muted transition hover:bg-rice-surface-soft hover:text-rice-forest focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf/35 dark:text-white/55 dark:hover:bg-white/10 dark:hover:text-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            ) : null}
          </label>
        </header>

        <div className="mt-5 border-b border-rice-forest/10 pb-5 sm:mt-7 dark:border-white/10">
          <nav
            aria-label="หมวดหมู่ข่าวสาร"
            className="-mx-1 overflow-x-auto overscroll-x-contain px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            <div className="flex w-max snap-x snap-mandatory gap-2 pr-5">
              {INFOGRAPHIC_CATEGORIES.map((category) => {
                const isActive = activeCategory === category.id;

                return (
                  <button
                    key={category.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setActiveCategory(category.id)}
                    className={`min-h-11 shrink-0 snap-start whitespace-nowrap rounded-xl px-4 text-sm font-semibold ring-1 ring-inset transition-colors duration-200 ${
                      isActive
                        ? "bg-amber-100 text-amber-950 shadow-[0_7px_20px_rgba(251,191,36,0.18)] ring-amber-200/80 dark:bg-amber-200/15 dark:text-amber-100 dark:ring-amber-100/20"
                        : "bg-white/75 text-rice-forest shadow-[0_5px_16px_rgba(15,23,42,0.05)] ring-rice-forest/8 hover:bg-white hover:text-amber-800 dark:bg-white/[0.055] dark:text-white dark:ring-white/10"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="mt-3 flex items-center justify-between gap-3">
            <p aria-live="polite" className="text-xs font-semibold text-rice-muted dark:text-white/55">
              {isLoadingPosts
                ? "กำลังเตรียมรายการข่าว"
                : `${visibleArticles.length.toLocaleString("th-TH")} รายการ`}
            </p>
            <div
              className="flex shrink-0 items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-inset ring-rice-forest/10 dark:bg-white/[0.055] dark:ring-white/10"
              aria-label="รูปแบบการแสดงข่าว"
            >
              <button
                type="button"
                aria-label="แสดงแบบตาราง"
                aria-pressed={viewMode === "grid"}
                onClick={() => setViewMode("grid")}
                className={`grid h-10 w-10 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf/35 ${
                  viewMode === "grid"
                    ? "bg-rice-forest text-white shadow-sm dark:bg-rice-mint-light dark:text-rice-dark"
                    : "text-rice-muted hover:bg-rice-surface-soft hover:text-rice-forest dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <Grid2X2 aria-hidden="true" className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="แสดงแบบรายการ"
                aria-pressed={viewMode === "list"}
                onClick={() => setViewMode("list")}
                className={`grid h-10 w-10 place-items-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf/35 ${
                  viewMode === "list"
                    ? "bg-rice-forest text-white shadow-sm dark:bg-rice-mint-light dark:text-rice-dark"
                    : "text-rice-muted hover:bg-rice-surface-soft hover:text-rice-forest dark:text-white/45 dark:hover:bg-white/10 dark:hover:text-white"
                }`}
              >
                <List aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        <section
          aria-label="รายการข่าวสาร"
          aria-busy={isLoadingPosts}
          className={
            viewMode === "grid"
              ? "mt-5 grid grid-cols-1 gap-4 sm:mt-8 sm:gap-6 md:grid-cols-2 lg:grid-cols-3"
              : "mt-5 flex flex-col gap-3 sm:mt-8 sm:gap-5"
          }
        >
          {isLoadingPosts ? (
            <div className={viewMode === "grid" ? "col-span-full" : undefined}>
              <InfographicLoadingState compact />
            </div>
          ) : visibleArticles.length ? (
            visibleArticles.map((article, index) =>
              viewMode === "grid" ? (
                <GridCard
                  key={article.id}
                  article={article}
                  eager={index === 0}
                />
              ) : (
                <ListCard
                  key={article.id}
                  article={article}
                  eager={index === 0}
                />
              )
            )
          ) : (
            <div
              className={`${viewMode === "grid" ? "col-span-full" : ""} flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-rice-forest/15 bg-white/65 px-6 py-10 text-center dark:border-white/15 dark:bg-white/[0.035]`}
            >
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-rice-surface-soft text-rice-leaf dark:bg-white/[0.08] dark:text-rice-mint-light">
                <Search aria-hidden="true" className="h-6 w-6" />
              </span>
              <h2 className="mt-4 font-heading text-lg font-bold text-rice-forest dark:text-white">
                ไม่พบข่าวสารที่ตรงกับการค้นหา
              </h2>
              <p className="mt-1.5 max-w-sm text-sm leading-6 text-rice-muted dark:text-white/55">
                ลองใช้คำค้นอื่น หรือเลือกดูข่าวจากทุกหมวดหมู่
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                  }}
                  className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-rice-forest px-5 text-sm font-bold text-white shadow-sm transition hover:bg-rice-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/25 dark:bg-rice-mint-light dark:text-rice-dark"
                >
                  ล้างตัวกรอง
                </button>
              ) : null}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
