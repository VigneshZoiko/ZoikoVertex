export default function TrustedBy() {
  const logos = [
    "Meridian Commerce",
    "Orbis Financial",
    "TerraScale Retail",
    "Apex Logistics",
    "Northgate FinTech",
    "VantaHealth",
  ];

  return (
    <section className="bg-[#0f1b2e] py-7 border-y border-white/5">
      <div className="max-w-6xl mx-auto px-6 flex items-center gap-8 flex-wrap">
        <span className="text-white/30 text-[10px] font-semibold tracking-[0.15em] uppercase whitespace-nowrap flex-shrink-0">
          Trusted by enterprise leaders
        </span>
        <div className="flex-1 h-px bg-white/5 hidden md:block" />
        <div className="flex items-center gap-8 flex-wrap">
          {logos.map((logo) => (
            <span
              key={logo}
              className="text-white/20 text-sm font-bold tracking-tight whitespace-nowrap hover:text-white/35 transition-colors"
            >
              {logo}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
