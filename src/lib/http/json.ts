function responseStatus(response: Response): string {
  return `HTTP ${response.status}`;
}

/**
 * Parses a fetch response without exposing the browser's cryptic
 * "Unexpected token '<'" error when a server or proxy returns HTML.
 */
export async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = await response.text();

  if (!body.trim()) {
    throw new Error(`เซิร์ฟเวอร์ไม่ส่งข้อมูล JSON กลับมา (${responseStatus(response)})`);
  }

  try {
    return JSON.parse(body) as T;
  } catch {
    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    const isHtml = contentType.includes("text/html") || /^\s*</.test(body);

    throw new Error(
      isHtml
        ? `เซิร์ฟเวอร์ส่งหน้า HTML แทนข้อมูล JSON (${responseStatus(response)}) กรุณาลองใหม่อีกครั้ง`
        : `ข้อมูล JSON ที่เซิร์ฟเวอร์ส่งกลับมาไม่ถูกต้อง (${responseStatus(response)})`
    );
  }
}
