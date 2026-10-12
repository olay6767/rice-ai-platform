"use client";

import { ChevronDown, MapPin } from "lucide-react";

export default function ProvinceMapSelect({
  value,
  provinces,
  onChange,
  includeAll = true,
  allValue = "all",
}: {
  value: string;
  provinces: string[];
  onChange: (value: string) => void;
  includeAll?: boolean;
  allValue?: string;
}) {
  return (
    <label className="relative flex min-h-11 w-full min-w-0 items-center gap-2 rounded-full border border-emerald-700/20 bg-[#f3f7f1] px-3.5 text-sm font-semibold text-emerald-950 shadow-sm transition focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-600/20 sm:w-52 dark:border-emerald-200/15 dark:bg-white/10 dark:text-white">
      <MapPin aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />
      <span className="sr-only">เลือกจังหวัดบนแผนที่</span>
      <select
        aria-label="เลือกจังหวัดบนแผนที่"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-w-0 flex-1 appearance-none bg-transparent py-2 pr-6 text-sm font-semibold text-inherit outline-none"
      >
        {includeAll ? <option value={allValue}>ทุกจังหวัด</option> : null}
        {provinces.map((province) => (
          <option key={province} value={province} className="text-emerald-950">
            {province}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 h-4 w-4 text-emerald-700/70 dark:text-emerald-200/70" />
    </label>
  );
}
