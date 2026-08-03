import { Callout, DataTable, Lede, SectionHeader } from "./CookiePreferencesShared";

const ROWS = [
  [
    "Strictly Necessary",
    "Security, sessions, consent storage, fraud prevention, load balancing",
    "Session – 12 months",
    "Always active",
    "Cannot be disabled",
  ],
  [
    "Analytics",
    "Traffic, engagement, funnel, content effectiveness",
    "Up to 24 months",
    "Off (consent regions)",
    "Consent / opt-out",
  ],
  [
    "Personalization",
    "Preferences, language, region, resource suggestions",
    "Up to 12 months",
    "Off (consent regions)",
    "Consent / opt-out",
  ],
  [
    "Marketing",
    "Attribution, retargeting, ad measurement, cross-site signals",
    "Up to 13 months",
    "Off",
    "Consent / Do Not Sell or Share",
  ],
  [
    "Integrations",
    "Embedded video, scheduling, chat, CRM forms, demos",
    "Provider-specific",
    "Off",
    "Contextual consent / toggle",
  ],
];

export default function CookiePreferencesSummary() {
  return (
    <section>
      <SectionHeader
        id="category-details"
        num={2}
        title="Cookie Category Summary"
        badge={{ label: "Reference", tone: "gray" }}
      />

      <Lede>
        This table summarizes each cookie category, its typical use, legal
        basis, and whether it can be controlled through Cookie Preferences.
      </Lede>

      <DataTable
        headers={["Category", "Typical use", "Retention", "Default", "Choice model"]}
        rows={ROWS}
        minWidth={760}
      />

      <Callout tone="cyan" lead="Vendor lists:">
        Specific vendor and technology disclosures will be published in this
        section before launch. These require legal review and confirmation of
        implemented technologies. [Placeholder — legal and engineering to
        complete before production.]
      </Callout>
    </section>
  );
}
