import {
  getProvinceYieldDetail,
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
    const provinceId = parseInteger(id, 0, 1, 999);
    const version = new URL(request.url).searchParams.get("version");
    const data = await getProvinceYieldDetail(provinceId, version);
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
