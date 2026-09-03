import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, KeyRound } from "lucide-react";

export const metadata: Metadata = {
  title: "ลืมรหัสผ่าน",
  description:
    "หน้าช่วยเหลือสำหรับผู้ใช้ที่ลืมรหัสผ่าน Rice AI Platform",
};

export default function ForgotPasswordPage() {
  return (
    <main className="page-container flex min-h-[65vh] items-center justify-center py-16">
      <section className="glass-card w-full max-w-lg p-7 text-center sm:p-10">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rice-mint/50 text-rice-forest dark:bg-rice-leaf/15 dark:text-rice-mint-light">
          <KeyRound className="h-7 w-7" />
        </span>
        <h1 className="mt-5 font-heading text-2xl font-bold text-rice-forest dark:text-white">
          ลืมรหัสผ่าน
        </h1>
        <p className="mt-3 text-sm leading-7 text-rice-muted dark:text-white/55">
          ระบบรีเซ็ตรหัสผ่านทางอีเมลยังไม่เปิดใช้งาน
          กรุณาติดต่อผู้ดูแลระบบหรือลองเข้าสู่ระบบอีกครั้ง
        </p>
        <Link
          href="/login"
          className="primary-action mt-7"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </main>
  );
}
