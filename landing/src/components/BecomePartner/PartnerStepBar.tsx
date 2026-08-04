import { CONTAINER, STEPS } from "./shared";

export default function PartnerStepBar({ current }: { current: number }) {
  return (
    <div className="border-b border-white/5 bg-slate-700">
      <div className={`${CONTAINER} py-3.5`}>
        <ol className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {STEPS.map((s, i) => {
            const active = s.n === current;
            const done = s.n < current;
            return (
              <li key={s.n} className="flex flex-1 items-center gap-3">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl border text-xs font-bold font-[family-name:var(--font-jetbrains)] ${
                    active || done
                      ? "border-[#20E7F2] bg-[#20E7F2] text-slate-950"
                      : "border-white/10 bg-white/5 text-white/30"
                  }`}
                >
                  {s.n}
                </span>

                <span className="min-w-0">
                  <span
                    className={`block text-[9.6px] font-medium uppercase leading-none tracking-wide font-[family-name:var(--font-jetbrains)] ${
                      active ? "text-[#20E7F2]" : "text-white/30"
                    }`}
                  >
                    Step {s.n}
                  </span>
                  <span
                    className={`mt-1.5 block text-xs font-bold leading-3 font-[family-name:var(--font-bricolage)] ${
                      active ? "text-white/90" : "text-white/40"
                    }`}
                  >
                    {s.label}
                  </span>
                </span>

                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="ml-auto hidden h-px flex-1 bg-white/10 lg:block"
                  />
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
