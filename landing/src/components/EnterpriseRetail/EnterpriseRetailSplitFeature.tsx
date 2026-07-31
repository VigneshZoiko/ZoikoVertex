"use client";

import Image from "next/image";

type Props = {
  eyebrow: string;
  heading: string;
  body: string;
  chips: string[];
  image: string;
  /** Which side the photo sits on at lg and up. */
  imageSide: "left" | "right";
  /** Section background. */
  bg: string;
  /** Desktop section height, taken from the Figma frame. */
  minHeight: string;
};

/**
 * Shared layout for the three alternating photo/copy bands on the
 * Enterprise Retail page (AI agents, omnichannel, evidence).
 */
export default function EnterpriseRetailSplitFeature({
  eyebrow,
  heading,
  body,
  chips,
  image,
  imageSide,
  bg,
  minHeight,
}: Props) {
  return (
    <section className={`grid lg:grid-cols-2 ${bg} ${minHeight}`}>
      <div
        className={`relative min-h-[280px] lg:min-h-full overflow-hidden ${
          imageSide === "left" ? "order-first" : "order-first lg:order-last"
        }`}
      >
        <Image
          src={image}
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover saturate-[0.2]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080d1a]/5 to-[#080d1a]/30" />
      </div>

      <div className="px-6 lg:px-[72px] py-20 lg:py-24 flex flex-col justify-center">
        <div className="inline-flex items-center gap-2.5 mb-6">
          <span className="w-3.5 h-px bg-[#20E7F2]" />
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
            {eyebrow}
          </span>
        </div>

        <h2 className="max-w-[420px] text-[clamp(1.9rem,3.6vw,2.5rem)] font-extrabold leading-[1.15] text-white/90 font-[family-name:var(--font-bricolage)]">
          {heading}
        </h2>

        <p className="mt-7 max-w-[440px] text-base font-light leading-7 text-white/50 font-[family-name:var(--font-jakarta)]">
          {body}
        </p>

        <div className="mt-9 flex flex-wrap gap-2.5">
          {chips.map((c) => (
            <span
              key={c}
              className="rounded-full border border-[#20E7F2]/30 bg-[#20E7F2]/10 px-3 py-1.5 text-[10.1px] font-medium text-[#20E7F2] font-[family-name:var(--font-jetbrains)]"
            >
              {c}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
