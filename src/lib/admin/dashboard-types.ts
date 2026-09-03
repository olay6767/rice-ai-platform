export type DashboardDatasetType = "yearly-yield" | "monthly-environment" | "yield-predictions";
export type DashboardRow = Record<string, string | number | boolean | null>;
export type VersionStatus = "draft" | "published" | "archived";

export interface DatasetColumn {
  key: string;
  label: string;
  help: string;
  required: boolean;
  example: string;
}

const column = (key: string, label: string, help: string, example: string, required = false): DatasetColumn =>
  ({ key, label, help, example, required });
const province = column("province_id", "รหัสจังหวัด", "ใช้รหัสของระบบ ไม่ใช่รหัสไปรษณีย์ • ดาวน์โหลดตารางรหัสจังหวัดได้", "5", true);
const cropStart = column("crop_start_year", "ปีเริ่มเพาะปลูก", "ค.ศ. 1900–2200 เช่น 2025 ไม่ใช่ 2568", "2025", true);
const cropYear = column("crop_year", "ปีเพาะปลูก", "พ.ศ. รูปแบบ 2568/69 หรือ ค.ศ. 2025/26 ให้ตรงกับปีเริ่ม", "2568/69", true);
const actualYield = column("actual_yield", "ผลผลิตจริง", "กก./ไร่ • 0–10,000", "410", true);

export const DASHBOARD_DATASETS = [
  {
    type: "yearly-yield", label: "ผลผลิตข้าวรายปี", table: "rice_yield_yearly",
    fileName: "province_yearly_yield.csv", period: "crop_start_year",
    description: "ผลผลิตจริง พื้นที่ปลูก พื้นที่เก็บเกี่ยว และปริมาณผลผลิต ใช้ใน KPI กราฟรายปี และแผนที่",
    keys: ["province_id", "crop_start_year"],
    columns: [province, cropStart, cropYear, actualYield,
      column("yield_per_harvested_rai", "ผลผลิตต่อพื้นที่เก็บเกี่ยว", "กก./ไร่ • ตั้งแต่ 0 ขึ้นไป", "428"),
      column("production_ton", "ปริมาณผลผลิต", "ตัน • ตั้งแต่ 0 ขึ้นไป", "615000"),
      column("harvested_area_rai", "พื้นที่เก็บเกี่ยว", "ไร่ • ไม่ควรมากกว่าพื้นที่ปลูก", "1437000"),
      column("planted_area_rai", "พื้นที่ปลูก", "ไร่ • ตั้งแต่ 0 ขึ้นไป", "1490000")],
  },
  {
    type: "monthly-environment", label: "สภาพแวดล้อมรายเดือน", table: "rice_environment_monthly",
    fileName: "province_monthly_environment.csv", period: "year",
    description: "ฝน อุณหภูมิ ความชื้นดิน และ NDVI ใช้ใน KPI แผนที่ และกราฟสิ่งแวดล้อมรายเดือน",
    keys: ["province_id", "year", "month"],
    columns: [province,
      column("year", "ปีปฏิทิน", "ค.ศ. 1900–2200", "2025", true),
      column("month", "เดือน", "จำนวนเต็ม 1–12", "8", true),
      column("temperature_mean_c", "อุณหภูมิเฉลี่ย", "°C • -30 ถึง 70", "26.9"),
      column("dewpoint_mean_c", "จุดน้ำค้างเฉลี่ย", "°C • -50 ถึง 70", "23.5"),
      column("soil_moisture_mean", "ความชื้นดิน", "สัดส่วน 0–1 ไม่ใช่เปอร์เซ็นต์", "0.46"),
      column("rainfall_total_mm", "ฝนสะสม", "มม./เดือน • ตั้งแต่ 0 ขึ้นไป", "304"),
      column("evaporation_total_mm", "การระเหยสะสม", "มม./เดือน • ตั้งแต่ 0 ขึ้นไป", "98"),
      column("solar_total_mj_m2", "รังสีดวงอาทิตย์", "MJ/m² • ตั้งแต่ 0 ขึ้นไป", "486"),
      column("ndvi_mean", "NDVI เฉลี่ย", "ดัชนี -1 ถึง 1", "0.75"),
      column("ndvi_median", "NDVI มัธยฐาน", "ดัชนี -1 ถึง 1", "0.76"),
      column("ndvi_std", "NDVI ส่วนเบี่ยงเบน", "ตั้งแต่ 0 ขึ้นไป", "0.07"),
      column("ndvi_min", "NDVI ต่ำสุด", "ดัชนี -1 ถึง 1 • ไม่เกินค่าเฉลี่ย", "0.39"),
      column("ndvi_max", "NDVI สูงสุด", "ดัชนี -1 ถึง 1 • ไม่น้อยกว่าค่าเฉลี่ย", "0.96"),
      column("rice_valid_ratio_mean", "สัดส่วนข้อมูลที่ใช้ได้", "0–1", "0.72"),
      column("rice_ndvi_imputed", "เติมค่าข้อมูลหรือไม่", "0/1 หรือ false/true • เว้นว่างเท่ากับ false", "0"),
      column("rice_ndvi_structural_missing", "ขาดข้อมูลเชิงโครงสร้าง", "0/1 หรือ false/true • เว้นว่างเท่ากับ false", "0"),
      column("rice_ndvi_final_quality", "คุณภาพ NDVI", "ข้อความคุณภาพจากชุดข้อมูล ไม่เกิน 80 ตัวอักษร", "good"),
      column("grid_cell_count", "จำนวนช่องกริด", "จำนวนเต็มตั้งแต่ 0 ขึ้นไป", "42")],
  },
  {
    type: "yield-predictions", label: "ผลพยากรณ์ผลผลิต", table: "rice_yield_predictions",
    fileName: "province_yearly_predictions.csv", period: "crop_start_year",
    description: "ผลพยากรณ์จากเพื่อนร่วมทีมและค่าคลาดเคลื่อน ไม่ได้ฝึกโมเดลใหม่ผ่านหน้า Admin",
    keys: ["province_id", "crop_start_year", "model_version"],
    columns: [province, cropStart, cropYear, actualYield,
      column("predicted_yield", "ผลผลิตพยากรณ์", "กก./ไร่ • 0–10,000", "422", true),
      column("residual", "ค่าคลาดเคลื่อน", "ผลผลิตจริง − ผลพยากรณ์", "-12", true),
      column("absolute_error", "คลาดเคลื่อนสัมบูรณ์", "ค่าสัมบูรณ์ของ residual", "12", true),
      column("percentage_error", "คลาดเคลื่อนร้อยละ", "absolute_error ÷ actual_yield × 100 • เว้นว่างได้", "2.927"),
      column("model_version", "เวอร์ชันโมเดล", "ชื่อโมเดลจากผู้พัฒนา ไม่เกิน 120 ตัวอักษร", "Demo_Model_v1.0", true)],
  },
] as const;

export function getDashboardDataset(type: DashboardDatasetType) {
  return DASHBOARD_DATASETS.find((item) => item.type === type)!;
}

export interface DatasetSummary {
  type: DashboardDatasetType; label: string; count: number;
  provinceCount: number; years: number[]; missingMonths: number; models: string[];
}

export interface AdminDashboardVersion {
  id: string; version_key: string; label: string; description: string;
  status: VersionStatus; is_default: boolean; published_at: string | null;
  created_at: string; updated_at: string; revision: number;
  datasets: DatasetSummary[];
  predictionMismatchCount: number;
}

export interface ValidationIssue { row: number | null; message: string }
export interface ImportPreview {
  valid: boolean; fileName: string; receivedRows: number; validRows: number;
  errorCount: number; errors: ValidationIssue[]; warnings: string[];
  provinceCount: number; years: number[]; inserts: number; updates: number;
  previewRows: DashboardRow[]; columns: string[]; token: string; revision: number;
}

export interface BatchImportPreview {
  valid: boolean;
  items: Array<ImportPreview & { datasetType: DashboardDatasetType }>;
  errorCount: number;
  token: string;
  revision: number;
}

/** A CSV that was imported after file-level tracking was enabled. */
export interface DashboardImportFile {
  id: string;
  version_id: string;
  dataset_type: DashboardDatasetType;
  file_name: string;
  original_row_count: number;
  current_row_count: number;
  created_at: string;
}

export interface DashboardEvent {
  id: string; action: string; actor_name: string; created_at: string;
  summary: string; details: Record<string, unknown>;
}

export interface DashboardRecords {
  rows: DashboardRow[]; count: number; page: number; pageSize: number;
}
