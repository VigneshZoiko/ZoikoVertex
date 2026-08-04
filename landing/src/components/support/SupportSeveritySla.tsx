import { CONTAINER, MONO, SectionHeadLeft } from "./shared";

type Row = {
  id: string;
  name: string;
  dot: string;
  definition: string;
  examples: string;
  /** Rendered as label + highlighted target, or a single target line. */
  response: { label?: string; value: string }[];
};

const ROWS: Row[] = [
  {
    id: "P1",
    name: "Critical",
    dot: "#F87171",
    definition: "Production-blocking issue with severe business impact.",
    examples:
      "Platform unavailable, critical integration outage, security incident, evidence integrity exception.",
    response: [
      { label: "Enterprise", value: "1 hour" },
      { label: "Standard", value: "4 business hrs" },
    ],
  },
  {
    id: "P2",
    name: "Major",
    dot: "#E8B768",
    definition: "High-impact issue with limited or no workaround.",
    examples:
      "Approval workflow blocked, publishing failure across channels, admin access issue.",
    response: [
      { label: "Enterprise", value: "4 business hrs" },
      { label: "Standard", value: "1 business day" },
    ],
  },
  {
    id: "P3",
    name: "Standard",
    dot: "#20E7F2",
    definition: "Routine product issue with a workaround available.",
    examples:
      "Configuration help, single workflow error, non-critical integration warning.",
    response: [{ value: "1–2 business days" }],
  },
  {
    id: "P4",
    name: "Question",
    dot: "#94A3B8",
    definition: "How-to, documentation, billing, or feature guidance.",
    examples: "How to configure approval stages or find audit evidence.",
    response: [{ value: "2–3 business days" }, { value: "or self-service" }],
  },
];

const HEADINGS = ["Severity", "Definition", "Examples", "Target response"];

export default function SupportSeveritySla() {
  return (
    <section className="bg-[#080d1a] py-20">
      <div className={CONTAINER}>
        <SectionHeadLeft
          eyebrow="Severity & SLA"
          title={
            <>
              Clear expectations, no
              <br className="hidden sm:block" /> overpromises.
            </>
          }
        />

        <div className="mt-10 overflow-x-auto rounded-2xl border border-white/10 bg-[#0b1120]">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/10">
                {HEADINGS.map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className={`px-6 py-4 text-[11px] font-normal uppercase leading-4 tracking-[0.14em] text-white/35 ${MONO}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-white/10 last:border-b-0"
                >
                  <th
                    scope="row"
                    className="border-r border-white/10 px-6 py-5 align-top"
                  >
                    <span
                      className={`flex items-center gap-2 text-xs font-bold text-slate-100 ${MONO}`}
                    >
                      <span
                        className="h-2 w-2 shrink-0 rounded-[2px]"
                        style={{ backgroundColor: r.dot }}
                        aria-hidden
                      />
                      {r.id} · {r.name}
                    </span>
                  </th>
                  <td className="border-r border-white/10 px-6 py-5 align-top text-xs font-normal leading-5 text-white/60">
                    {r.definition}
                  </td>
                  <td className="border-r border-white/10 px-6 py-5 align-top text-xs font-normal leading-5 text-white/60">
                    {r.examples}
                  </td>
                  <td className="px-6 py-5 align-top">
                    <span className={`flex flex-col gap-1 text-xs ${MONO}`}>
                      {r.response.map((x, i) => (
                        <span key={i} className="flex gap-1.5">
                          {x.label && (
                            <span className="text-white/45">{x.label}</span>
                          )}
                          <span className="text-[#20E7F2]">{x.value}</span>
                        </span>
                      ))}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
