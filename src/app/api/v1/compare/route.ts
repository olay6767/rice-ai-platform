import {
  getRiceComparison,
  isRiceComparisonMetric,
  parseInteger,
  riceApiError,
} from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const search = new URL(request.url).searchParams;
    const type = search.get("type") === "region" ? "region" : "province";
    const metricValue = search.get("metric");
    const metric = isRiceComparisonMetric(metricValue) ? metricValue : "actual_yield";
    const maxItems = type === "region" ? 4 : 5;
    const ids = (search.get("ids") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, maxItems);
    const data = await getRiceComparison({
      version: search.get("version"),
      type,
      ids,
      metric,
      year: parseInteger(search.get("year"), 2024, 1900, 2200),
    });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
