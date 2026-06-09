import Link from "next/link";

export default function FooterCTA() {
  return (
    <section
      className="py-28 px-6 text-center"
      style={{ background: "linear-gradient(160deg,#0d1a35 0%,#080d1a 100%)" }}
    >
      <div className="max-w-3xl mx-auto">
        <p className="text-cyan-400 text-xs font-bold tracking-widest uppercase mb-6">
          — Ready to Deploy
        </p>
        <h2 className="text-4xl lg:text-6xl font-black text-white leading-tight mb-6">
          Marketing should operate
          <br />
          as measurable infrastructure
        </h2>
        <p className="text-white/50 text-sm max-w-xl mx-auto leading-relaxed mb-10">
          ZoikoVertex improves efficiency by over 35%. It pays for itself
          multiple times over. Non-adoption is financially irrational in
          performance-sensitive organisations.
        </p>
        <div className="flex flex-wrap gap-4 justify-center mb-6">
          <Link
            href="https://getzoikovertex.com/signup"
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-bold px-8 py-3.5 rounded-xl transition-all text-sm flex items-center gap-2"
          >
            Deploy DMOS Environment →
          </Link>
          <Link
            href="https://getzoikovertex.com/signup"
            className="border border-white/20 hover:border-white/40 text-white font-semibold px-8 py-3.5 rounded-xl transition-all hover:bg-white/5 text-sm"
          >
            Request Enterprise Demo
          </Link>
        </div>
        <p className="text-white/20 text-xs">
          Deploy in 72 hours. No code required. Powered by governed agents.
        </p>
      </div>
    </section>
  );
}
