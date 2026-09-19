"use client";

import {
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { useActionState } from "react";

import {
  forgotPasswordAction,
  type ForgotPasswordState,
} from "@/app/forgot-password/actions";

const initialState: ForgotPasswordState = {
  status: "idle",
  message: "",
};

export default function ForgotPasswordForm() {
  const [state, formAction, pending] =
    useActionState(
      forgotPasswordAction,
      initialState
    );

  return (
    <form
      action={formAction}
      className="mt-7 text-left"
    >
      <label
        htmlFor="forgot-password-email"
        className="text-sm font-semibold text-rice-dark dark:text-white"
      >
        อีเมลที่ใช้สมัครสมาชิก
      </label>

      <div className="relative mt-2">
        <Mail
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rice-muted dark:text-white/40"
        />
        <input
          id="forgot-password-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          disabled={pending}
          placeholder="name@example.com"
          className="h-12 w-full rounded-2xl border border-rice-forest/15 bg-white/80 pl-12 pr-4 text-sm text-rice-dark outline-none transition focus:border-rice-leaf focus:ring-4 focus:ring-rice-leaf/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/30"
        />
      </div>

      {state.message && (
        <div
          role={
            state.status === "error"
              ? "alert"
              : "status"
          }
          aria-live="polite"
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-6 ${
            state.status === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300"
              : "border-green-200 bg-green-50 text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <button
        type="submit"
        disabled={pending}
        className="primary-action mt-5 w-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? (
          <Loader2
            aria-hidden="true"
            className="h-4 w-4 animate-spin"
          />
        ) : (
          <Send
            aria-hidden="true"
            className="h-4 w-4"
          />
        )}
        {pending
          ? "กำลังส่งลิงก์..."
          : "ส่งลิงก์ตั้งรหัสผ่านใหม่"}
      </button>
    </form>
  );
}
