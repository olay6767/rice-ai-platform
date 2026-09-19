import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import Script from "next/script";

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

const adminThemeInitializer = `
  (() => {
    try {
      const savedTheme = localStorage.getItem("rice-ai-admin-theme");
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const theme = savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : prefersDark
          ? "dark"
          : "light";

      document.documentElement.classList.toggle("dark", theme === "dark");
    } catch {
      document.documentElement.classList.add("dark");
    }
  })();
`;

export default function AdminPortalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="th"
      className="dark"
      suppressHydrationWarning
    >
      <head>
        <Script
          id="rice-ai-admin-theme"
          strategy="beforeInteractive"
        >
          {adminThemeInitializer}
        </Script>
      </head>
      <body className={ibmPlexSansThai.variable}>{children}</body>
    </html>
  );
}
