"use client";

import { Lightbulb, MessageCircle, Sparkles, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export default function DashboardMascotInsight({
  dashboardName,
  summary,
  recommendation,
}: {
  dashboardName: string;
  summary: string;
  recommendation: string;
}) {
  const [open, setOpen] = useState(true);

  return (
    <aside
      hidden
      data-replaced-by="global-rice-assistant"
      data-print-hidden="true"
      aria-label={`มาสคอตผู้ช่วยสรุป${dashboardName}`}
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[70] flex justify-end sm:inset-x-auto sm:bottom-5 sm:right-0 lg:bottom-7 lg:right-0"
    >
      <div className="flex w-full max-w-full flex-col items-end gap-3 sm:w-auto sm:flex-row sm:items-end sm:gap-5 lg:gap-6">
        {open ? (
          <div
            key={`${dashboardName}-${summary}-${recommendation}`}
            className="dashboard-mascot-speech pointer-events-auto relative w-full sm:mb-7 sm:w-[430px]"
          >
            <span
              aria-hidden="true"
              className="absolute -bottom-2 right-14 h-5 w-5 rotate-45 bg-white shadow-[8px_8px_14px_rgba(18,61,40,0.08)] sm:-right-2 sm:bottom-12"
            />
            <div
              role="status"
              aria-live="polite"
              className="relative z-10 max-h-[min(58vh,430px)] overflow-y-auto rounded-[1.6rem] bg-white p-4 text-[#244a35] shadow-[0_24px_65px_rgba(18,61,40,0.26)] sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#9A6D08]">
                    <Sparkles aria-hidden="true" className="h-4 w-4" />
                    ผู้ช่วยวิเคราะห์ข้อมูล
                  </p>
                  <h2 className="mt-1 text-base font-bold leading-6 sm:text-lg">
                    สรุป{dashboardName}
                  </h2>
                </div>
                <button
                  type="button"
                  aria-label="ปิดคำพูดของมาสคอต"
                  onClick={() => setOpen(false)}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#eef5e8] text-[#315d42] transition hover:bg-[#dfeccf] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#237A57]"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-[#315d42] sm:text-[15px]">
                {summary}
              </p>

              <div className="mt-3 rounded-2xl bg-[#fff4c9] px-3.5 py-3 shadow-[0_8px_20px_rgba(132,98,13,0.10)]">
                <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#8A6408]">
                  <Lightbulb aria-hidden="true" className="h-4 w-4" />
                  แนะนำว่าควรทำอย่างไร
                </p>
                <p className="mt-1.5 text-xs leading-5 text-[#4c4a2f] sm:text-sm sm:leading-6">
                  {recommendation}
                </p>
              </div>

            </div>
          </div>
        ) : null}

        <div className="dashboard-mascot-character pointer-events-auto relative -mr-3 h-36 w-32 shrink-0 sm:-mr-2 sm:h-48 sm:w-40 lg:-mr-1">
          <button
            type="button"
            aria-label={open ? "ซ่อนคำสรุปแดชบอร์ด" : "เปิดคำสรุปแดชบอร์ด"}
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
            className="group relative h-full w-full origin-bottom transition-transform duration-300 hover:scale-105 focus-visible:rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F1C75B]"
          >
            <Image
              src="/images/14.png"
              alt="มาสคอตผู้ช่วยวิเคราะห์ข้อมูลข้าว"
              fill
              sizes="(max-width: 639px) 128px, 160px"
              className="object-contain object-bottom drop-shadow-[0_16px_18px_rgba(15,53,35,0.28)]"
            />
            {!open ? (
              <span className="dashboard-mascot-nudge absolute -left-20 top-3 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#174f3a] px-3 py-2 text-xs font-bold text-white shadow-[0_10px_28px_rgba(18,61,40,0.28)]">
                <MessageCircle aria-hidden="true" className="h-4 w-4 text-[#F1C75B]" />
                ดูคำสรุป
              </span>
            ) : null}
          </button>
        </div>
      </div>
    </aside>
  );
}
