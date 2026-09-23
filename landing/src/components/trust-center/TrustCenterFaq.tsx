"use client";

import { useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";
import { CONTAINER, Eyebrow, Photo, SECURITY_MAILTO, SectionTitle } from "./shared";

const FAQ = [
  {
    q: "Is ZoikoVertex SOC 2 Type II certified?",
    a: "The SOC 2 Type II audit is in progress. The controls required for Type II are implemented and currently being assessed over the formal audit period. A SOC 2 Type I report is available to enterprise prospects under NDA in the meantime.",
  },
  {
    q: "Where is customer data stored and can I choose my data region?",
    a: "Customer data is hosted on AWS infrastructure. Enterprise customers can choose EU, US, or APAC data residency for primary data storage, and replication policy is configurable. Residency is set by customer configuration and confirmed in the DPA.",
  },
  {
    q: "Does ZoikoVertex use customer data to train AI models?",
    a: "No. Customer data is never used to train ZoikoVertex AI models or third-party foundation models. AI inference runs through enterprise API agreements with no customer data retention for model training, and prompts containing customer data are sealed in the Evidence Vault.",
  },
  {
    q: "How does ZoikoVertex handle a security breach or data incident?",
    a: "Security events are monitored 24/7 and classified from P0 to P4 using documented incident response runbooks. Customers are notified within 72 hours of a confirmed breach, in line with GDPR Article 33, and every incident goes through post-incident review and remediation tracking.",
  },
  {
    q: "Can ZoikoVertex sign a Data Processing Addendum (DPA)?",
    a: "Yes. The DPA covers controller-processor obligations, data subject rights support, sub-processing terms, international transfer mechanisms (EU SCCs and UK IDTA), retention, and security requirements. Enterprise customers can request execution through the security team.",
  },
  {
    q: "How does ZoikoVertex support enterprise SSO and identity management?",
    a: "ZoikoVertex supports SSO via SAML 2.0 and OIDC — including Okta, Microsoft Azure AD, Google Workspace, Ping Identity, and OneLogin — plus SCIM 2.0 provisioning, enforced MFA, role-based access control, and configurable session management.",
  },
  {
    q: "How is ZoikoVertex aligned with the NIST AI Risk Management Framework?",
    a: "The governance architecture is designed to align with the NIST AI RMF functions: Govern, Map, Measure, and Manage. Risk is identified through policy checks, managed through approval workflows, overseen through the Audit Engine, and documented through the Evidence Vault.",
  },
  {
    q: "Can ZoikoVertex be used by organisations subject to HIPAA?",
    a: "Yes, with the appropriate configuration. HIPAA-aligned workflow configurations are available for healthcare customers, and a Business Associate Agreement (BAA) is available to qualified healthcare customers on the Enterprise tier. BAA execution and configuration review take place during onboarding.",
  },
  {
    q: "What penetration testing does ZoikoVertex conduct?",
    a: "Independent third-party penetration testing is conducted annually across all platform components and APIs, alongside automated SAST and DAST scanning in the CI/CD pipeline. An executive summary of the most recent engagement is available to enterprise prospects under NDA.",
  },
  {
    q: "How does ZoikoVertex manage subprocessors?",
    a: "Every subprocessor is subject to security review and contractual data protection obligations. The full subprocessor register is available to enterprise customers via the DPA, and material changes are communicated with at least 30 days' advance notice, with the right to object.",
  },
];

export default function TrustCenterFaq() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section id="faq" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Enterprise Trust Questions</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Answers for security, legal, and procurement reviewers.
      </SectionTitle>

      <div className="mt-10 sm:mt-12 grid items-start gap-10 lg:grid-cols-[1fr_400px] lg:gap-12">
        <div className="overflow-hidden rounded-xl border border-white/10">
          {FAQ.map(({ q, a }, i) => {
            const open = openIdx === i;
            return (
              <div key={q} className="border-b border-white/10 bg-[#0b1120] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenIdx(open ? null : i)}
                  aria-expanded={open}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-sm font-semibold text-white/90">{q}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 shrink-0 text-white/40 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                    strokeWidth={2.5}
                  />
                </button>
                {open && (
                  <p className="px-5 pb-5 text-[13px] font-light leading-6 text-white/50">{a}</p>
                )}
              </div>
            );
          })}
        </div>

        <aside
          id="security-review"
          className="scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]"
        >
          <div className="relative h-[200px]">
            <Photo slot="securityReview" sizes="(max-width: 1024px) 100vw, 400px" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-50% to-[#0b1120]" />
          </div>
          <div className="p-7 pt-6">
            <span className="text-[9.5px] font-medium uppercase tracking-[0.14em] text-[#20E7F2] font-[family-name:var(--font-jetbrains)]">
              Security review
            </span>
            <h3 className="mt-3 text-[22px] font-extrabold leading-[1.2] text-white font-[family-name:var(--font-bricolage)]">
              Request a formal security and compliance review.
            </h3>
            <p className="mt-3 text-[13px] font-light leading-[1.7] text-white/50">
              For enterprise procurement, CISOs, data protection officers, and
              compliance teams — a structured security review with the
              ZoikoVertex security team, documentation access under NDA, and a
              compliance Q&amp;A session.
            </p>
            <a
              href={SECURITY_MAILTO}
              className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#20E7F2] px-5 py-3 text-sm font-bold text-[#080d1a] transition-colors hover:bg-[#20E7F2]/90"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2.5} />
              Request Security Review
            </a>
          </div>
        </aside>
      </div>
    </section>
  );
}
