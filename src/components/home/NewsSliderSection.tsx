"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CloudRain,
  Newspaper,
  Pause,
  Play,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type {
  ComponentPropsWithoutRef,
  PointerEvent as ReactPointerEvent,
} from "react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export interface NewsSliderSectionProps
  extends Omit<
    ComponentPropsWithoutRef<"section">,
    "children" | "title"
  > {
  /**
   * ระยะเวลาเปลี่ยนสไลด์อัตโนมัติ
   * ค่าเริ่มต้น 5 วินาที
   */
  autoplayInterval?: number;

  /**
   * เปิดหรือปิดการเลื่อนอัตโนมัติ
   */
  autoplay?: boolean;

  /**
   * ลิงก์ไปหน้าข่าวทั้งหมด
   */
  allNewsHref?: string;

  /**
   * ข้อความปุ่มดูข่าวทั้งหมด
   */
  allNewsLabel?: string;
}

interface FeaturedNewsItem {
  id: string;
  category: string;
  badge?: string;
  title: string;
  description: string;
  publishedAt: string;
  source: string;
  image: string;
  imageAlt: string;
  href: string;
  icon: LucideIcon;
  imageFit?: "cover" | "contain";
}

const FEATURED_NEWS: FeaturedNewsItem[] = [
  {
    id: "rice-disease-management",
    category: "โรคและศัตรูข้าว",
    badge: "แนะนำ",
    title:
      "แนวทางรับมือโรคข้าว 5 ชนิดที่ควรเฝ้าระวัง",
    description:
      "เรียนรู้อาการและแนวทางจัดการโรคไหม้ข้าว โรคขอบใบแห้ง โรคกาบใบแห้ง โรคใบจุดสีน้ำตาล และโรคเมล็ดด่าง",
    publishedAt: "บทความความรู้",
    source: "Rice AI",
    image:
      "/images/news/rice-disease-management.webp",
    imageAlt:
      "แนวทางรับมือโรคข้าว 5 ชนิด พร้อมวิธีสังเกตและจัดการเบื้องต้น",
    href: "/news/rice-disease-management",
    icon: ShieldAlert,
    imageFit: "contain",
  },
  {
    id: "rice-disease-warning",
    category: "เตือนภัยโรคข้าว",
    badge: "เฝ้าระวัง",
    title:
      "สังเกตโรคข้าว 5 ชนิด ก่อนอาการลุกลามในแปลง",
    description:
      "ตรวจสอบลักษณะแผลบนใบ กาบใบ โคนต้น และเมล็ด เพื่อค้นหาความผิดปกติและวางแผนจัดการได้เร็วขึ้น",
    publishedAt: "คู่มือเฝ้าระวัง",
    source: "Rice AI",
    image:
      "/images/news/rice-disease-warning.webp",
    imageAlt:
      "เตือนภัยโรคข้าว 5 ชนิดที่ควรเฝ้าระวังในแปลงนา",
    href: "/news/rice-disease-warning",
    icon: ShieldAlert,
    imageFit: "contain",
  },
  {
    id: "rice-price",
    category: "ราคาข้าว",
    badge: "ข้อมูลตลาด",
    title:
      "ติดตามราคาข้าวก่อนวางแผนขายผลผลิต",
    description:
      "ตรวจสอบราคา วันที่อัปเดต และแหล่งข้อมูล เพื่อใช้ประกอบการตัดสินใจเกี่ยวกับช่วงเวลาจำหน่ายผลผลิต",
    publishedAt: "อัปเดตตามแหล่งข้อมูล",
    source: "ข้อมูลตลาดข้าว",
    image: "/images/news/rice-price.webp",
    imageAlt:
      "เมล็ดข้าวและผลผลิตข้าวสำหรับข่าวราคาตลาด",
    href: "/news/rice-price",
    icon: TrendingUp,
    imageFit: "cover",
  },
  {
    id: "rice-weather",
    category: "อากาศเพื่อการเกษตร",
    badge: "สภาพอากาศ",
    title:
      "วางแผนงานในแปลงด้วยข้อมูลฝนและสภาพอากาศ",
    description:
      "ตรวจสอบแนวโน้มฝนก่อนให้น้ำ ใส่ปุ๋ย พ่นสาร หรือทำกิจกรรมสำคัญภายในแปลงนา",
    publishedAt: "พยากรณ์การเกษตร",
    source: "ข้อมูลสภาพอากาศ",
    image: "/images/news/rice-weather.webp",
    imageAlt:
      "แปลงนาข้าวภายใต้สภาพอากาศสำหรับการวางแผนเกษตร",
    href: "/news/rice-weather",
    icon: CloudRain,
    imageFit: "cover",
  },
];

const SWIPE_THRESHOLD = 50;

function cn(
  ...classNames: Array<
    string | null | undefined | false
  >
): string {
  return classNames.filter(Boolean).join(" ");
}

function NewsMeta({
  publishedAt,
  source,
}: {
  publishedAt: string;
  source: string;
}) {
  return (
    <div
      className="
        flex flex-wrap items-center
        gap-x-4 gap-y-2
        text-xs text-white/50
      "
    >
      <span
        className="
          inline-flex items-center gap-1.5
        "
      >
        <CalendarDays
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />

        {publishedAt}
      </span>

      <span
        className="
          inline-flex items-center gap-1.5
        "
      >
        <Newspaper
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />

        {source}
      </span>
    </div>
  );
}

/**
 * สไลด์ข่าวเด่นสำหรับวางบนสุดของหน้า Home
 *
 * แสดงเฉพาะข่าวเด่นและปุ่มไปยังหน้าข่าวทั้งหมด
 * รายการข่าวทั้งหมดจะแสดงในหน้า /news
 */
export default function NewsSliderSection({
  id = "home-news-slider",
  autoplayInterval = 5000,
  autoplay = true,
  allNewsHref = "/news",
  allNewsLabel = "ดูข่าวทั้งหมด",
  className,
  ...sectionProps
}: NewsSliderSectionProps) {
  const [activeSlide, setActiveSlide] =
    useState(0);

  const [isPaused, setIsPaused] =
    useState(false);

  const [reducedMotion, setReducedMotion] =
    useState(false);

  const pointerStartX = useRef<
    number | null
  >(null);

  const totalSlides = FEATURED_NEWS.length;

  const goToSlide = useCallback(
    (index: number) => {
      const normalizedIndex =
        ((index % totalSlides) +
          totalSlides) %
        totalSlides;

      setActiveSlide(normalizedIndex);
    },
    [totalSlides]
  );

  const showPreviousSlide =
    useCallback(() => {
      setActiveSlide(
        (currentSlide) =>
          (currentSlide -
            1 +
            totalSlides) %
          totalSlides
      );
    }, [totalSlides]);

  const showNextSlide =
    useCallback(() => {
      setActiveSlide(
        (currentSlide) =>
          (currentSlide + 1) %
          totalSlides
      );
    }, [totalSlides]);

  useEffect(() => {
    const mediaQuery =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      );

    const updateMotionPreference = () => {
      setReducedMotion(mediaQuery.matches);
    };

    updateMotionPreference();

    mediaQuery.addEventListener(
      "change",
      updateMotionPreference
    );

    return () => {
      mediaQuery.removeEventListener(
        "change",
        updateMotionPreference
      );
    };
  }, []);

  useEffect(() => {
    if (
      !autoplay ||
      isPaused ||
      reducedMotion ||
      totalSlides <= 1
    ) {
      return;
    }

    const intervalId =
      window.setInterval(
        showNextSlide,
        autoplayInterval
      );

    return () => {
      window.clearInterval(intervalId);
    };
  }, [
    autoplay,
    autoplayInterval,
    isPaused,
    reducedMotion,
    showNextSlide,
    totalSlides,
  ]);

  function handlePointerDown(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    pointerStartX.current =
      event.clientX;
  }

  function handlePointerUp(
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    if (pointerStartX.current === null) {
      return;
    }

    const swipeDistance =
      event.clientX -
      pointerStartX.current;

    pointerStartX.current = null;

    if (
      Math.abs(swipeDistance) <
      SWIPE_THRESHOLD
    ) {
      return;
    }

    if (swipeDistance > 0) {
      showPreviousSlide();
      return;
    }

    showNextSlide();
  }

  function handlePointerCancel() {
    pointerStartX.current = null;
  }

  return (
    <section
      {...sectionProps}
      id={id}
      aria-label="ข่าวเด่นจาก Rice AI"
      data-component="news-slider-section"
      className={cn(
        "relative isolate overflow-hidden",
        "bg-rice-surface-soft",
        "px-4 pb-8 pt-4",
        "sm:px-6 sm:pb-10 sm:pt-6",
        "lg:px-8 lg:pb-12 lg:pt-8",
        className
      )}
    >
      <div className="mx-auto w-full max-w-7xl">
        {/* Top bar */}
        <div
          className="
            mb-4 flex items-center
            justify-between gap-4
            sm:mb-5
          "
        >
          <div
            className="
              flex min-w-0 items-center gap-3
            "
          >
            <span
              className="
                flex h-10 w-10
                shrink-0 items-center
                justify-center rounded-2xl
                bg-rice-natural text-white
                shadow-primary
                dark:bg-rice-mint
                dark:text-rice-dark
              "
            >
              <Newspaper
                aria-hidden="true"
                className="h-5 w-5"
              />
            </span>

            <div className="min-w-0">
              <p
                className="
                  text-[10px] font-semibold
                  uppercase tracking-[0.14em]
                  text-rice-muted/70
                  dark:text-white/40
                "
              >
                Featured news
              </p>

              <h1
                className="
                  truncate font-heading
                  text-base font-semibold
                  text-rice-dark
                  sm:text-lg
                  dark:text-white
                "
              >
                ข่าวเด่นและข้อมูลสำคัญ
              </h1>
            </div>
          </div>

          <Link
            href={allNewsHref}
            className="
              group inline-flex min-h-10
              shrink-0 items-center gap-2
              rounded-pill
              border border-rice-forest/10
              bg-white/75
              px-3.5 py-2
              text-xs font-semibold
              text-rice-natural
              shadow-card
              backdrop-blur-glass
              transition-[transform,border-color,background-color]
              duration-300
              hover:-translate-y-0.5
              hover:border-rice-leaf/30
              hover:bg-white
              active:translate-y-0
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rice-leaf
              focus-visible:ring-offset-2
              dark:border-white/10
              dark:bg-white/[0.055]
              dark:text-rice-mint
              dark:hover:bg-white/[0.09]
              dark:focus-visible:ring-offset-[#07140c]
            "
          >
            <span className="hidden sm:inline">
              {allNewsLabel}
            </span>

            <span className="sm:hidden">
              ข่าวทั้งหมด
            </span>

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

        {/* Slider */}
        <div
          aria-roledescription="carousel"
          aria-label="ข่าวเด่น"
          onMouseEnter={() =>
            setIsPaused(true)
          }
          onMouseLeave={() =>
            setIsPaused(false)
          }
          onFocusCapture={() =>
            setIsPaused(true)
          }
          onBlurCapture={(event) => {
            if (
              !event.currentTarget.contains(
                event.relatedTarget
              )
            ) {
              setIsPaused(false);
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={
            handlePointerCancel
          }
          className="
            relative touch-pan-y
            select-none overflow-hidden
            rounded-[2rem]
            border border-white/15
            bg-rice-dark
            shadow-floating
            sm:rounded-[2.25rem]
          "
        >
          <div
            className="
              relative min-h-[620px]
              sm:min-h-[610px]
              lg:min-h-[540px]
            "
          >
            {FEATURED_NEWS.map(
              (slide, index) => {
                const SlideIcon = slide.icon;
                const isActive =
                  activeSlide === index;

                return (
                  <article
                    key={slide.id}
                    aria-hidden={!isActive}
                    aria-roledescription="slide"
                    aria-label={`ข่าวที่ ${
                      index + 1
                    } จาก ${totalSlides}`}
                    className={cn(
                      `
                        absolute inset-0
                        transition-[opacity,transform]
                        duration-700
                        ease-premium
                      `,
                      isActive
                        ? `
                          z-10 translate-x-0
                          opacity-100
                        `
                        : `
                          pointer-events-none
                          z-0 translate-x-4
                          opacity-0
                        `
                    )}
                  >
                    <div
                      className="
                        grid min-h-[620px]
                        sm:min-h-[610px]
                        lg:min-h-[540px]
                        lg:grid-cols-[minmax(0,1.25fr)_minmax(360px,0.75fr)]
                      "
                    >
                      {/* Image */}
                      <Link
                        href={slide.href}
                        tabIndex={
                          isActive ? 0 : -1
                        }
                        aria-label={`อ่านรายละเอียด: ${slide.title}`}
                        className="
                          relative min-h-[300px]
                          overflow-hidden
                          bg-[#edf4ec]
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-inset
                          focus-visible:ring-rice-mint
                          sm:min-h-[340px]
                          lg:min-h-full
                        "
                      >
                        <Image
                          src={slide.image}
                          alt={slide.imageAlt}
                          fill
                          priority={index === 0}
                          sizes="
                            (max-width: 1023px) 100vw,
                            820px
                          "
                          className={cn(
                            `
                              object-center
                              transition-transform
                              duration-1000
                              ease-premium
                              hover:scale-[1.02]
                            `,
                            slide.imageFit ===
                              "contain"
                              ? "object-contain"
                              : "object-cover"
                          )}
                        />

                        <div
                          aria-hidden="true"
                          className="
                            absolute inset-0
                            bg-gradient-to-b
                            from-rice-dark/5
                            via-transparent
                            to-rice-dark/45
                            lg:bg-gradient-to-r
                            lg:from-transparent
                            lg:via-transparent
                            lg:to-rice-dark/60
                          "
                        />

                        {/* Category badges */}
                        <div
                          className="
                            absolute left-4 top-4
                            flex max-w-[calc(100%-2rem)]
                            flex-wrap gap-2
                            sm:left-6 sm:top-6
                          "
                        >
                          <span
                            className="
                              inline-flex min-h-9
                              items-center gap-1.5
                              rounded-pill
                              border border-white/20
                              bg-rice-dark/75
                              px-3 py-1.5
                              text-[11px]
                              font-semibold text-white
                              shadow-card
                              backdrop-blur-glass
                            "
                          >
                            <SlideIcon
                              aria-hidden="true"
                              className="
                                h-3.5 w-3.5
                                text-rice-mint
                              "
                            />

                            {slide.category}
                          </span>

                          {slide.badge && (
                            <span
                              className="
                                inline-flex min-h-9
                                items-center
                                rounded-pill
                                bg-rice-mint
                                px-3 py-1.5
                                text-[11px]
                                font-semibold
                                text-rice-dark
                                shadow-card
                              "
                            >
                              {slide.badge}
                            </span>
                          )}
                        </div>
                      </Link>

                      {/* Content */}
                      <div
                        className="
                          relative flex
                          flex-col justify-center
                          overflow-hidden
                          p-5 pb-20 text-white
                          sm:p-8 sm:pb-20
                          lg:p-10 lg:pb-20
                          xl:p-12 xl:pb-20
                        "
                      >
                        <div
                          aria-hidden="true"
                          className="
                            pointer-events-none
                            absolute -right-24
                            -top-24 h-80 w-80
                            rounded-full
                            bg-rice-mint/15
                            blur-3xl
                          "
                        />

                        <div
                          aria-hidden="true"
                          className="
                            pointer-events-none
                            absolute -bottom-28
                            -left-20 h-72 w-72
                            rounded-full
                            bg-rice-leaf/20
                            blur-3xl
                          "
                        />

                        <div className="relative">
                          <p
                            className="
                              text-[10px]
                              font-semibold uppercase
                              tracking-[0.16em]
                              text-rice-mint/70
                            "
                          >
                            Featured story
                          </p>

                          <div className="mt-3">
                            <NewsMeta
                              publishedAt={
                                slide.publishedAt
                              }
                              source={
                                slide.source
                              }
                            />
                          </div>

                          <h2
                            className="
                              mt-5 font-heading
                              text-2xl
                              font-semibold
                              leading-tight
                              tracking-[-0.025em]
                              text-white
                              sm:text-[2rem]
                              lg:text-[2.25rem]
                            "
                          >
                            {slide.title}
                          </h2>

                          <p
                            className="
                              mt-4 text-sm
                              leading-7
                              text-white/60
                              sm:text-[15px]
                            "
                          >
                            {slide.description}
                          </p>

                          <div
                            className="
                              mt-7 flex flex-col
                              gap-3 sm:flex-row
                              sm:items-center
                            "
                          >
                            <Link
                              href={slide.href}
                              tabIndex={
                                isActive ? 0 : -1
                              }
                              className="
                                group inline-flex
                                min-h-12 w-full
                                items-center
                                justify-center gap-2
                                rounded-pill
                                bg-rice-mint
                                px-5 py-2.5
                                text-sm font-semibold
                                text-rice-dark
                                shadow-card
                                transition-[transform,background-color]
                                duration-300
                                hover:-translate-y-0.5
                                hover:bg-rice-mint-light
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
                              อ่านรายละเอียด

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
                              href={allNewsHref}
                              tabIndex={
                                isActive ? 0 : -1
                              }
                              className="
                                inline-flex min-h-12
                                w-full items-center
                                justify-center gap-2
                                rounded-pill
                                border border-white/15
                                bg-white/[0.07]
                                px-5 py-2.5
                                text-sm font-semibold
                                text-white
                                backdrop-blur-glass
                                transition-[transform,background-color,border-color]
                                duration-300
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
                              {allNewsLabel}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>

          {/* Previous */}
          <button
            type="button"
            onClick={showPreviousSlide}
            aria-label="ข่าวก่อนหน้า"
            className="
              absolute left-3 top-[250px]
              z-30 inline-flex
              h-11 w-11 items-center
              justify-center rounded-full
              border border-white/20
              bg-rice-dark/70
              text-white shadow-card
              backdrop-blur-glass
              transition-[transform,background-color]
              duration-300
              hover:scale-105
              hover:bg-rice-dark/90
              active:scale-95
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rice-mint
              sm:left-5 sm:top-[285px]
              lg:top-1/2
              lg:-translate-y-1/2
            "
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>

          {/* Next */}
          <button
            type="button"
            onClick={showNextSlide}
            aria-label="ข่าวถัดไป"
            className="
              absolute right-3 top-[250px]
              z-30 inline-flex
              h-11 w-11 items-center
              justify-center rounded-full
              border border-white/20
              bg-rice-dark/70
              text-white shadow-card
              backdrop-blur-glass
              transition-[transform,background-color]
              duration-300
              hover:scale-105
              hover:bg-rice-dark/90
              active:scale-95
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rice-mint
              sm:right-5 sm:top-[285px]
              lg:top-1/2
              lg:-translate-y-1/2
            "
          >
            <ArrowRight
              aria-hidden="true"
              className="h-5 w-5"
            />
          </button>

          {/* Controls */}
          <div
            className="
              absolute bottom-4
              left-1/2 z-30
              flex -translate-x-1/2
              items-center gap-2
              rounded-pill
              border border-white/15
              bg-rice-dark/80
              px-3 py-2
              shadow-card
              backdrop-blur-glass
              sm:bottom-5
              lg:left-auto
              lg:right-6
              lg:translate-x-0
            "
          >
            <div
              role="tablist"
              aria-label="เลือกข่าวเด่น"
              className="
                flex items-center gap-1.5
              "
            >
              {FEATURED_NEWS.map(
                (slide, index) => {
                  const isActive =
                    activeSlide === index;

                  return (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={
                        isActive
                      }
                      aria-label={`เปิดข่าวที่ ${
                        index + 1
                      }: ${slide.title}`}
                      onClick={() =>
                        goToSlide(index)
                      }
                      className={cn(
                        `
                          h-2 rounded-pill
                          transition-[width,background-color]
                          duration-300
                          focus-visible:outline-none
                          focus-visible:ring-2
                          focus-visible:ring-rice-mint
                          focus-visible:ring-offset-2
                          focus-visible:ring-offset-rice-dark
                        `,
                        isActive
                          ? `
                            w-7 bg-rice-mint
                          `
                          : `
                            w-2 bg-white/35
                            hover:bg-white/60
                          `
                      )}
                    />
                  );
                }
              )}
            </div>

            {autoplay &&
              !reducedMotion && (
                <>
                  <span
                    aria-hidden="true"
                    className="
                      mx-1 h-4 w-px
                      bg-white/15
                    "
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setIsPaused(
                        (current) =>
                          !current
                      )
                    }
                    aria-label={
                      isPaused
                        ? "เล่นสไลด์อัตโนมัติ"
                        : "หยุดสไลด์อัตโนมัติ"
                    }
                    className="
                      inline-flex h-7 w-7
                      items-center
                      justify-center
                      rounded-full
                      text-white/70
                      transition-colors
                      hover:bg-white/10
                      hover:text-white
                      focus-visible:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-rice-mint
                    "
                  >
                    {isPaused ? (
                      <Play
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    ) : (
                      <Pause
                        aria-hidden="true"
                        className="h-3.5 w-3.5"
                      />
                    )}
                  </button>
                </>
              )}
          </div>
        </div>
      </div>
    </section>
  );
}
