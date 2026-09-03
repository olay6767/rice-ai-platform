import type {
  Metadata,
  Viewport,
} from "next";
import { IBM_Plex_Sans_Thai } from "next/font/google";
import type { ReactNode } from "react";

import { signOutAction } from "@/app/auth/actions";
import Footer from "@/components/layout/Footer/Footer";
import Navbar, {
  type NavbarUser,
} from "@/components/layout/Navbar/Navbar";
import { createClient } from "@/lib/supabase/server";

import "./globals.css";

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-ibm-plex-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  style: "normal",
  display: "swap",
  preload: true,
  fallback: [
    "Tahoma",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ],
});

export const metadata: Metadata = {
  title: {
    default:
      "Rice AI — เกษตรอัจฉริยะสำหรับคนปลูกข้าว",
    template: "%s | Rice AI",
  },

  description:
    "แพลตฟอร์มเกษตรอัจฉริยะสำหรับวิเคราะห์โรคข้าว ติดตามสุขภาพแปลงนา จัดการต้นทุน และวางแผนการเพาะปลูกด้วยข้อมูลและ AI",

  applicationName: "Rice AI",

  keywords: [
    "Rice AI",
    "โรคข้าว",
    "ตรวจโรคข้าว",
    "เกษตรอัจฉริยะ",
    "จัดการแปลงนา",
    "Smart Farming",
    "AgriTech",
    "Crop Management",
  ],

  creator: "Rice AI",
  publisher: "Rice AI",

  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "Rice AI",
    title:
      "Rice AI — เกษตรอัจฉริยะสำหรับคนปลูกข้าว",
    description:
      "วิเคราะห์โรคข้าว ติดตามสุขภาพแปลงนา และจัดการข้อมูลการเพาะปลูกในแพลตฟอร์มเดียว",
  },

  twitter: {
    card: "summary_large_image",
    title:
      "Rice AI — เกษตรอัจฉริยะสำหรับคนปลูกข้าว",
    description:
      "วิเคราะห์โรคข้าว ติดตามสุขภาพแปลงนา และจัดการข้อมูลการเพาะปลูกในแพลตฟอร์มเดียว",
  },

  robots: {
    index: true,
    follow: true,
  },

  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",

  colorScheme: "light dark",

  themeColor: [
    {
      media: "(prefers-color-scheme: light)",
      color: "#FAF9F6",
    },
    {
      media: "(prefers-color-scheme: dark)",
      color: "#07140C",
    },
  ],
};

export interface RootLayoutProps {
  children: ReactNode;
}

async function getNavbarUser(): Promise<NavbarUser | null> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const fullName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name.trim()
        : "";

    const avatarUrl =
      typeof user.user_metadata?.avatar_url === "string"
        ? user.user_metadata.avatar_url
        : null;

    return {
      id: user.id,
      fullName: fullName || user.email || "ผู้ใช้งาน",
      email: user.email || "",
      avatarUrl,
      role:
        user.app_metadata?.role === "admin"
          ? "admin"
          : "user",
    };
  } catch (error) {
    console.error(
      "Unable to load the current user for Navbar:",
      error
    );

    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<RootLayoutProps>) {
  const navbarUser = await getNavbarUser();

  return (
    <html
      lang="th"
      suppressHydrationWarning
      className={ibmPlexSansThai.variable}
    >
      <body
        className="
          min-h-dvh
          bg-rice-background
          font-body
          text-rice-text
          antialiased
          selection:bg-rice-mint
          selection:text-rice-dark
          dark:bg-[#07140c]
          dark:text-white
        "
      >
        <div
          id="app-root"
          className="
            relative flex
            min-h-dvh flex-col
            overflow-x-clip
          "
        >
          <Navbar
            user={navbarUser}
            onSignOut={signOutAction}
          />

          <div className="flex-1">
            {children}
          </div>

          <Footer />
        </div>
      </body>
    </html>
  );
}
