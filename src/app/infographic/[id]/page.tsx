import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Eye } from "lucide-react";
import type { ReactNode } from "react";

import {
  categoryLabel,
  defaultArticleImage,
  formatArticleDate,
  galleryForArticle,
  getPreviewInfographicArticle,
  inferArticleCategory,
  stableViewCount,
  type InfographicArticle,
} from "@/lib/infographic/articles";
import { createClient } from "@/lib/supabase/server";
import {
  parseNewsContent,
  type NewsContentBlock,
  type NewsTextRun,
} from "@/lib/infographic/news-content";

export const metadata: Metadata = {
  title: "รายละเอียดข่าว",
  description: "รายละเอียดข่าวสารและความรู้เกี่ยวกับข้าว",
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function getArticle(id: string): Promise<InfographicArticle | undefined> {
  const previewArticle = getPreviewInfographicArticle(id);

  if (previewArticle) return previewArticle;
  if (!isUuid(id)) return undefined;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("news_posts")
      .select(
        "id, title, summary, body, category, image_url, image_alt, published_at"
      )
      .eq("id", id)
      .eq("status", "published")
      .lte("published_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data?.published_at) return undefined;

    const rawBody = typeof data.body === "string" ? data.body.trim() : "";
    const storedContent = rawBody ? parseNewsContent(rawBody) : null;
    const category = storedContent?.category ?? inferArticleCategory(
      data.category,
      data.title,
      data.summary
    );
    const body = rawBody && !storedContent
      ? rawBody
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
      : [data.summary];

    return {
      id: data.id,
      title: data.title,
      summary: data.summary,
      body,
      category,
      publishedAt: data.published_at,
      viewCount: stableViewCount(data.id),
      image: data.image_url || defaultArticleImage(category),
      imageAlt: data.image_alt || data.title,
      ...(storedContent
        ? {
            richBody: storedContent.blocks,
            gallery: storedContent.gallery.map((image) => image.src),
          }
        : {}),
    };
  } catch {
    return undefined;
  }
}

function RichParagraph({ text }: { text: string }) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);

  return (
    <p>
      {segments.map((segment, index) =>
        segment.startsWith("**") && segment.endsWith("**") ? (
          <strong key={`${segment}-${index}`} className="font-bold text-rice-forest dark:text-white">
            {segment.slice(2, -2)}
          </strong>
        ) : (
          segment
        )
      )}
    </p>
  );
}

function RichRuns({ runs }: { runs: NewsTextRun[] }) {
  return runs.map((run, index) => {
    let content: ReactNode = run.text;
    if (run.bold) content = <strong>{content}</strong>;
    if (run.italic) content = <em>{content}</em>;
    if (run.underline) content = <u>{content}</u>;
    if (run.link) {
      content = (
        <a
          href={run.link}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-sky-700 underline underline-offset-2"
        >
          {content}
        </a>
      );
    }
    return (
      <span key={`${run.text}-${index}`} style={run.color ? { color: run.color } : undefined}>
        {content}
      </span>
    );
  });
}

function RichNewsBody({ blocks }: { blocks: NewsContentBlock[] }) {
  const alignClass = (align?: "left" | "center" | "right" | "justify") =>
    align === "center"
      ? "text-center"
      : align === "right"
        ? "text-right"
        : align === "justify"
          ? "text-justify"
          : "text-left";

  return blocks.map((block, index) => {
    if (block.type === "image") {
      return (
        <div
          key={`${block.src}-${index}`}
          className="relative my-7 aspect-[16/10] overflow-hidden rounded-2xl bg-rice-surface-soft"
        >
          <Image
            src={block.src}
            alt={block.alt}
            fill
            sizes="(max-width: 1023px) 100vw, 42vw"
            className="object-cover"
          />
        </div>
      );
    }

    if ("items" in block) {
      const ListTag = block.type === "bullet-list" ? "ul" : "ol";
      return (
        <ListTag
          key={`${block.type}-${index}`}
          className={`space-y-2 pl-6 ${block.type === "bullet-list" ? "list-disc" : "list-decimal"}`}
        >
          {block.items.map((item, itemIndex) => (
            <li key={`${index}-${itemIndex}`} className="whitespace-pre-line">
              <RichRuns runs={item} />
            </li>
          ))}
        </ListTag>
      );
    }

    if (block.type === "heading") {
      return (
        <h2
          key={`${block.type}-${index}`}
          className={`pt-2 font-heading text-2xl font-bold leading-tight text-rice-forest dark:text-white ${alignClass(block.align)}`}
          style={block.lineHeight ? { lineHeight: block.lineHeight } : undefined}
        >
          <RichRuns runs={block.runs} />
        </h2>
      );
    }

    return (
      <p
        key={`${block.type}-${index}`}
        className={`whitespace-pre-line ${alignClass(block.align)}`}
        style={block.lineHeight ? { lineHeight: block.lineHeight } : undefined}
      >
        <RichRuns runs={block.runs} />
      </p>
    );
  });
}

function ArticleMeta({ article }: { article: InfographicArticle }) {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-rice-muted dark:text-white/55">
      <span className="inline-flex items-center gap-2">
        <CalendarDays aria-hidden="true" className="h-4 w-4" />
        {formatArticleDate(article.publishedAt)}
      </span>
      <span className="inline-flex items-center gap-2">
        <Eye aria-hidden="true" className="h-4 w-4" />
        {article.viewCount.toLocaleString("th-TH")} ครั้ง
      </span>
    </div>
  );
}

export default async function InfographicArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const article = await getArticle(id);

  if (!article) notFound();

  const gallery = galleryForArticle(article);

  return (
    <main className="py-5 pb-[calc(6rem+env(safe-area-inset-bottom))] sm:py-12 sm:pb-12 lg:py-14">
      <article className="dashboard-container grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
        <header className="lg:hidden">
          <Link
            href="/infographic"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-rice-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/20 dark:text-rice-mint-light"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            กลับไปข่าวสาร
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
            {categoryLabel(article.category)}
          </p>
          <h1 className="mt-2 font-heading text-3xl font-bold leading-tight tracking-[-0.035em] text-rice-forest dark:text-white">
            {article.title}
          </h1>
          <div className="mt-4 border-b border-rice-forest/10 pb-5 dark:border-white/10">
            <ArticleMeta article={article} />
          </div>
        </header>

        <div className="min-w-0">
          <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-rice-forest/10 bg-rice-surface-soft sm:aspect-[4/3] sm:rounded-[1.75rem] dark:border-white/10">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              preload
              sizes="(max-width: 1023px) 100vw, 56vw"
              className="object-cover"
            />
          </div>
          <div
            className="-mx-1 mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] sm:mx-0 sm:mt-4 sm:grid sm:grid-cols-4 sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: "none" }}
          >
            {gallery.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="relative h-24 w-24 shrink-0 snap-start overflow-hidden rounded-xl border border-rice-forest/10 bg-rice-surface-soft sm:h-auto sm:w-auto sm:aspect-square sm:rounded-2xl dark:border-white/10"
              >
                <Image
                  src={image}
                  alt={`ภาพประกอบข่าว ${article.title} ลำดับที่ ${index + 1}`}
                  fill
                  sizes="(max-width: 639px) 96px, (max-width: 1023px) 25vw, 14vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:pt-2">
          <div className="hidden lg:block">
            <Link
              href="/infographic"
              className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-xl pr-3 text-sm font-bold text-rice-leaf focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-rice-leaf/20 dark:text-rice-mint-light"
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              กลับไปข่าวสาร
            </Link>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-200">
              {categoryLabel(article.category)}
            </p>
            <h1 className="mt-2 font-heading text-5xl font-bold leading-tight tracking-[-0.035em] text-rice-forest dark:text-white">
              {article.title}
            </h1>
            <div className="mt-5 border-b border-rice-forest/10 pb-6 dark:border-white/10">
              <ArticleMeta article={article} />
            </div>
          </div>
          <div className="mt-1 space-y-5 text-base leading-8 text-rice-text sm:mt-5 sm:text-lg sm:leading-9 lg:mt-7 dark:text-white/75">
            {article.richBody?.length ? (
              <RichNewsBody blocks={article.richBody} />
            ) : (
              article.body.map((paragraph, index) => (
                <RichParagraph key={`${article.id}-${index}`} text={paragraph} />
              ))
            )}
          </div>
        </div>
      </article>
    </main>
  );
}
