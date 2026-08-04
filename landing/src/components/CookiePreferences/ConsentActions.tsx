"use client";

import { Check, CircleCheck, CircleX } from "lucide-react";
import { useCookieConsent } from "./CookieConsentProvider";

/**
 * The three choices are given equal visual weight and identical placement in
 * both the hero and the controls section — accepting is never easier than
 * rejecting.
 */
export default function ConsentActions({ theme }: { theme: "dark" | "light" }) {
  const { save, acceptAll, rejectNonEssential } = useCookieConsent();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-[13.5px] font-bold transition-colors";
  const outline =
    theme === "dark"
      ? "border border-white/20 text-white/60 hover:border-white/40 hover:text-white/90"
      : "border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900";

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
      <button
        type="button"
        onClick={save}
        className={`${base} bg-[#20E7F2] text-[#080d1a] hover:bg-[#20E7F2]/90`}
      >
        <Check className="h-[14px] w-[14px]" strokeWidth={3} />
        Save Preferences
      </button>
      <button
        type="button"
        onClick={acceptAll}
        className={`${base} bg-green-500 text-white hover:bg-green-500/90`}
      >
        <CircleCheck className="h-[14px] w-[14px]" strokeWidth={2.5} />
        Accept All
      </button>
      <button
        type="button"
        onClick={rejectNonEssential}
        className={`${base} font-normal ${outline}`}
      >
        <CircleX className="h-[14px] w-[14px]" strokeWidth={2.5} />
        Reject Non-Essential
      </button>
    </div>
  );
}
