"use client";

import Image from "next/image";
import Link from "next/link";

export default function NavbarLogo() {
  return (
    <Link
      href="/"
      aria-label="Rice AI Platform"
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
          src="/logo/rice-ai-farmer-mark.png"
          alt="โลโก้ Rice AI Platform"
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
            text-[#166534]
            transition-colors
            duration-300
            dark:text-white
          "
        >
          Rice
        </span>

        <span
          className="
            ml-1 text-lg
            font-bold tracking-tight
            text-[#16A34A]
          "
        >
          AI
        </span>

        <span
          className="
            ml-1.5 text-lg
            font-medium tracking-tight
            text-[#166534]
            dark:text-green-100
          "
        >
          Platform
        </span>
      </div>
    </Link>
  );
}
