"use client";

import {
  BarChart3,
  Database,
  FlaskConical,
  GitCompareArrows,
  Waves,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

const links = [
  { href: "/dashboard", label: "ภาพรวม", icon: BarChart3 },
  {
    href: "/analytics/yield/monthly",
    label: "สิ่งแวดล้อมรายเดือน",
    icon: Waves,
  },
  {
    href: "/analytics/yield/compare",
    label: "เปรียบเทียบพื้นที่",
    icon: GitCompareArrows,
  },
  {
    href: "/analytics/yield/research",
    label: "งานวิจัยและโมเดล",
    icon: FlaskConical,
  },
  {
    href: "/analytics/yield/about-data",
    label: "ข้อมูลและแหล่งที่มา",
    icon: Database,
  },
];

export default function RiceAnalyticsNav() {
  const versionKey = useSearchParams().get("version");

  return (
    <ul className="flex min-w-max snap-x snap-mandatory gap-2">
      {links.map(({ href, label, icon: Icon }) => (
        <li key={href} className="snap-start">
          <Link
            href={
              versionKey
                ? `${href}?version=${encodeURIComponent(versionKey)}`
                : href
            }
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-xl border border-emerald-950/10 bg-white/70 px-3 text-xs font-semibold transition hover:border-emerald-700/30 hover:bg-white sm:min-h-11 sm:px-4 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
          >
            <Icon
              aria-hidden="true"
              className="h-4 w-4 text-emerald-700 dark:text-emerald-300"
            />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
