import { redirect } from "next/navigation";

import AdminConsole from "@/components/admin/AdminConsole";
import { getAdminRole } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  const adminRole = getAdminRole(user);

  if (adminRole === "user") {
    return (
      <main className="dashboard-container flex min-h-dvh items-center py-10">
        <section className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-[var(--app-surface)] p-8 text-center shadow-card">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-200">ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[var(--app-text)]">บัญชีนี้ยังไม่เป็นผู้ดูแล</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--app-text-secondary)]">
            ให้ผู้ดูแลระบบกำหนดบทบาทของบัญชีนี้เป็น admin ใน Supabase ก่อนใช้งาน
          </p>
        </section>
      </main>
    );
  }

  return (
    <AdminConsole
      administratorId={user.id}
      administratorName={user.email ?? "ผู้ดูแลระบบ"}
      administratorRole={adminRole}
    />
  );
}
