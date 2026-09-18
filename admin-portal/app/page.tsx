import { redirect } from "next/navigation";

import AdminConsole from "@/components/admin/AdminConsole";
import { isAdmin } from "@/lib/admin/auth";
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

  if (!isAdmin(user)) {
    return (
      <main className="dashboard-container flex min-h-dvh items-center py-10">
        <section className="mx-auto max-w-xl rounded-3xl border border-amber-300/30 bg-amber-400/10 p-8 text-center shadow-card">
          <p className="text-sm font-bold text-amber-200">ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล</p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-white">บัญชีนี้ยังไม่เป็นผู้ดูแล</h1>
          <p className="mt-3 text-sm leading-6 text-white/60">
            ให้ผู้ดูแลระบบกำหนดบทบาทของบัญชีนี้เป็น admin ใน Supabase ก่อนใช้งาน
          </p>
        </section>
      </main>
    );
  }

  return <AdminConsole administratorName={user.email ?? "ผู้ดูแลระบบ"} />;
}
