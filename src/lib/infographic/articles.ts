import { parseNewsContent } from "@/lib/infographic/news-content";

export const INFOGRAPHIC_CATEGORIES = [
  { id: "all", label: "ทั้งหมด" },
  { id: "rice-knowledge", label: "ความรู้เรื่องข้าว" },
  { id: "rice-variety", label: "พันธุ์ข้าว" },
  { id: "leaf-disease", label: "โรคใบข้าว" },
  { id: "cultivation", label: "การปลูกและดูแล" },
  { id: "smart-farming", label: "เกษตรอัจฉริยะ" },
] as const;

export type InfographicCategory = Exclude<
  (typeof INFOGRAPHIC_CATEGORIES)[number]["id"],
  "all"
>;

export interface InfographicArticle {
  id: string;
  title: string;
  summary: string;
  body: string[];
  category: InfographicCategory;
  publishedAt: string;
  viewCount: number;
  image: string;
  imageAlt: string;
  gallery?: string[];
  richBody?: import("@/lib/infographic/news-content").NewsContentBlock[];
}

export interface AdminPostSummary {
  id: string;
  title: string;
  summary: string;
  body?: string;
  category: "weather" | "disease" | "pest" | "price" | "knowledge" | "disaster";
  image_url: string | null;
  image_alt: string;
  published_at: string;
}

export const ARTICLE_IMAGE_LIBRARY = [
  "/images/home/rice-field.jpg",
  "/images/news/rice-price.webp",
  "/images/news/rice-disease-warning.webp",
  "/images/news/rice-weather.webp",
  "/images/news/rice-disease-management.webp",
  "/images/news/storm-risk-infographic.png",
  "/images/news/flood-impact-infographic.png",
] as const;

export const PREVIEW_INFOGRAPHIC_ARTICLES: InfographicArticle[] = [
  {
    id: "rice-field-basics",
    title: "รู้จักระยะการเจริญเติบโตของข้าว เพื่อวางแผนดูแลได้ถูกช่วง",
    summary: "ทำความเข้าใจตั้งแต่ระยะกล้า แตกกอ ตั้งท้อง ออกรวง จนถึงเก็บเกี่ยว เพื่อจัดการน้ำและธาตุอาหารอย่างเหมาะสม",
    body: [
      "การเจริญเติบโตของข้าวแบ่งเป็นหลายระยะ แต่ละระยะต้องการน้ำ ธาตุอาหาร และการเฝ้าระวังที่ต่างกัน การรู้ว่าข้าวอยู่ในช่วงใดจึงช่วยให้วางแผนงานในแปลงได้แม่นยำขึ้น",
      "ในระยะแตกกอควรดูแลระดับน้ำและสังเกตความสมบูรณ์ของต้น ส่วนช่วงตั้งท้องถึงออกรวงเป็นช่วงที่ต้องระวังการขาดน้ำและปัจจัยที่กระทบต่อการสร้างเมล็ดเป็นพิเศษ",
      "**หลักสำคัญคือสำรวจแปลงจริงอย่างสม่ำเสมอ** และจดบันทึกวันที่ปลูก สภาพอากาศ และการจัดการแต่ละครั้ง เพื่อใช้ประกอบการตัดสินใจในรอบถัดไป",
    ],
    category: "rice-knowledge",
    publishedAt: "2026-08-27T08:30:00+07:00",
    viewCount: 1284,
    image: "/images/home/rice-field.jpg",
    imageAlt: "ทุ่งนาข้าวสีเขียว",
  },
  {
    id: "thai-rice-varieties",
    title: "เลือกพันธุ์ข้าวให้เหมาะกับพื้นที่และฤดูเพาะปลูก",
    summary: "เปรียบเทียบปัจจัยด้านอายุเก็บเกี่ยว แหล่งน้ำ สภาพดิน และตลาด ก่อนตัดสินใจเลือกพันธุ์ข้าว",
    body: [
      "พันธุ์ข้าวแต่ละชนิดมีอายุเก็บเกี่ยว คุณภาพเมล็ด และความเหมาะสมต่อพื้นที่แตกต่างกัน การเลือกพันธุ์จึงควรเริ่มจากข้อมูลของแปลงและแผนการผลิต ไม่ใช่พิจารณาจากราคาเพียงอย่างเดียว",
      "ควรตรวจสอบว่าแปลงอยู่ในเขตนาน้ำฝนหรือนาชลประทาน มีข้อจำกัดเรื่องน้ำช่วงใด และตลาดในพื้นที่ต้องการข้าวชนิดใด จากนั้นจึงเปรียบเทียบคุณสมบัติของพันธุ์ที่สนใจ",
      "**ใช้เมล็ดพันธุ์ที่มีแหล่งที่มาชัดเจนและเหมาะกับฤดูปลูก** จะช่วยลดความเสี่ยงด้านความงอก ความสม่ำเสมอ และคุณภาพผลผลิต",
    ],
    category: "rice-variety",
    publishedAt: "2026-08-26T14:10:00+07:00",
    viewCount: 936,
    image: "/images/news/rice-price.webp",
    imageAlt: "เมล็ดข้าวและรวงข้าว",
  },
  {
    id: "leaf-disease-watch",
    title: "สังเกตอาการโรคบนใบข้าวให้เร็ว ก่อนความเสียหายลุกลาม",
    summary: "เรียนรู้จุดสังเกตเบื้องต้นของแผลบนใบข้าว พร้อมแนวทางสำรวจหลายจุดในแปลงเพื่อยืนยันความผิดปกติ",
    body: [
      "อาการผิดปกติบนใบข้าวอาจเกิดจากโรค แมลง ธาตุอาหาร หรือสภาพแวดล้อม การดูจากใบเพียงใบเดียวจึงยังไม่เพียงพอสำหรับสรุปสาเหตุ",
      "ควรสำรวจต้นข้าวหลายจุดทั้งบริเวณขอบแปลงและกลางแปลง สังเกตรูปร่าง สี ขอบแผล และการกระจายของอาการ พร้อมบันทึกภาพในแสงธรรมชาติให้ชัดเจน",
      "**หากอาการกระจายรวดเร็วควรปรึกษาเจ้าหน้าที่เกษตรในพื้นที่** ก่อนเลือกวิธีจัดการหรือใช้สารป้องกันกำจัดโรคพืช",
    ],
    category: "leaf-disease",
    publishedAt: "2026-08-25T09:45:00+07:00",
    viewCount: 1742,
    image: "/images/news/rice-disease-warning.webp",
    imageAlt: "ใบข้าวสำหรับสังเกตอาการโรค",
  },
  {
    id: "rice-water-care",
    title: "จัดการน้ำในนาข้าวตามระยะการเติบโต ลดการใช้น้ำเกินจำเป็น",
    summary: "แนวทางตรวจระดับน้ำและความชื้นในแปลง เพื่อวางแผนให้น้ำให้สัมพันธ์กับฝนและระยะของต้นข้าว",
    body: [
      "การจัดการน้ำที่เหมาะสมควรพิจารณาระยะการเติบโต ชนิดดิน ปริมาณฝน และความสามารถในการระบายน้ำของแปลงร่วมกัน",
      "ก่อนให้น้ำควรตรวจสภาพดินและระดับน้ำจริง รวมถึงดูพยากรณ์ฝนระยะสั้น เพื่อหลีกเลี่ยงการสูบน้ำก่อนฝนตกและลดค่าใช้จ่ายที่ไม่จำเป็น",
      "**ตรวจคันนาและทางน้ำเข้าออกเป็นประจำ** โดยเฉพาะก่อนฝนหนัก จะช่วยลดทั้งความเสี่ยงขาดน้ำและน้ำขัง",
    ],
    category: "cultivation",
    publishedAt: "2026-08-24T16:20:00+07:00",
    viewCount: 825,
    image: "/images/news/rice-weather.webp",
    imageAlt: "ต้นข้าวในแปลงนากับสภาพอากาศ",
  },
  {
    id: "smart-rice-farming",
    title: "เกษตรอัจฉริยะช่วยติดตามแปลงข้าวได้อย่างไร",
    summary: "รู้จักการใช้ข้อมูลสภาพอากาศ เซนเซอร์ ภาพถ่าย และ AI เป็นเครื่องมือประกอบการตัดสินใจในแปลงนา",
    body: [
      "เกษตรอัจฉริยะไม่ได้หมายถึงการซื้ออุปกรณ์จำนวนมาก แต่คือการเลือกใช้ข้อมูลที่ช่วยแก้ปัญหาของแปลงได้จริง เช่น ข้อมูลฝน ความชื้น การบันทึกต้นทุน และภาพอาการผิดปกติ",
      "ข้อมูลจากระบบดิจิทัลควรใช้ร่วมกับการสำรวจแปลงจริง เพราะสภาพดิน แหล่งน้ำ และการจัดการของแต่ละพื้นที่แตกต่างกัน",
      "**เริ่มจากปัญหาที่ต้องการแก้และวัดผลก่อนลงทุน** จากนั้นเก็บข้อมูลอย่างต่อเนื่องเพื่อเปรียบเทียบผลลัพธ์ของแต่ละรอบการผลิต",
    ],
    category: "smart-farming",
    publishedAt: "2026-08-23T11:00:00+07:00",
    viewCount: 1168,
    image: "/images/news/rice-disease-management.webp",
    imageAlt: "การจัดการแปลงข้าวด้วยข้อมูล",
  },
  {
    id: "rainy-season-field-care",
    title: "ดูแลแปลงข้าวช่วงฝนต่อเนื่อง ป้องกันน้ำขังและต้นข้าวอ่อนแอ",
    summary: "รายการตรวจแปลงหลังฝนตก ทั้งทางระบายน้ำ ความแข็งแรงของต้น และสัญญาณโรคที่มากับความชื้น",
    body: [
      "ฝนที่ตกต่อเนื่องอาจทำให้น้ำขัง ต้นข้าวล้ม และความชื้นในทรงพุ่มสูงขึ้น จึงควรตรวจแปลงทันทีเมื่อสภาพอากาศเอื้ออำนวย",
      "เปิดทางระบายน้ำที่อุดตัน สำรวจคันนา และตรวจต้นข้าวในจุดลุ่มต่ำก่อนพื้นที่อื่น พร้อมบันทึกอาการผิดปกติที่พบ",
      "**หลีกเลี่ยงการทำงานหรือใส่ปัจจัยการผลิตขณะฝนหนัก** และติดตามพยากรณ์อากาศก่อนวางแผนงานครั้งถัดไป",
    ],
    category: "cultivation",
    publishedAt: "2026-08-22T07:30:00+07:00",
    viewCount: 691,
    image: "/images/news/storm-risk-infographic.png",
    imageAlt: "ข้อมูลสภาพอากาศและพื้นที่เสี่ยงฝน",
  },
];

export function formatArticleDate(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "อัปเดตล่าสุด";
  }

  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function categoryLabel(category: InfographicCategory): string {
  return (
    INFOGRAPHIC_CATEGORIES.find((item) => item.id === category)?.label ??
    "ความรู้เรื่องข้าว"
  );
}

export function stableViewCount(id: string): number {
  let hash = 0;

  for (const character of id) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return 420 + (hash % 4200);
}

export function inferArticleCategory(
  category: AdminPostSummary["category"],
  title: string,
  summary: string
): InfographicCategory {
  const text = `${title} ${summary}`.toLocaleLowerCase("th-TH");

  if (/พันธุ์|เมล็ดพันธุ์/.test(text)) return "rice-variety";
  if (category === "disease" || category === "pest" || /โรค|ใบข้าว|แมลง|ไหม้/.test(text)) {
    return "leaf-disease";
  }
  if (/อัจฉริยะ|เซนเซอร์|โดรน|ปัญญาประดิษฐ์|\bai\b/.test(text)) {
    return "smart-farming";
  }
  if (/ปลูก|ดูแล|น้ำ|ปุ๋ย|เก็บเกี่ยว|แปลง|ฝน/.test(text)) {
    return "cultivation";
  }

  return "rice-knowledge";
}

export function defaultArticleImage(category: InfographicCategory): string {
  if (category === "leaf-disease") return "/images/news/rice-disease-warning.webp";
  if (category === "rice-variety") return "/images/news/rice-price.webp";
  if (category === "smart-farming") return "/images/news/rice-disease-management.webp";
  if (category === "cultivation") return "/images/news/rice-weather.webp";
  return "/images/home/rice-field.jpg";
}

export function adminPostToArticle(post: AdminPostSummary): InfographicArticle {
  const storedContent = post.body ? parseNewsContent(post.body) : null;
  const category = storedContent?.category ?? inferArticleCategory(
    post.category,
    post.title,
    post.summary
  );

  return {
    id: post.id,
    title: post.title,
    summary: post.summary,
    body: [post.summary],
    category,
    publishedAt: post.published_at,
    viewCount: stableViewCount(post.id),
    image: post.image_url || defaultArticleImage(category),
    imageAlt: post.image_alt || post.title,
    ...(storedContent
      ? {
          richBody: storedContent.blocks,
          gallery: storedContent.gallery.map((image) => image.src),
        }
      : {}),
  };
}

export function getPreviewInfographicArticle(
  id: string
): InfographicArticle | undefined {
  return PREVIEW_INFOGRAPHIC_ARTICLES.find((article) => article.id === id);
}

export function galleryForArticle(article: InfographicArticle): string[] {
  if (article.gallery?.length) return article.gallery;

  const otherImages = ARTICLE_IMAGE_LIBRARY.filter(
    (image) => image !== article.image
  );
  const offset = stableViewCount(article.id) % otherImages.length;

  return [...otherImages.slice(offset), ...otherImages.slice(0, offset)].slice(0, 4);
}
