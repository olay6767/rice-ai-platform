import {
  getRiceDashboardVersions,
  riceApiError,
} from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const data = await getRiceDashboardVersions();
    return Response.json(
      { data },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return riceApiError(error);
  }
}
