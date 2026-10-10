"use client";

import Link from "next/link";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  useActionState,
  useState,
} from "react";

import {
  loginAction,
  type LoginState,
} from "@/app/login/actions";
import AuthBrandMark from "@/components/auth/AuthBrandMark";

const initialLoginState: LoginState = {
  status: "idle",
  message: "",
};

const adminLoginUrl = `${(
  process.env.NEXT_PUBLIC_ADMIN_PORTAL_URL?.trim() ||
  "http://localhost:3001"
).replace(/\/+$/, "")}/login`;

export interface LoginFormProps {
  nextPath?: string;
  confirmationSuccess?: boolean;
  confirmationError?: boolean;
}

export default function LoginForm({
  nextPath = "/",
  confirmationSuccess = false,
  confirmationError = false,
}: LoginFormProps) {
  const [showPassword, setShowPassword] =
    useState(false);

  const [state, formAction, pending] =
    useActionState(
      loginAction,
      initialLoginState
    );

  return (
    <form
      action={formAction}
      aria-labelledby="login-form-title"
      className="
        rounded-[2rem]
        border border-rice-forest/10
        bg-white/90 p-5
        shadow-floating
        backdrop-blur-xl
        sm:p-8
        dark:border-white/10
        dark:bg-white/[0.055]
      "
    >
      <input
        type="hidden"
        name="next"
        value={nextPath}
      />

      <div
        className="
          flex items-center gap-3
          border-b
          border-rice-forest/10
          pb-5
          dark:border-white/10
        "
      >
        <AuthBrandMark />

        <div>
          <h1
            id="login-form-title"
            className="
              font-heading
              text-lg font-semibold
              text-rice-dark
              dark:text-white
            "
          >
            เข้าสู่ระบบผู้ใช้งาน
          </h1>

          <p
            className="
              mt-0.5 text-xs
              text-rice-muted
              dark:text-white/45
            "
          >
            สำหรับเกษตรกรและผู้ใช้งาน Rice AI
          </p>
        </div>
      </div>

      {confirmationSuccess && (
        <div
          role="status"
          className="
            mt-5 rounded-2xl
            border border-green-200
            bg-green-50 px-4 py-3
            text-sm leading-6
            text-green-700
            dark:border-green-500/20
            dark:bg-green-500/10
            dark:text-green-300
          "
        >
          ยืนยันอีเมลสำเร็จแล้ว
          คุณสามารถเข้าสู่ระบบได้ทันที
        </div>
      )}

      {confirmationError && (
        <div
          role="alert"
          className="
            mt-5 rounded-2xl
            border border-red-200
            bg-red-50 px-4 py-3
            text-sm leading-6
            text-red-700
            dark:border-red-500/20
            dark:bg-red-500/10
            dark:text-red-300
          "
        >
          ยืนยันอีเมลไม่สำเร็จ
          ลิงก์อาจหมดอายุหรือถูกใช้งานแล้ว
        </div>
      )}

      {state.status === "error" &&
        state.message && (
          <div
            role="alert"
            aria-live="polite"
            className="
              mt-5 rounded-2xl
              border border-red-200
              bg-red-50 px-4 py-3
              text-sm leading-6
              text-red-700
              dark:border-red-500/20
              dark:bg-red-500/10
              dark:text-red-300
            "
          >
            {state.message}

            {state.errorCode ===
              "ADMIN_ACCOUNT" && (
              <a
                href={adminLoginUrl}
                className="ml-1 font-semibold underline underline-offset-4"
              >
                ไปหน้าเข้าสู่ระบบผู้ดูแล
              </a>
            )}
          </div>
        )}

      <div className="mt-6 space-y-5">
        <div>
          <label
            htmlFor="email"
            className="
              text-sm font-semibold
              text-rice-dark
              dark:text-white
            "
          >
            อีเมล
          </label>

          <div className="relative mt-2">
            <Mail
              aria-hidden="true"
              className="
                pointer-events-none
                absolute left-4 top-1/2
                h-5 w-5
                -translate-y-1/2
                text-rice-muted/50
                dark:text-white/30
              "
            />

            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="name@example.com"
              disabled={pending}
              className="
                min-h-12 w-full
                rounded-2xl border
                border-rice-forest/10
                bg-rice-background
                py-3 pl-12 pr-4
                text-sm text-rice-dark
                outline-none
                transition-[border-color,box-shadow]
                placeholder:text-rice-muted/40
                focus:border-rice-leaf/50
                focus:ring-4
                focus:ring-rice-mint/30
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-white/10
                dark:bg-white/[0.055]
                dark:text-white
                dark:placeholder:text-white/25
              "
            />
          </div>
        </div>

        <div>
          <div
            className="
              flex items-center
              justify-between gap-4
            "
          >
            <label
              htmlFor="password"
              className="
                text-sm font-semibold
                text-rice-dark
                dark:text-white
              "
            >
              รหัสผ่าน
            </label>

            <Link
              href="/forgot-password"
              className="
                text-xs font-semibold
                text-rice-natural
                hover:underline
                focus-visible:rounded
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rice-leaf
                dark:text-rice-mint
              "
            >
              ลืมรหัสผ่าน?
            </Link>
          </div>

          <div className="relative mt-2">
            <LockKeyhole
              aria-hidden="true"
              className="
                pointer-events-none
                absolute left-4 top-1/2
                h-5 w-5
                -translate-y-1/2
                text-rice-muted/50
                dark:text-white/30
              "
            />

            <input
              id="password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              required
              autoComplete="current-password"
              placeholder="กรอกรหัสผ่าน"
              disabled={pending}
              className="
                min-h-12 w-full
                rounded-2xl border
                border-rice-forest/10
                bg-rice-background
                py-3 pl-12 pr-12
                text-sm text-rice-dark
                outline-none
                transition-[border-color,box-shadow]
                placeholder:text-rice-muted/40
                focus:border-rice-leaf/50
                focus:ring-4
                focus:ring-rice-mint/30
                disabled:cursor-not-allowed
                disabled:opacity-60
                dark:border-white/10
                dark:bg-white/[0.055]
                dark:text-white
                dark:placeholder:text-white/25
              "
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              aria-label={
                showPassword
                  ? "ซ่อนรหัสผ่าน"
                  : "แสดงรหัสผ่าน"
              }
              aria-pressed={showPassword}
              className="
                absolute right-3 top-1/2
                inline-flex h-9 w-9
                -translate-y-1/2
                items-center justify-center
                rounded-xl
                text-rice-muted
                transition-colors
                hover:bg-rice-mint/40
                hover:text-rice-forest
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-rice-leaf
                dark:text-white/50
                dark:hover:bg-white/10
                dark:hover:text-white
              "
            >
              {showPassword ? (
                <EyeOff
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              ) : (
                <Eye
                  aria-hidden="true"
                  className="h-4 w-4"
                />
              )}
            </button>
          </div>
        </div>
      </div>

      <button
        type="submit"
        disabled={pending}
        aria-disabled={pending}
        className="
          group mt-6 inline-flex
          min-h-12 w-full
          items-center justify-center
          gap-2 rounded-full
          bg-rice-natural
          px-5 py-3
          text-sm font-semibold
          text-white shadow-primary
          transition-[transform,background-color,opacity]
          duration-300
          hover:-translate-y-0.5
          hover:bg-rice-forest
          active:translate-y-0
          active:scale-[0.98]
          disabled:cursor-not-allowed
          disabled:opacity-60
          disabled:hover:translate-y-0
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-rice-leaf
          focus-visible:ring-offset-2
        "
      >
        {pending ? (
          <>
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />

            กำลังเข้าสู่ระบบ...
          </>
        ) : (
          <>
            <LogIn
              aria-hidden="true"
              className="h-4 w-4"
            />

            เข้าสู่ระบบผู้ใช้งาน

            <ArrowRight
              aria-hidden="true"
              className="
                h-4 w-4
                transition-transform
                group-hover:translate-x-1
              "
            />
          </>
        )}
      </button>

      <p
        className="
          mt-6 text-center text-sm
          text-rice-muted
          dark:text-white/50
        "
      >
        ยังไม่มีบัญชี?{" "}
        <Link
          href="/register"
          className="
            font-semibold
            text-rice-natural
            hover:underline
            focus-visible:rounded
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-rice-leaf
            dark:text-rice-mint
          "
        >
          สมัครสมาชิก
        </Link>
      </p>

      <div
        className="
          mt-5 border-t
          border-rice-forest/10 pt-5
          text-center
          dark:border-white/10
        "
      >
        <a
          href={adminLoginUrl}
          className="
            inline-flex items-center gap-2
            text-xs font-semibold
            text-rice-muted
            transition-colors
            hover:text-rice-natural
            focus-visible:rounded
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-rice-leaf
            dark:text-white/45
            dark:hover:text-rice-mint
          "
        >
          <ShieldCheck
            aria-hidden="true"
            className="h-4 w-4"
          />

          สำหรับผู้ดูแลระบบ
        </a>
      </div>
    </form>
  );
}
