import { CONTAINER, SectionHead } from "./shared";

const QUESTIONS = [
  "What happened?",
  "Who acted?",
  "Why was it decided?",
  "What proof exists?",
  "What changed?",
  "What was approved?",
  "What was blocked?",
  "How is it reviewed?",
];

export default function AuditabilityQuestions() {
  return (
    <section className="bg-[#0a0f1c] py-20">
      <div className={CONTAINER}>
        <SectionHead
          eyebrow="Why auditability matters"
          title="Unaudited AI is an unanswered question."
          lede={
            <>
              When agents act at machine speed, &ldquo;trust us&rdquo; isn&apos;t
              an answer for legal, security, or the board. Auditability lets your
              organization answer, with proof:
            </>
          }
        />

        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {QUESTIONS.map((q, i) => (
            <div
              key={q}
              className="flex flex-col gap-2 rounded-xl border border-white/10 bg-[#111827] p-5"
            >
              <span className="text-[10px] font-normal leading-4 tracking-wide text-[#20E7F2]/60 font-[family-name:var(--font-jetbrains)]">
                Q{i + 1}
              </span>
              <span className="text-sm font-semibold leading-5 text-slate-100">
                {q}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
