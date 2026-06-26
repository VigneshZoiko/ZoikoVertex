import { useState } from "react";
import { HiOutlineXMark } from "react-icons/hi2";

export default function EditModal({ lastUserMsg, onSubmit, onClose, theme }) {
  const [val, setVal] = useState(lastUserMsg || "");
  const isDark = theme === "dark";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(2,7,12,0.78)] backdrop-blur-sm"
      style={{ animation: "fadeIn 0.14s ease both" }}
    >
      <div
        className={`w-full max-w-md mx-4 rounded-2xl border p-5 shadow-2xl ${
          isDark
            ? "border-[rgba(77,184,255,0.16)] bg-[rgba(10,22,40,0.99)]"
            : "border-[rgba(43,154,217,0.3)] bg-white"
        }`}
        style={{ animation: "scaleIn 0.17s ease both" }}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-[0.65rem] font-black uppercase tracking-widest text-[#4db8ff]">
            Edit Message
          </span>
          <button onClick={onClose} className="orbit-icon-button h-8 w-8 rounded-[11px]">
            <HiOutlineXMark className="h-4 w-4 " />
          </button>
        </div>
        <textarea
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Edit your message…"
          rows={4}
          className={`w-full rounded-xl border px-4 py-3 text-sm placeholder-[#3e6372] outline-none resize-none transition-colors ${
            isDark
              ? "border-[rgba(43,154,217,0.4)] bg-[rgba(10,22,40,0.9)] text-[#c8dafc] focus:border-[rgba(77,184,255,0.4)]"
              : "border-[rgba(43,154,217,0.3)] bg-[#f0f5ff] text-[#103040] focus:border-[rgba(43,154,217,0.6)]"
          }`}
        />
        <div className="flex gap-2 mt-3 justify-end">
          <button
            onClick={onClose}
            className={`rounded-xl border px-4 py-2 text-xs transition-all ${
              isDark
                ? "border-[rgba(255,255,255,0.08)] text-[#5a7da0] hover:text-[#8ccdff]"
                : "border-[rgba(43,154,217,0.3)] text-[#5a7da0] hover:text-[#17337c]"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={() => { if (val.trim()) { onSubmit(val.trim()); onClose(); } }}
            className="rounded-xl bg-gradient-to-r from-[#2b9ad9] to-[#1a5fa8] px-5 py-2 text-xs font-black text-[#ffffff] transition-all hover:opacity-90 active:scale-95"
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
}