import { getAdminContext } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AdminActivityLog, AdminOverview } from "@/lib/admin/types";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(): Promise<Response> {
  try {
    const context = await getAdminContext();

    if (context.errorResponse || !context.user) {
      return context.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const sevenDaysAgo = new Date(Date.now() - 6 * 86_400_000);
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const [posts, publishedPosts, activeAlerts, prices, recommendations, activity, diseaseChecks, assistantUses] =
      await Promise.all([
        context.supabase.from("news_posts").select("*", { count: "exact", head: true }),
        context.supabase
          .from("news_posts")
          .select("*", { count: "exact", head: true })
          .eq("status", "published"),
        context.supabase
          .from("management_alerts")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        context.supabase
          .from("rice_price_updates")
          .select("*", { count: "exact", head: true }),
        context.supabase
          .from("farmer_recommendations")
          .select("*", { count: "exact", head: true })
          .eq("is_active", true),
        context.supabase
          .from("admin_activity_logs")
          .select("id, action, resource_type, resource_id, summary, created_at")
          .order("created_at", { ascending: false })
          .limit(8),
        context.supabase
          .from("disease_predictions")
          .select("created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
        context.supabase
          .from("assistant_usage_logs")
          .select("created_at")
          .gte("created_at", sevenDaysAgo.toISOString()),
      ]);

    const firstError = [
      posts.error,
      publishedPosts.error,
      activeAlerts.error,
      prices.error,
      recommendations.error,
      activity.error,
    ].find(Boolean);

    if (firstError) {
      console.error("Admin overview request failed", firstError);
      const schemaNotReady =
        firstError.code === "42P01" || firstError.code === "PGRST205";

      return jsonError(
        schemaNotReady ? 503 : 500,
        schemaNotReady ? "ADMIN_SCHEMA_NOT_READY" : "DATABASE_ERROR",
        schemaNotReady
          ? "ระบบหลังบ้านยังไม่พร้อม กรุณาติดตั้ง migration จัดการเนื้อหาก่อน"
          : "ไม่สามารถโหลดภาพรวมหลังบ้านได้ กรุณาลองใหม่"
      );
    }

    let userCount = 0;
    try {
      const admin = createAdminClient();
      const result = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
      if (!result.error) userCount = result.data.total ?? result.data.users.length;
    } catch (error) {
      console.error("Unable to count admin users", error);
    }

    const dailyUsage = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(sevenDaysAgo.getTime() + index * 86_400_000)
        .toISOString()
        .slice(0, 10);
      return { date, diseaseChecks: 0, assistantUses: 0 };
    });
    const byDate = new Map(dailyUsage.map((item) => [item.date, item]));
    for (const row of diseaseChecks.data ?? []) {
      const day = byDate.get(String(row.created_at).slice(0, 10));
      if (day) day.diseaseChecks += 1;
    }
    for (const row of assistantUses.data ?? []) {
      const day = byDate.get(String(row.created_at).slice(0, 10));
      if (day) day.assistantUses += 1;
    }

    const totalContent =
      (posts.count ?? 0) +
      (activeAlerts.count ?? 0) +
      (prices.count ?? 0) +
      (recommendations.count ?? 0);

    const data: AdminOverview = {
      counts: {
        users: userCount,
        diseaseChecks: diseaseChecks.data?.length ?? 0,
        assistantUses: assistantUses.data?.length ?? 0,
        content: totalContent,
        posts: posts.count ?? 0,
        publishedPosts: publishedPosts.count ?? 0,
        activeAlerts: activeAlerts.count ?? 0,
        prices: prices.count ?? 0,
        recommendations: recommendations.count ?? 0,
      },
      dailyUsage,
      recentActivity: (activity.data ?? []) as AdminActivityLog[],
    };

    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected admin overview error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดภาพรวมหลังบ้านได้ กรุณาลองใหม่");
  }
}
