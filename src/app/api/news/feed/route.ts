import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function GET(): Promise<Response> {
  try {
    const supabase = await createClient();
    const [posts, alerts, prices, recommendations] = await Promise.all([
      supabase
        .from("news_posts")
        .select("id, title, summary, body, category, source_name, image_url, image_alt, is_featured, published_at")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false }),
      supabase
        .from("management_alerts")
        .select("id, title, description, alert_type, severity, area_name, starts_at, expires_at")
        .eq("is_active", true)
        .order("starts_at", { ascending: false })
        .limit(4),
      supabase
        .from("rice_price_updates")
        .select("id, rice_type, price_per_ton, trend, change_percent, market_name, observed_at")
        .eq("is_published", true)
        .order("observed_at", { ascending: false })
        .limit(3),
      supabase
        .from("farmer_recommendations")
        .select("id, title, description, category, priority, starts_at, expires_at")
        .eq("is_active", true)
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false })
        .limit(3),
    ]);

    const firstError = [
      posts.error,
      alerts.error,
      prices.error,
      recommendations.error,
    ].find(Boolean);

    if (firstError) {
      console.error("Public news feed request failed", firstError);
      const schemaNotReady =
        firstError.code === "42P01" || firstError.code === "PGRST205";

      return jsonError(
        schemaNotReady ? 503 : 500,
        schemaNotReady ? "NEWS_SCHEMA_NOT_READY" : "DATABASE_ERROR",
        schemaNotReady
          ? "ระบบข่าวสารกำลังอยู่ระหว่างการตั้งค่า"
          : "ไม่สามารถโหลดข้อมูลข่าวสารได้"
      );
    }

    return Response.json(
      {
        data: {
          posts: posts.data ?? [],
          alerts: alerts.data ?? [],
          prices: prices.data ?? [],
          recommendations: recommendations.data ?? [],
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Unexpected public news feed error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถโหลดข้อมูลข่าวสารได้");
  }
}
