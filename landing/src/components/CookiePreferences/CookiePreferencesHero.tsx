import { CONSENT_VERSION } from "./constants";
import ConsentActions from "./ConsentActions";
import { CONTAINER } from "./CookiePreferencesShared";

const META = [
  { label: "Last Updated", value: "[Date — TBC by legal]" },
  { label: "Consent version", value: `${CONSENT_VERSION} · [placeholder]` },
  { label: "Entity", value: "Zoiko Tech Inc. · Zoiko Group" },
];

export default function CookiePreferencesHero() {
  return (
    <section className="bg-[#080d1a]">
      <div className={`${CONTAINER} py-14 sm:py-16`}>
        <h1 className="text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.12] tracking-tight text-white font-[family-name:var(--font-bricolage)]">
          Cookie Preferences
        </h1>

        <p className="mt-5 max-w-[560px] text-[14px] font-light leading-[1.75] text-white/40">
          Control how ZoikoVertex uses cookies and similar technologies for
          essential site operation, analytics, personalization, marketing, and
          integrations. Your choices are saved and can be changed at any time.
        </p>

        <div className="mt-10 flex flex-col gap-y-2.5 border-t border-white/5 pt-5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-y-2">
          {META.map((m, i) => (
            <div key={m.label} className="flex flex-wrap items-center gap-2">
              <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-white/25 font-[family-name:var(--font-jetbrains)]">
                {m.label}
              </span>
              <span className="text-[11.5px] font-medium text-white/60 font-[family-name:var(--font-jetbrains)]">
                {m.value}
              </span>
              {i < META.length - 1 && (
                <span className="mx-4 hidden h-3.5 w-px bg-white/10 sm:inline-block" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-5 border-t border-white/5 pt-6">
          <ConsentActions theme="dark" />
        </div>
      </div>
    </section>
  );
}
