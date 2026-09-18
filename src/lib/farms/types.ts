export interface FarmField {
  id: string;
  name: string;
  province: string;
  district: string | null;
  subdistrict: string | null;
  areaRai: number;
  riceVariety: string;
  plantingDate: string | null;
  expectedHarvestDate: string | null;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FarmFieldInput {
  name: string;
  province: string;
  district: string;
  subdistrict: string;
  areaRai: number;
  riceVariety: string;
  plantingDate: string;
  expectedHarvestDate: string;
  latitude: number | null;
  longitude: number | null;
  isPrimary: boolean;
}
