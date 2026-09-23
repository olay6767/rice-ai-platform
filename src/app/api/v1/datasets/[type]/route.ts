import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const TABLES = {
  rice_price: "rice_price_series",
  flood: "flood_records",
  drought: "drought_records",
  storm: "storm_records",
} as const;
type DatasetType = keyof typeof TABLES;

function parseType(value: string): DatasetType | null {
  return value in TABLES ? value as DatasetType : null;
}

function integer(value: string | null, minimum: number, maximum: number): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ type: string }> }
): Promise<Response> {
  const { type: rawType } = await params;
  const type = parseType(rawType);
  if (!type) {
    return Response.json(
      { error: { code: "INVALID_DATASET", message: "ประเภทข้อมูลไม่ถูกต้อง" } },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  const supabase = await createClient();
  const versionResult = await supabase
    .from("agricultural_dataset_versions")
    .select("id,version_key,label,description,source_name,source_url,published_at")
    .eq("dataset_type", type)
    .eq("status", "published")
    .eq("is_default", true)
    .maybeSingle();
  if (versionResult.error) {
    console.error("Unable to resolve agricultural dataset version", versionResult.error);
    return Response.json(
      { error: { code: "DATASET_ERROR", message: "ไม่สามารถโหลด Dataset ได้" } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
  if (!versionResult.data) {
    return Response.json(
      { error: { code: "DATASET_NOT_READY", message: "Dataset นี้ยังไม่มีเวอร์ชันเริ่มต้นที่เผยแพร่" } },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const search = new URL(request.url).searchParams;
  const page = integer(search.get("page"), 1, 100000) ?? 1;
  const perPage = integer(search.get("perPage"), 1, 500) ?? 100;
  const year = integer(search.get("year"), 1900, 2200);
  const month = integer(search.get("month"), 1, 12);
  const provinceId = integer(search.get("province"), 1, 999);
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  let query = supabase
    .from(TABLES[type])
    .select("*", { count: "exact" })
    .eq("version_id", versionResult.data.id);
  if (year !== null) query = query.eq("year", year);
  if (month !== null) query = query.eq("month", month);
  if (type !== "rice_price" && provinceId !== null) query = query.eq("province_id", provinceId);
  if (type === "rice_price") {
    const riceType = search.get("riceType")?.trim();
    const dataType = search.get("dataType")?.trim();
    if (riceType) query = query.eq("rice_type_code", riceType);
    if (dataType === "actual" || dataType === "forecast") query = query.eq("data_type", dataType);
    query = query.order("observed_on", { ascending: true }).order("rice_type_code", { ascending: true });
  } else {
    query = query.order("year", { ascending: true }).order("month", { ascending: true }).order("province_id", { ascending: true });
  }
  const rowsResult = await query.range(from, to);
  if (rowsResult.error) {
    console.error("Unable to load agricultural dataset rows", rowsResult.error);
    return Response.json(
      { error: { code: "DATASET_ERROR", message: "ไม่สามารถโหลดข้อมูลได้" } },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  return Response.json(
    {
      data: rowsResult.data ?? [],
      meta: {
        datasetType: type,
        version: versionResult.data,
        page,
        perPage,
        total: rowsResult.count ?? 0,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
