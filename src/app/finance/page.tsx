import type { Metadata } from "next";

import FinanceAssistant from "@/components/finance/FinanceAssistant";
import { getFinanceUser } from "@/lib/finance/user";

export const metadata: Metadata = {
  title: "ผู้ช่วยบันทึกรายรับ–รายจ่าย",
  description:
    "บันทึกรายรับและรายจ่ายด้วยข้อความภาษาไทย ให้ Gemini ช่วยแยกประเภท จำนวนเงิน และหมวดหมู่อัตโนมัติ",
};

export default async function FinancePage() {
  const user = await getFinanceUser();

  return <FinanceAssistant {...user} />;
}
