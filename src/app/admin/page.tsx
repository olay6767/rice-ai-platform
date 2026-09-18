import { redirect } from "next/navigation";

/**
 * หลังบ้านรันเป็นเว็บไซต์แยกใน admin-portal เพื่อแยกผู้ดูแลออกจากเว็บผู้ใช้.
 */
export default function AdminPage() {
  redirect(
    process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim() ||
      "http://localhost:3001"
  );
}
