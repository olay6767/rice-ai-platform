import Link from "next/link";
import {
  ArrowUpRight,
  Bot,
  CloudSun,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

interface QuickAccessItem {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: "mint" | "gold" | "blue";
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  {
    id: "assistant",
    label: "คุยกับ AI เกษตร",
    description:
      "ถามเรื่องโรคข้าว ปุ๋ย น้ำ และการดูแลแปลงด้วยภาษาธรรมชาติ",
    href: "/chatbot",
    icon: Bot,
    tone: "mint",
  },
  {
    id: "finance",
    label: "จัดการการเงิน",
    description:
      "บันทึกรายรับ–รายจ่าย พร้อมดูแนวโน้มและสรุปกำไรขาดทุน",
    href: "/finance",
    icon: WalletCards,
    tone: "gold",
  },
  {
    id: "weather",
    label: "ดูสภาพอากาศ",
    description:
      "เช็กฝน อุณหภูมิ และความชื้น เพื่อวางแผนงานในแปลงนา",
    href: "/analytics/weather",
    icon: CloudSun,
    tone: "blue",
  },
];

const TONE_CLASSES: Record<
  QuickAccessItem["tone"],
  {
    icon: string;
    iconDark: string;
    hover: string;
  }
> = {
  mint: {
    icon: "bg-rice-mint/55 text-rice-forest",
    iconDark:
      "dark:bg-rice-leaf/20 dark:text-rice-mint-light",
    hover:
      "hover:border-rice-leaf/30 hover:bg-rice-mint/10",
  },
  gold: {
    icon: "bg-rice-gold/20 text-amber-800",
    iconDark:
      "dark:bg-rice-gold/10 dark:text-rice-gold",
    hover:
      "hover:border-rice-gold/35 hover:bg-rice-gold/10",
  },
  blue: {
    icon: "bg-sky-100 text-sky-700",
    iconDark:
      "dark:bg-sky-400/10 dark:text-sky-200",
    hover:
      "hover:border-sky-300/50 hover:bg-sky-50/70",
  },
};

/**
 * แผงทางลัดไปยังเครื่องมือที่ใช้งานได้จริงบนแพลตฟอร์ม
 */
export default function QuickAccessSection() {
  return (
    <section
      id="home-tools"
      aria-labelledby="home-tools-title"
      className="
        relative isolate overflow-hidden
        bg-rice-background
        px-5 pb-10
        sm:px-6 sm:pb-12
        lg:px-8 lg:pb-16
        dark:bg-[#07140c]
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none absolute
          -right-24 top-0 -z-10
          h-64 w-64 rounded-full
          bg-rice-mint/20 blur-3xl
          dark:bg-rice-leaf/10
        "
      />

      <div className="mx-auto w-full max-w-7xl">
        <div
          className="
            glass-card p-4
            sm:p-6
            lg:p-7
          "
        >
          <div
            className="
              flex flex-col gap-4
              sm:flex-row sm:items-end
              sm:justify-between
            "
          >
            <div className="max-w-2xl">
              <p className="uppercase-label">
                Rice AI workspace
              </p>
              <h2
                id="home-tools-title"
                className="
                  mt-2 font-heading
                  text-xl font-bold
                  tracking-[-0.025em]
                  text-rice-dark
                  sm:text-2xl
                  dark:text-white
                "
              >
                เริ่มต้นจากเครื่องมือที่ต้องใช้วันนี้
              </h2>
              <p
                className="
                  mt-2 text-sm leading-6
                  text-rice-muted
                  dark:text-white/55
                "
              >
                เลือกเครื่องมือที่ต้องการ แล้วจัดการงานในแปลง
                และข้อมูลของคุณได้จากที่เดียว
              </p>
            </div>

            <Link
              href="/analytics"
              className="
                hidden shrink-0 items-center gap-2
                rounded-pill border border-rice-forest/10
                bg-white/70 px-4 py-2.5
                text-xs font-bold text-rice-forest
                shadow-card backdrop-blur-glass
                transition-[transform,background-color,border-color]
                duration-300 hover:-translate-y-0.5
                hover:border-rice-leaf/25 hover:bg-white
                focus-visible:outline-none
                focus-visible:ring-2 focus-visible:ring-rice-leaf
                sm:inline-flex
                dark:border-white/10 dark:bg-white/[0.05]
                dark:text-rice-mint-light
                dark:hover:bg-white/[0.1]
              "
            >
              ดูภาพรวมข้อมูล
              <ArrowUpRight
                aria-hidden="true"
                className="h-3.5 w-3.5"
              />
            </Link>
          </div>

          <div
            className="
              mt-5 grid gap-3
              md:grid-cols-3
            "
          >
            {QUICK_ACCESS_ITEMS.map((item) => {
              const Icon = item.icon;
              const tone = TONE_CLASSES[item.tone];

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`
                    interactive-card group
                    flex min-h-[132px]
                    items-start gap-3.5
                    rounded-2xl border
                    border-rice-forest/10
                    bg-white/60 p-4
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-rice-leaf
                    ${tone.hover}
                    dark:border-white/10
                    dark:bg-white/[0.035]
                    dark:hover:bg-white/[0.07]
                  `}
                >
                  <span
                    className={`
                      flex h-11 w-11
                      shrink-0 items-center
                      justify-center rounded-xl
                      ${tone.icon}
                      ${tone.iconDark}
                    `}
                  >
                    <Icon
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className="
                        flex items-center
                        justify-between gap-2
                      "
                    >
                      <span
                        className="
                          font-heading text-sm
                          font-bold text-rice-forest
                          dark:text-white
                        "
                      >
                        {item.label}
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="
                          h-4 w-4 shrink-0
                          text-rice-muted/60
                          transition-transform duration-300
                          group-hover:-translate-y-0.5
                          group-hover:translate-x-0.5
                          dark:text-white/40
                        "
                      />
                    </span>
                    <span
                      className="
                        mt-1.5 block text-xs
                        leading-5 text-rice-muted
                        dark:text-white/50
                      "
                    >
                      {item.description}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
