import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ImagePlus, ScanLine, FileCheck2 } from "lucide-react";

const steps = [
  { number: "01", icon: ImagePlus, title: "อัปโหลดภาพใบข้าว", description: "เลือกภาพที่เห็นใบข้าวและบริเวณที่ต้องการตรวจชัดเจน" },
  { number: "02", icon: ScanLine, title: "เริ่มวิเคราะห์ภาพ", description: "ส่งภาพให้ AI ประมวลผลและจำแนกโรคข้าว" },
  { number: "03", icon: FileCheck2, title: "อ่านผลการตรวจ", description: "ดูผลที่ระบบจำแนกได้ พร้อมระดับความมั่นใจในการวิเคราะห์" },
];

export default function HowItWorksSection() {
  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-24 px-4 pb-12 sm:px-6 sm:pb-16 lg:px-8">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] border border-rice-forest/10 bg-[#edf2e8]">
        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[0.85fr_1.6fr] lg:gap-12 lg:p-10">
          <div>
            <p className="text-sm font-semibold text-rice-natural">ลองใช้เครื่องมือแรก</p>
            <h2 id="how-heading" className="mt-2 text-2xl font-bold leading-snug text-rice-forest sm:text-3xl">ตรวจโรคข้าว<br className="hidden lg:block" /> เริ่มจากภาพเดียว</h2>
            <Link href="/disease" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-semibold text-rice-forest underline decoration-rice-leaf/40 underline-offset-4 hover:decoration-rice-forest">
              ไปหน้าตรวจโรคข้าว<ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <ol className="grid gap-6 sm:grid-cols-3 sm:gap-5">
            {steps.map(({ number, icon: Icon, title, description }) => (
              <li key={number} className="flex gap-4 sm:block">
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-rice-forest/10 bg-white text-rice-natural">
                  <Icon aria-hidden="true" className="h-5 w-5" />
                  <span className="absolute -right-2 -top-2 rounded-md bg-rice-forest px-1.5 py-0.5 text-[10px] font-semibold text-white">{number}</span>
                </div>
                <div className="sm:mt-5">
                  <h3 className="text-base font-semibold text-rice-forest">{title}</h3>
                  <p className="mt-2 text-sm leading-7 text-rice-muted">{description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-5 border-t border-rice-forest/10 bg-white/70 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-9 lg:px-10">
          <div className="flex items-center gap-4">
            <Image src="/logo/rice-ai-farmer-mark.png" alt="น้องเสริม ผู้ช่วยของ SmartRiceHub" width={52} height={52} className="h-13 w-13 shrink-0 object-contain" />
            <div>
              <h3 className="text-base font-semibold text-rice-forest">อยากถามเรื่องการปลูกข้าวต่อ?</h3>
              <p className="mt-1 text-sm leading-6 text-rice-muted">เข้าสู่ระบบ แล้วคุยกับน้องเสริมได้ในหน้าแชตบอต</p>
            </div>
          </div>
          <Link href="/chatbot" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-rice-forest/15 bg-white px-5 py-3 text-sm font-semibold text-rice-forest transition-colors hover:bg-rice-surface-soft">
            คุยกับน้องเสริม<ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
