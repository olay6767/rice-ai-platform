import type {
  WeatherCondition,
  WeatherIconKey,
} from "./types";

interface ConditionDefinition {
  label: string;
  description: string;
  icon: WeatherIconKey;
}

const CONDITION_GROUPS: Array<{
  codes: number[];
  definition: ConditionDefinition;
}> = [
  {
    codes: [0],
    definition: {
      label: "ท้องฟ้าแจ่มใส",
      description: "มีเมฆน้อยและแสงแดดเป็นส่วนใหญ่",
      icon: "clear",
    },
  },
  {
    codes: [1, 2],
    definition: {
      label: "มีเมฆบางส่วน",
      description: "ท้องฟ้าโปร่งสลับเมฆบางช่วง",
      icon: "partly-cloudy",
    },
  },
  {
    codes: [3],
    definition: {
      label: "เมฆมาก",
      description: "มีเมฆปกคลุมท้องฟ้าเป็นส่วนใหญ่",
      icon: "cloudy",
    },
  },
  {
    codes: [45, 48],
    definition: {
      label: "มีหมอก",
      description: "ทัศนวิสัยอาจลดลงในบางพื้นที่",
      icon: "fog",
    },
  },
  {
    codes: [51, 53, 55, 56, 57],
    definition: {
      label: "ฝนปรอย",
      description: "มีฝนปรอยเป็นระยะ",
      icon: "drizzle",
    },
  },
  {
    codes: [61, 63, 65, 66, 67, 80, 81, 82],
    definition: {
      label: "มีฝน",
      description: "ควรติดตามปริมาณฝนก่อนทำงานในแปลง",
      icon: "rain",
    },
  },
  {
    codes: [71, 73, 75, 77, 85, 86],
    definition: {
      label: "หยาดน้ำฟ้า",
      description: "มีหยาดน้ำฟ้าตามแบบจำลองอากาศ",
      icon: "rain",
    },
  },
  {
    codes: [95, 96, 99],
    definition: {
      label: "พายุฝนฟ้าคะนอง",
      description: "หลีกเลี่ยงกิจกรรมกลางแจ้งและติดตามประกาศเตือน",
      icon: "storm",
    },
  },
];

const FALLBACK_CONDITION: ConditionDefinition = {
  label: "สภาพอากาศแปรปรวน",
  description: "ควรตรวจสอบข้อมูลล่าสุดอีกครั้ง",
  icon: "cloudy",
};

export function getWeatherCondition(
  code: number
): WeatherCondition {
  const matchedGroup = CONDITION_GROUPS.find(
    (group) => group.codes.includes(code)
  );

  const definition =
    matchedGroup?.definition ?? FALLBACK_CONDITION;

  return {
    code,
    ...definition,
  };
}

export function getWindDirectionLabel(
  degrees: number
): string {
  const directions = [
    "เหนือ",
    "ตะวันออกเฉียงเหนือ",
    "ตะวันออก",
    "ตะวันออกเฉียงใต้",
    "ใต้",
    "ตะวันตกเฉียงใต้",
    "ตะวันตก",
    "ตะวันตกเฉียงเหนือ",
  ];

  const normalizedDegrees =
    ((degrees % 360) + 360) % 360;

  const index = Math.round(normalizedDegrees / 45) % 8;

  return directions[index];
}
