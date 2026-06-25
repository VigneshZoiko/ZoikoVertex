import { HiOutlineCheck, HiOutlineXMark } from "react-icons/hi2";

export const LANGS = [
  { code: "en", short: "EN", label: "English" },
  { code: "hi", short: "HI", label: "Hindi" },
  { code: "es", short: "ES", label: "Spanish" },
  { code: "fr", short: "FR", label: "French" },
  { code: "de", short: "DE", label: "German" },
];

export default function LangPanel({ current, onChange, onClose, theme }) {
  const isDark = theme === "dark";

  return (
    <div
      className={`absolute right-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border shadow-2xl ${
        isDark
          ? "border-[rgba(43,154,217,0.16)] bg-[rgba(10,22,40,0.98)]"
          : "border-[rgba(43,154,217,0.24)] bg-white"
      }`}
      style={{ animation: "panelIn 0.17s ease both" }}
    >
      <div
        className={`flex items-center justify-between border-b px-4 py-3 ${
          isDark
            ? "border-[rgba(255,255,255,0.05)]"
            : "border-[rgba(31,154,70,0.12)]"
        }`}
      >
        <span className="text-[0.65rem] font-black uppercase tracking-widest text-[#4db8ff]">
          Language
        </span>
        <button
          onClick={onClose}
          className={`orbit-icon-button h-7 w-7 rounded-[10px] flex items-center justify-center border transition-all ${
            isDark
              ? "border-[rgba(255,255,255,0.07)] text-[#7ac8f0] hover:border-[rgba(77,184,255,0.4)] hover:bg-[rgba(23,51,124,0.3)]"
              : "border-[rgba(43,154,217,0.2)] text-[#1a5fa8] hover:border-[rgba(43,154,217,0.45)] hover:bg-[rgba(43,154,217,0.1)]"
          }`}
        >
          <HiOutlineXMark className="h-4 w-4 hover:text-red-500" />
        </button>
      </div>
      <div className="p-2">
        {LANGS.map((language) => (
          <button
            key={language.code}
            onClick={() => {
              onChange(language.code);
              onClose();
            }}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
              isDark
                ? "text-[#a8c8e8] hover:bg-[rgba(43,154,217,0.06)] hover:text-[#d8eeff]"
                : "text-[#1a5fa8] hover:bg-[rgba(43,154,217,0.08)] hover:text-[#17337c]"
            }`}
          >
            <span
              className={`rounded-md px-2 py-1 text-[0.68rem] font-black tracking-wide ${
                isDark
                  ? "bg-[rgba(43,154,217,0.12)] text-[#8ccdff]"
                  : "bg-[rgba(43,154,217,0.14)] text-[#1a5fa8]"
              }`}
            >
              {language.short}
            </span>
            <span>{language.label}</span>
            {current === language.code ? (
              <HiOutlineCheck className="ml-auto h-3.5 w-3.5 text-[#4db8ff]" />
            ) : null}
          </button>
        ))}
      </div>
    </div>
  );
}
