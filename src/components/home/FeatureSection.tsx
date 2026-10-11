import Link from "next/link";
import { ArrowUpRight, Bot, ChartNoAxesCombined, CloudSun, Newspaper, ScanLine, Wallet } from "lucide-react";

const features = [
  {
    title: "แดชบอร์ดผลผลิตข้าว",
    purpose: "มองภาพรวมก่อนวางแผน",
    description: "ดูผลผลิตข้าวรายปี แผนที่รายจังหวัด เปรียบเทียบพื้นที่ และสำรวจแนวโน้มจากข้อมูลกับค่าพยากรณ์",
    href: "/dashboard",
    action: "เปิดแดชบอร์ด",
    icon: ChartNoAxesCombined,
    color: "bg-[#edf2e4] text-[#526b31]",
  },
  {
    title: "ตรวจโรคข้าวจากภาพ",
    purpose: "มีใบข้าวที่อยากตรวจ",
    description: "อัปโหลดภาพใบข้าว ให้ AI ช่วยจำแนกโรค พร้อมดูผลการวิเคราะห์และระดับความมั่นใจ",
    href: "/disease",
    action: "เริ่มตรวจโรค",
    icon: ScanLine,
    color: "bg-[#e4f3e9] text-[#287248]",
  },
  {
    title: "สภาพอากาศ",
    purpose: "เช็กพื้นที่ก่อนลงมือทำ",
    description: "เลือกพื้นที่หรือใช้ตำแหน่งปัจจุบัน ดูอุณหภูมิ ฝน ความชื้น และคำแนะนำกิจกรรมตามสภาพอากาศ",
    href: "/analytics/weather",
    action: "ดูสภาพอากาศ",
    icon: CloudSun,
    color: "bg-[#e7f1f7] text-[#346582]",
  },
  {
    title: "แชตบอตน้องเสริม",
    purpose: "สงสัยเรื่องข้าว ถามได้",
    description: "พูดคุยเรื่องพันธุ์ข้าว การปลูก ปุ๋ย น้ำ โรคข้าว และการเก็บเกี่ยว กับผู้ช่วย AI",
    href: "/chatbot",
    action: "คุยกับน้องเสริม",
    icon: Bot,
    color: "bg-[#f7efda] text-[#896621]",
    signIn: true,
  },
  {
    title: "รายรับและรายจ่าย",
    purpose: "รู้ว่ารับเท่าไร จ่ายอะไรไป",
    description: "พิมพ์รายการให้ AI ช่วยแยกหมวด ตรวจสอบก่อนบันทึก และดูสรุปรายรับรายจ่ายของคุณ",
    href: "/finance",
    action: "จัดการการเงิน",
    icon: Wallet,
    color: "bg-[#e8efea] text-[#456a50]",
    signIn: true,
  },
  {
    title: "ข่าวสารและอินโฟกราฟิก",
    purpose: "เติมความรู้เรื่องการเกษตร",
    description: "อ่านข่าวและความรู้เกี่ยวกับข้าว ค้นหาเรื่องที่สนใจ และเลือกดูตามหมวดหมู่",
    href: "/infographic",
    action: "อ่านข่าวและความรู้",
    icon: Newspaper,
    color: "bg-[#f8ece3] text-[#9a6138]",
  },
];

export default function FeatureSection() {
  return (
    <section id="home-features" aria-labelledby="features-heading" className="scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-7 flex flex-col gap-3 sm:mb-9 md:flex-row md:items-end md:justify-between md:gap-8">
          <div>
            <p className="text-sm font-semibold text-rice-natural">เครื่องมือของคุณ</p>
            <h2 id="features-heading" className="mt-2 text-2xl font-bold leading-snug text-rice-forest sm:text-3xl">วันนี้อยากเริ่มจากเรื่องไหน?</h2>
          </div>
          <p className="max-w-sm text-sm leading-7 text-rice-muted">เลือกสิ่งที่ต้องการ แล้วเข้าใช้งานได้จากตรงนี้</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {features.map(({ title, purpose, description, href, action, icon: Icon, color, signIn }) => (
            <Link key={href} href={href} className="group flex flex-col rounded-2xl border border-rice-forest/10 bg-white p-6 transition-[border-color,box-shadow] hover:border-rice-leaf/50 hover:shadow-card sm:p-7">
              <div className="flex items-center justify-between gap-3">
                <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${color}`}><Icon aria-hidden="true" className="h-6 w-6" /></span>
                {signIn && <span className="rounded-full bg-rice-surface-soft px-3 py-1 text-xs text-rice-muted">เข้าสู่ระบบเพื่อใช้งาน</span>}
              </div>
              <p className="mt-5 text-xs font-medium text-rice-muted">{purpose}</p>
              <h3 className="mt-1.5 text-xl font-semibold text-rice-forest">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-7 text-rice-muted">{description}</p>
              <span className="mt-5 flex items-center justify-between border-t border-rice-forest/10 pt-4 text-sm font-semibold text-rice-natural">
                {action}<ArrowUpRight aria-hidden="true" className="h-5 w-5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
