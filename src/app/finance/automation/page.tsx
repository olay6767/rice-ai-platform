import type { Metadata } from "next";

import FinanceAutomationManager from "@/components/finance/FinanceAutomationManager";
import { getFinanceUser } from "@/lib/finance/user";

export const metadata: Metadata = { title: "บัญชีและรายการประจำ | การเงิน", description: "จัดการหลายบัญชีและรายการรายรับรายจ่ายประจำ" };

export default async function FinanceAutomationPage() {
  const { isAuthenticated } = await getFinanceUser();
  if (!isAuthenticated) return <main className="dashboard-container py-16 text-center text-rice-muted dark:text-white/55">กรุณาเข้าสู่ระบบเพื่อจัดการรายการประจำ</main>;
  return <FinanceAutomationManager />;
}
