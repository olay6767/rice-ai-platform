import { getRiceResearchData, riceApiError } from "@/lib/rice-yield/server";

export const runtime = "nodejs";

export async function GET(): Promise<Response> {
  try {
    const data = await getRiceResearchData();
    return Response.json({
      data: {
        metadata: data.metadata,
        modelComparison: data.modelComparison,
        predictions: data.predictions,
      },
    });
  } catch (error) {
    return riceApiError(error);
  }
}
