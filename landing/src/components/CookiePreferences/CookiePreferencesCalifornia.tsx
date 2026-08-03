import Link from "next/link";
import { Bullets, Callout, Lede, SectionHeader } from "./CookiePreferencesShared";

const BULLETS = [
  "No account is required to exercise relevant opt-out choices.",
  "Opt-out choices are honored for marketing and cross-context advertising technologies.",
  "ZoikoVertex's website should not collect sensitive personal information through cookies. If introduced, a separate control will be added.",
  "Opt-out will not affect your access to the ZoikoVertex website or any features available to non-registered visitors.",
];

export default function CookiePreferencesCalifornia() {
  return (
    <section>
      <SectionHeader
        id="california-controls"
        num={3}
        title="California & US State Privacy Controls"
        badge={{ label: "Opt-out", tone: "amber" }}
      />

      <Lede>
        If you are a California resident or resident of another US state with
        applicable privacy rights, you may have the right to opt out of the sale
        or sharing of your personal information for cross-context behavioral
        advertising.
      </Lede>

      <Callout tone="cyan" lead="Do Not Sell or Share My Personal Information.">
        If ZoikoVertex engages in practices that constitute &ldquo;selling&rdquo;
        or &ldquo;sharing&rdquo; personal information under California law (for
        example, through marketing or advertising cookies involving
        cross-context behavioral advertising), you may exercise an opt-out.
        Turning off the Marketing cookies category above applies this opt-out
        where applicable. Dedicated controls will be confirmed before production
        launch. [Legal and engineering review required before publication.]
      </Callout>

      <p className="mt-6 text-[15px] font-light leading-[1.85] text-slate-700">
        ZoikoVertex also commits to honoring the{" "}
        <span className="font-semibold text-slate-900">
          Global Privacy Control (GPC)
        </span>{" "}
        browser signal where legally required or commercially prudent. If your
        browser is sending a GPC signal, ZoikoVertex should treat this as a
        request to opt out of sale or sharing for targeted advertising where
        applicable. The status of your browser signal is shown in the page
        header.
      </p>

      <Bullets items={BULLETS} />

      <p className="mt-7 text-[15px] font-light leading-[1.85] text-slate-700">
        For full California, Colorado, Virginia, and other US state privacy
        rights — including access, correction, deletion, and portability — see
        the{" "}
        <Link
          href="/privacy#ccpa"
          className="border-b border-[#20E7F2]/40 text-[#0d8d9a] transition-colors hover:border-[#20E7F2] hover:text-[#20E7F2]"
        >
          Privacy Policy
        </Link>{" "}
        Section 13.
      </p>
    </section>
  );
}
