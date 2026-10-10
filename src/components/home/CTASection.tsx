import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Check,
  MapPin,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Sprout,
  Wheat,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  ReactNode,
} from "react";

export interface CTASectionProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "title"
  > {
  /**
   * ข้อความขนาดเล็กเหนือหัวข้อ
   */
  eyebrow?: ReactNode;

  /**
   * หัวข้อหลักของ CTA
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

interface CTAFeature {
  id: string;
  label: string;
}

const CTA_FEATURES: CTAFeature[] = [
  {
    id: "easy-start",
    label: "เริ่มใช้งานได้ง่าย",
  },
  {
    id: "farm-history",
    label: "จัดเก็บประวัติแปลงนา",
  },
  {
    id: "mobile-ready",
    label: "รองรับการใช้งานบนมือถือ",
  },
];

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

/**
 * CTA Section สำหรับปิดท้ายหน้า Home
 *
 * ใช้เชิญชวนให้ผู้ใช้เริ่มตรวจโรคข้าว
 * หรือเพิ่มข้อมูลแปลงนาเข้าสู่ระบบ
 */
export default function CTASection({
  id = "home-cta",

  eyebrow = "เริ่มต้นใช้งาน Rice AI",

  heading = (
    <>
      พร้อมดูแลแปลงนา
      <span className="block text-rice-mint">
        อย่างเป็นระบบแล้วหรือยัง
      </span>
    </>
  ),

  description = (
    <>
      เริ่มจากการเพิ่มข้อมูลแปลงนา
      หรืออัปโหลดภาพใบข้าวเพื่อตรวจสอบความผิดปกติ
      พร้อมจัดเก็บผลและประวัติการดูแลไว้ในที่เดียว
    </>
  ),

  primaryHref = "/disease",
  primaryLabel = "เริ่มตรวจโรคข้าว",

  secondaryHref = "/farms",
  secondaryLabel = "เพิ่มแปลงนา",

  className,
  ...sectionProps
}: CTASectionProps) {
  const titleId = `${id}-title`;
  const descriptionId = `${id}-description`;

  return (
    <section
      {...sectionProps}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-component="home-cta-section"
      className={cn(
        "relative isolate overflow-hidden",
        "border-t border-rice-forest/10 bg-rice-background",
        "px-5 py-20",
        "sm:px-6 sm:py-24",
        "lg:px-8 lg:py-28",
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        <div
          className="
            relative overflow-hidden
            rounded-[2.25rem]
            border border-white/10
            bg-rice-dark
            px-5 py-7
            text-white
            shadow-floating
            sm:px-8 sm:py-10
            lg:min-h-[560px]
            lg:px-12 lg:py-12
          "
        >
          {/* Grid texture */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute inset-0
              opacity-[0.045]
              [background-image:linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)]
              [background-size:44px_44px]
            "
          />

          {/* Ambient glows */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -right-24 -top-28
              h-96 w-96 rounded-full
              bg-rice-mint/20
              blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -bottom-40 -left-24
              h-[420px] w-[420px]
              rounded-full
              bg-rice-leaf/25
              blur-3xl
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute right-[18%] top-[34%]
              h-48 w-48 rounded-full
              bg-rice-gold/10
              blur-3xl
            "
          />

          {/* Decorative rice shapes */}
          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -bottom-20 -right-16
              hidden h-80 w-80
              rotate-[-12deg]
              rounded-[45%]
              border-[34px]
              border-white/[0.035]
              lg:block
            "
          />

          <div
            aria-hidden="true"
            className="
              pointer-events-none
              absolute -bottom-40 right-28
              hidden h-80 w-80
              rotate-[16deg]
              rounded-[45%]
              border-[28px]
              border-rice-mint/[0.04]
              lg:block
            "
          />

          <div
            className="
              relative z-10 grid
              items-center gap-10
              lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]
              lg:gap-14
            "
          >
            {/* CTA content */}
            <div className="max-w-3xl">
              <div
                className="
                  inline-flex min-h-10
                  items-center gap-2
                  rounded-pill
                  border border-white/10
                  bg-white/[0.07]
                  px-4 py-2
                  text-xs font-semibold
                  text-rice-mint
                  backdrop-blur-glass
                "
              >
                <Sparkles
                  aria-hidden="true"
                  className="h-4 w-4"
                />

                <span>{eyebrow}</span>
              </div>

              <h2
                id={titleId}
                className="
                  mt-6 max-w-3xl
                  font-heading
                  text-[2.25rem] font-bold
                  leading-[1.08]
                  tracking-[-0.04em]
                  text-white
                  sm:text-[3rem]
                  lg:text-[3.75rem]
                "
              >
                {heading}
              </h2>

              <p
                id={descriptionId}
                className="
                  mt-6 max-w-2xl
                  text-[15px] leading-7
                  text-white/60
                  sm:text-base sm:leading-8
                "
              >
                {description}
              </p>

              <div
                className="
                  mt-8 flex
                  flex-col gap-3
                  sm:flex-row
                  sm:items-center
                "
              >
                <Link
                  href={primaryHref}
                  className="
                    group inline-flex
                    min-h-14 w-full
                    items-center justify-center
                    gap-2.5 rounded-pill
                    bg-rice-mint
                    px-6 py-3
                    text-sm font-semibold
                    text-rice-dark
                    shadow-[0_12px_32px_rgba(190,238,207,0.18)]
                    transition-[transform,background-color,box-shadow]
                    duration-300
                    ease-premium
                    hover:-translate-y-0.5
                    hover:bg-rice-mint-light
                    hover:shadow-[0_16px_38px_rgba(190,238,207,0.24)]
                    active:translate-y-0
                    active:scale-[0.98]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-white
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-rice-dark
                    sm:w-auto
                  "
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
                      group-hover:translate-x-1
                    "
                  />
                </Link>

                <Link
                  href={secondaryHref}
                  className="
                    inline-flex min-h-14
                    w-full items-center
                    justify-center gap-2.5
                    rounded-pill
                    border border-white/15
                    bg-white/[0.07]
                    px-6 py-3
                    text-sm font-semibold
                    text-white
                    backdrop-blur-glass
                    transition-[transform,background-color,border-color]
                    duration-300
                    ease-premium
                    hover:-translate-y-0.5
                    hover:border-white/25
                    hover:bg-white/[0.11]
                    active:translate-y-0
                    active:scale-[0.98]
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-rice-mint
                    focus-visible:ring-offset-2
                    focus-visible:ring-offset-rice-dark
                    sm:w-auto
                  "
                >
                  <MapPin
                    aria-hidden="true"
                    className="h-5 w-5 text-rice-mint"
                  />

                  <span>{secondaryLabel}</span>
                </Link>
              </div>

              <ul
                aria-label="จุดเด่นของการเริ่มใช้งาน Rice AI"
                className="
                  mt-8 grid gap-3
                  text-sm text-white/60
                  sm:grid-cols-2
                  xl:grid-cols-3
                "
              >
                {CTA_FEATURES.map((feature) => (
                  <li
                    key={feature.id}
                    className="
                      flex min-h-7
                      items-center gap-2.5
                    "
                  >
                    <span
                      aria-hidden="true"
                      className="
                        inline-flex h-5 w-5
                        shrink-0 items-center
                        justify-center
                        rounded-full
                        bg-rice-mint/15
                        text-rice-mint
                      "
                    >
                      <Check
                        className="h-3 w-3"
                        strokeWidth={3}
                      />
                    </span>

                    <span>{feature.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA visual card */}
            <div
              aria-label="ตัวอย่างลำดับการเริ่มใช้งาน Rice AI"
              className="
                relative mx-auto
                w-full max-w-[460px]
                lg:mx-0
                lg:justify-self-end
              "
            >
              <div
                aria-hidden="true"
                className="
                  absolute inset-x-10
                  bottom-0 -z-10
                  h-24 rounded-full
                  bg-rice-mint/20
                  blur-3xl
                "
              />

              <div
                className="
                  overflow-hidden
                  rounded-[2rem]
                  border border-white/12
                  bg-white/[0.075]
                  p-4
                  shadow-[0_24px_70px_rgba(0,0,0,0.22)]
                  backdrop-blur-glass
                  sm:p-5
                "
              >
                {/* Visual header */}
                <div
                  className="
                    flex items-center
                    justify-between gap-4
                  "
                >
                  <div
                    className="
                      flex min-w-0
                      items-center gap-3
                    "
                  >
                    <span
                      className="
                        flex h-11 w-11
                        shrink-0 items-center
                        justify-center rounded-2xl
                        bg-rice-mint
                        text-rice-dark
                      "
                    >
                      <Wheat
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                    </span>

                    <div className="min-w-0">
                      <p
                        className="
                          text-[10px]
                          font-semibold uppercase
                          tracking-[0.14em]
                          text-white/40
                        "
                      >
                        Rice AI workspace
                      </p>

                      <p
                        className="
                          mt-1 truncate
                          font-heading
                          text-base font-semibold
                          text-white
                        "
                      >
                        เริ่มต้นจัดการแปลงนา
                      </p>
                    </div>
                  </div>

                  <span
                    className="
                      shrink-0 rounded-pill
                      bg-rice-mint/15
                      px-2.5 py-1
                      text-[10px] font-semibold
                      text-rice-mint
                    "
                  >
                    พร้อมใช้งาน
                  </span>
                </div>

                {/* Workflow preview */}
                <div className="mt-5 space-y-3">
                  <div
                    className="
                      flex items-center
                      gap-3 rounded-[1.35rem]
                      border border-white/10
                      bg-white/[0.055]
                      px-4 py-3.5
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
                      <MapPin
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div
                        className="
                          flex items-center
                          justify-between gap-3
                        "
                      >
                        <p
                          className="
                            text-xs font-semibold
                            text-white
                          "
                        >
                          เพิ่มข้อมูลแปลงนา
                        </p>

                        <span
                          className="
                            text-[10px]
                            text-white/35
                          "
                        >
                          ขั้นตอน 1
                        </span>
                      </div>

                      <p
                        className="
                          mt-1 truncate
                          text-[11px]
                          text-white/45
                        "
                      >
                        ชื่อแปลง ตำแหน่ง และพันธุ์ข้าว
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      flex items-center
                      gap-3 rounded-[1.35rem]
                      border border-white/10
                      bg-white/[0.055]
                      px-4 py-3.5
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
                      <ScanLine
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>

                    <div className="min-w-0 flex-1">
                      <div
                        className="
                          flex items-center
                          justify-between gap-3
                        "
                      >
                        <p
                          className="
                            text-xs font-semibold
                            text-white
                          "
                        >
                          อัปโหลดภาพใบข้าว
                        </p>

                        <span
                          className="
                            text-[10px]
                            text-white/35
                          "
                        >
                          ขั้นตอน 2
                        </span>
                      </div>

                      <p
                        className="
                          mt-1 truncate
                          text-[11px]
                          text-white/45
                        "
                      >
                        ถ่ายภาพหรือเลือกไฟล์จากอุปกรณ์
                      </p>
                    </div>
                  </div>

                  <div
                    className="
                      relative overflow-hidden
                      rounded-[1.35rem]
                      border border-rice-mint/20
                      bg-rice-mint/10
                      px-4 py-4
                    "
                  >
                    <div
                      aria-hidden="true"
                      className="
                        pointer-events-none
                        absolute -right-10 -top-10
                        h-28 w-28 rounded-full
                        bg-rice-mint/15
                        blur-2xl
                      "
                    />

                    <div
                      className="
                        relative flex
                        items-center gap-3
                      "
                    >
                      <span
                        className="
                          relative flex h-11 w-11
                          shrink-0 items-center
                          justify-center rounded-2xl
                          bg-rice-mint
                          text-rice-dark
                        "
                      >
                        <Bot
                          aria-hidden="true"
                          className="h-5 w-5"
                        />

                        <span
                          aria-hidden="true"
                          className="
                            absolute right-0.5 top-0.5
                            h-2.5 w-2.5
                            rounded-full
                            bg-[#4f9b5f]
                            ring-2 ring-rice-mint
                          "
                        />
                      </span>

                      <div className="min-w-0 flex-1">
                        <div
                          className="
                            flex items-center
                            justify-between gap-3
                          "
                        >
                          <p
                            className="
                              text-xs font-semibold
                              text-white
                            "
                          >
                            วิเคราะห์และบันทึกผล
                          </p>

                          <span
                            className="
                              text-[10px]
                              text-rice-mint
                            "
                          >
                            ขั้นตอน 3
                          </span>
                        </div>

                        <p
                          className="
                            mt-1 truncate
                            text-[11px]
                            text-white/50
                          "
                        >
                          จัดเก็บผลไว้ในประวัติของแปลง
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visual footer */}
                <div
                  className="
                    mt-4 flex items-center
                    justify-between gap-4
                    rounded-[1.25rem]
                    bg-rice-dark/50
                    px-4 py-3.5
                  "
                >
                  <div
                    className="
                      flex min-w-0
                      items-center gap-3
                    "
                  >
                    <span
                      className="
                        flex h-9 w-9
                        shrink-0 items-center
                        justify-center rounded-xl
                        bg-white/[0.08]
                        text-rice-mint
                      "
                    >
                      <Sprout
                        aria-hidden="true"
                        className="h-4 w-4"
                      />
                    </span>

                    <div className="min-w-0">
                      <p
                        className="
                          text-[10px]
                          text-white/35
                        "
                      >
                        ขั้นตอนถัดไป
                      </p>

                      <p
                        className="
                          mt-0.5 truncate
                          text-xs font-semibold
                          text-white
                        "
                      >
                        ติดตามข้อมูลและวางแผน
                      </p>
                    </div>
                  </div>

                  <ArrowRight
                    aria-hidden="true"
                    className="
                      h-4 w-4 shrink-0
                      text-rice-mint
                    "
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Trust footer */}
          <div
            className="
              relative z-10 mt-10
              flex flex-col gap-4
              border-t border-white/10
              pt-6
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <div
              className="
                flex items-start gap-3
              "
            >
              <ShieldCheck
                aria-hidden="true"
                className="
                  mt-0.5 h-5 w-5
                  shrink-0 text-rice-mint
                "
              />

              <p
                className="
                  max-w-2xl text-xs
                  leading-5 text-white/45
                "
              >
                Rice AI เป็นเครื่องมือสนับสนุนการจัดเก็บข้อมูล
                และการตัดสินใจ ผลการวิเคราะห์ไม่ควรใช้แทนคำแนะนำ
                จากผู้เชี่ยวชาญทั้งหมด
              </p>
            </div>

            <span
              className="
                inline-flex w-fit
                shrink-0 items-center gap-2
                rounded-pill
                border border-white/10
                bg-white/[0.055]
                px-3 py-2
                text-xs font-medium
                text-white/55
              "
            >
              <span
                aria-hidden="true"
                className="
                  h-2 w-2 rounded-full
                  bg-rice-mint
                "
              />

              ระบบเกษตรอัจฉริยะสำหรับนาข้าว
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
