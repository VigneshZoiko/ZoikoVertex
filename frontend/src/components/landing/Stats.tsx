export default function Stats() {
  const stats = [
    { value: "26%", label: "Average CPA reduction" },
    { value: "72h", label: "Time to first insight" },
    { value: "3.7×", label: "Campaign ROI uplift" },
    { value: "30d", label: "Measurable ROI evidence" },
  ];

  return (
    <section
      className="py-24 px-6"
      style={{ background: "#f5f5f7" }}
      id="features"
    >
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 text-indigo-500 text-xs font-semibold tracking-widest uppercase mb-4">
            <span className="w-4 h-px bg-indigo-400" />
            Proof in practice
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-5">
            Numbers that move the board
          </h2>
          <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed text-center">
            Not abstract intelligence. Measurable performance movement, reduced
            waste, and improved capital efficiency — reportable to finance.
          </p>
        </div>
        <div className="flex divide-x" style={{ borderColor: "#E3E9F0" }}>
          {stats.map((s) => (
            <div key={s.label} className="flex-1 bg-white px-8 py-10">
              <p
                className="text-5xl font-black mb-2"
                style={{ color: "#4f46e5" }}
              >
                {s.value}
              </p>
              <p className="text-gray-500 text-sm leading-snug">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
