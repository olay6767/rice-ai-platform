"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

const links = [
  {
    href: "/analytics/overview",
    label: "ภาพรวม",
    icon: "/images/1.png",
  },
  { href: "/dashboard", label: "ผลผลิต", icon: "/images/4.png" },
  {
    href: "/analytics/flood",
    label: "สถานการณ์น้ำท่วม",
    icon: "/images/2.png",
  },
  {
    href: "/analytics/drought",
    label: "บันทึกภัยแล้ง",
    icon: "/images/3.png",
  },
  {
    href: "/analytics/storm",
    label: "วิเคราะห์พายุ",
    icon: "/images/6.png",
  },
];

export default function RiceAnalyticsNav({
  appearance = "default",
}: {
  appearance?: "default" | "light";
}) {
  const versionKey = useSearchParams().get("version");
  const pathname = usePathname();
  const activeLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      activeLinkRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return (
    <ul className="flex min-w-max snap-x snap-mandatory gap-2">
      {links.map(({ href, label, icon }) => {
        const isActive = pathname === href || (href !== "/dashboard" && pathname.startsWith(`${href}/`));
        const keepVersion = href === "/dashboard" || href.startsWith("/analytics/yield");

        return (
          <li key={href} className="snap-start">
            <Link
              ref={isActive ? activeLinkRef : undefined}
              href={
                versionKey && keepVersion
                  ? `${href}?version=${encodeURIComponent(versionKey)}`
                  : href
              }
              aria-current={isActive ? "page" : undefined}
              className={`relative inline-flex min-h-10 items-center gap-2 overflow-hidden whitespace-nowrap rounded-md px-3 text-xs font-semibold transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:min-h-11 sm:px-4 sm:text-sm ${
                appearance === "light"
                  ? isActive
                    ? "bg-amber-100 text-amber-950 shadow-[0_8px_22px_rgba(120,83,20,0.20)]"
                    : "bg-white text-emerald-950 shadow-sm hover:bg-[#f8f2de]"
                  : isActive
                    ? "border border-amber-300/55 bg-amber-100 text-amber-950 shadow-[0_8px_22px_rgba(120,83,20,0.18)] dark:border-amber-200/25 dark:bg-amber-200/15 dark:text-amber-100"
                    : "border border-emerald-950/10 bg-white/70 hover:border-amber-500/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              }`}
            >
              {isActive && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 overflow-hidden rounded-md bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_6px_18px_rgba(251,191,36,0.24)] transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-safe:animate-pulse dark:from-amber-300/15 dark:via-yellow-200/25 dark:to-amber-300/15"
                >
                  <span className="absolute inset-x-3 top-1 h-2 rounded-full bg-white/65 blur-[2px]" />
                  <span className="absolute -bottom-4 -right-2 h-9 w-14 rounded-full bg-amber-300/35 blur-md" />
                </span>
              )}
              <Image
                aria-hidden="true"
                src={icon}
                alt=""
                width={24}
                height={24}
                className={`relative z-10 h-6 w-6 object-contain ${
                  appearance === "light"
                    ? isActive
                      ? "brightness-0 opacity-90"
                      : "opacity-80 brightness-0"
                    : "opacity-80 dark:brightness-0 dark:invert"
                }`}
              />
              <span className="relative z-10">{label}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
