import { createClient } from "@/lib/supabase/server";

export interface FinancePageUser {
  isAuthenticated: boolean;
  displayName?: string;
}

export async function getFinanceUser(): Promise<FinancePageUser> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { isAuthenticated: false };
    }

    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    return {
      isAuthenticated: true,
      displayName:
        fullName ||
        user.email?.split("@")[0] ||
        undefined,
    };
  } catch (error) {
    console.error(
      "Unable to load finance user:",
      error
    );

    return { isAuthenticated: false };
  }
}
