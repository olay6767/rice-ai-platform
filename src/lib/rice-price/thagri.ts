const THAGRI_RICE_PRICE_ENDPOINT =
  "https://api.thagri.in.th/Pricing_API/agri_price_rice";

type UnknownRecord = Record<string, unknown>;

export interface ExternalRicePrice {
  riceType: string;
  pricePerTon: number;
  source: string;
}

export class RicePriceProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | "PROVIDER_NOT_CONFIGURED"
      | "UPSTREAM_UNAVAILABLE"
      | "UPSTREAM_REJECTED"
      | "UNSUPPORTED_RESPONSE"
  ) {
    super(message);
    this.name = "RicePriceProviderError";
  }
}

function getRequiredEnvironment(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new RicePriceProviderError(
      "ยังไม่ได้ตั้งค่า THAGRI_API_TOKEN, THAGRI_RICE_LAT และ THAGRI_RICE_LON สำหรับดึงข้อมูลราคาข้าว",
      "PROVIDER_NOT_CONFIGURED"
    );
  }

  return value;
}

function getCoordinates(): { latitude: number; longitude: number } {
  const latitude = Number(getRequiredEnvironment("THAGRI_RICE_LAT"));
  const longitude = Number(getRequiredEnvironment("THAGRI_RICE_LON"));

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < 5 ||
    latitude > 21 ||
    longitude < 97 ||
    longitude > 106
  ) {
    throw new RicePriceProviderError(
      "พิกัด THAGRI_RICE_LAT หรือ THAGRI_RICE_LON ไม่ถูกต้อง",
      "PROVIDER_NOT_CONFIGURED"
    );
  }

  return { latitude, longitude };
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function collectObjectArrays(value: unknown, depth = 0): UnknownRecord[][] {
  if (depth > 4) {
    return [];
  }

  if (Array.isArray(value)) {
    const directRecords = value.filter(isRecord);

    if (directRecords.length > 0) {
      return [directRecords];
    }

    return value.flatMap((item) => collectObjectArrays(item, depth + 1));
  }

  if (!isRecord(value)) {
    return [];
  }

  return Object.values(value).flatMap((item) =>
    collectObjectArrays(item, depth + 1)
  );
}

function textFrom(record: UnknownRecord, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function numberFrom(record: UnknownRecord, keys: string[]): number | null {
  for (const key of keys) {
    const value = record[key];
    const numeric =
      typeof value === "number"
        ? value
        : typeof value === "string"
          ? Number(value.replaceAll(",", "").trim())
          : Number.NaN;

    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }
  }

  return null;
}

/**
 * API ของ Agri-Map ให้โครงสร้างผลลัพธ์เปลี่ยนได้ตามชุดข้อมูลและพิกัด
 * จึงยอมรับชื่อ field มาตรฐานหลายแบบ แต่จะบันทึกเฉพาะ record ที่ระบุราคาได้ชัดเจน
 */
function normalizeResponse(payload: unknown, source: string): ExternalRicePrice[] {
  const rows = collectObjectArrays(payload).flat();
  const values = new Map<string, ExternalRicePrice>();

  for (const row of rows) {
    const price = numberFrom(row, [
      "price_per_ton",
      "farm_gate_price",
      "selling_price",
      "sale_price",
      "average_price",
      "avg_price",
      "price",
    ]);

    if (!price || price > 9_999_999) {
      continue;
    }

    const riceType =
      textFrom(row, [
        "rice_type",
        "rice_name",
        "product_name",
        "commodity_name",
        "crop_name",
        "name",
      ]) ?? "ราคาข้าวจาก Agri-Map";

    const pricePerTon = price < 1_000 ? price * 1_000 : price;

    values.set(riceType, {
      riceType,
      pricePerTon: Math.round(pricePerTon * 100) / 100,
      source,
    });
  }

  return [...values.values()].slice(0, 10);
}

export async function fetchThagriRicePrices(): Promise<ExternalRicePrice[]> {
  const token = getRequiredEnvironment("THAGRI_API_TOKEN");
  const { latitude, longitude } = getCoordinates();
  const url = new URL(THAGRI_RICE_PRICE_ENDPOINT);
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("tgtoken", token);

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), 12_000);

  try {
    const response = await fetch(url, {
      method: "POST",
      body: "",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: abortController.signal,
    });
    const body = (await response.json().catch(() => null)) as unknown;

    if (!response.ok) {
      throw new RicePriceProviderError(
        "Agri-Map ไม่สามารถให้ข้อมูลราคาข้าวได้ในขณะนี้",
        "UPSTREAM_REJECTED"
      );
    }

    if (isRecord(body) && typeof body["status: "] === "string") {
      throw new RicePriceProviderError(
        "THAGRI_API_TOKEN ไม่ถูกต้องหรือหมดอายุ กรุณาสร้าง token ใหม่จาก THAGRI",
        "UPSTREAM_REJECTED"
      );
    }

    const source = `Agri-Map / THAGRI (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    const prices = normalizeResponse(body, source);

    if (!prices.length) {
      throw new RicePriceProviderError(
        "รูปแบบข้อมูลราคาจาก Agri-Map ไม่ตรงกับที่ระบบรองรับ หรือไม่พบข้อมูลราคาสำหรับพิกัดนี้",
        "UNSUPPORTED_RESPONSE"
      );
    }

    return prices;
  } catch (error) {
    if (error instanceof RicePriceProviderError) {
      throw error;
    }

    throw new RicePriceProviderError(
      "ไม่สามารถเชื่อมต่อ Agri-Map เพื่อดึงราคาข้าวได้ กรุณาลองใหม่ภายหลัง",
      "UPSTREAM_UNAVAILABLE"
    );
  } finally {
    clearTimeout(timeout);
  }
}
