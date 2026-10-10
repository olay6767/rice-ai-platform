import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import AuthBrandMark from "@/components/auth/AuthBrandMark";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "ลืมรหัสผ่าน",
  description:
    "ขอลิงก์ตั้งรหัสผ่านใหม่สำหรับบัญชี SmartRiceHub",
};

export default function ForgotPasswordPage() {
  return (
    <main
      data-standalone-page="forgot-password"
      className="flex min-h-dvh items-center justify-center bg-rice-background px-4 py-10 sm:px-6 dark:bg-[#07140c]"
    >
      <section className="glass-card w-full max-w-lg p-7 text-center sm:p-10">
        <div className="flex justify-center">
          <AuthBrandMark size="hero" />
        </div>
        <h1 className="mt-5 font-heading text-2xl font-bold text-rice-forest dark:text-white">
          ลืมรหัสผ่าน
        </h1>
        <p className="mt-3 text-sm leading-7 text-rice-muted dark:text-white/55">
          กรอกอีเมลที่ใช้สมัครสมาชิก
          ระบบจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ให้คุณ
        </p>

        <ForgotPasswordForm />

        <Link
          href="/login"
          className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-rice-muted transition-colors hover:text-rice-natural dark:text-white/50 dark:hover:text-rice-mint"
        >
          <ArrowLeft
            aria-hidden="true"
            className="h-4 w-4"
          />
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </section>
    </main>
  );
}
