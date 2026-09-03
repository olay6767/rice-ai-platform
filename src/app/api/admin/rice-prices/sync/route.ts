import { getAdminContext } from "@/lib/admin/auth";
import { logAdminActivity } from "@/lib/admin/content";
import {
  fetchThagriRicePrices,
  RicePriceProviderError,
} from "@/lib/rice-price/thagri";

export const runtime = "nodejs";

function jsonError(status: number, code: string, message: string): Response {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

function trendFrom(changePercent: number): "up" | "down" | "steady" {
  if (changePercent > 0.01) return "up";
  if (changePercent < -0.01) return "down";
  return "steady";
}

export async function POST(): Promise<Response> {
  try {
    const context = await getAdminContext();

    if (context.errorResponse || !context.user) {
      return context.errorResponse ?? jsonError(401, "AUTH_REQUIRED", "กรุณาเข้าสู่ระบบ");
    }

    const importedPrices = await fetchThagriRicePrices();
    const rows = [];

    for (const item of importedPrices) {
      const { data: previous, error: previousError } = await context.supabase
        .from("rice_price_updates")
        .select("price_per_ton")
        .eq("rice_type", item.riceType)
        .order("observed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (previousError) {
        console.error("Unable to read previous rice price", previousError);

        if (previousError.code === "42P01" || previousError.code === "PGRST205") {
          return jsonError(
            503,
            "ADMIN_SCHEMA_NOT_READY",
            "ระบบราคาข้าวยังไม่พร้อม กรุณาติดตั้ง migration จัดการเนื้อหาก่อน"
          );
        }

        return jsonError(500, "DATABASE_ERROR", "ไม่สามารถอ่านราคาข้าวเดิมได้");
      }

      const previousPrice = previous ? Number(previous.price_per_ton) : null;
      const changePercent = previousPrice && previousPrice > 0
        ? Math.round(((item.pricePerTon - previousPrice) / previousPrice) * 10_000) / 100
        : 0;

      rows.push({
        rice_type: item.riceType,
        price_per_ton: item.pricePerTon,
        trend: trendFrom(changePercent),
        change_percent: changePercent,
        market_name: item.source,
        observed_at: new Date().toISOString(),
        is_published: true,
        created_by: context.user.id,
      });
    }

    const { data, error } = await context.supabase
      .from("rice_price_updates")
      .insert(rows)
      .select(
        "id, rice_type, price_per_ton, trend, change_percent, market_name, observed_at, is_published, created_at, updated_at"
      );

    if (error) {
      console.error("Unable to store synced rice prices", error);
      const schemaNotReady = error.code === "42P01" || error.code === "PGRST205";
      return jsonError(
        schemaNotReady ? 503 : 500,
        schemaNotReady ? "ADMIN_SCHEMA_NOT_READY" : "DATABASE_ERROR",
        schemaNotReady
          ? "ระบบราคาข้าวยังไม่พร้อม กรุณาติดตั้ง migration จัดการเนื้อหาก่อน"
          : "ไม่สามารถบันทึกราคาข้าวที่ดึงมาได้"
      );
    }

    await logAdminActivity(context.supabase, {
      actorId: context.user.id,
      action: "create",
      resourceType: "rice_price_sync",
      summary: `ดึงราคาข้าวจาก Agri-Map จำนวน ${(data ?? []).length.toLocaleString("th-TH")} รายการ`,
      details: { provider: "THAGRI", count: (data ?? []).length },
    });

    return Response.json(
      { data: data ?? [] },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    if (error instanceof RicePriceProviderError) {
      const status = error.code === "PROVIDER_NOT_CONFIGURED" ? 503 : 502;
      return jsonError(status, error.code, error.message);
    }

    console.error("Unexpected rice price sync error", error);
    return jsonError(500, "INTERNAL_ERROR", "ไม่สามารถอัปเดตราคาข้าวได้ กรุณาลองใหม่");
  }
}
