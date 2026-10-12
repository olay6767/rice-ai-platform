export const BRAND_LOGO_SRC = "/logo/rice-ai-farmer-mark.png";
export const AI_MASCOT_SRC = "/images/44.png";

export function brandLogoForPath(pathname: string | null): string {
  if (
    pathname === "/disease" ||
    pathname?.startsWith("/disease/") ||
    pathname === "/chatbot" ||
    pathname?.startsWith("/chatbot/")
  ) {
    return AI_MASCOT_SRC;
  }

  return BRAND_LOGO_SRC;
}
