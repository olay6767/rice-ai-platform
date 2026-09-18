import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const authCookieName =
  process.env.NEXT_PUBLIC_SUPABASE_COOKIE_NAME?.trim() ||
  "rice-ai-user-auth";

export async function createClient() {
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

  const cookieStore = await cookies();

  return createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookieOptions: {
        name: authCookieName,
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(
              ({
                name,
                value,
                options,
              }) => {
                cookieStore.set(
                  name,
                  value,
                  options
                );
              }
            );
          } catch {
            /*
             * Server Component บางกรณี
             * ไม่อนุญาตให้แก้ไข cookies
             */
          }
        },
      },
    }
  );
}
