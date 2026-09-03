import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  CheckCircle2,
  CloudRain,
  Droplets,
  History,
  Leaf,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  WalletCards,
  Wheat,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

import {
  buttonVariants,
} from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardIcon,
} from "@/components/ui/Card";

export interface FeatureSectionProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "title"
  > {
  /**
   * ข้อความขนาดเล็กเหนือหัวข้อ
   */
  eyebrow?: ReactNode;

  /**
   * หัวข้อหลักของ Section
   */
  heading?: ReactNode;

  /**
   * คำอธิบายใต้หัวข้อ
   */
  description?: ReactNode;

  /**
   * เส้นทางของปุ่มด้านล่าง
   */
  actionHref?: string;

  /**
   * ข้อความของปุ่มด้านล่าง
   */
  actionLabel?: string;
}

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * Feature Section หน้าแรกของ Rice AI
 *
 * แสดงความสามารถหลักในรูปแบบ Bento Grid
 * โดยข้อมูลกราฟและตัวเลขภายในเป็นภาพประกอบ UI
 * ยังไม่ได้เชื่อมกับฐานข้อมูลจริง
 */
export default function FeatureSection({
  id = "home-features",

  eyebrow = "ทุกเครื่องมือในแพลตฟอร์มเดียว",

  heading = (
    <>
      เทคโนโลยีที่ช่วยให้การดูแลนา
      <span
        className="
          block text-rice-natural
          dark:text-rice-mint
        "
      >
        ง่ายและเป็นระบบมากขึ้น
      </span>
    </>
  ),

  description = (
    <>
      ตั้งแต่การตรวจโรคข้าว ติดตามสภาพแปลง
      บันทึกต้นทุน ไปจนถึงการดูข้อมูลย้อนหลัง
      Rice AI ช่วยรวบรวมข้อมูลสำคัญให้อยู่ในที่เดียว
    </>
  ),

  actionHref = "/disease",
  actionLabel = "เริ่มตรวจโรคข้าว",

  className,
  ...sectionProps
}: FeatureSectionProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <section
      {...sectionProps}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-component="home-feature-section"
      className={cn(
        "relative isolate overflow-hidden",
        "bg-rice-background",
        "px-5 py-20",
        "sm:px-6 sm:py-24",
        "lg:px-8 lg:py-28",
        "dark:bg-[#07140c]",
        className
      )}
    >
      {/* Decorative background */}
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-32 top-20 -z-10
          h-80 w-80 rounded-full
          bg-rice-mint/35 blur-3xl
          dark:bg-rice-leaf/10
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-32 bottom-20 -z-10
          h-96 w-96 rounded-full
          bg-rice-gold/15 blur-3xl
          dark:bg-rice-gold/5
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute inset-0 -z-20
          opacity-[0.022]
          [background-image:linear-gradient(to_right,#0B2E1C_1px,transparent_1px),linear-gradient(to_bottom,#0B2E1C_1px,transparent_1px)]
          [background-size:48px_48px]
          dark:opacity-[0.035]
        "
      />

      <div className="mx-auto w-full max-w-7xl">
        {/* Section heading */}
        <div
          className="
            mx-auto max-w-3xl
            text-center
          "
        >
          <div
            className="
              inline-flex min-h-10
              items-center gap-2
              rounded-pill
              border border-rice-forest/10
              bg-white/75
              px-4 py-2
              text-xs font-semibold
              text-rice-forest
              shadow-card
              backdrop-blur-glass
              dark:border-white/10
              dark:bg-white/[0.055]
              dark:text-rice-mint
            "
          >
            <Sparkles
              aria-hidden="true"
              className="
                h-4 w-4 text-rice-leaf
              "
            />

            <span>{eyebrow}</span>
          </div>

          <h2
            id={titleId}
            className="
              mt-6 font-heading
              text-[2rem] font-bold
              leading-[1.15]
              tracking-[-0.035em]
              text-rice-dark
              sm:text-[2.5rem]
              lg:text-[3.25rem]
              dark:text-white
            "
          >
            {heading}
          </h2>

          <p
            id={descriptionId}
            className="
              mx-auto mt-5 max-w-2xl
              text-[15px] leading-7
              text-rice-muted
              sm:text-base sm:leading-8
              dark:text-white/60
            "
          >
            {description}
          </p>
        </div>

        {/* Bento grid */}
        <div
          className="
            mt-12 grid
            grid-cols-1 gap-4
            md:grid-cols-2
            lg:mt-16
            lg:grid-cols-12
            lg:gap-5
          "
        >
          {/* Disease analysis — Large card */}
          <Card
            variant="dark"
            radius="3xl"
            fullHeight
            className="
              relative overflow-hidden
              md:col-span-2
              lg:col-span-7
              lg:row-span-2
            "
          >
            <CardContent
              className="
                relative flex min-h-[520px]
                h-full flex-col
                p-5 sm:p-7
                lg:min-h-[600px]
              "
            >
              {/* Decorative glow */}
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute -right-24 -top-24
                  h-72 w-72 rounded-full
                  bg-rice-mint/15 blur-3xl
                "
              />

              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute -bottom-24 -left-20
                  h-72 w-72 rounded-full
                  bg-rice-leaf/20 blur-3xl
                "
              />

              <div
                className="
                  relative z-10
                  flex items-start
                  justify-between gap-5
                "
              >
                <div className="max-w-md">
                  <div
                    className="
                      inline-flex items-center
                      gap-2 rounded-pill
                      bg-white/[0.08]
                      px-3 py-1.5
                      text-[10px] font-semibold
                      uppercase tracking-[0.14em]
                      text-rice-mint
                    "
                  >
                    <ScanLine
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
                    />

                    Disease detection
                  </div>

                  <h3
                    className="
                      mt-5 font-heading
                      text-2xl font-semibold
                      leading-tight text-white
                      sm:text-[2rem]
                    "
                  >
                    วิเคราะห์โรคข้าว
                    จากภาพถ่าย
                  </h3>

                  <p
                    className="
                      mt-3 max-w-md
                      text-sm leading-7
                      text-white/60
                    "
                  >
                    ถ่ายภาพหรืออัปโหลดภาพใบข้าว
                    เพื่อช่วยตรวจหาความผิดปกติ
                    และจัดเก็บประวัติการตรวจอย่างเป็นระบบ
                  </p>
                </div>

                <span
                  className="
                    flex h-12 w-12
                    shrink-0 items-center
                    justify-center rounded-2xl
                    border border-white/10
                    bg-white/[0.08]
                    text-rice-mint
                    sm:h-14 sm:w-14
                  "
                >
                  <Leaf
                    aria-hidden="true"
                    className="h-6 w-6"
                  />
                </span>
              </div>

              {/* Scan preview */}
              <div
                className="
                  relative z-10 mt-8
                  flex flex-1 flex-col
                  overflow-hidden
                  rounded-[1.75rem]
                  border border-white/10
                  bg-white/[0.045]
                  p-3
                  shadow-inner
                  sm:p-4
                "
              >
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute inset-0
                    opacity-[0.055]
                    [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
                    [background-size:28px_28px]
                  "
                />

                <div
                  className="
                    relative flex flex-1
                    items-center justify-center
                    overflow-hidden
                    rounded-[1.35rem]
                    border border-white/10
                    bg-gradient-to-br
                    from-rice-natural/45
                    via-rice-forest/70
                    to-rice-dark
                    px-5 py-10
                    sm:min-h-[260px]
                  "
                >
                  <div
                    aria-hidden="true"
                    className="
                      absolute left-1/2 top-1/2
                      h-40 w-40
                      -translate-x-1/2
                      -translate-y-1/2
                      rounded-full
                      bg-rice-mint/15
                      blur-3xl
                    "
                  />

                  {/* Scan corners */}
                  <span
                    aria-hidden="true"
                    className="
                      absolute left-5 top-5
                      h-10 w-10
                      border-l-2 border-t-2
                      border-rice-mint/70
                    "
                  />

                  <span
                    aria-hidden="true"
                    className="
                      absolute right-5 top-5
                      h-10 w-10
                      border-r-2 border-t-2
                      border-rice-mint/70
                    "
                  />

                  <span
                    aria-hidden="true"
                    className="
                      absolute bottom-5 left-5
                      h-10 w-10
                      border-b-2 border-l-2
                      border-rice-mint/70
                    "
                  />

                  <span
                    aria-hidden="true"
                    className="
                      absolute bottom-5 right-5
                      h-10 w-10
                      border-b-2 border-r-2
                      border-rice-mint/70
                    "
                  />

                  {/* Scanning line */}
                  <div
                    aria-hidden="true"
                    className="
                      absolute inset-x-8 top-1/2
                      h-px
                      bg-gradient-to-r
                      from-transparent
                      via-rice-mint
                      to-transparent
                      shadow-[0_0_20px_rgba(190,238,207,0.9)]
                    "
                  />

                  <div
                    className="
                      relative z-10
                      flex h-28 w-28
                      items-center justify-center
                      rounded-full
                      border border-rice-mint/25
                      bg-rice-mint/10
                      text-rice-mint
                      backdrop-blur-sm
                    "
                  >
                    <Sprout
                      aria-hidden="true"
                      className="h-12 w-12"
                    />
                  </div>
                </div>

                <div
                  className="
                    relative mt-3
                    grid gap-3
                    sm:grid-cols-[1fr_auto]
                  "
                >
                  <div
                    className="
                      flex min-h-16
                      items-center gap-3
                      rounded-2xl
                      border border-white/10
                      bg-white/[0.06]
                      px-4 py-3
                    "
                  >
                    <span
                      className="
                        flex h-10 w-10
                        shrink-0 items-center
                        justify-center rounded-xl
                        bg-rice-mint/15
                        text-rice-mint
                      "
                    >
                      <CheckCircle2
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                    </span>

                    <div className="min-w-0">
                      <p
                        className="
                          text-[10px] font-medium
                          uppercase tracking-[0.12em]
                          text-white/40
                        "
                      >
                        Scan preview
                      </p>

                      <p
                        className="
                          mt-1 truncate
                          text-sm font-semibold
                          text-white
                        "
                      >
                        พร้อมรับภาพสำหรับวิเคราะห์
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/disease"
                    className="
                      group inline-flex min-h-16
                      items-center justify-center
                      gap-2 rounded-2xl
                      bg-rice-mint
                      px-5 py-3
                      text-sm font-semibold
                      text-rice-dark
                      shadow-card
                      transition-[transform,background-color]
                      duration-300
                      ease-premium
                      hover:-translate-y-0.5
                      hover:bg-rice-mint-light
                      active:translate-y-0
                      active:scale-[0.98]
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-white
                      focus-visible:ring-offset-2
                      focus-visible:ring-offset-rice-dark
                    "
                  >
                    เริ่มตรวจ

                    <ArrowRight
                      aria-hidden="true"
                      className="
                        h-4 w-4
                        transition-transform
                        duration-300
                        group-hover:translate-x-1
                      "
                    />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farm health */}
          <Card
            variant="surface"
            radius="3xl"
            fullHeight
            className="
              lg:col-span-5
            "
          >
            <CardContent
              className="
                flex min-h-[285px]
                h-full flex-col
                p-5 sm:p-6
              "
            >
              <div
                className="
                  flex items-start
                  justify-between gap-4
                "
              >
                <div>
                  <p className="uppercase-label">
                    Farm health
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    ติดตามสุขภาพแปลงนา
                  </h3>
                </div>

                <CardIcon
                  variant="green"
                  size="sm"
                >
                  <TrendingUp />
                </CardIcon>
              </div>

              <p
                className="
                  mt-3 max-w-sm
                  text-sm leading-6
                  text-rice-muted
                  dark:text-white/55
                "
              >
                ดูภาพรวมข้อมูลแต่ละแปลง
                พร้อมติดตามแนวโน้มและสิ่งที่ควรตรวจสอบ
              </p>

              <div
                className="
                  mt-auto pt-7
                "
              >
                <div
                  className="
                    flex h-28 items-end
                    gap-2 rounded-[1.4rem]
                    bg-rice-surface-soft
                    px-4 pb-4 pt-5
                    dark:bg-white/[0.045]
                  "
                >
                  {[42, 58, 48, 70, 62, 82, 76].map(
                    (height, index) => (
                      <div
                        key={`${height}-${index}`}
                        className="
                          flex h-full flex-1
                          items-end
                        "
                      >
                        <div
                          aria-hidden="true"
                          className="
                            w-full rounded-t-lg
                            bg-rice-natural/75
                            dark:bg-rice-mint/65
                          "
                          style={{
                            height: `${height}%`,
                          }}
                        />
                      </div>
                    )
                  )}
                </div>

                <div
                  className="
                    mt-3 flex items-center
                    justify-between gap-3
                    text-xs text-rice-muted
                    dark:text-white/45
                  "
                >
                  <span>
                    เปรียบเทียบแนวโน้มรายสัปดาห์
                  </span>

                  <span
                    className="
                      shrink-0 rounded-pill
                      bg-rice-mint/45
                      px-2.5 py-1
                      font-semibold
                      text-rice-forest
                      dark:bg-rice-leaf/20
                      dark:text-rice-mint
                    "
                  >
                    ภาพตัวอย่าง
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Weather */}
          <Card
            variant="mint"
            radius="3xl"
            fullHeight
            className="
              lg:col-span-5
            "
          >
            <CardContent
              className="
                flex min-h-[295px]
                h-full flex-col
                p-5 sm:p-6
              "
            >
              <div
                className="
                  flex items-start
                  justify-between gap-4
                "
              >
                <div>
                  <p className="uppercase-label">
                    Weather insight
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    สภาพอากาศและฝน
                  </h3>
                </div>

                <CardIcon
                  variant="mint"
                  size="sm"
                >
                  <CloudRain />
                </CardIcon>
              </div>

              <p
                className="
                  mt-3 text-sm leading-6
                  text-rice-muted
                  dark:text-white/55
                "
              >
                ตรวจสอบสภาพอากาศก่อนวางแผน
                ให้น้ำ ใส่ปุ๋ย หรือทำกิจกรรมในแปลง
              </p>

              <div
                className="
                  mt-auto grid grid-cols-3
                  gap-2 pt-6
                "
              >
                <div
                  className="
                    rounded-2xl
                    bg-white/60
                    px-3 py-4
                    text-center
                    dark:bg-white/[0.06]
                  "
                >
                  <CloudRain
                    aria-hidden="true"
                    className="
                      mx-auto h-5 w-5
                      text-rice-natural
                      dark:text-rice-mint
                    "
                  />

                  <p
                    className="
                      mt-2 text-[10px]
                      text-rice-muted
                      dark:text-white/40
                    "
                  >
                    เช้า
                  </p>

                  <p
                    className="
                      mt-1 text-xs font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    ตรวจสภาพฝน
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-white/60
                    px-3 py-4
                    text-center
                    dark:bg-white/[0.06]
                  "
                >
                  <Droplets
                    aria-hidden="true"
                    className="
                      mx-auto h-5 w-5
                      text-rice-natural
                      dark:text-rice-mint
                    "
                  />

                  <p
                    className="
                      mt-2 text-[10px]
                      text-rice-muted
                      dark:text-white/40
                    "
                  >
                    กลางวัน
                  </p>

                  <p
                    className="
                      mt-1 text-xs font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    วางแผนให้น้ำ
                  </p>
                </div>

                <div
                  className="
                    rounded-2xl
                    bg-white/60
                    px-3 py-4
                    text-center
                    dark:bg-white/[0.06]
                  "
                >
                  <Leaf
                    aria-hidden="true"
                    className="
                      mx-auto h-5 w-5
                      text-rice-natural
                      dark:text-rice-mint
                    "
                  />

                  <p
                    className="
                      mt-2 text-[10px]
                      text-rice-muted
                      dark:text-white/40
                    "
                  >
                    เย็น
                  </p>

                  <p
                    className="
                      mt-1 text-xs font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    ตรวจแปลง
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Finance */}
          <Card
            variant="gold"
            radius="3xl"
            fullHeight
            className="
              lg:col-span-4
            "
          >
            <CardContent
              className="
                flex min-h-[310px]
                h-full flex-col
                p-5 sm:p-6
              "
            >
              <div
                className="
                  flex items-start
                  justify-between gap-4
                "
              >
                <div>
                  <p className="uppercase-label">
                    Farm finance
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    รายรับและรายจ่าย
                  </h3>
                </div>

                <CardIcon
                  variant="gold"
                  size="sm"
                >
                  <WalletCards />
                </CardIcon>
              </div>

              <p
                className="
                  mt-3 text-sm leading-6
                  text-rice-muted
                  dark:text-white/55
                "
              >
                บันทึกค่าปุ๋ย ค่าแรง ค่าเมล็ดพันธุ์
                และรายรับจากการขายผลผลิต
              </p>

              <div
                className="
                  mt-auto rounded-[1.4rem]
                  border border-rice-gold/20
                  bg-white/55 p-4
                  dark:border-white/10
                  dark:bg-white/[0.055]
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between gap-3
                  "
                >
                  <span
                    className="
                      text-xs text-rice-muted
                      dark:text-white/45
                    "
                  >
                    สรุปต้นทุน
                  </span>

                  <BarChart3
                    aria-hidden="true"
                    className="
                      h-4 w-4
                      text-rice-gold
                    "
                  />
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div
                      className="
                        flex items-center
                        justify-between
                        text-[10px]
                        text-rice-muted
                        dark:text-white/40
                      "
                    >
                      <span>เมล็ดพันธุ์</span>
                      <span>รายการตัวอย่าง</span>
                    </div>

                    <div
                      className="
                        mt-1.5 h-2
                        overflow-hidden rounded-pill
                        bg-rice-dark/10
                        dark:bg-white/10
                      "
                    >
                      <div
                        className="
                          h-full w-[72%]
                          rounded-pill
                          bg-rice-gold
                        "
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      className="
                        flex items-center
                        justify-between
                        text-[10px]
                        text-rice-muted
                        dark:text-white/40
                      "
                    >
                      <span>ปุ๋ยและการดูแล</span>
                      <span>รายการตัวอย่าง</span>
                    </div>

                    <div
                      className="
                        mt-1.5 h-2
                        overflow-hidden rounded-pill
                        bg-rice-dark/10
                        dark:bg-white/10
                      "
                    >
                      <div
                        className="
                          h-full w-[54%]
                          rounded-pill
                          bg-rice-natural
                        "
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI assistant */}
          <Card
            variant="surface"
            radius="3xl"
            fullHeight
            className="
              lg:col-span-4
            "
          >
            <CardContent
              className="
                flex min-h-[310px]
                h-full flex-col
                p-5 sm:p-6
              "
            >
              <div
                className="
                  flex items-start
                  justify-between gap-4
                "
              >
                <div>
                  <p className="uppercase-label">
                    AI assistant
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    คำแนะนำที่เข้าใจง่าย
                  </h3>
                </div>

                <CardIcon
                  variant="green"
                  size="sm"
                >
                  <Bot />
                </CardIcon>
              </div>

              <p
                className="
                  mt-3 text-sm leading-6
                  text-rice-muted
                  dark:text-white/55
                "
              >
                ช่วยสรุปข้อมูลจากแปลงนา
                และแสดงสิ่งที่ควรตรวจสอบเป็นลำดับ
              </p>

              <div
                className="
                  mt-auto space-y-2.5 pt-6
                "
              >
                <div
                  className="
                    flex items-start gap-3
                    rounded-2xl
                    bg-rice-surface-soft
                    px-3.5 py-3
                    dark:bg-white/[0.045]
                  "
                >
                  <span
                    className="
                      mt-0.5 flex h-7 w-7
                      shrink-0 items-center
                      justify-center rounded-lg
                      bg-rice-mint/55
                      text-rice-forest
                      dark:bg-rice-leaf/20
                      dark:text-rice-mint
                    "
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <p
                    className="
                      text-xs leading-5
                      text-rice-muted
                      dark:text-white/55
                    "
                  >
                    สรุปข้อมูลสำคัญของแปลง
                  </p>
                </div>

                <div
                  className="
                    flex items-start gap-3
                    rounded-2xl
                    bg-rice-surface-soft
                    px-3.5 py-3
                    dark:bg-white/[0.045]
                  "
                >
                  <span
                    className="
                      mt-0.5 flex h-7 w-7
                      shrink-0 items-center
                      justify-center rounded-lg
                      bg-rice-mint/55
                      text-rice-forest
                      dark:bg-rice-leaf/20
                      dark:text-rice-mint
                    "
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <p
                    className="
                      text-xs leading-5
                      text-rice-muted
                      dark:text-white/55
                    "
                  >
                    แจ้งสิ่งที่ควรตรวจสอบเพิ่มเติม
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reports and history */}
          <Card
            variant="dark"
            radius="3xl"
            fullHeight
            className="
              relative overflow-hidden
              lg:col-span-4
            "
          >
            <CardContent
              className="
                relative flex min-h-[310px]
                h-full flex-col
                p-5 sm:p-6
              "
            >
              <div
                aria-hidden="true"
                className="
                  pointer-events-none
                  absolute -bottom-20 -right-20
                  h-56 w-56 rounded-full
                  bg-rice-mint/10 blur-3xl
                "
              />

              <div
                className="
                  relative z-10
                  flex items-start
                  justify-between gap-4
                "
              >
                <div>
                  <p
                    className="
                      text-[10px] font-semibold
                      uppercase tracking-[0.14em]
                      text-white/40
                    "
                  >
                    Reports & history
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-xl font-semibold
                      text-white
                    "
                  >
                    ประวัติและรายงานย้อนหลัง
                  </h3>
                </div>

                <span
                  className="
                    flex h-11 w-11
                    shrink-0 items-center
                    justify-center rounded-2xl
                    bg-white/[0.08]
                    text-rice-mint
                  "
                >
                  <History
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>
              </div>

              <p
                className="
                  relative z-10 mt-3
                  text-sm leading-6
                  text-white/55
                "
              >
                ดูประวัติการตรวจโรค
                กิจกรรมในแปลง และรายการต้นทุน
                เพื่อใช้เปรียบเทียบในแต่ละรอบปลูก
              </p>

              <div
                className="
                  relative z-10
                  mt-auto space-y-2.5 pt-6
                "
              >
                <div
                  className="
                    flex items-center
                    justify-between gap-4
                    rounded-2xl
                    border border-white/10
                    bg-white/[0.055]
                    px-4 py-3
                  "
                >
                  <div
                    className="
                      flex min-w-0 items-center
                      gap-3
                    "
                  >
                    <ScanLine
                      aria-hidden="true"
                      className="
                        h-4 w-4 shrink-0
                        text-rice-mint
                      "
                    />

                    <span
                      className="
                        truncate text-xs
                        text-white/70
                      "
                    >
                      ประวัติการตรวจโรค
                    </span>
                  </div>

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      h-4 w-4 shrink-0
                      text-white/35
                    "
                  />
                </div>

                <div
                  className="
                    flex items-center
                    justify-between gap-4
                    rounded-2xl
                    border border-white/10
                    bg-white/[0.055]
                    px-4 py-3
                  "
                >
                  <div
                    className="
                      flex min-w-0 items-center
                      gap-3
                    "
                  >
                    <WalletCards
                      aria-hidden="true"
                      className="
                        h-4 w-4 shrink-0
                        text-rice-mint
                      "
                    />

                    <span
                      className="
                        truncate text-xs
                        text-white/70
                      "
                    >
                      สรุปต้นทุนรอบปลูก
                    </span>
                  </div>

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      h-4 w-4 shrink-0
                      text-white/35
                    "
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom CTA */}
        <div
          className="
            mt-12 overflow-hidden
            rounded-[2rem]
            border border-rice-forest/10
            bg-white/75
            p-5 shadow-glass
            backdrop-blur-glass
            sm:p-7
            lg:mt-16
            dark:border-white/10
            dark:bg-white/[0.05]
          "
        >
          <div
            className="
              flex flex-col gap-6
              lg:flex-row
              lg:items-center
              lg:justify-between
            "
          >
            <div
              className="
                flex items-start gap-4
              "
            >
              <span
                className="
                  flex h-12 w-12
                  shrink-0 items-center
                  justify-center rounded-2xl
                  bg-rice-natural
                  text-white
                  shadow-primary
                  dark:bg-rice-mint
                  dark:text-rice-dark
                "
              >
                <Wheat
                  aria-hidden="true"
                  className="h-6 w-6"
                />
              </span>

              <div>
                <h3
                  className="
                    font-heading
                    text-lg font-semibold
                    text-rice-dark
                    sm:text-xl
                    dark:text-white
                  "
                >
                  เริ่มต้นจากการตรวจโรคข้าว
                </h3>

                <p
                  className="
                    mt-1 max-w-2xl
                    text-sm leading-6
                    text-rice-muted
                    dark:text-white/55
                  "
                >
                  อัปโหลดภาพใบข้าวเพื่อทดลองใช้งาน
                  และเริ่มสร้างประวัติข้อมูลสำหรับแปลงนา
                </p>
              </div>
            </div>

            <Link
              href={actionHref}
              className={buttonVariants({
                variant: "primary",
                size: "xl",
                className:
                  "group w-full shrink-0 lg:w-auto",
              })}
            >
              <ScanLine
                aria-hidden="true"
                className="h-5 w-5"
              />

              <span>{actionLabel}</span>

              <ArrowRight
                aria-hidden="true"
                className="
                  h-4 w-4
                  transition-transform
                  duration-300
                  ease-premium
                  group-hover:translate-x-1
                "
              />
            </Link>
          </div>

          <div
            className="
              mt-6 flex flex-wrap
              items-center gap-x-6 gap-y-3
              border-t border-rice-forest/10
              pt-5 text-xs
              text-rice-muted
              dark:border-white/10
              dark:text-white/45
            "
          >
            <span
              className="
                inline-flex items-center gap-2
              "
            >
              <ShieldCheck
                aria-hidden="true"
                className="
                  h-4 w-4 text-rice-leaf
                "
              />

              จัดเก็บข้อมูลอย่างเป็นระบบ
            </span>

            <span
              className="
                inline-flex items-center gap-2
              "
            >
              <Sprout
                aria-hidden="true"
                className="
                  h-4 w-4 text-rice-leaf
                "
              />

              ออกแบบสำหรับการจัดการนาข้าว
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}