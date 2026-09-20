import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, Eye } from "lucide-react";
import type { ReactNode } from "react";

import {
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
    <main className="py-8 sm:py-12 lg:py-14">
      <article className="dashboard-container grid gap-8 lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] lg:gap-12">
        <div className="min-w-0">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[1.75rem] border border-rice-forest/10 bg-rice-surface-soft dark:border-white/10">
            <Image
              src={article.image}
              alt={article.imageAlt}
              fill
              priority
              sizes="(max-width: 1023px) 100vw, 56vw"
              className="object-cover"
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {gallery.map((image, index) => (
              <div
                key={`${image}-${index}`}
                className="relative aspect-square overflow-hidden rounded-2xl border border-rice-forest/10 bg-rice-surface-soft dark:border-white/10"
              >
                <Image
                  src={image}
                  alt={`ภาพประกอบข่าว ${article.title} ลำดับที่ ${index + 1}`}
                  fill
                  sizes="(max-width: 639px) 50vw, (max-width: 1023px) 25vw, 14vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 lg:pt-2">
          <h1 className="font-heading text-3xl font-bold leading-tight tracking-[-0.035em] text-rice-forest sm:text-4xl lg:text-5xl dark:text-white">
            {article.title}
          </h1>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-rice-forest/10 pb-6 text-sm font-medium text-rice-muted dark:border-white/10 dark:text-white/55">
            <span className="inline-flex items-center gap-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              {formatArticleDate(article.publishedAt)}
            </span>
            <span className="inline-flex items-center gap-2">
              <Eye aria-hidden="true" className="h-4 w-4" />
              {article.viewCount.toLocaleString("th-TH")} ครั้ง
            </span>
          </div>
          <div className="mt-7 space-y-5 text-base leading-8 text-rice-text sm:text-lg sm:leading-9 dark:text-white/75">
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
