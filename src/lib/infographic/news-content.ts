export type NewsTextAlign = "left" | "center" | "right" | "justify";

export interface NewsTextRun {
  text: string;
  bold?: true;
  italic?: true;
  underline?: true;
  link?: string;
  color?: string;
}

export type NewsContentBlock =
  | {
      type: "paragraph" | "heading";
      align?: NewsTextAlign;
      lineHeight?: "1" | "1.5" | "2";
      runs: NewsTextRun[];
    }
  | {
      type: "bullet-list" | "numbered-list";
      items: NewsTextRun[][];
    }
  | {
      type: "image";
      src: string;
      alt: string;
    };

export interface NewsGalleryImage {
  src: string;
  alt: string;
}

export interface StoredNewsContent {
  version: 1;
  category?: "rice-knowledge" | "rice-variety" | "leaf-disease" | "cultivation" | "smart-farming";
  blocks: NewsContentBlock[];
  gallery: NewsGalleryImage[];
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2_000) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function safeColor(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 40) return null;
  const color = value.trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([\d\s.,%]+\))$/i.test(color) ? color : null;
}

function parseRun(value: unknown): NewsTextRun | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const run = value as Record<string, unknown>;
  if (typeof run.text !== "string" || run.text.length > 20_000) return null;
  const link = safeUrl(run.link);
  const color = safeColor(run.color);

  return {
    text: run.text,
    ...(run.bold === true ? { bold: true as const } : {}),
    ...(run.italic === true ? { italic: true as const } : {}),
    ...(run.underline === true ? { underline: true as const } : {}),
    ...(link ? { link } : {}),
    ...(color ? { color } : {}),
  };
}

function parseRuns(value: unknown): NewsTextRun[] | null {
  if (!Array.isArray(value) || value.length > 2_000) return null;
  const runs = value.map(parseRun);
  return runs.every((run): run is NewsTextRun => Boolean(run)) ? runs : null;
}

function parseBlock(value: unknown): NewsContentBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const block = value as Record<string, unknown>;

  if (block.type === "image") {
    const src = safeUrl(block.src);
    if (!src) return null;
    return {
      type: "image",
      src,
      alt: typeof block.alt === "string" ? block.alt.slice(0, 300) : "ภาพประกอบข่าว",
    };
  }

  if (block.type === "paragraph" || block.type === "heading") {
    const runs = parseRuns(block.runs);
    if (!runs) return null;
    const align = ["left", "center", "right", "justify"].includes(String(block.align))
      ? (block.align as NewsTextAlign)
      : undefined;
    const lineHeight = ["1", "1.5", "2"].includes(String(block.lineHeight))
      ? (block.lineHeight as "1" | "1.5" | "2")
      : undefined;
    return {
      type: block.type,
      ...(align ? { align } : {}),
      ...(lineHeight ? { lineHeight } : {}),
      runs,
    };
  }

  if (block.type === "bullet-list" || block.type === "numbered-list") {
    if (!Array.isArray(block.items) || block.items.length > 500) return null;
    const items = block.items.map(parseRuns);
    if (!items.every((item): item is NewsTextRun[] => Boolean(item))) return null;
    return { type: block.type, items };
  }

  return null;
}

export function serializeNewsContent(
  blocks: NewsContentBlock[],
  gallery: NewsGalleryImage[],
  category?: StoredNewsContent["category"]
): string {
  return JSON.stringify({ version: 1, category, blocks, gallery } satisfies StoredNewsContent);
}

export function parseNewsContent(value: string): StoredNewsContent | null {
  if (!value.trim().startsWith("{")) return null;

  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (parsed.version !== 1 || !Array.isArray(parsed.blocks) || !Array.isArray(parsed.gallery)) {
      return null;
    }

    const blocks = parsed.blocks.map(parseBlock);
    if (!blocks.every((block): block is NewsContentBlock => Boolean(block))) return null;

    const gallery = parsed.gallery
      .slice(0, 30)
      .map((item): NewsGalleryImage | null => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return null;
        const candidate = item as Record<string, unknown>;
        const src = safeUrl(candidate.src);
        if (!src) return null;
        return {
          src,
          alt: typeof candidate.alt === "string"
            ? candidate.alt.slice(0, 300)
            : "ภาพประกอบข่าว",
        };
      });

    if (!gallery.every((item): item is NewsGalleryImage => Boolean(item))) return null;
    const category = [
      "rice-knowledge",
      "rice-variety",
      "leaf-disease",
      "cultivation",
      "smart-farming",
    ].includes(String(parsed.category))
      ? (parsed.category as StoredNewsContent["category"])
      : undefined;
    return { version: 1, ...(category ? { category } : {}), blocks, gallery };
  } catch {
    return null;
  }
}
