export default function WelcomeCard({ onSuggestion, theme }) {
  const isDark = theme === "dark";
  const chips = [
    "What is ZoikoVertex?",
    "Show pricing options",
    "How does the Three-Key Approval Protocol work?",
    "What is the Evidence Vault?",
    "I want a demo",
  ];

  return (
    <div
      className={`mx-auto mb-5 w-full max-w-sm rounded-2xl border p-4 ${
        isDark
          ? "border-[rgba(77,184,255,0.1)] bg-[rgba(13,31,58,0.7)]"
          : "border-[rgba(43,154,217,0.2)] bg-[rgba(43,154,217,0.05)]"
      }`}
      style={{ animation: "msgIn 0.3s ease both" }}
    >
      <p className="text-[0.62rem] font-black uppercase tracking-widest text-[#4db8ff] mb-3">
        Quick Start
      </p>
      <div className="flex flex-col gap-1.5">
        {chips.map((c, i) => (
          <button
            key={i}
            onClick={() => onSuggestion(c)}
            className={`w-full text-left rounded-xl border px-3 py-2 text-xs transition-all ${
              isDark
                ? "border-[rgba(77,184,255,0.11)] bg-[rgba(13,31,58,0.5)] text-[#7ac8f0] hover:border-[rgba(77,184,255,0.28)] hover:bg-[rgba(23,51,124,0.3)] hover:text-[#4db8ff]"
                : "border-[rgba(43,154,217,0.2)] bg-white text-[#1a5fa8] hover:border-[rgba(43,154,217,0.5)] hover:bg-[rgba(43,154,217,0.1)] hover:text-[#17337c]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
