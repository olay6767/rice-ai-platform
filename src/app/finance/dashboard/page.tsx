import type { Metadata } from "next";

import FinanceAssistant from "@/components/finance/FinanceAssistant";
import { getFinanceUser } from "@/lib/finance/user";

export const metadata: Metadata = {
  title: "Dashboard การเงิน",
  description:
    "ดูภาพรวมรายรับ รายจ่าย แนวโน้มย้อนหลัง และสัดส่วนการเงินของคุณ",
};

export default async function FinanceDashboardPage() {
  const user = await getFinanceUser();

  return (
    <FinanceAssistant
      {...user}
      dashboardOnly
    />
  );
}
