import Image from "next/image";
import { BRAND_LOGO_SRC } from "@/lib/brand-logo";

export interface AuthBrandMarkProps {
  size?: "compact" | "hero";
}

export default function AuthBrandMark({
  size = "compact",
}: AuthBrandMarkProps) {
  const isHero = size === "hero";

  return (
    <span
      className={`
        flex shrink-0 items-center justify-center
        overflow-hidden rounded-2xl
        border border-rice-forest/10
        bg-rice-mint/45
        shadow-sm
        dark:border-white/10
        dark:bg-rice-leaf/15
        ${isHero ? "h-20 w-20 rounded-[1.75rem]" : "h-14 w-14"}
      `}
    >
      <Image
        src={BRAND_LOGO_SRC}
        alt="โลโก้ SmartRiceHub"
        width={isHero ? 76 : 54}
        height={isHero ? 76 : 54}
        sizes={isHero ? "76px" : "54px"}
        className="h-full w-full object-contain p-0.5 drop-shadow-sm"
        preload
      />
    </span>
  );
}
