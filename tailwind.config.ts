import type { Config } from "tailwindcss";

const config = {
  darkMode: "class",

  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",

    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],

  theme: {
    extend: {
      /**
       * ฟอนต์หลักของ Rice AI
       *
       * ตัวแปร CSS จะถูกกำหนดผ่าน next/font
       * ใน src/app/layout.tsx
       */
      fontFamily: {
  heading: [
    "var(--font-ibm-plex-sans-thai)",
    "IBM Plex Sans Thai",
    "Tahoma",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ],

  body: [
    "var(--font-ibm-plex-sans-thai)",
    "IBM Plex Sans Thai",
    "Tahoma",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ],

  sans: [
    "var(--font-ibm-plex-sans-thai)",
    "IBM Plex Sans Thai",
    "Tahoma",
    "Arial",
    "ui-sans-serif",
    "system-ui",
    "sans-serif",
  ],
},

      /**
       * ชุดสีหลักของ Rice AI
       */
      colors: {
        rice: {
          forest: "#0B2E1C",
          dark: "#00180B",
          natural: "#3C674F",
          leaf: "#5E8C4A",
          mint: "#BEEECF",
          "mint-light": "#C5ECD0",
          gold: "#D8B45B",

          background: "#FAF9F6",
          surface: "#FFFFFF",
          "surface-soft": "#F4F4F0",

          text: "#1A1C1A",
          muted: "#424843",
          error: "#BA1A1A",
        },

        forest: {
          50: "#F1F7F3",
          100: "#DDEBE1",
          200: "#BED8C5",
          300: "#92BCA0",
          400: "#649976",
          500: "#467B5B",
          600: "#356247",
          700: "#2A4E39",
          800: "#223F30",
          900: "#193326",
          950: "#0B2E1C",
        },

        leaf: {
          50: "#F4F8F1",
          100: "#E5EFDF",
          200: "#CCDFC1",
          300: "#A9C996",
          400: "#82AD6C",
          500: "#5E8C4A",
          600: "#4A713A",
          700: "#3C5A31",
          800: "#324929",
          900: "#293D23",
          950: "#142111",
        },

        mint: {
          50: "#F3FCF6",
          100: "#E2F8E9",
          200: "#C5ECD0",
          300: "#BEEECF",
          400: "#7FD99B",
          500: "#4CC475",
          600: "#31A75C",
          700: "#288449",
          800: "#24683D",
          900: "#205636",
          950: "#0D2F1C",
        },

        gold: {
          50: "#FBF8ED",
          100: "#F5EDCE",
          200: "#EBDD9D",
          300: "#DFC86A",
          400: "#D8B45B",
          500: "#C99A36",
          600: "#AD782B",
          700: "#8B5927",
          800: "#744826",
          900: "#633D24",
          950: "#392012",
        },
      },

      /**
       * ขนาดตัวอักษรตาม Design System
       */
      fontSize: {
        display: [
          "2.125rem",
          {
            lineHeight: "1.08",
            letterSpacing: "-0.035em",
            fontWeight: "700",
          },
        ],

        "display-lg": [
          "3rem",
          {
            lineHeight: "1.04",
            letterSpacing: "-0.045em",
            fontWeight: "700",
          },
        ],

        section: [
          "1.5rem",
          {
            lineHeight: "1.25",
            letterSpacing: "-0.02em",
            fontWeight: "600",
          },
        ],

        "mobile-heading": [
          "1.25rem",
          {
            lineHeight: "1.35",
            letterSpacing: "-0.015em",
            fontWeight: "600",
          },
        ],

        "card-title": [
          "1.125rem",
          {
            lineHeight: "1.4",
            letterSpacing: "-0.01em",
            fontWeight: "600",
          },
        ],

        body: [
          "1rem",
          {
            lineHeight: "1.7",
            fontWeight: "400",
          },
        ],

        label: [
          "0.6875rem",
          {
            lineHeight: "1.4",
            letterSpacing: "0.12em",
            fontWeight: "600",
          },
        ],
      },

      /**
       * Radius แบบ Apple-inspired
       */
      borderRadius: {
        card: "1.5rem",
        hero: "2.25rem",
        control: "1rem",
        icon: "0.875rem",
        pill: "9999px",
      },

      /**
       * เงาแบบนุ่ม ไม่หนัก
       */
      boxShadow: {
        card: [
          "0 1px 2px rgba(11, 46, 28, 0.03)",
          "0 10px 30px rgba(11, 46, 28, 0.06)",
        ].join(", "),

        "card-hover": [
          "0 2px 4px rgba(11, 46, 28, 0.04)",
          "0 18px 45px rgba(11, 46, 28, 0.10)",
        ].join(", "),

        glass: [
          "0 1px 2px rgba(11, 46, 28, 0.03)",
          "0 12px 36px rgba(11, 46, 28, 0.07)",
          "inset 0 1px 0 rgba(255, 255, 255, 0.70)",
        ].join(", "),

        "glass-lg": [
          "0 2px 4px rgba(11, 46, 28, 0.04)",
          "0 24px 70px rgba(11, 46, 28, 0.10)",
          "inset 0 1px 0 rgba(255, 255, 255, 0.80)",
        ].join(", "),

        floating: [
          "0 4px 10px rgba(11, 46, 28, 0.05)",
          "0 24px 64px rgba(11, 46, 28, 0.12)",
        ].join(", "),

        primary: [
          "0 1px 2px rgba(0, 24, 11, 0.12)",
          "0 5px 10px rgba(0, 24, 11, 0.12)",
          "0 14px 28px rgba(0, 24, 11, 0.10)",
          "inset 0 1px 1px rgba(255, 255, 255, 0.25)",
        ].join(", "),

        "primary-hover": [
          "0 2px 4px rgba(0, 24, 11, 0.14)",
          "0 10px 20px rgba(0, 24, 11, 0.14)",
          "0 24px 44px rgba(0, 24, 11, 0.12)",
          "inset 0 1px 1px rgba(255, 255, 255, 0.30)",
        ].join(", "),

        mint: [
          "0 10px 35px rgba(94, 140, 74, 0.16)",
        ].join(", "),

        gold: [
          "0 10px 35px rgba(216, 180, 91, 0.16)",
        ].join(", "),
      },

      /**
       * Blur สำหรับ Glassmorphism
       */
      backdropBlur: {
        glass: "22px",
        "glass-lg": "28px",
      },

      /**
       * พื้นหลังสำเร็จรูป
       */
      backgroundImage: {
        "rice-ambient": [
          "radial-gradient(circle at 12% 10%, rgba(190, 238, 207, 0.48), transparent 30%)",
          "radial-gradient(circle at 88% 18%, rgba(216, 180, 91, 0.16), transparent 28%)",
          "linear-gradient(180deg, #FAF9F6 0%, #FFFFFF 72%)",
        ].join(", "),

        "rice-ambient-dark": [
          "radial-gradient(circle at 12% 10%, rgba(94, 140, 74, 0.18), transparent 30%)",
          "radial-gradient(circle at 88% 18%, rgba(216, 180, 91, 0.10), transparent 28%)",
          "linear-gradient(180deg, #00180B 0%, #07140D 72%)",
        ].join(", "),

        "glass-highlight": [
          "linear-gradient(135deg, rgba(255,255,255,0.85), rgba(255,255,255,0.48))",
        ].join(", "),

        "forest-gradient": [
          "linear-gradient(135deg, #0B2E1C 0%, #3C674F 100%)",
        ].join(", "),

        "mint-gradient": [
          "linear-gradient(135deg, #BEEECF 0%, #C5ECD0 100%)",
        ].join(", "),

        "rice-field": [
          "linear-gradient(145deg, #E4EFDB 0%, #BFD5AE 45%, #6F965C 100%)",
        ].join(", "),
      },

      /**
       * ระยะห่างเพิ่มเติมตาม 8-point system
       */
      spacing: {
        4.5: "1.125rem",
        5.5: "1.375rem",
        7.5: "1.875rem",
        15: "3.75rem",
        18: "4.5rem",
        22: "5.5rem",
        26: "6.5rem",
        30: "7.5rem",
      },

      /**
       * ความกว้างสำหรับ Mobile App และ Landing Page
       */
      maxWidth: {
        mobile: "30rem",
        content: "75rem",
        dashboard: "90rem",
      },

      /**
       * Keyframes
       */
      keyframes: {
        "fade-in": {
          "0%": {
            opacity: "0",
          },
          "100%": {
            opacity: "1",
          },
        },

        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(24px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "fade-in-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "scale-in": {
          "0%": {
            opacity: "0",
            transform: "scale(0.96)",
          },
          "100%": {
            opacity: "1",
            transform: "scale(1)",
          },
        },

        float: {
          "0%, 100%": {
            transform: "translateY(0)",
          },
          "50%": {
            transform: "translateY(-10px)",
          },
        },

        "float-soft": {
          "0%, 100%": {
            transform: "translate3d(0, 0, 0)",
          },
          "50%": {
            transform: "translate3d(0, -6px, 0)",
          },
        },

        "ambient-glow": {
          "0%, 100%": {
            opacity: "0.45",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "0.75",
            transform: "scale(1.08)",
          },
        },

        "scan-line": {
          "0%": {
            opacity: "0",
            transform: "translateY(-20%)",
          },
          "15%": {
            opacity: "1",
          },
          "85%": {
            opacity: "1",
          },
          "100%": {
            opacity: "0",
            transform: "translateY(420%)",
          },
        },

        shimmer: {
          "0%": {
            backgroundPosition: "200% 0",
          },
          "100%": {
            backgroundPosition: "-200% 0",
          },
        },

        "pulse-soft": {
          "0%, 100%": {
            opacity: "0.55",
            transform: "scale(1)",
          },
          "50%": {
            opacity: "1",
            transform: "scale(1.04)",
          },
        },

        "progress-grow": {
          "0%": {
            transform: "scaleX(0)",
          },
          "100%": {
            transform: "scaleX(1)",
          },
        },

        "slide-in-bottom": {
          "0%": {
            opacity: "0",
            transform: "translateY(100%)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },

        "rotate-slow": {
          "0%": {
            transform: "rotate(0deg)",
          },
          "100%": {
            transform: "rotate(360deg)",
          },
        },
      },

      /**
       * Animation utilities
       */
      animation: {
        "fade-in":
          "fade-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",

        "fade-in-up":
          "fade-in-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",

        "fade-in-down":
          "fade-in-down 0.8s cubic-bezier(0.16, 1, 0.3, 1) both",

        "scale-in":
          "scale-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",

        float:
          "float 6s ease-in-out infinite",

        "float-soft":
          "float-soft 7s ease-in-out infinite",

        "ambient-glow":
          "ambient-glow 8s ease-in-out infinite",

        "scan-line":
          "scan-line 3.5s ease-in-out infinite",

        shimmer:
          "shimmer 2.4s linear infinite",

        "pulse-soft":
          "pulse-soft 5s ease-in-out infinite",

        "progress-grow":
          "progress-grow 1.1s cubic-bezier(0.16, 1, 0.3, 1) both",

        "slide-in-bottom":
          "slide-in-bottom 0.7s cubic-bezier(0.16, 1, 0.3, 1) both",

        "rotate-slow":
          "rotate-slow 18s linear infinite",
      },

      /**
       * Transition แบบนุ่ม
       */
      transitionTimingFunction: {
        premium: "cubic-bezier(0.16, 1, 0.3, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },

      transitionDuration: {
        600: "600ms",
        700: "700ms",
        800: "800ms",
        900: "900ms",
        1200: "1200ms",
      },

      /**
       * Safe area สำหรับ Mobile
       */
      padding: {
        "safe-top": "env(safe-area-inset-top)",
        "safe-right": "env(safe-area-inset-right)",
        "safe-bottom": "env(safe-area-inset-bottom)",
        "safe-left": "env(safe-area-inset-left)",
      },

      minHeight: {
        touch: "2.75rem",
        screen: "100dvh",
      },

      height: {
        touch: "2.75rem",
      },

      width: {
        touch: "2.75rem",
      },
    },
  },

  plugins: [],
} satisfies Config;

export default config;