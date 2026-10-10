import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Camera,
  Check,
  CheckCircle2,
  Database,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  TrendingUp,
  Upload,
  Wheat,
  type LucideIcon,
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

export interface HowItWorksSectionProps
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
   * ลิงก์ปุ่มหลัก
   */
  primaryHref?: string;

  /**
   * ข้อความปุ่มหลัก
   */
  primaryLabel?: string;

  /**
   * ลิงก์ปุ่มรอง
   */
  secondaryHref?: string;

  /**
   * ข้อความปุ่มรอง
   */
  secondaryLabel?: string;
}

interface WorkflowStep {
  id: string;
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  helper: string;
  icon: LucideIcon;
  iconVariant:
    | "green"
    | "mint"
    | "gold"
    | "neutral";
}

const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    id: "create-farm",
    number: "01",
    eyebrow: "Create farm",
    title: "เพิ่มข้อมูลแปลงนา",
    description:
      "บันทึกชื่อแปลง ตำแหน่ง พันธุ์ข้าว วันที่เริ่มปลูก และข้อมูลพื้นฐานที่จำเป็น",
    helper:
      "ข้อมูลแปลงช่วยให้ระบบจัดเก็บประวัติได้เป็นระเบียบ",
    icon: MapPin,
    iconVariant: "green",
  },
  {
    id: "upload-image",
    number: "02",
    eyebrow: "Upload image",
    title: "ถ่ายภาพใบข้าว",
    description:
      "ถ่ายภาพจากมือถือหรือเลือกรูปจากอุปกรณ์ โดยให้ใบข้าวอยู่ในภาพอย่างชัดเจน",
    helper:
      "ควรถ่ายในบริเวณที่มีแสงเพียงพอและภาพไม่เบลอ",
    icon: Camera,
    iconVariant: "mint",
  },
  {
    id: "ai-analysis",
    number: "03",
    eyebrow: "AI analysis",
    title: "ระบบช่วยวิเคราะห์",
    description:
      "AI ประมวลผลภาพเพื่อค้นหาความผิดปกติ พร้อมบันทึกผลการตรวจไว้กับแปลงนา",
    helper:
      "ผลลัพธ์ควรใช้ร่วมกับการตรวจสอบจากผู้เชี่ยวชาญ",
    icon: Bot,
    iconVariant: "gold",
  },
  {
    id: "track-result",
    number: "04",
    eyebrow: "Track & plan",
    title: "ติดตามและวางแผน",
    description:
      "ดูผลการตรวจย้อนหลัง แนวโน้มสุขภาพแปลง และรายการที่ควรตรวจสอบในครั้งต่อไป",
    helper:
      "ใช้ข้อมูลย้อนหลังเพื่อประกอบการตัดสินใจในแต่ละรอบปลูก",
    icon: TrendingUp,
    iconVariant: "green",
  },
];

const IMAGE_CHECKLIST = [
  "ใบข้าวอยู่ในระยะที่มองเห็นรายละเอียด",
  "ภาพมีแสงเพียงพอและไม่มืดเกินไป",
  "หลีกเลี่ยงภาพเบลอหรือมีสิ่งบดบัง",
];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * How It Works Section หน้า Home ของ Rice AI
 *
 * อธิบายลำดับการใช้งานตั้งแต่เพิ่มแปลงนา
 * ไปจนถึงติดตามผลและดูข้อมูลย้อนหลัง
 */
export default function HowItWorksSection({
  id = "how-it-works",

  eyebrow = "เริ่มใช้งานได้ในไม่กี่ขั้นตอน",

  heading = (
    <>
      จากภาพใบข้าว
      <span
        className="
          block text-rice-natural
          dark:text-rice-mint
        "
      >
        สู่ข้อมูลที่นำไปใช้งานต่อได้
      </span>
    </>
  ),

  description = (
    <>
      เพิ่มข้อมูลแปลง ถ่ายภาพใบข้าว
      และติดตามผลการตรวจในขั้นตอนที่เข้าใจง่าย
      โดยข้อมูลทุกครั้งจะถูกจัดเก็บอย่างเป็นระบบ
    </>
  ),

  primaryHref = "/disease",
  primaryLabel = "เริ่มตรวจโรคข้าว",

  secondaryHref = "/farms",
  secondaryLabel = "เพิ่มแปลงนา",

  className,
  ...sectionProps
}: HowItWorksSectionProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <section
      {...sectionProps}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-component="how-it-works-section"
      className={cn(
        "relative isolate overflow-hidden",
        "border-y border-rice-forest/10 bg-rice-background",
        "px-5 py-20",
        "sm:px-6 sm:py-24",
        "lg:px-8 lg:py-28",
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Heading */}
        <div
          className="
            grid items-end gap-8
            lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.7fr)]
          "
        >
          <div className="max-w-3xl">
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
                className="h-4 w-4 text-rice-leaf"
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
          </div>

          <p
            id={descriptionId}
            className="
              max-w-xl text-[15px]
              leading-7 text-rice-muted
              sm:text-base sm:leading-8
              lg:justify-self-end
              dark:text-white/60
            "
          >
            {description}
          </p>
        </div>

        {/* Workflow */}
        <div
          className="
            relative mt-12
            lg:mt-16
          "
        >
          {/* Desktop connecting line */}
          <div
            aria-hidden="true"
            className="
              absolute left-[8%] right-[8%]
              top-[42px] hidden h-px
              bg-gradient-to-r
              from-transparent
              via-rice-natural/30
              to-transparent
              lg:block
              dark:via-rice-mint/20
            "
          />

          <ol
            aria-label="ขั้นตอนการใช้งาน Rice AI"
            className="
              grid gap-4
              md:grid-cols-2
              lg:grid-cols-4
              lg:gap-5
            "
          >
            {WORKFLOW_STEPS.map(
              (step, index) => {
                const StepIcon = step.icon;
                const isAnalysisStep =
                  step.id === "ai-analysis";

                return (
                  <li
                    key={step.id}
                    className="relative"
                  >
                    {/* Mobile connector */}
                    {index <
                      WORKFLOW_STEPS.length -
                        1 && (
                      <div
                        aria-hidden="true"
                        className="
                          absolute -bottom-4
                          left-8 z-10 h-4
                          w-px bg-rice-natural/20
                          md:hidden
                          dark:bg-rice-mint/15
                        "
                      />
                    )}

                    <Card
                      variant={
                        isAnalysisStep
                          ? "dark"
                          : "surface"
                      }
                      radius="3xl"
                      fullHeight
                      className="
                        relative overflow-hidden
                      "
                    >
                      <CardContent
                        className="
                          relative flex
                          min-h-[350px]
                          h-full flex-col
                          p-5 sm:p-6
                        "
                      >
                        {isAnalysisStep && (
                          <>
                            <div
                              aria-hidden="true"
                              className="
                                pointer-events-none
                                absolute -right-20 -top-20
                                h-56 w-56
                                rounded-full
                                bg-rice-mint/15
                                blur-3xl
                              "
                            />

                            <div
                              aria-hidden="true"
                              className="
                                pointer-events-none
                                absolute -bottom-24 -left-20
                                h-56 w-56
                                rounded-full
                                bg-rice-leaf/20
                                blur-3xl
                              "
                            />
                          </>
                        )}

                        {/* Number and icon */}
                        <div
                          className="
                            relative z-10
                            flex items-center
                            justify-between gap-4
                          "
                        >
                          <span
                            className={cn(
                              `
                                inline-flex h-12
                                min-w-12 items-center
                                justify-center
                                rounded-2xl px-3
                                font-heading
                                text-sm font-bold
                              `,
                              isAnalysisStep
                                ? `
                                  border border-white/10
                                  bg-white/[0.08]
                                  text-rice-mint
                                `
                                : `
                                  border border-rice-forest/10
                                  bg-rice-surface-soft
                                  text-rice-natural
                                  dark:border-white/10
                                  dark:bg-white/[0.05]
                                  dark:text-rice-mint
                                `
                            )}
                          >
                            {step.number}
                          </span>

                          <CardIcon
                            variant={step.iconVariant}
                            size="sm"
                          >
                            <StepIcon />
                          </CardIcon>
                        </div>

                        <div
                          className="
                            relative z-10 mt-8
                          "
                        >
                          <p
                            className={cn(
                              `
                                text-[10px]
                                font-semibold uppercase
                                tracking-[0.14em]
                              `,
                              isAnalysisStep
                                ? "text-white/40"
                                : `
                                  text-rice-muted/70
                                  dark:text-white/40
                                `
                            )}
                          >
                            {step.eyebrow}
                          </p>

                          <h3
                            className={cn(
                              `
                                mt-2 font-heading
                                text-xl font-semibold
                                leading-tight
                              `,
                              isAnalysisStep
                                ? "text-white"
                                : `
                                  text-rice-dark
                                  dark:text-white
                                `
                            )}
                          >
                            {step.title}
                          </h3>

                          <p
                            className={cn(
                              `
                                mt-3 text-sm
                                leading-6
                              `,
                              isAnalysisStep
                                ? "text-white/55"
                                : `
                                  text-rice-muted
                                  dark:text-white/55
                                `
                            )}
                          >
                            {step.description}
                          </p>
                        </div>

                        <div
                          className={cn(
                            `
                              relative z-10
                              mt-auto flex
                              items-start gap-2.5
                              rounded-2xl
                              px-3.5 py-3
                            `,
                            isAnalysisStep
                              ? `
                                border border-white/10
                                bg-white/[0.06]
                              `
                              : `
                                bg-rice-surface-soft
                                dark:bg-white/[0.045]
                              `
                          )}
                        >
                          <CheckCircle2
                            aria-hidden="true"
                            className={cn(
                              `
                                mt-0.5 h-4 w-4
                                shrink-0
                              `,
                              isAnalysisStep
                                ? "text-rice-mint"
                                : `
                                  text-rice-leaf
                                  dark:text-rice-mint
                                `
                            )}
                          />

                          <p
                            className={cn(
                              "text-xs leading-5",
                              isAnalysisStep
                                ? "text-white/55"
                                : `
                                  text-rice-muted
                                  dark:text-white/50
                                `
                            )}
                          >
                            {step.helper}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </li>
                );
              }
            )}
          </ol>
        </div>

        {/* Detail preview */}
        <div
          className="
            mt-5 grid gap-5
            lg:mt-6
            lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]
          "
        >
          {/* Image preparation card */}
          <Card
            variant="mint"
            radius="3xl"
            fullHeight
          >
            <CardContent
              className="
                flex min-h-[400px]
                h-full flex-col
                p-5 sm:p-7
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
                    Image preparation
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-2xl font-semibold
                      leading-tight
                      text-rice-dark
                      dark:text-white
                    "
                  >
                    เตรียมภาพให้พร้อม
                    ก่อนเริ่มวิเคราะห์
                  </h3>
                </div>

                <CardIcon
                  variant="mint"
                  size="sm"
                >
                  <Upload />
                </CardIcon>
              </div>

              <p
                className="
                  mt-4 max-w-xl
                  text-sm leading-7
                  text-rice-muted
                  dark:text-white/55
                "
              >
                คุณภาพของภาพมีผลต่อรายละเอียด
                ที่ระบบสามารถมองเห็นได้
                จึงควรถ่ายภาพใบข้าวให้ชัดเจนที่สุด
              </p>

              <ul
                className="
                  mt-7 space-y-3
                "
              >
                {IMAGE_CHECKLIST.map(
                  (item) => (
                    <li
                      key={item}
                      className="
                        flex items-start gap-3
                        rounded-2xl
                        bg-white/60
                        px-4 py-3.5
                        dark:bg-white/[0.055]
                      "
                    >
                      <span
                        className="
                          mt-0.5 inline-flex
                          h-6 w-6 shrink-0
                          items-center justify-center
                          rounded-full
                          bg-rice-mint
                          text-rice-forest
                          dark:bg-rice-leaf/25
                          dark:text-rice-mint
                        "
                      >
                        <Check
                          aria-hidden="true"
                          className="h-3.5 w-3.5"
                          strokeWidth={3}
                        />
                      </span>

                      <span
                        className="
                          text-sm leading-6
                          text-rice-dark
                          dark:text-white/70
                        "
                      >
                        {item}
                      </span>
                    </li>
                  )
                )}
              </ul>

              <div
                className="
                  mt-auto flex items-center
                  gap-3 pt-7
                "
              >
                <span
                  className="
                    inline-flex h-11 w-11
                    shrink-0 items-center
                    justify-center rounded-2xl
                    bg-rice-natural
                    text-white
                    shadow-primary
                    dark:bg-rice-mint
                    dark:text-rice-dark
                  "
                >
                  <Sprout
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>

                <p
                  className="
                    text-xs leading-5
                    text-rice-muted
                    dark:text-white/45
                  "
                >
                  รองรับการถ่ายภาพจากมือถือ
                  และการอัปโหลดไฟล์จากอุปกรณ์
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Process preview */}
          <Card
            variant="dark"
            radius="3xl"
            fullHeight
            className="
              relative overflow-hidden
            "
          >
            <CardContent
              className="
                relative flex min-h-[400px]
                h-full flex-col
                p-5 sm:p-7
              "
            >
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
                  absolute -bottom-20 -left-20
                  h-64 w-64 rounded-full
                  bg-rice-leaf/20 blur-3xl
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
                    Data workflow
                  </p>

                  <h3
                    className="
                      mt-2 font-heading
                      text-2xl font-semibold
                      leading-tight text-white
                    "
                  >
                    ข้อมูลถูกจัดเก็บ
                    ตามลำดับการทำงาน
                  </h3>
                </div>

                <span
                  className="
                    flex h-12 w-12
                    shrink-0 items-center
                    justify-center rounded-2xl
                    border border-white/10
                    bg-white/[0.08]
                    text-rice-mint
                  "
                >
                  <Database
                    aria-hidden="true"
                    className="h-5 w-5"
                  />
                </span>
              </div>

              <div
                className="
                  relative z-10 mt-7
                  grid gap-3
                  sm:grid-cols-3
                "
              >
                <div
                  className="
                    rounded-[1.4rem]
                    border border-white/10
                    bg-white/[0.055]
                    p-4
                  "
                >
                  <span
                    className="
                      flex h-10 w-10
                      items-center justify-center
                      rounded-xl
                      bg-rice-mint/15
                      text-rice-mint
                    "
                  >
                    <MapPin
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <p
                    className="
                      mt-4 text-[10px]
                      uppercase tracking-[0.12em]
                      text-white/35
                    "
                  >
                    Farm
                  </p>

                  <p
                    className="
                      mt-1 text-sm font-semibold
                      text-white
                    "
                  >
                    ข้อมูลแปลงนา
                  </p>
                </div>

                <div
                  className="
                    rounded-[1.4rem]
                    border border-white/10
                    bg-white/[0.055]
                    p-4
                  "
                >
                  <span
                    className="
                      flex h-10 w-10
                      items-center justify-center
                      rounded-xl
                      bg-rice-mint/15
                      text-rice-mint
                    "
                  >
                    <ScanLine
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <p
                    className="
                      mt-4 text-[10px]
                      uppercase tracking-[0.12em]
                      text-white/35
                    "
                  >
                    Scan
                  </p>

                  <p
                    className="
                      mt-1 text-sm font-semibold
                      text-white
                    "
                  >
                    ผลการตรวจ
                  </p>
                </div>

                <div
                  className="
                    rounded-[1.4rem]
                    border border-white/10
                    bg-white/[0.055]
                    p-4
                  "
                >
                  <span
                    className="
                      flex h-10 w-10
                      items-center justify-center
                      rounded-xl
                      bg-rice-mint/15
                      text-rice-mint
                    "
                  >
                    <TrendingUp
                      aria-hidden="true"
                      className="h-4 w-4"
                    />
                  </span>

                  <p
                    className="
                      mt-4 text-[10px]
                      uppercase tracking-[0.12em]
                      text-white/35
                    "
                  >
                    History
                  </p>

                  <p
                    className="
                      mt-1 text-sm font-semibold
                      text-white
                    "
                  >
                    ข้อมูลย้อนหลัง
                  </p>
                </div>
              </div>

              <div
                className="
                  relative z-10
                  mt-4 flex flex-1
                  items-center justify-center
                  overflow-hidden
                  rounded-[1.5rem]
                  border border-white/10
                  bg-white/[0.04]
                  px-5 py-8
                "
              >
                <div
                  aria-hidden="true"
                  className="
                    pointer-events-none
                    absolute inset-0
                    opacity-[0.05]
                    [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
                    [background-size:30px_30px]
                  "
                />

                <div
                  className="
                    relative flex w-full
                    max-w-md items-center
                    justify-between gap-2
                  "
                >
                  <span
                    className="
                      flex h-14 w-14
                      shrink-0 items-center
                      justify-center rounded-2xl
                      bg-white/[0.08]
                      text-rice-mint
                    "
                  >
                    <Camera
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className="
                      h-px flex-1
                      bg-gradient-to-r
                      from-rice-mint/15
                      to-rice-mint/60
                    "
                  />

                  <span
                    className="
                      flex h-16 w-16
                      shrink-0 items-center
                      justify-center rounded-[1.3rem]
                      border border-rice-mint/20
                      bg-rice-mint/15
                      text-rice-mint
                      shadow-[0_0_30px_rgba(190,238,207,0.12)]
                    "
                  >
                    <Bot
                      aria-hidden="true"
                      className="h-6 w-6"
                    />
                  </span>

                  <span
                    aria-hidden="true"
                    className="
                      h-px flex-1
                      bg-gradient-to-r
                      from-rice-mint/60
                      to-rice-mint/15
                    "
                  />

                  <span
                    className="
                      flex h-14 w-14
                      shrink-0 items-center
                      justify-center rounded-2xl
                      bg-white/[0.08]
                      text-rice-mint
                    "
                  >
                    <CheckCircle2
                      aria-hidden="true"
                      className="h-5 w-5"
                    />
                  </span>
                </div>
              </div>

              <div
                className="
                  relative z-10
                  mt-4 flex items-start gap-3
                  rounded-2xl
                  border border-white/10
                  bg-white/[0.055]
                  px-4 py-3.5
                "
              >
                <ShieldCheck
                  aria-hidden="true"
                  className="
                    mt-0.5 h-4 w-4
                    shrink-0 text-rice-mint
                  "
                />

                <p
                  className="
                    text-xs leading-5
                    text-white/55
                  "
                >
                  ผลการวิเคราะห์เป็นข้อมูลสนับสนุน
                  ไม่ควรใช้แทนคำแนะนำจากผู้เชี่ยวชาญทั้งหมด
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bottom action */}
        <div
          className="
            mt-6 overflow-hidden
            rounded-[2rem]
            border border-rice-forest/10
            bg-white/75
            p-5 shadow-glass
            backdrop-blur-glass
            sm:p-7
            lg:mt-8
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
                  text-white shadow-primary
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
                  พร้อมเริ่มสร้างข้อมูลแปลงนา
                </h3>

                <p
                  className="
                    mt-1 max-w-2xl
                    text-sm leading-6
                    text-rice-muted
                    dark:text-white/55
                  "
                >
                  เพิ่มข้อมูลแปลงก่อน
                  หรือเริ่มตรวจโรคข้าวจากภาพได้ทันที
                </p>
              </div>
            </div>

            <div
              className="
                flex w-full flex-col gap-3
                sm:flex-row
                lg:w-auto
              "
            >
              <Link
                href={secondaryHref}
                className={buttonVariants({
                  variant: "secondary",
                  size: "xl",
                  className:
                    "w-full lg:w-auto",
                })}
              >
                <MapPin
                  aria-hidden="true"
                  className="h-5 w-5"
                />

                <span>
                  {secondaryLabel}
                </span>
              </Link>

              <Link
                href={primaryHref}
                className={buttonVariants({
                  variant: "primary",
                  size: "xl",
                  className:
                    "group w-full lg:w-auto",
                })}
              >
                <ScanLine
                  aria-hidden="true"
                  className="h-5 w-5"
                />

                <span>{primaryLabel}</span>

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
          </div>
        </div>
      </div>
    </section>
  );
}
