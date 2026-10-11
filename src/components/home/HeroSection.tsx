import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ChartNoAxesCombined, ScanLine, Sprout } from "lucide-react";

export default function HeroSection() {
  return (
    <section id="home-hero" aria-labelledby="home-heading" className="scroll-mt-24 px-4 pt-6 sm:px-6 sm:pt-10 lg:px-8">
      <div className="mx-auto grid max-w-7xl overflow-hidden rounded-[1.75rem] border border-rice-forest/10 bg-white lg:min-h-[540px] lg:grid-cols-[1.08fr_1fr] lg:rounded-[2rem]">
        <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12 xl:p-14">
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-rice-natural">
            <Sprout aria-hidden="true" className="h-5 w-5" />
            <span>SmartRiceHub · เพื่อนคู่คิดของคนปลูกข้าว</span>
          </div>
          <h1 id="home-heading" className="text-[2.25rem] font-bold leading-[1.35] tracking-tight text-rice-forest sm:text-5xl xl:text-[3.5rem]">
            เข้าใจเรื่องข้าว<br />
            <span className="text-rice-natural">เริ่มได้ในที่เดียว</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-8 text-rice-muted">
            ดูข้อมูลผลผลิต ตรวจโรคจากภาพ เช็กสภาพอากาศ
            และจัดการรายรับรายจ่าย เลือกเครื่องมือที่ช่วยคุณได้ในแต่ละวัน
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/disease" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-rice-forest px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rice-natural">
              <ScanLine aria-hidden="true" className="h-5 w-5" />
              ตรวจโรคจากภาพ
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
            <Link href="#home-features" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-rice-forest/15 px-5 py-3 text-sm font-semibold text-rice-forest transition-colors hover:bg-rice-surface-soft">
              ดูเครื่องมือทั้งหมด
              <ArrowDown aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
          <p className="mt-6 border-t border-rice-forest/10 pt-5 text-sm leading-6 text-rice-muted">
            ดูแดชบอร์ดและสภาพอากาศได้เลย<br className="sm:hidden" /> โดยไม่ต้องเข้าสู่ระบบ
          </p>
        </div>

        <div className="relative min-h-[280px] bg-[#dae5ca] sm:min-h-[360px] lg:min-h-full">
          <Image src="/images/home/rice-field.jpg" alt="แปลงนาสีเขียวและสีทองมองจากมุมสูง" fill preload sizes="(max-width: 1023px) 100vw, 50vw" className="object-cover object-[50%_48%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-rice-dark/55 via-transparent to-transparent" />
          <div className="absolute left-5 top-5 flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-rice-forest sm:left-7 sm:top-7">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-rice-leaf" />
            ข้อมูลและเครื่องมือเพื่อคนปลูกข้าว
          </div>
          <Link href="/dashboard" className="group absolute inset-x-5 bottom-5 flex items-center gap-4 rounded-2xl border border-white/80 bg-white/95 p-4 transition-colors hover:bg-white sm:inset-x-7 sm:bottom-7 sm:p-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rice-mint/40 text-rice-natural">
              <ChartNoAxesCombined aria-hidden="true" className="h-6 w-6" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-rice-muted">เริ่มจากภาพรวม</span>
              <span className="mt-1 block text-base font-semibold text-rice-forest">สำรวจผลผลิตข้าวรายจังหวัด</span>
            </span>
            <ArrowRight aria-hidden="true" className="h-5 w-5 shrink-0 text-rice-natural transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}
