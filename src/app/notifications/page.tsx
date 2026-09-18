import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BellRing, RadioTower } from "lucide-react";

import NotificationCenter from "@/components/notifications/NotificationCenter";
import type {
  ManagementNotification,
  NotificationSeverity,
  NotificationType,
} from "@/lib/notifications/types";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "การแจ้งเตือน",
  description: "ติดตามการแจ้งเตือนด้านสภาพอากาศ โรคข้าว แมลง และภัยพิบัติ",
};

interface AlertRow {
  id: string;
  title: string;
  description: string;
  alert_type: NotificationType;
  severity: NotificationSeverity;
  area_name: string;
  starts_at: string;
  expires_at: string | null;
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login?next=/notifications");
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("management_alerts")
    .select(
      "id, title, description, alert_type, severity, area_name, starts_at, expires_at"
    )
    .eq("is_active", true)
    .lte("starts_at", now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("starts_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error("Unable to load notifications:", error);
  }

  const alerts: ManagementNotification[] = ((data ?? []) as AlertRow[])
    .map((alert) => ({
      id: alert.id,
      title: alert.title,
      description: alert.description,
      alertType: alert.alert_type,
      severity: alert.severity,
      areaName: alert.area_name,
      startsAt: alert.starts_at,
      expiresAt: alert.expires_at,
      source: "admin" as const,
    }))
    .sort((left, right) => {
      const priority = { high: 3, medium: 2, low: 1 };
      const severityDifference = priority[right.severity] - priority[left.severity];

      return severityDifference || Date.parse(right.startsAt) - Date.parse(left.startsAt);
    });

  return (
    <main className="relative isolate overflow-hidden py-5 sm:py-12 lg:py-14">
      <div
        aria-hidden="true"
        className="ambient-orb -left-32 top-6 h-80 w-80 bg-rice-mint/45 dark:bg-rice-leaf/10"
      />
      <div
        aria-hidden="true"
        className="ambient-orb -right-28 top-80 h-96 w-96 bg-rose-200/25 dark:bg-rose-400/[0.04]"
      />

      <div className="dashboard-container relative z-10">
        <header className="mb-5 overflow-hidden rounded-[1.75rem] bg-rice-forest px-4 py-6 text-white shadow-[0_24px_70px_rgba(11,46,28,0.2)] sm:mb-7 sm:rounded-[2.25rem] sm:px-8 sm:py-9 dark:bg-[#0a2a1a]">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3 sm:gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rice-mint text-rice-forest shadow-sm sm:h-14 sm:w-14">
                <BellRing className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-rice-mint-light">
                  Notification Center
                </p>
                <h1 className="mt-2 font-heading text-2xl font-bold tracking-[-0.03em] sm:text-4xl">
                  การแจ้งเตือนของคุณ
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/65 sm:text-base">
                  ติดตามสภาพอากาศ โรค แมลง ภัยพิบัติ และข้อมูลสำคัญที่อาจกระทบต่อแปลงข้าว
                </p>
              </div>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3 text-xs font-bold text-rice-mint-light">
              <RadioTower className="h-4 w-4" />
              ผู้ดูแล + Open-Meteo
            </span>
          </div>
        </header>

        <NotificationCenter
          alerts={alerts}
          userId={user.id}
          loadError={
            error
              ? "ไม่สามารถโหลดการแจ้งเตือนจากฐานข้อมูลได้ กรุณาลองใหม่"
              : null
          }
        />
      </div>
    </main>
  );
}
