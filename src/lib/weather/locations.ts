export interface WeatherLocationOption {
  id: string;
  name: string;
  region: string;
  district?: string;
  province?: string;
  latitude: number;
  longitude: number;
}

export const WEATHER_LOCATIONS: WeatherLocationOption[] = [
  {
    id: "suphan-buri",
    name: "สุพรรณบุรี",
    region: "ภาคกลาง",
    district: "อำเภอเมืองสุพรรณบุรี",
    province: "จังหวัดสุพรรณบุรี",
    latitude: 14.4745,
    longitude: 100.1177,
  },
  {
    id: "phitsanulok",
    name: "พิษณุโลก",
    region: "ภาคเหนือตอนล่าง",
    district: "อำเภอเมืองพิษณุโลก",
    province: "จังหวัดพิษณุโลก",
    latitude: 16.8211,
    longitude: 100.2659,
  },
  {
    id: "chiang-mai",
    name: "เชียงใหม่",
    region: "ภาคเหนือ",
    district: "อำเภอเมืองเชียงใหม่",
    province: "จังหวัดเชียงใหม่",
    latitude: 18.7883,
    longitude: 98.9853,
  },
  {
    id: "roi-et",
    name: "ร้อยเอ็ด",
    region: "ภาคตะวันออกเฉียงเหนือ",
    district: "อำเภอเมืองร้อยเอ็ด",
    province: "จังหวัดร้อยเอ็ด",
    latitude: 16.0538,
    longitude: 103.652,
  },
  {
    id: "ubon-ratchathani",
    name: "อุบลราชธานี",
    region: "ภาคตะวันออกเฉียงเหนือ",
    district: "อำเภอเมืองอุบลราชธานี",
    province: "จังหวัดอุบลราชธานี",
    latitude: 15.2447,
    longitude: 104.8473,
  },
  {
    id: "nakhon-ratchasima",
    name: "นครราชสีมา",
    region: "ภาคตะวันออกเฉียงเหนือ",
    district: "อำเภอเมืองนครราชสีมา",
    province: "จังหวัดนครราชสีมา",
    latitude: 14.9799,
    longitude: 102.0978,
  },
  {
    id: "nakhon-si-thammarat",
    name: "นครศรีธรรมราช",
    region: "ภาคใต้",
    district: "อำเภอเมืองนครศรีธรรมราช",
    province: "จังหวัดนครศรีธรรมราช",
    latitude: 8.4304,
    longitude: 99.9631,
  },
  {
    id: "bangkok",
    name: "กรุงเทพมหานคร",
    region: "ภาคกลาง",
    district: "เขตพระนคร",
    province: "กรุงเทพมหานคร",
    latitude: 13.7563,
    longitude: 100.5018,
  },
];

export const DEFAULT_WEATHER_LOCATION =
  WEATHER_LOCATIONS[0];
