import { createBrowserClient } from "@supabase/ssr";

const authCookieName =
  process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME?.trim() ||
  "rice-ai-user-auth";

export function createClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabasePublishableKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "ไม่พบ NEXT_PUBLIC_SUPABASE_URL ใน .env.local"
    );
  }

  if (!supabasePublishableKey) {
    throw new Error(
      "ไม่พบ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local"
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookieOptions: {
        name: authCookieName,
      },
    }
  );
}
