import { getRiceProvinces, riceApiError } from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const provinces = await getRiceProvinces(false);
    return Response.json(
      { data: provinces, meta: { count: provinces.length, joinKey: "province_id" } },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=3600" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}

