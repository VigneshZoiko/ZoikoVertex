"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { Callout, SectionHeader } from "./CookiePreferencesShared";

const FAQ = [
  {
    q: "What are cookies and similar technologies?",
    a: "Cookies are small data files stored by a browser or device when a person visits a website or uses an online service. Similar technologies can include pixels, tags, local storage, software development kits, and other identifiers. ZoikoVertex may use them to operate and secure the service, remember choices, understand usage, measure performance, and support approved communications or marketing.",
  },
  {
    q: "What categories of cookies does ZoikoVertex use?",
    a: "The ZoikoVertex preference center may present categories such as strictly necessary, preference, analytics, and marketing cookies. The live cookie inventory is the authoritative source for the technologies currently in use, including provider, purpose, category, and duration. Categories should not be published unless they accurately reflect the implemented website and consent-management configuration.",
  },
  {
    q: "What are strictly necessary cookies?",
a: "Strictly necessary cookies support functions required to operate the website or platform securely and reliably, such as authentication, session management, fraud prevention, load balancing, and consent recording. Because disabling them may prevent essential services from working, they are not normally controlled through optional consent settings. Their use remains subject to the applicable privacy notice and law.",
  },
  {
    q: "Does ZoikoVertex sell personal information?",
    a: "Whether any ZoikoVertex practice constitutes “selling” or “sharing” under California law is subject to legal review. Where applicable, turning off the Marketing category applies the Do Not Sell or Share opt-out. See Section 03.",
  },
  {
    q: "How long do cookies remain on my device?",
a: "Cookie duration varies by purpose. Session cookies generally expire when the browser session ends, while persistent cookies remain for a defined period or until deleted. The live Cookie Preferences center or cookie inventory should state the duration of each active cookie or similar technology. Retention periods must match the actual technical configuration.",
  },
  {
    q: "How does this page relate to the Privacy Policy?",
    a: "The ZoikoVertex Privacy Policy explains how personal information and usage data are handled, while the Cookie Preferences center describes the technologies active on the website. Questions or privacy-rights requests should be sent through the current contact channel stated in the Privacy Policy. Enterprise processing may also be governed by the applicable customer agreement and Data Processing Addendum.",
  },
];

export default function CookiePreferencesFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section>
      <SectionHeader
        id="faq"
        num={6}
        title="Frequently Asked Questions"
        badge={{ label: "FAQ", tone: "gray" }}
      />

      <div className="mt-7 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {FAQ.map(({ q, a }, i) => {
          const open = openIdx === i;
          return (
            <div key={q} className="border-b border-slate-200 last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-gray-50/70"
              >
                <span className="text-[13.5px] font-medium text-slate-800">
                  {q}
                </span>
                <ChevronDown
                  className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                  strokeWidth={2.5}
                />
              </button>
              {open && (
                <p className="px-5 pb-4 text-[13px] font-light leading-[1.75] text-slate-500">
                  {a}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <Callout tone="cyan" lead="Questions about privacy or consent?">
        Contact{" "}
        <a
          href="mailto:privacy@zoikovertex.com"
          className="text-[#0d8d9a] underline underline-offset-2"
        >
          privacy@zoikovertex.com
        </a>{" "}
        or review the{" "}
        <Link href="/privacy" className="text-[#0d8d9a] underline underline-offset-2">
          Privacy Policy
        </Link>
        , Data Processing Addendum, and{" "}
        <Link href="/governance" className="text-[#0d8d9a] underline underline-offset-2">
          Compliance &amp; Governance
        </Link>{" "}
        pages. Enterprise procurement reviewers may request vendor details and
        consent architecture documentation directly from the ZoikoVertex privacy
        team.
      </Callout>
    </section>
  );
}
