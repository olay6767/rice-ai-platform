export type DiseasePredictionStatus =
  | "Unknown"
  | "Uncertain"
  | "Rice Leaf";

export interface DiseasePredictionDetail {
  disease: string;
  diseaseTh: string;
  confidence: number;
  allProbabilities: Record<string, number>;
}

export interface DiseasePrediction {
  status: DiseasePredictionStatus;
  riceProbability: number;
  prediction?: DiseasePredictionDetail;
  message?: string;
  savedToHistory: boolean;
}

export interface DiseasePredictionApiSuccess {
  data: DiseasePrediction;
}

export interface DiseaseHistoryEntry {
  id: string;
  status: DiseasePredictionStatus;
  riceProbability: number;
  disease: string | null;
  diseaseTh: string | null;
  confidence: number | null;
  allProbabilities: Record<string, number>;
  createdAt: string;
}

export interface DiseaseHistoryApiSuccess {
  data: DiseaseHistoryEntry[];
}

export interface DiseaseApiError {
  error: {
    code: string;
    message: string;
  };
}

/**
 * Classes ที่มีอยู่จริงใน Set2_ResNet50_Finetuned_best.keras
 * โมเดลนี้ไม่มีคลาสโรคเมล็ดด่าง จึงห้ามนำผลไปสื่อว่าตรวจโรคดังกล่าวได้
 */
export const MODEL_CLASS_LABELS: Record<string, string> = {
  Healthy: "ใบข้าวปกติ",
  "Sheath Blight": "โรคกาบใบแห้ง",
  "Bacterial Leaf Blight": "โรคขอบใบแห้ง",
  "Brown Spot": "โรคใบจุดสีน้ำตาล",
  "Rice Blast": "โรคไหม้ข้าว",
  "Neck Blast": "โรคไหม้คอรวง",
};
