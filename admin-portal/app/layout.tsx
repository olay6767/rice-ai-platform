import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";

import "../../src/app/globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  style: "normal",
  display: "swap",
  fallback: ["Tahoma", "Arial", "ui-sans-serif", "system-ui", "sans-serif"],
});

export const metadata: Metadata = {
  title: {
    default: "Rice AI Admin",
    template: "%s | Rice AI Admin",
  },
  description: "ระบบจัดการเนื้อหาและผู้ใช้ Rice AI Platform",
  robots: { index: false, follow: false },
};

export default function AdminPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body className={ibmPlexSansThai.variable}>{children}</body>
    </html>
  );
}
