import { DataTable, Lede, SectionHeader } from "./CookiePreferencesShared";

const PENDING = "[Confirm before launch]";

const ROWS = [
  [
    "Strictly Necessary",
    "ZoikoVertex first-party; CDN / infrastructure; security and bot protection providers",
    PENDING,
  ],
  [
    "Analytics",
    "Web analytics; product analytics; session recording where applicable",
    PENDING,
  ],
  [
    "Personalization",
    "First-party preference store; personalization engine",
    PENDING,
  ],
  [
    "Marketing",
    "Advertising and retargeting platforms; CRM attribution; demand-generation tools",
    PENDING,
  ],
  [
    "Integrations",
    "Video hosting; scheduling/calendar tools; live chat; CRM-connected forms",
    PENDING,
  ],
];

export default function CookiePreferencesVendors() {
  return (
    <section>
      <SectionHeader
        id="vendor-categories"
        num={4}
        title="Vendor & Technology Categories"
        badge={{ label: "Disclosure", tone: "gray" }}
      />

      <Lede>
        ZoikoVertex discloses vendor categories used on the website by cookie
        category. Specific vendor names and links to their privacy
        documentation will be listed below before production launch, following
        legal review and confirmation of implemented technologies.
      </Lede>

      <DataTable
        headers={["Category", "Vendor class", "Status"]}
        rows={ROWS}
        minWidth={640}
      />

      <p className="mt-7 text-[15px] font-light leading-[1.85] text-slate-700">
        Vendor registry version and last-review date will be published alongside
        specific vendor disclosures. Enterprise procurement reviewers requiring
        early access to vendor categories may contact{" "}
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
