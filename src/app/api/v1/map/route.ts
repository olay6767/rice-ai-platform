import {
  getRiceMapData,
  isRiceMapMetric,
  parseInteger,
  parseRiceRegion,
  riceApiError,
} from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const search = new URL(request.url).searchParams;
    const metricValue = search.get("metric");
    const metric = isRiceMapMetric(metricValue) ? metricValue : "actual_yield";
    const data = await getRiceMapData({
      version: search.get("version"),
      metric,
      year: parseInteger(search.get("year"), 2024, 1900, 2200),
      month: parseInteger(search.get("month"), 8, 1, 12),
      region: parseRiceRegion(search.get("region")),
    });
    return Response.json(
      { data, meta: { metric } },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
