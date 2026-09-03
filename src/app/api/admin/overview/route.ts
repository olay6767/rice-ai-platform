import { getAdminContext } from "@/lib/admin/auth";
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

    const [posts, publishedPosts, activeAlerts, prices, recommendations, activity] =
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

    const data: AdminOverview = {
      counts: {
        posts: posts.count ?? 0,
        publishedPosts: publishedPosts.count ?? 0,
        activeAlerts: activeAlerts.count ?? 0,
        prices: prices.count ?? 0,
        recommendations: recommendations.count ?? 0,
      },
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
