import {
  getRiceDashboard,
  getRiceYieldDashboardView,
  parseInteger,
  parseRiceRegion,
  riceApiError,
} from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(request: Request): Promise<Response> {
  try {
    const search = new URL(request.url).searchParams;
    if (search.get("view") === "yield-dashboard") {
      const result = await getRiceYieldDashboardView(search.get("version"));
      return Response.json(
        {
          data: result.data,
          meta: {
            version: result.version.key,
            versionLabel: result.version.label,
            publishedAt: result.version.publishedAt,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const provinceValue = search.get("province");
    const provinceId = provinceValue
      ? parseInteger(provinceValue, 0, 1, 999)
      : null;
    const data = await getRiceDashboard({
      version: search.get("version"),
      cropYear: parseInteger(search.get("cropYear"), 0, 1900, 2200),
      year: parseInteger(search.get("year"), 0, 1900, 2200),
      month: parseInteger(search.get("month"), 8, 1, 12),
      region: parseRiceRegion(search.get("region")),
      provinceId: provinceId || null,
    });
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
