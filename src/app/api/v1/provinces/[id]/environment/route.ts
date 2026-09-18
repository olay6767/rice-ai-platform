import {
  getProvinceEnvironment,
  parseInteger,
  riceApiError,
} from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  try {
    const { id } = await context.params;
    const search = new URL(request.url).searchParams;
    const data = await getProvinceEnvironment(
      parseInteger(id, 0, 1, 999),
      parseInteger(search.get("year"), 0, 1900, 2200),
      search.get("version")
    );
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
