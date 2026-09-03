"use client";

import {
  ArrowLeft,
  LockKeyhole,
  LogIn,
  Sprout,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { createClient } from "@/lib/supabase/client";

const userLoginUrl = `${(
  process.env.NEXT_PUBLIC_MAIN_SITE_URL?.trim() ||
  "http://localhost:3000"
).replace(/\/+$/, "")}/login`;

function loginMessage(message: string): string {
  const value = message.toLowerCase();

  if (value.includes("email not confirmed")) return "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ";
  if (value.includes("invalid login credentials")) return "อีเมลหรือรหัสผ่านไม่ถูกต้อง";
  if (value.includes("rate limit")) return "เข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่";

  return "เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);

    try {
      const supabase = createClient();
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

      if (loginError) {
        setError(loginMessage(loginError.message));
        return;
      }

      if (
        data.user?.app_metadata?.role !==
        "admin"
      ) {
        const { error: signOutError } =
          await supabase.auth.signOut();

        if (signOutError) {
          console.error(
            "Unable to clear a non-admin session:",
            signOutError
          );
        }

        setError(
          "บัญชีนี้เป็นบัญชีผู้ใช้งานทั่วไป ไม่มีสิทธิ์เข้าสู่ระบบผู้ดูแล"
        );
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("เชื่อมต่อระบบเข้าสู่ระบบไม่ได้ กรุณาลองใหม่");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-[2rem] border border-white/10 bg-white/[0.05] p-7 shadow-floating backdrop-blur-xl sm:p-9">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rice-mint/90 text-rice-forest">
            <Sprout className="h-6 w-6" aria-hidden="true" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-rice-mint-light">Rice AI</p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-white">ระบบผู้ดูแล</h1>
          </div>
        </div>

        <p className="mt-6 text-sm leading-6 text-white/60">
          สำหรับบัญชีที่ได้รับสิทธิ์ผู้ดูแลระบบเท่านั้น
          บัญชีผู้ใช้งานทั่วไปไม่สามารถเข้าสู่หน้านี้ได้
        </p>

        <form className="mt-7 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-semibold text-white">
            อีเมล
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm outline-none transition focus:border-rice-mint/70 focus:ring-4 focus:ring-rice-mint/15"
              placeholder="name@example.com"
            />
          </label>

          <label className="block text-sm font-semibold text-white">
            รหัสผ่าน
            <span className="relative mt-2 block">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" aria-hidden="true" />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-white/[0.06] py-3 pl-11 pr-4 text-sm outline-none transition focus:border-rice-mint/70 focus:ring-4 focus:ring-rice-mint/15"
                placeholder="กรอกรหัสผ่าน"
              />
            </span>
          </label>

          {error && (
            <p role="alert" className="rounded-2xl border border-rose-300/25 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rice-mint px-5 py-3 text-sm font-bold text-rice-forest transition hover:bg-rice-mint-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            {pending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบผู้ดูแล"}
          </button>
        </form>

        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <a
            href={userLoginUrl}
            className="inline-flex items-center gap-2 text-xs font-semibold text-white/55 transition hover:text-rice-mint focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rice-mint"
          >
            <ArrowLeft
              className="h-4 w-4"
              aria-hidden="true"
            />
            ไปหน้าเข้าสู่ระบบผู้ใช้งาน
          </a>
        </div>
      </section>
    </main>
  );
}
