import type { Metadata } from "next";
import { notFound } from "next/navigation";

import RiceAnalyticsShell from "@/components/rice-yield/RiceAnalyticsShell";
import RiceProvinceDetail from "@/components/rice-yield/RiceProvinceDetail";

export const metadata: Metadata = {
  title: "ข้อมูลผลผลิตรายจังหวัด",
};

export default async function ProvinceYieldPage({
  params,
}: {
  params: Promise<{ provinceId: string }>;
}) {
  const { provinceId: value } = await params;
  const provinceId = Number(value);
  if (!Number.isInteger(provinceId) || provinceId < 1) notFound();

  return (
    <RiceAnalyticsShell
      title="ข้อมูลผลผลิตรายจังหวัด"
      description="ประวัติผลผลิต ตัวชี้วัดสิ่งแวดล้อม ผลพยากรณ์ และช่วงประมาณการในมุมมองเดียว"
    >
      <RiceProvinceDetail provinceId={provinceId} />
    </RiceAnalyticsShell>
  );
}

