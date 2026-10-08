import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  BadgeCheck,
  CalendarDays,
  ChevronRight,
  Mail,
  ScanLine,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import ProfileSettings from "@/components/profile/ProfileSettings";
import ProfileAvatarUploader from "@/components/profile/ProfileAvatarUploader";
import FarmFieldManager from "@/components/profile/FarmFieldManager";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "โปรไฟล์ผู้ใช้งาน",
  description: "จัดการข้อมูลส่วนตัว รูปโปรไฟล์ และความปลอดภัยของบัญชี SmartRiceHub",
};

function metadataText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string | null): string {
  if (!value) {
    return "ยังไม่มีข้อมูล";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "ยังไม่มีข้อมูล";
  }

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
  }).format(date);
}

function initials(value: string): string {
  const words = value.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return "RA";
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0))
    .join("")
    .toUpperCase();
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login?next=/profile");
  }

  const [financeResult, diseaseResult] = await Promise.all([
    supabase
      .from("finance_transactions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("disease_predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (financeResult.error) {
    console.error("Unable to count profile finance transactions:", financeResult.error);
  }

  if (diseaseResult.error) {
    console.error("Unable to count profile disease predictions:", diseaseResult.error);
  }

  const fullName =
    metadataText(user.user_metadata?.full_name) ||
    user.email ||
    "ผู้ใช้งาน SmartRiceHub";
  const avatarUrl = metadataText(user.user_metadata?.avatar_url);
  const role = user.app_metadata?.role === "superadmin"
    ? "ผู้ดูแลระบบสูงสุด"
    : user.app_metadata?.role === "admin"
      ? "ผู้ดูแลระบบ"
      : "ผู้ใช้งาน";

  const summaryCards = [
    {
      label: "รายการการเงิน",
      value: (financeResult.count ?? 0).toLocaleString("th-TH"),
      detail: "รายการที่บันทึกในบัญชี",
      icon: WalletCards,
      tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-200",
    },
    {
      label: "ประวัติตรวจโรค",
      value: (diseaseResult.count ?? 0).toLocaleString("th-TH"),
      detail: "ผลวิเคราะห์ที่บันทึกไว้",
      icon: ScanLine,
      tone: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-200",
    },
    {
      label: "สมาชิกตั้งแต่",
      value: formatDate(user.created_at),
      detail: `เข้าสู่ระบบล่าสุด ${formatDate(user.last_sign_in_at)}`,
      icon: CalendarDays,
      tone: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-200",
    },
  ];

  return (
    <main className="relative isolate overflow-hidden pb-24 pt-5 sm:py-12 lg:py-14">
      <div
        aria-hidden="true"
        className="ambient-orb -left-28 top-8 h-80 w-80 bg-rice-mint/45 dark:bg-rice-leaf/10"
      />
      <div
        aria-hidden="true"
        className="ambient-orb -right-28 top-72 h-96 w-96 bg-rice-gold/15 dark:bg-rice-gold/[0.04]"
      />

      <div className="dashboard-container relative z-10">
        <section className="overflow-hidden rounded-[1.75rem] bg-rice-forest text-white shadow-[0_24px_70px_rgba(11,46,28,0.2)] sm:rounded-[2.25rem] dark:bg-[#0a2a1a]">
          <div className="relative px-5 py-7 sm:px-8 sm:py-9 lg:px-10">
            <div
              aria-hidden="true"
              className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-rice-mint/10"
            />
            <div aria-hidden="true" className="absolute -bottom-28 left-1/3 h-56 w-56 rounded-full bg-rice-gold/[0.07] blur-2xl" />

            <div className="relative grid gap-7 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-center">
              <ProfileAvatarUploader
                avatarUrl={avatarUrl}
                fullName={fullName}
                initials={initials(fullName)}
              />

              <div className="min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold text-rice-mint-light">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {role}
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-2.5 py-1 text-[11px] font-bold text-emerald-100">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    {user.email_confirmed_at ? "ยืนยันอีเมลแล้ว" : "รอยืนยันอีเมล"}
                  </span>
                </div>
                <h1 className="mt-3 break-words font-heading text-3xl font-bold leading-tight text-white sm:text-4xl">
                  {fullName}
                </h1>
                <p className="mt-2 flex items-center justify-center gap-2 text-sm text-white/65 sm:justify-start">
                  <Mail className="h-4 w-4 shrink-0" />
                  <span className="truncate">{user.email}</span>
                </p>
                <p className="mt-3 max-w-xl text-xs leading-5 text-white/55 sm:text-sm sm:leading-6">
                  จัดการข้อมูลบัญชี รูปโปรไฟล์ ความปลอดภัย และข้อมูลแปลงนาของคุณได้จากที่เดียว
                </p>
              </div>

              <nav aria-label="ทางลัดการตั้งค่าโปรไฟล์" className="grid gap-2 sm:grid-cols-3 lg:w-52 lg:grid-cols-1">
                {[
                  ["ข้อมูลส่วนตัว", "#personal-info"],
                  ["ความปลอดภัย", "#security"],
                  ["ข้อมูลแปลงนา", "#farm-fields"],
                ].map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="flex min-h-11 items-center justify-between rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-xs font-bold text-white transition hover:bg-white/[0.13]"
                  >
                    {label}
                    <ChevronRight className="h-4 w-4 text-white/55" />
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </section>

        <div className="mb-4 mt-7 sm:mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-rice-leaf">ภาพรวมบัญชี</p>
          <h2 className="mt-1 font-heading text-2xl font-bold text-rice-forest dark:text-white">ข้อมูลของคุณใน SmartRiceHub</h2>
        </div>

        <section
          aria-label="สรุปบัญชี"
          className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3"
        >
          {summaryCards.map((card) => {
            const Icon = card.icon;

            return (
              <article
                key={card.label}
                className="group rounded-[1.6rem] border border-rice-forest/10 bg-white/80 p-5 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-card dark:border-white/10 dark:bg-white/[0.04]"
              >
                <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <p className="mt-4 font-heading text-[1.7rem] font-bold leading-tight text-rice-forest dark:text-white">
                  {card.value}
                </p>
                <h2 className="mt-1 text-sm font-bold text-rice-forest dark:text-white">
                  {card.label}
                </h2>
                <p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/45">
                  {card.detail}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mt-6 sm:mt-8">
          <ProfileSettings
            fullName={fullName}
            email={user.email ?? ""}
            phone={metadataText(user.user_metadata?.phone)}
            province={metadataText(user.user_metadata?.province)}
            district={metadataText(user.user_metadata?.district)}
            farmName={metadataText(user.user_metadata?.farm_name)}
          />
        </section>

        <FarmFieldManager
          initialName={metadataText(user.user_metadata?.farm_name)}
          initialProvince={metadataText(user.user_metadata?.province)}
          initialDistrict={metadataText(user.user_metadata?.district)}
        />
      </div>
    </main>
  );
}
