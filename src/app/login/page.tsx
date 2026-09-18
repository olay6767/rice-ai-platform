import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  BrainCircuit,
  ShieldCheck,
  Sprout,
} from "lucide-react";

import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | Rice AI",
  description:
    "เข้าสู่ระบบ Rice AI เพื่อจัดการแปลงนา ตรวจโรคข้าว และติดตามข้อมูลการเพาะปลูก",
};

interface LoginPageProps {
  searchParams: Promise<{
    next?: string;
    confirmed?: string;
    error?: string;
  }>;
}

const LOGIN_BENEFITS = [
  {
    title: "ข้อมูลแปลงนาในบัญชีเดียว",
    description:
      "ดูข้อมูลแปลง รอบปลูก และประวัติการดูแลได้อย่างเป็นระบบ",
    icon: Sprout,
  },
  {
    title: "วิเคราะห์โรคด้วย AI",
    description:
      "ตรวจสอบผลวิเคราะห์และประวัติภาพที่เคยอัปโหลด",
    icon: BrainCircuit,
  },
  {
    title: "ควบคุมการเข้าถึงข้อมูล",
    description:
      "ข้อมูลของคุณแยกจากบัญชีผู้ใช้งานรายอื่น",
    icon: ShieldCheck,
  },
];

function getSafeNextPath(
  value?: string
): string {
  if (
    value?.startsWith("/") &&
    !value.startsWith("//")
  ) {
    return value;
  }

  return "/";
}

export default async function LoginPage({
  searchParams,
}: LoginPageProps) {
  const params = await searchParams;

  const nextPath = getSafeNextPath(
    params.next
  );

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
              transition-colors
              hover:text-rice-natural
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
            Welcome back
          </p>

          <h2
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
            กลับมาดูแลแปลงนา
            <span
              className="
                block text-rice-natural
                dark:text-rice-mint
              "
            >
              ด้วยข้อมูลที่ต่อเนื่อง
            </span>
          </h2>

          <p
            className="
              mt-5 max-w-lg
              text-base leading-8
              text-rice-muted
              dark:text-white/60
            "
          >
            เข้าสู่ระบบเพื่อดูข้อมูลแปลงนา
            ผลตรวจโรค และข้อมูลสำคัญจากรอบปลูกของคุณ
          </p>

          <div className="mt-9 space-y-4">
            {LOGIN_BENEFITS.map(
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
                      bg-white/55 p-4
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
                      <h3
                        className="
                          text-sm font-semibold
                          text-rice-dark
                          dark:text-white
                        "
                      >
                        {benefit.title}
                      </h3>

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

          <LoginForm
            nextPath={nextPath}
            confirmationSuccess={
              params.confirmed === "true"
            }
            confirmationError={
              params.error ===
              "confirmation_failed"
            }
          />
        </section>
      </div>
    </main>
  );
} 