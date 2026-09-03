import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import RegisterForm from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "สมัครสมาชิก | Rice AI",
  description:
    "สร้างบัญชี Rice AI เพื่อจัดการแปลงนา ตรวจโรคข้าว และบันทึกข้อมูลการเพาะปลูก",
};

const REGISTER_BENEFITS = [
  {
    title: "จัดการข้อมูลแปลงนา",
    description:
      "บันทึกข้อมูลแปลง พันธุ์ข้าว และรอบการเพาะปลูก",
    icon: Sprout,
  },
  {
    title: "วิเคราะห์โรคด้วย AI",
    description:
      "อัปโหลดภาพเพื่อช่วยวิเคราะห์อาการผิดปกติของต้นข้าว",
    icon: BrainCircuit,
  },
  {
    title: "ข้อมูลเป็นส่วนตัว",
    description:
      "ข้อมูลของแต่ละบัญชีจะแยกออกจากผู้ใช้งานคนอื่น",
    icon: ShieldCheck,
  },
];

export default function RegisterPage() {
  return (
    <main
      className="
        relative isolate
        min-h-dvh overflow-hidden
        bg-rice-ambient
        px-4 py-6
        sm:px-6 sm:py-10
        lg:px-8
        dark:bg-rice-ambient-dark
      "
    >
      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -left-32 top-0 -z-10
          h-96 w-96 rounded-full
          bg-rice-mint/40 blur-3xl
          dark:bg-rice-leaf/10
        "
      />

      <div
        aria-hidden="true"
        className="
          pointer-events-none
          absolute -right-32 bottom-0 -z-10
          h-96 w-96 rounded-full
          bg-rice-gold/15 blur-3xl
          dark:bg-rice-gold/[0.06]
        "
      />

      <div
        className="
          mx-auto grid w-full
          max-w-6xl items-center
          gap-10
          lg:min-h-[calc(100dvh-5rem)]
          lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,0.7fr)]
          lg:gap-16
        "
      >
        <section className="hidden lg:block">
          <Link
            href="/"
            className="
              inline-flex items-center
              gap-2 rounded-full
              text-sm font-semibold
              text-rice-muted
              transition
              hover:text-rice-natural
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-rice-leaf
            "
          >
            <ArrowLeft
              aria-hidden="true"
              className="h-4 w-4"
            />

            กลับหน้าแรก
          </Link>

          <p
            className="
              mt-12 text-xs font-semibold
              uppercase tracking-[0.16em]
              text-rice-natural
              dark:text-rice-mint
            "
          >
            Rice AI Platform
          </p>

          <h1
            className="
              mt-4 max-w-xl
              font-heading
              text-4xl font-bold
              leading-tight
              tracking-[-0.04em]
              text-rice-dark
              xl:text-5xl
              dark:text-white
            "
          >
            เริ่มต้นดูแลแปลงนา
            <span
              className="
                block text-rice-natural
                dark:text-rice-mint
              "
            >
              ด้วยข้อมูลและ AI
            </span>
          </h1>

          <p
            className="
              mt-5 max-w-lg
              text-base leading-8
              text-rice-muted
              dark:text-white/60
            "
          >
            สร้างบัญชีเพื่อบันทึกข้อมูลแปลงนา
            ตรวจสอบโรคข้าว และติดตามข้อมูลสำคัญ
            ในแต่ละรอบการเพาะปลูก
          </p>

          <div className="mt-9 space-y-4">
            {REGISTER_BENEFITS.map(
              (benefit) => {
                const Icon = benefit.icon;

                return (
                  <div
                    key={benefit.title}
                    className="
                      flex max-w-lg
                      items-start gap-4
                      rounded-3xl
                      border border-white/70
                      bg-white/55
                      p-4
                      backdrop-blur-xl
                      dark:border-white/10
                      dark:bg-white/[0.045]
                    "
                  >
                    <span
                      className="
                        flex h-11 w-11
                        shrink-0 items-center
                        justify-center
                        rounded-2xl
                        bg-rice-mint/60
                        text-rice-forest
                        dark:bg-rice-leaf/20
                        dark:text-rice-mint
                      "
                    >
                      <Icon
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                    </span>

                    <div>
                      <h2
                        className="
                          text-sm font-semibold
                          text-rice-dark
                          dark:text-white
                        "
                      >
                        {benefit.title}
                      </h2>

                      <p
                        className="
                          mt-1 text-sm
                          leading-6
                          text-rice-muted
                          dark:text-white/50
                        "
                      >
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-5 lg:hidden">
            <Link
              href="/"
              className="
                inline-flex items-center
                gap-2 text-sm font-semibold
                text-rice-muted
                hover:text-rice-natural
              "
            >
              <ArrowLeft
                aria-hidden="true"
                className="h-4 w-4"
              />

              กลับหน้าแรก
            </Link>
          </div>

          <RegisterForm />
        </section>
      </div>
    </main>
  );
}