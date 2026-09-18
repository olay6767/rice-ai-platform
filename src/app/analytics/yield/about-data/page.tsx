import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Database, FileSpreadsheet, Map, Satellite } from "lucide-react";

import RiceAnalyticsShell, { RicePanel } from "@/components/rice-yield/RiceAnalyticsShell";

export const metadata: Metadata = { title: "ข้อมูลและแหล่งที่มา Rice Yield Thailand" };

const dictionary = [
  ["actual_yield", "ผลผลิตจริง", "กก./ไร่", "รายปี"],
  ["predicted_yield", "ผลผลิตจากแบบจำลอง", "กก./ไร่", "รายปี 2023–2024"],
  ["rainfall_total_mm", "ปริมาณฝนรวม", "มม.", "รายเดือน"],
  ["temperature_mean_c", "อุณหภูมิเฉลี่ย", "°C", "รายเดือน"],
  ["soil_moisture_mean", "ความชื้นในดินเฉลี่ย", "ค่าชุดข้อมูล", "รายเดือน"],
  ["ndvi_mean", "ความเขียวของพืชจากดาวเทียม", "ดัชนี", "รายเดือน"],
  ["residual", "ผลผลิตจริง − ผลผลิตพยากรณ์", "กก./ไร่", "ผลทดสอบ"],
  ["absolute_error", "ค่าสัมบูรณ์ของ Residual", "กก./ไร่", "ผลทดสอบ"],
];

export default function RiceAboutDataPage() {
  return (
    <RiceAnalyticsShell title="ข้อมูลและแหล่งที่มา" description="ขอบเขตข้อมูล นิยามตัวแปร แหล่งที่มา วิธีประมวลผล และข้อจำกัดที่ต้องทราบก่อนนำผลไปใช้">
      <div className="space-y-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "จังหวัด", value: "77", detail: "ครบทุกจังหวัด", icon: Map },
            { label: "สิ่งแวดล้อม", value: "2011–2025", detail: "13,860 แถวรายเดือน", icon: Satellite },
            { label: "ผลผลิตข้าว", value: "2011–2024", detail: "1,078 แถวรายปี", icon: FileSpreadsheet },
            { label: "ผลพยากรณ์", value: "2023–2024", detail: "154 แถวทดสอบย้อนหลัง", icon: Database },
          ].map(({ label, value, detail, icon: Icon }) => (
            <article key={label} className="rounded-2xl border border-emerald-950/10 bg-white p-5 dark:border-white/10 dark:bg-[#0d2014]">
              <Icon className="h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <p className="mt-4 text-xs text-emerald-950/50 dark:text-white/50">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
              <p className="mt-1 text-xs text-emerald-950/50 dark:text-white/50">{detail}</p>
            </article>
          ))}
        </section>

        <RicePanel title="คำอธิบายโครงการ" description="Rice Yield Thailand Website Data Handoff Package Version 1.0">
          <div className="grid gap-6 text-sm leading-7 lg:grid-cols-2">
            <p>ชุดข้อมูลนี้เชื่อมโยงผลผลิตข้าวรายจังหวัด ข้อมูลภูมิอากาศ NDVI ความชื้นในดิน ขอบเขตเชิงพื้นที่ และผลการประเมินแบบจำลอง โดยใช้ <code className="rounded bg-emerald-950/5 px-1.5 py-0.5 dark:bg-white/10">province_id</code> เป็น Canonical Join Key ทุกชุด</p>
            <ul className="space-y-2">{["ผลผลิตข้าวเป็นรายปี/ปีเพาะปลูกเท่านั้น", "ภูมิอากาศ NDVI และความชื้นในดินเป็นรายเดือน", "ค่าที่หายไม่ถูกแทนด้วย 0", "ปี พ.ศ. ใช้สำหรับการนำเสนอ ส่วนฐานข้อมูลเก็บปี ค.ศ."].map((item) => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-300" />{item}</li>)}</ul>
          </div>
        </RicePanel>

        <RicePanel title="แหล่งข้อมูล" description="ข้อมูลตามเอกสาร data_sources.csv ในแพ็กเกจส่งมอบ">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b border-emerald-950/10 text-left text-emerald-950/55 dark:border-white/10 dark:text-white/55"><th className="py-3 pr-4">ชุดข้อมูล</th><th className="px-4 py-3">ผู้ให้ข้อมูล</th><th className="px-4 py-3">ช่วงเวลา</th><th className="px-4 py-3">ความละเอียด</th></tr></thead><tbody>
            {[
              ["ผลผลิตข้าว", "สำนักงานเศรษฐกิจการเกษตร (OAE)", "2011–2024", "จังหวัด–ปี"],
              ["ภูมิอากาศ", "ERA5 / ERA5-Land (ต้องยืนยันผลิตภัณฑ์ย่อย)", "2011–2025", "จังหวัด–เดือน"],
              ["NDVI", "MODIS / Google Earth Engine (ต้องยืนยันแหล่งย่อย)", "2011–2025", "จังหวัด–เดือน"],
              ["ขอบเขตจังหวัด", "GADM 4.1", "คงที่", "ADM1 / จังหวัด"],
            ].map((row) => <tr key={row[0]} className="border-b border-emerald-950/5 dark:border-white/5">{row.map((cell, index) => <td key={cell} className={`${index === 0 ? "py-3 pr-4 font-semibold" : "px-4 py-3"}`}>{cell}</td>)}</tr>)}
          </tbody></table></div>
          <div className="mt-4 flex gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-300/20 dark:bg-amber-300/10 dark:text-amber-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><p>ก่อนเผยแพร่ต่อสาธารณะ ควรยืนยันชื่อผลิตภัณฑ์ ERA5/MODIS ที่ใช้จริง พร้อม URL ใบอนุญาต และวันที่เข้าถึงข้อมูล</p></div>
        </RicePanel>

        <RicePanel title="พจนานุกรมตัวแปรหลัก" description="ชื่อฐานข้อมูลคงตาม Data Contract และแปลงเป็นภาษาไทยเฉพาะ Presentation Layer">
          <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b border-emerald-950/10 text-left text-emerald-950/55 dark:border-white/10 dark:text-white/55"><th className="py-3 pr-4">Field</th><th className="px-4 py-3">ชื่อที่แสดง</th><th className="px-4 py-3">หน่วย</th><th className="px-4 py-3">ความถี่</th></tr></thead><tbody>{dictionary.map((row) => <tr key={row[0]} className="border-b border-emerald-950/5 dark:border-white/5"><td className="py-3 pr-4 font-mono text-xs">{row[0]}</td><td className="px-4 py-3">{row[1]}</td><td className="px-4 py-3">{row[2]}</td><td className="px-4 py-3">{row[3]}</td></tr>)}</tbody></table></div>
        </RicePanel>

        <RicePanel title="ข้อมูลแบบจำลอง" description="Extra Trees Regressor · Environmental-only model">
          <dl className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div><dt className="text-emerald-950/50 dark:text-white/50">ช่วงพัฒนา</dt><dd className="mt-1 font-semibold">2011–2022</dd></div>
            <div><dt className="text-emerald-950/50 dark:text-white/50">ช่วงทดสอบสุดท้าย</dt><dd className="mt-1 font-semibold">2023–2024</dd></div>
            <div><dt className="text-emerald-950/50 dark:text-white/50">จำนวน Features</dt><dd className="mt-1 font-semibold">77</dd></div>
            <div><dt className="text-emerald-950/50 dark:text-white/50">Model Version</dt><dd className="mt-1 font-semibold">ExtraTrees_Environmental_v1.0</dd></div>
          </dl>
        </RicePanel>

        <RicePanel title="ข้อจำกัดการใช้งาน">
          <ul className="grid gap-3 text-sm leading-7 md:grid-cols-2">
            {[
              "ผลผลิตเป็นข้อมูลระดับจังหวัด ไม่ใช่ระดับแปลงนา",
              "ไม่มีข้อมูลผลผลิตรายเดือน",
              "ผลพยากรณ์ไม่ใช่ผลผลิตทางการและไม่ใช่พยากรณ์อนาคตแบบสด",
              "NDVI ไม่ใช่เครื่องมือวินิจฉัยโรคพืชโดยตรง",
              "ประสิทธิภาพโมเดลแตกต่างกันในแต่ละพื้นที่",
              "SHAP อธิบายพฤติกรรมโมเดล ไม่ได้พิสูจน์เหตุและผล",
              "ช่วงประมาณการเป็นผลจากการทดลอง Conformal แยกจากค่าพยากรณ์หลัก",
              "ผลลัพธ์ใช้สนับสนุนการวิเคราะห์ ไม่ควรแทนข้อมูลภาคสนามทั้งหมด",
            ].map((item) => <li key={item} className="flex gap-2"><AlertTriangle className="mt-1 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />{item}</li>)}
          </ul>
        </RicePanel>
      </div>
    </RiceAnalyticsShell>
  );
}

