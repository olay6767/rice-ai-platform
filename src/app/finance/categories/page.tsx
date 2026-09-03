import type { Metadata } from "next";

import FinanceCategoryManager from "@/components/finance/FinanceCategoryManager";
import { getFinanceUser } from "@/lib/finance/user";

export const metadata: Metadata = { title: "หมวดและงบประมาณ | การเงิน", description: "จัดการหมวดรายรับและรายจ่าย" };

export default async function FinanceCategoriesPage() {
  const { isAuthenticated } = await getFinanceUser();
  if (!isAuthenticated) return <main className="dashboard-container py-16 text-center text-rice-muted dark:text-white/55">กรุณาเข้าสู่ระบบเพื่อจัดการหมวดการเงิน</main>;
  return <FinanceCategoryManager />;
}
