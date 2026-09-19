import { redirect } from "next/navigation";

import AdminConsole from "@/components/admin/AdminConsole";
import { getAdminRole } from "@/lib/admin/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * หลังบ้านรันเป็นเว็บไซต์แยกใน admin-portal เพื่อแยกผู้ดูแลออกจากเว็บผู้ใช้.
 */
export default async function AdminPage() {
  const portalUrl = process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim();
  const isLocalPortal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\/?$/i.test(
    portalUrl ?? ""
  );

  if (portalUrl && (process.env.NODE_ENV !== "production" || !isLocalPortal)) {
    redirect(portalUrl);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login?next=/admin");

  const role = getAdminRole(user);
  if (role === "user") {
    return (
      <main className="dashboard-container flex min-h-dvh items-center py-10">
        <section className="mx-auto max-w-xl rounded-3xl border border-amber-400/30 bg-[var(--app-surface)] p-8 text-center shadow-card">
          <p className="text-sm font-bold text-amber-700 dark:text-amber-200">
            ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล
          </p>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[var(--app-text)]">
            บัญชีนี้ยังไม่เป็นผู้ดูแล
          </h1>
        </section>
      </main>
    );
  }

  return (
    <AdminConsole
      administratorId={user.id}
      administratorName={user.email ?? "ผู้ดูแลระบบ"}
      administratorRole={role}
    />
  );
}
