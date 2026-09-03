"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sprout,
  UserRound,
} from "lucide-react";
import {
  useActionState,
  useState,
} from "react";

import {
  registerAction,
  type RegisterState,
} from "@/app/register/actions";

/*
 * ค่าเริ่มต้นต้องอยู่ใน Client Component
 * ห้าม export object นี้จากไฟล์ actions.ts
 * เพราะไฟล์ที่มี "use server" export ได้เฉพาะ async function
 */
const initialRegisterState: RegisterState = {
  status: "idle",
  message: "",
};

function FormMessage({
  state,
}: {
  state: RegisterState;
}) {
  if (
    state.status !== "error" ||
    !state.message
  ) {
    return null;
  }

  return (
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
    </div>
  );
}

function PasswordToggle({
  visible,
  onToggle,
  label,
}: {
  visible: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={visible}
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
      {visible ? (
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
  );
}

export default function RegisterForm() {
  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [state, formAction, pending] =
    useActionState(
      registerAction,
      initialRegisterState
    );

  /*
   * แสดงหน้าสำเร็จเมื่อ Supabase สมัครสมาชิกเรียบร้อย
   * และกำลังรอผู้ใช้ยืนยันอีเมล
   */
  if (state.status === "success") {
    return (
      <section
        aria-labelledby="register-success-title"
        className="
          rounded-[2rem]
          border border-rice-forest/10
          bg-white/90 p-6
          text-center shadow-floating
          backdrop-blur-xl
          sm:p-8
          dark:border-white/10
          dark:bg-white/[0.055]
        "
      >
        <span
          className="
            mx-auto flex h-16 w-16
            items-center justify-center
            rounded-full
            bg-rice-mint/60
            text-rice-natural
            dark:bg-rice-leaf/20
            dark:text-rice-mint
          "
        >
          <CheckCircle2
            aria-hidden="true"
            className="h-8 w-8"
          />
        </span>

        <h2
          id="register-success-title"
          className="
            mt-5 font-heading
            text-2xl font-semibold
            text-rice-dark
            dark:text-white
          "
        >
          ตรวจสอบอีเมลของคุณ
        </h2>

        <p
          aria-live="polite"
          className="
            mt-3 text-sm leading-7
            text-rice-muted
            dark:text-white/60
          "
        >
          {state.message}
        </p>

        <p
          className="
            mt-2 text-xs leading-6
            text-rice-muted/70
            dark:text-white/40
          "
        >
          หากไม่พบอีเมลในกล่องข้อความ
          กรุณาตรวจสอบโฟลเดอร์ Spam หรือ Junk Mail
        </p>

        <Link
          href="/login"
          className="
            group mt-7 inline-flex
            min-h-12 w-full
            items-center justify-center
            gap-2 rounded-full
            bg-rice-natural
            px-5 py-3
            text-sm font-semibold
            text-white shadow-primary
            transition-[transform,background-color]
            duration-300
            hover:-translate-y-0.5
            hover:bg-rice-forest
            active:translate-y-0
            active:scale-[0.98]
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-rice-leaf
            focus-visible:ring-offset-2
            dark:focus-visible:ring-offset-rice-dark
          "
        >
          ไปหน้าเข้าสู่ระบบ

          <ArrowRight
            aria-hidden="true"
            className="
              h-4 w-4
              transition-transform
              duration-300
              group-hover:translate-x-1
            "
          />
        </Link>
      </section>
    );
  }

  return (
    <form
      action={formAction}
      aria-labelledby="register-form-title"
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
      {/* Form header */}
      <div
        className="
          flex items-center gap-3
          border-b
          border-rice-forest/10
          pb-5
          dark:border-white/10
        "
      >
        <span
          className="
            flex h-11 w-11
            shrink-0 items-center
            justify-center rounded-2xl
            bg-rice-mint/60
            text-rice-forest
            dark:bg-rice-leaf/20
            dark:text-rice-mint
          "
        >
          <Sprout
            aria-hidden="true"
            className="h-5 w-5"
          />
        </span>

        <div>
          <h2
            id="register-form-title"
            className="
              font-heading
              text-lg font-semibold
              text-rice-dark
              dark:text-white
            "
          >
            สร้างบัญชี Rice AI
          </h2>

          <p
            className="
              mt-0.5 text-xs
              text-rice-muted
              dark:text-white/45
            "
          >
            เริ่มจัดการข้อมูลแปลงนาอย่างเป็นระบบ
          </p>
        </div>
      </div>

      <FormMessage state={state} />

      <div className="mt-6 space-y-5">
        {/* Full name */}
        <div>
          <label
            htmlFor="fullName"
            className="
              text-sm font-semibold
              text-rice-dark
              dark:text-white
            "
          >
            ชื่อและนามสกุล
          </label>

          <div className="relative mt-2">
            <UserRound
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
              id="fullName"
              name="fullName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              autoComplete="name"
              placeholder="เช่น สมชาย ใจดี"
              disabled={pending}
              className="
                min-h-12 w-full
                rounded-2xl border
                border-rice-forest/10
                bg-rice-background
                py-3 pl-12 pr-4
                text-sm text-rice-dark
                outline-none
                transition-[border-color,box-shadow,background-color]
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

        {/* Email */}
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
                transition-[border-color,box-shadow,background-color]
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

        {/* Password */}
        <div>
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
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="อย่างน้อย 8 ตัวอักษร"
              disabled={pending}
              aria-describedby="password-help"
              className="
                min-h-12 w-full
                rounded-2xl border
                border-rice-forest/10
                bg-rice-background
                py-3 pl-12 pr-12
                text-sm text-rice-dark
                outline-none
                transition-[border-color,box-shadow,background-color]
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

            <PasswordToggle
              visible={showPassword}
              onToggle={() =>
                setShowPassword(
                  (current) => !current
                )
              }
              label={
                showPassword
                  ? "ซ่อนรหัสผ่าน"
                  : "แสดงรหัสผ่าน"
              }
            />
          </div>

          <p
            id="password-help"
            className="
              mt-2 text-xs leading-5
              text-rice-muted/70
              dark:text-white/40
            "
          >
            ใช้อย่างน้อย 8 ตัวอักษร
            และไม่ควรใช้รหัสผ่านเดียวกับบริการอื่น
          </p>
        </div>

        {/* Confirm password */}
        <div>
          <label
            htmlFor="confirmPassword"
            className="
              text-sm font-semibold
              text-rice-dark
              dark:text-white
            "
          >
            ยืนยันรหัสผ่าน
          </label>

          <div className="relative mt-2">
            <ShieldCheck
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
              id="confirmPassword"
              name="confirmPassword"
              type={
                showConfirmPassword
                  ? "text"
                  : "password"
              }
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              placeholder="กรอกรหัสผ่านอีกครั้ง"
              disabled={pending}
              className="
                min-h-12 w-full
                rounded-2xl border
                border-rice-forest/10
                bg-rice-background
                py-3 pl-12 pr-12
                text-sm text-rice-dark
                outline-none
                transition-[border-color,box-shadow,background-color]
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

            <PasswordToggle
              visible={showConfirmPassword}
              onToggle={() =>
                setShowConfirmPassword(
                  (current) => !current
                )
              }
              label={
                showConfirmPassword
                  ? "ซ่อนรหัสผ่านยืนยัน"
                  : "แสดงรหัสผ่านยืนยัน"
              }
            />
          </div>
        </div>
      </div>

      {/* Terms */}
      <label
        className="
          mt-5 flex cursor-pointer
          items-start gap-3
          text-sm leading-6
          text-rice-muted
          dark:text-white/55
        "
      >
        <input
          name="acceptedTerms"
          type="checkbox"
          required
          disabled={pending}
          className="
            mt-1 h-4 w-4
            shrink-0 rounded
            border-rice-forest/20
            accent-rice-natural
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-rice-leaf
            focus-visible:ring-offset-2
            disabled:cursor-not-allowed
            disabled:opacity-60
          "
        />

        <span>
          ฉันยอมรับ{" "}
          <Link
            href="/terms"
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
            ข้อกำหนดการใช้งาน
          </Link>{" "}
          และ{" "}
          <Link
            href="/privacy"
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
            นโยบายความเป็นส่วนตัว
          </Link>
        </span>
      </label>

      {/* Submit */}
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
          dark:focus-visible:ring-offset-rice-dark
        "
      >
        {pending ? (
          <>
            <Loader2
              aria-hidden="true"
              className="h-4 w-4 animate-spin"
            />

            กำลังสร้างบัญชี...
          </>
        ) : (
          <>
            สมัครสมาชิก

            <ArrowRight
              aria-hidden="true"
              className="
                h-4 w-4
                transition-transform
                duration-300
                group-hover:translate-x-1
              "
            />
          </>
        )}
      </button>

      {/* Login link */}
      <p
        className="
          mt-6 text-center text-sm
          text-rice-muted
          dark:text-white/50
        "
      >
        มีบัญชีอยู่แล้ว?{" "}
        <Link
          href="/login"
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
          เข้าสู่ระบบ
        </Link>
      </p>
    </form>
  );
}