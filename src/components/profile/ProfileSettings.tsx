"use client";

import {
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MapPinned,
  Phone,
  Save,
  Sprout,
  UserRound,
} from "lucide-react";
import { useActionState } from "react";

import {
  changePasswordAction,
  type ProfileActionState,
  updateProfileAction,
} from "@/app/profile/actions";

const initialState: ProfileActionState = {
  status: "idle",
  message: "",
};

interface ProfileSettingsProps {
  fullName: string;
  email: string;
  phone: string;
  province: string;
  district: string;
  farmName: string;
}

const inputClassName =
  "mt-2 min-h-12 w-full rounded-2xl border border-rice-forest/10 bg-rice-background px-4 py-3 text-sm text-rice-dark outline-none transition focus:border-rice-leaf/50 focus:ring-4 focus:ring-rice-mint/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/[0.055] dark:text-white dark:placeholder:text-white/25";

function StatusNotice({ state }: { state: ProfileActionState }) {
  if (state.status === "idle" || !state.message) {
    return null;
  }

  return (
    <div
      role={state.status === "error" ? "alert" : "status"}
      className={`mt-5 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm leading-6 ${
        state.status === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
          : "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-400/20 dark:bg-rose-400/10 dark:text-rose-200"
      }`}
    >
      {state.status === "success" && (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      )}
      <span>{state.message}</span>
    </div>
  );
}

export default function ProfileSettings({
  fullName,
  email,
  phone,
  province,
  district,
  farmName,
}: ProfileSettingsProps) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateProfileAction,
    initialState
  );
  const [passwordState, passwordAction, passwordPending] = useActionState(
    changePasswordAction,
    initialState
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
      <form
        id="personal-info"
        action={profileAction}
        className="scroll-mt-24 rounded-[1.75rem] border border-rice-forest/10 bg-white/85 p-5 shadow-card backdrop-blur sm:rounded-[2rem] sm:p-7 dark:border-white/10 dark:bg-white/[0.045]"
      >
        <div className="flex items-start gap-3 border-b border-rice-forest/10 pb-5 dark:border-white/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-mint/60 text-rice-forest dark:bg-rice-leaf/20 dark:text-rice-mint-light">
            <UserRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">
              ข้อมูลส่วนตัว
            </h2>
            <p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/45">
              ข้อมูลนี้ใช้แสดงในระบบและช่วยปรับคำแนะนำให้เหมาะกับพื้นที่
            </p>
          </div>
        </div>

        <StatusNotice state={profileState} />

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="text-sm font-semibold text-rice-dark sm:col-span-2 dark:text-white">
            ชื่อที่แสดง
            <span className="relative block">
              <UserRound className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-rice-muted/55" />
              <input
                name="fullName"
                defaultValue={fullName}
                required
                maxLength={100}
                disabled={profilePending}
                className={`${inputClassName} pl-11`}
                placeholder="ชื่อ–นามสกุล"
              />
            </span>
          </label>

          <label className="text-sm font-semibold text-rice-dark sm:col-span-2 dark:text-white">
            อีเมล
            <input
              value={email}
              readOnly
              aria-readonly="true"
              className={`${inputClassName} cursor-not-allowed opacity-65`}
            />
            <span className="mt-1.5 block text-xs font-normal text-rice-muted dark:text-white/40">
              อีเมลเป็นข้อมูลสำหรับเข้าสู่ระบบ จึงแก้ไขจากหน้านี้ไม่ได้
            </span>
          </label>

          <label className="text-sm font-semibold text-rice-dark dark:text-white">
            หมายเลขโทรศัพท์
            <span className="relative block">
              <Phone className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-rice-muted/55" />
              <input
                name="phone"
                type="tel"
                inputMode="tel"
                defaultValue={phone}
                maxLength={20}
                disabled={profilePending}
                className={`${inputClassName} pl-11`}
                placeholder="08x-xxx-xxxx"
              />
            </span>
          </label>

          <label className="text-sm font-semibold text-rice-dark dark:text-white">
            ชื่อฟาร์มหรือแปลงหลัก
            <span className="relative block">
              <Sprout className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-rice-muted/55" />
              <input
                name="farmName"
                defaultValue={farmName}
                maxLength={120}
                disabled={profilePending}
                className={`${inputClassName} pl-11`}
                placeholder="เช่น ฟาร์มข้าวบ้านหนอง"
              />
            </span>
          </label>

          <label className="text-sm font-semibold text-rice-dark dark:text-white">
            จังหวัด
            <span className="relative block">
              <MapPinned className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-rice-muted/55" />
              <input
                name="province"
                defaultValue={province}
                maxLength={100}
                disabled={profilePending}
                className={`${inputClassName} pl-11`}
                placeholder="จังหวัด"
              />
            </span>
          </label>

          <label className="text-sm font-semibold text-rice-dark dark:text-white">
            อำเภอ/เขต
            <input
              name="district"
              defaultValue={district}
              maxLength={100}
              disabled={profilePending}
              className={inputClassName}
              placeholder="อำเภอหรือเขต"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-stretch sm:justify-end">
          <button
            type="submit"
            disabled={profilePending}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-rice-natural px-5 py-2.5 text-sm font-bold text-white shadow-primary transition hover:-translate-y-0.5 hover:bg-rice-forest disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto"
          >
            {profilePending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {profilePending ? "กำลังบันทึก..." : "บันทึกโปรไฟล์"}
          </button>
        </div>
      </form>

      <form
        id="security"
        action={passwordAction}
        className="h-fit scroll-mt-24 rounded-[1.75rem] border border-rice-forest/10 bg-white/85 p-5 shadow-card backdrop-blur sm:rounded-[2rem] sm:p-7 dark:border-white/10 dark:bg-white/[0.045]"
      >
        <div className="flex items-start gap-3 border-b border-rice-forest/10 pb-5 dark:border-white/10">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rice-gold/20 text-amber-700 dark:bg-rice-gold/10 dark:text-rice-gold">
            <KeyRound className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="font-heading text-lg font-bold text-rice-forest dark:text-white">
              ความปลอดภัย
            </h2>
            <p className="mt-1 text-xs leading-5 text-rice-muted dark:text-white/45">
              ยืนยันรหัสผ่านปัจจุบันก่อนตั้งรหัสผ่านใหม่
            </p>
          </div>
        </div>

        <StatusNotice state={passwordState} />

        <div className="mt-6 space-y-5">
          {[
            {
              name: "currentPassword",
              label: "รหัสผ่านปัจจุบัน",
              autoComplete: "current-password",
            },
            {
              name: "newPassword",
              label: "รหัสผ่านใหม่",
              autoComplete: "new-password",
            },
            {
              name: "confirmPassword",
              label: "ยืนยันรหัสผ่านใหม่",
              autoComplete: "new-password",
            },
          ].map((field) => (
            <label
              key={field.name}
              className="block text-sm font-semibold text-rice-dark dark:text-white"
            >
              {field.label}
              <span className="relative block">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 mt-1 h-4 w-4 -translate-y-1/2 text-rice-muted/55" />
                <input
                  name={field.name}
                  type="password"
                  autoComplete={field.autoComplete}
                  required
                  minLength={field.name === "currentPassword" ? undefined : 8}
                  maxLength={72}
                  disabled={passwordPending}
                  className={`${inputClassName} pl-11`}
                  placeholder={field.name === "currentPassword" ? "รหัสผ่านเดิม" : "อย่างน้อย 8 ตัวอักษร"}
                />
              </span>
            </label>
          ))}
        </div>

        <button
          type="submit"
          disabled={passwordPending}
          className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-rice-forest/15 bg-rice-forest px-5 py-2.5 text-sm font-bold text-white transition hover:bg-rice-dark disabled:cursor-not-allowed disabled:opacity-60 dark:border-rice-mint-light/20 dark:bg-rice-mint-light dark:text-rice-dark"
        >
          {passwordPending ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <KeyRound className="h-4 w-4" />
          )}
          {passwordPending ? "กำลังเปลี่ยนรหัสผ่าน..." : "เปลี่ยนรหัสผ่าน"}
        </button>
      </form>
    </div>
  );
}
