"use client";

import Image from "next/image";
import Link from "next/link";

export default function NavbarLogo() {
  return (
    <Link
      href="/"
      aria-label="SmartRiceHub"
      className="
        group
        flex
        items-center
        gap-3
        rounded-xl
        px-2
        py-2
        transition-all
        duration-300
        hover:bg-green-50
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-green-500
        focus-visible:ring-offset-2
      "
    >
      {/* Logo */}
      <div
        className="
          relative
          h-11
          w-11
          flex-shrink-0
          overflow-hidden
          rounded-xl
          transition-all
          duration-300
          group-hover:scale-105
        "
      >
        <Image
          src="/images/44.png"
          alt="โลโก้ SmartRiceHub"
          fill
          priority
          sizes="44px"
          className="object-contain"
        />
      </div>

      {/* Wordmark */}
      <div
        className="
          hidden min-w-0 items-baseline
          whitespace-nowrap sm:flex
        "
      >
        <span
          className="
            text-lg
            font-bold
            tracking-tight
            text-[#B7791F]
            transition-colors
            duration-300
            dark:text-[#F6D365]
          "
        >
          SmartRice
        </span>

        <span
          className="
            text-lg
            font-medium tracking-tight
            text-[#E9B949]
            dark:text-[#FFE8A3]
          "
        >
          Hub
        </span>
      </div>
    </Link>
  );
}
