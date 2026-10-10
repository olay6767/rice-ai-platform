import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CloudSun,
  FileImage,
  MapPinned,
  ScanLine,
  Sparkles,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

interface PlatformFeature {
  id: "weather" | "assistant" | "finance" | "infographic";
  label: string;
  eyebrow: string;
  description: string;
  benefits: [string, string];
  href: string;
  action: string;
  icon: LucideIcon;
  tone: "sky" | "mint" | "gold" | "orange";
}

const PLATFORM_FEATURES: PlatformFeature[] = [
  {
    id: "weather",
    label: "สภาพอากาศ",
    eyebrow: "วางแผนงานในแปลง",
    description:
      "เช็กอุณหภูมิ ปริมาณฝน ความชื้น และแนวโน้มอากาศของพื้นที่ก่อนเริ่มงานในแต่ละวัน",
    benefits: ["ดูพยากรณ์ตามพื้นที่", "ติดตามฝนและภัยธรรมชาติ"],
    href: "/analytics/weather",
    action: "ดูสภาพอากาศ",
    icon: CloudSun,
    tone: "sky",
  },
  {
    id: "assistant",
    label: "แชตบอตเกษตร",
    eyebrow: "ถามเรื่องข้าวได้ทันที",
    description:
      "ถามเรื่องโรคข้าว ปุ๋ย น้ำ และการดูแลแปลงด้วยภาษาง่าย ๆ พร้อมรับคำตอบจากผู้ช่วย AI",
    benefits: ["คุยได้เหมือนถามผู้ช่วย", "ใช้บริบทด้านการทำนา"],
    href: "/chatbot",
    action: "คุยกับผู้ช่วย AI",
    icon: Bot,
    tone: "mint",
  },
  {
    id: "finance",
    label: "การเงินฟาร์ม",
    eyebrow: "รู้ต้นทุนและกำไร",
    description:
      "บันทึกรายรับ รายจ่าย และต้นทุนการเพาะปลูก เพื่อดูภาพรวมเงินของฟาร์มได้ชัดเจนขึ้น",
    benefits: ["แยกหมวดรายรับ–รายจ่าย", "ดูสรุปและแนวโน้มการเงิน"],
    href: "/finance",
    action: "จัดการการเงิน",
    icon: WalletCards,
    tone: "gold",
  },
  {
    id: "infographic",
    label: "ข่าวและอินโฟกราฟิก",
    eyebrow: "ข้อมูลเกษตรอ่านง่าย",
    description:
      "ติดตามข่าว ความรู้ และสรุปข้อมูลการเกษตรในรูปแบบที่ดูง่าย เหมาะกับการอ่านบนมือถือ",
    benefits: ["ค้นหาความรู้ที่สนใจ", "อ่านข้อมูลแบบภาพสรุป"],
    href: "/infographic",
    action: "ดูอินโฟกราฟิก",
    icon: FileImage,
    tone: "orange",
  },
];

const TONE_STYLES: Record<
  PlatformFeature["tone"],
  { icon: string; preview: string; accent: string }
> = {
  sky: {
    icon: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    preview: "bg-sky-50 dark:bg-sky-400/10",
    accent: "bg-sky-500",
  },
  mint: {
    icon: "bg-rice-mint/65 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint",
    preview: "bg-rice-mint/25 dark:bg-rice-leaf/10",
    accent: "bg-rice-leaf",
  },
  gold: {
    icon: "bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200",
    preview: "bg-amber-50 dark:bg-amber-400/10",
    accent: "bg-rice-gold",
  },
  orange: {
    icon: "bg-orange-100 text-orange-700 dark:bg-orange-400/15 dark:text-orange-200",
    preview: "bg-orange-50 dark:bg-orange-400/10",
    accent: "bg-orange-500",
  },
};

function MiniPreview({ feature }: { feature: PlatformFeature }) {
  const tone = TONE_STYLES[feature.tone];

  if (feature.id === "weather") {
    return (
      <div className={`grid grid-cols-3 gap-2 rounded-2xl p-3 ${tone.preview}`}>
        {[
          ["29°", "อุณหภูมิ"],
          ["65%", "โอกาสฝน"],
          ["78%", "ความชื้น"],
        ].map(([value, label]) => (
          <div key={label} className="rounded-xl bg-white/85 px-2 py-3 text-center shadow-sm dark:bg-white/[0.07]">
            <p className="font-heading text-base font-bold text-rice-dark dark:text-white">{value}</p>
            <p className="mt-0.5 text-[9px] text-rice-muted dark:text-white/45">{label}</p>
          </div>
        ))}
      </div>
    );
  }

  if (feature.id === "assistant") {
    return (
      <div className={`space-y-2 rounded-2xl p-3 ${tone.preview}`}>
        <div className="ml-auto w-[78%] rounded-2xl rounded-br-md bg-rice-forest px-3 py-2 text-[10px] leading-4 text-white">
          ใบข้าวมีจุดสีน้ำตาล ควรทำอย่างไร?
        </div>
        <div className="w-[88%] rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[10px] leading-4 text-rice-muted shadow-sm dark:bg-white/[0.08] dark:text-white/60">
          ลองตรวจภาพใบข้าวและเช็กความชื้นในแปลงก่อนครับ
        </div>
      </div>
    );
  }

  if (feature.id === "finance") {
    return (
      <div className={`rounded-2xl p-3 ${tone.preview}`}>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-[9px] text-rice-muted dark:text-white/45">ภาพรวมเดือนนี้</p>
            <p className="mt-1 font-heading text-lg font-bold text-rice-dark dark:text-white">+฿12,450</p>
          </div>
          <div className="flex h-10 items-end gap-1">
            {[45, 70, 54, 90, 76].map((height, index) => (
              <span key={index} className={`w-2 rounded-t ${tone.accent}`} style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-[78px_1fr] gap-3 rounded-2xl p-3 ${tone.preview}`}>
      <div className="min-h-16 rounded-xl bg-gradient-to-br from-rice-leaf via-rice-natural to-rice-gold/80" />
      <div className="py-1">
        <span className="block h-2 w-14 rounded-full bg-orange-400/70" />
        <span className="mt-2 block h-2 w-full rounded-full bg-rice-forest/15 dark:bg-white/15" />
        <span className="mt-1.5 block h-2 w-4/5 rounded-full bg-rice-forest/10 dark:bg-white/10" />
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: PlatformFeature }) {
  const Icon = feature.icon;
  const tone = TONE_STYLES[feature.tone];

  return (
    <article id={`feature-${feature.id}`} className="group flex h-full scroll-mt-24 flex-col rounded-[1.75rem] border border-rice-forest/10 bg-white/85 p-5 shadow-card transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-rice-leaf/25 hover:shadow-floating sm:p-6 dark:border-white/10 dark:bg-white/[0.045]">
      <div className="flex items-start justify-between gap-4">
        <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${tone.icon}`}>
          <Icon aria-hidden="true" className="h-6 w-6" />
        </span>
        <span className="rounded-full border border-rice-forest/10 bg-rice-background px-3 py-1 text-[10px] font-semibold text-rice-muted dark:border-white/10 dark:bg-white/[0.04] dark:text-white/45">
          {feature.eyebrow}
        </span>
      </div>

      <h3 className="mt-5 font-heading text-xl font-bold text-rice-dark dark:text-white">
        {feature.label}
      </h3>
      <p className="mt-2 min-h-[72px] text-sm leading-6 text-rice-muted dark:text-white/55">
        {feature.description}
      </p>

      <ul className="mt-4 space-y-2">
        {feature.benefits.map((benefit) => (
          <li key={benefit} className="flex items-center gap-2 text-xs font-medium text-rice-forest/80 dark:text-white/65">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4 shrink-0 text-rice-leaf dark:text-rice-mint" />
            {benefit}
          </li>
        ))}
      </ul>

      <div className="mt-5">
        <MiniPreview feature={feature} />
      </div>

      <Link href={feature.href} className="mt-5 inline-flex min-h-11 items-center justify-between rounded-xl border border-rice-forest/10 px-4 text-sm font-bold text-rice-forest transition-colors hover:bg-rice-mint/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf dark:border-white/10 dark:text-rice-mint-light dark:hover:bg-white/[0.07]">
        {feature.action}
        <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </Link>
    </article>
  );
}

export default function FeatureSection() {
  return (
    <section id="home-features" aria-labelledby="home-features-title" className="relative overflow-hidden bg-rice-surface-soft px-5 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-24">

      <div className="mx-auto w-full max-w-7xl">
        <div className="grid items-end gap-6 lg:grid-cols-[1fr_0.72fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-rice-forest/10 bg-white/75 px-4 py-2 text-xs font-semibold text-rice-forest shadow-card backdrop-blur dark:border-white/10 dark:bg-white/[0.055] dark:text-rice-mint">
              <Sparkles aria-hidden="true" className="h-4 w-4 text-rice-leaf" />
              ฟังก์ชันของ SmartRiceHub
            </div>
            <h2 id="home-features-title" className="mt-5 max-w-3xl font-heading text-[2rem] font-bold leading-[1.15] tracking-[-0.035em] text-rice-dark sm:text-[2.5rem] lg:text-[3.25rem] dark:text-white">
              เครื่องมือครบสำหรับ
              <span className="block text-rice-natural dark:text-rice-mint">ดูแลนาข้าวในที่เดียว</span>
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-rice-muted sm:text-base dark:text-white/55">
            ตั้งแต่ดูภาพรวมข้อมูล ตรวจโรค วางแผนจากสภาพอากาศ ไปจนถึงจัดการต้นทุนและค้นหาความรู้ เลือกฟังก์ชันที่ต้องการแล้วเริ่มใช้งานได้ทันที
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-12 lg:gap-5">
          <article id="feature-dashboard" className="group relative scroll-mt-24 overflow-hidden rounded-[2rem] bg-rice-forest p-6 text-white shadow-floating sm:p-8 lg:col-span-7">
            <div aria-hidden="true" className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-rice-leaf/35 blur-3xl" />
            <div className="relative grid h-full gap-7 md:grid-cols-[0.95fr_1.05fr] md:items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-rice-mint">
                  <BarChart3 aria-hidden="true" className="h-3.5 w-3.5" />
                  ศูนย์รวมข้อมูล
                </div>
                <h3 className="mt-5 font-heading text-2xl font-bold text-white sm:text-3xl">แดชบอร์ดภาพรวม</h3>
                <p className="mt-3 text-sm leading-7 text-white/65">
                  ดูข้อมูลผลผลิต แผนที่รายจังหวัด แนวโน้มสภาพแวดล้อม และสัญญาณความเสี่ยงสำคัญในหน้าจอเดียว
                </p>
                <ul className="mt-5 grid gap-2 text-xs text-white/75 sm:grid-cols-2 md:grid-cols-1">
                  {["ดูข้อมูลเชิงพื้นที่บนแผนที่", "เปรียบเทียบแนวโน้มย้อนหลัง"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-rice-mint" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Link href="/dashboard" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-rice-forest transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-mint">
                  เปิดแดชบอร์ด
                  <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>

              <div className="rounded-[1.6rem] border border-white/10 bg-white/[0.08] p-4 backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] uppercase tracking-[0.16em] text-white/45">ภาพรวมประเทศไทย</p>
                    <p className="mt-1 font-heading text-base font-bold">ข้อมูลการเกษตร</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rice-mint/15 text-rice-mint"><MapPinned aria-hidden="true" className="h-5 w-5" /></span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[["77", "จังหวัด"], ["6", "ชุดข้อมูล"], ["24", "รายงาน"]].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-white/[0.08] px-2 py-3 text-center">
                      <p className="font-heading text-lg font-bold">{value}</p>
                      <p className="text-[9px] text-white/45">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-2xl bg-[#0a2618] p-4">
                  <div className="flex h-24 items-end gap-2">
                    {[42, 68, 54, 82, 62, 94, 74].map((height, index) => (
                      <span key={index} className="flex-1 rounded-t-md bg-gradient-to-t from-rice-leaf to-rice-mint" style={{ height: `${height}%` }} />
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[9px] text-white/45">
                    <span>แนวโน้มข้อมูลรายเดือน</span><span className="text-rice-mint">+12.4%</span>
                  </div>
                </div>
              </div>
            </div>
          </article>

          <article id="feature-disease" className="group relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-rice-forest/10 bg-white/90 p-6 shadow-card sm:p-8 lg:col-span-5 dark:border-white/10 dark:bg-white/[0.045]">
            <div aria-hidden="true" className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-rice-mint/55 blur-3xl dark:bg-rice-leaf/15" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-rice-mint/65 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint"><ScanLine aria-hidden="true" className="h-7 w-7" /></span>
                <span className="rounded-full bg-rice-mint/45 px-3 py-1 text-[10px] font-semibold text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint">AI ช่วยวิเคราะห์</span>
              </div>
              <h3 className="mt-6 font-heading text-2xl font-bold text-rice-dark dark:text-white">ตรวจโรคข้าวจากภาพ</h3>
              <p className="mt-3 text-sm leading-7 text-rice-muted dark:text-white/55">
                ถ่ายภาพหรืออัปโหลดภาพใบข้าว ระบบช่วยจำแนกอาการเบื้องต้น พร้อมบันทึกผลไว้ดูย้อนหลัง
              </p>
              <div className="mt-5 rounded-[1.4rem] border border-rice-forest/10 bg-rice-background p-4 dark:border-white/10 dark:bg-white/[0.04]">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-rice-forest text-rice-mint"><ScanLine aria-hidden="true" className="h-5 w-5" /></span>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between text-[10px] font-medium text-rice-muted dark:text-white/50"><span>กำลังวิเคราะห์ภาพ</span><span>92%</span></div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-rice-forest/10 dark:bg-white/10"><span className="block h-full w-[92%] rounded-full bg-rice-leaf" /></div>
                  </div>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-xs font-medium text-rice-forest/80 dark:text-white/65">
                {["รองรับการถ่ายภาพจากมือถือ", "ดูประวัติผลการตรวจย้อนหลัง"].map((item) => <li key={item} className="flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="h-4 w-4 text-rice-leaf dark:text-rice-mint" />{item}</li>)}
              </ul>
              <Link href="/disease" className="mt-6 inline-flex min-h-11 items-center justify-between rounded-xl bg-rice-forest px-4 text-sm font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-leaf dark:bg-rice-mint dark:text-rice-dark">
                เริ่มตรวจโรคข้าว
                <ArrowRight aria-hidden="true" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </article>

          {PLATFORM_FEATURES.map((feature) => (
            <div key={feature.id} className="lg:col-span-3">
              <FeatureCard feature={feature} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
