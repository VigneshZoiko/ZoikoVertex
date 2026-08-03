"use client";

import { useCookieConsent } from "./CookieConsentProvider";
import { CONSENT_VERSION, OPTIONAL_CATEGORIES } from "./constants";
import {
  Callout,
  DataTable,
  Lede,
  SectionHeader,
} from "./CookiePreferencesShared";

const CATEGORY_LABEL: Record<string, string> = {
  analytics: "Analytics",
  personalization: "Personalization",
  marketing: "Marketing",
  integrations: "Integrations",
};

const EMPTY = "—";

export default function CookiePreferencesRecord() {
  const { saved, savedAt, gpc, hydrated } = useCookieConsent();

  const accepted = saved
    ? OPTIONAL_CATEGORIES.filter((id) => saved[id]).map((id) => CATEGORY_LABEL[id])
    : [];

  const rows: string[][] = [
    [
      "Consent status",
      !hydrated ? EMPTY : saved ? "Saved on this browser" : "Not yet set",
    ],
    [
      "Last saved",
      hydrated && savedAt ? new Date(savedAt).toLocaleString() : EMPTY,
    ],
    ["Consent version", `${CONSENT_VERSION} · [placeholder — TBC by legal]`],
    ["Region model", "Detected from browser — [placeholder]"],
    ["GPC signal", !hydrated ? EMPTY : gpc ? "Detected" : "Not detected"],
    [
      "Categories accepted",
      !hydrated || !saved
        ? EMPTY
        : accepted.length > 0
          ? accepted.join(", ")
          : "Strictly necessary only",
    ],
  ];

  return (
    <section>
      <SectionHeader
        id="consent-history"
        num={5}
        title="Your Consent Record"
        badge={{ label: "Automated", tone: "cyan" }}
      />

      <Lede>
        ZoikoVertex records your consent choices with a minimal pseudonymous
        identifier, timestamp, consent version, categories, and method of
        choice. This record supports the legal requirement for evidenced
        consent without creating unnecessary visitor surveillance.
      </Lede>

      <DataTable headers={["Field", "Value"]} rows={rows} minWidth={520} />

      <Callout tone="green" lead="Withdrawing consent:">
        Use the controls in Section 01 above and save your updated preferences
        at any time. Changes take effect immediately for new page interactions.
        Some analytics or marketing tools may require a page refresh to fully
        deactivate. Your withdrawal is logged to the consent record.
      </Callout>

      <p className="mt-7 text-[15px] font-light leading-[1.85] text-slate-700">
        For questions about your consent record, contact{" "}
        <a
          href="mailto:privacy@zoikovertex.com"
          className="border-b border-[#20E7F2]/40 text-[#0d8d9a] transition-colors hover:border-[#20E7F2] hover:text-[#20E7F2]"
        >
          privacy@zoikovertex.com
        </a>
        .
      </p>
    </section>
  );
}
