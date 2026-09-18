interface CorrectableGpsLocation {
  name: string;
  district?: string;
  province?: string;
  latitude: number;
  longitude: number;
  source?: "preset" | "gps" | "search";
}

const SURANARI_AREA = {
  minimumLatitude: 14.86,
  maximumLatitude: 14.92,
  minimumLongitude: 101.99,
  maximumLongitude: 102.04,
};

/**
 * Applies small, user-verified corrections when an external reverse-geocoder
 * returns a neighbouring administrative area for an accurate GPS coordinate.
 */
export function applyKnownGpsLocationCorrection<
  T extends CorrectableGpsLocation,
>(location: T): T {
  const isGpsLocation = location.source === "gps";
  const isKnownWrongLabel = location.name.includes("โคกกรวด");
  const isInsideSuranariArea =
    location.latitude >= SURANARI_AREA.minimumLatitude &&
    location.latitude <= SURANARI_AREA.maximumLatitude &&
    location.longitude >= SURANARI_AREA.minimumLongitude &&
    location.longitude <= SURANARI_AREA.maximumLongitude;

  if (!isGpsLocation || !isKnownWrongLabel || !isInsideSuranariArea) {
    return location;
  }

  return {
    ...location,
    name: "ตำบลสุรนารี · อำเภอเมืองนครราชสีมา · จังหวัดนครราชสีมา",
    district: "อำเภอเมืองนครราชสีมา",
    province: "จังหวัดนครราชสีมา",
  };
}
