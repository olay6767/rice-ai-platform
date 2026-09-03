import type { Metadata } from "next";

import FinanceTransactionHistory from "@/components/finance/FinanceTransactionHistory";
import { getFinanceUser } from "@/lib/finance/user";

export const metadata: Metadata = {
  title: "รายการย้อนหลัง | การเงิน",
  description: "ค้นหา แก้ไข ลบ และส่งออกรายการรายรับรายจ่าย",
};

export default async function FinanceTransactionsPage() {
  const { isAuthenticated } = await getFinanceUser();
  if (!isAuthenticated) {
    return <main className="dashboard-container py-16 text-center text-rice-muted dark:text-white/55">กรุณาเข้าสู่ระบบเพื่อดูรายการย้อนหลัง</main>;
  }
  return <FinanceTransactionHistory />;
}
