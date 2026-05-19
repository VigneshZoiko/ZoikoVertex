import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | ZoikoVertex",
  description: "Terms of Service for ZoikoVertex — Governed Autonomous Agentic-Intelligence Social Media Management Platform.",
};

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using the ZoikoVertex platform ("Platform"), you ("User", "Customer", or "Organisation") agree to be bound by these Terms of Service ("Terms"). If you are accepting these Terms on behalf of an organisation, you represent and warrant that you have the authority to bind that organisation.

If you do not agree to these Terms, you may not access or use the Platform. These Terms apply to all users including workspace administrators, team members, agents, and any other individuals who access the Platform under a licensed account.`,
  },
  {
    title: "2. Description of Service",
    content: `ZoikoVertex is a governed autonomous agentic-intelligence social media management platform designed for enterprise and regulated industries. The Platform enables organisations to plan, create, review, approve, publish, and govern social media content across connected platforms including Facebook, Instagram, LinkedIn, X (Twitter), Pinterest, Threads, YouTube, and TikTok.

ZoikoVertex operates across three functional layers:

**Control Plane**
Governance, identity management, policy enforcement, approval routing, and role-based access control.

**Data Plane**
Platform connector management, content ingestion, webhook processing, execution dispatch, and action attribution.

**Intelligence Plane**
AI agent reasoning, content optimisation, performance scoring, and ROI forecasting.

The Platform is provided as a Software-as-a-Service (SaaS) product under the subscription plan selected by the Customer.`,
  },
  {
    title: "3. Account Registration & Workspaces",
    content: `To use ZoikoVertex, you must register an account and create or join a workspace. You agree to:

- Provide accurate, current, and complete information during registration
- Maintain the security of your login credentials and not share them with unauthorised individuals
- Notify us immediately of any unauthorised access or suspected breach of your account
- Accept responsibility for all activity that occurs under your account or workspace

Workspace administrators are responsible for managing access, roles, and permissions for all members within their workspace. ZoikoVertex is not liable for losses resulting from unauthorised use of your account.`,
  },
  {
    title: "4. Subscription Plans & Billing",
    content: `ZoikoVertex is offered under the following subscription tiers: Starter, Core, Professional, and Enterprise. Features available to you depend on the plan your organisation has subscribed to.

**Feature Gating**
Certain features — including Approval Workflow Engine, Evidence Vault, Agent Autonomy levels D2 and D3, and Evidence Packs — are available only on Professional and Enterprise plans. Access to these features will be restricted if your plan does not include them.

**Billing**
Subscription fees are billed in advance on a monthly or annual basis. All fees are non-refundable except where required by applicable law. You authorise ZoikoVertex to charge your designated payment method for all applicable subscription fees.

**Changes to Plans**
ZoikoVertex reserves the right to change subscription pricing with 30 days' notice. Continued use of the Platform after a price change takes effect constitutes acceptance of the new pricing.

**Suspension for Non-Payment**
If payment is not received when due, ZoikoVertex may suspend or terminate access to the Platform.`,
  },
  {
    title: "5. Connected Social Media Platforms",
    content: `ZoikoVertex connects to third-party social media platforms via OAuth 2.0. By connecting a platform account, you:

- Authorise ZoikoVertex to act on your behalf within the permissions you grant during the OAuth authorisation flow
- Confirm that you have the legal right and authority to connect the account and publish content on it
- Accept that ZoikoVertex's ability to publish or retrieve data depends on the access level granted and the policies of the connected platform

**Supported platforms** include Facebook, Instagram (Business & Creator), LinkedIn (Profiles & Pages), X (Twitter), Pinterest, Threads, YouTube, and TikTok.

ZoikoVertex is not responsible for changes to third-party platform APIs, access restrictions imposed by those platforms, or content that fails to publish due to platform-side errors or policy violations. You may revoke platform access at any time from within ZoikoVertex or from the connected platform's security settings.`,
  },
  {
    title: "6. AI Agents & Autonomous Actions",
    content: `ZoikoVertex incorporates AI agents that can operate at varying levels of autonomy defined by the platform's Agent Autonomy Framework:

**D0 — Insight Only**
The agent provides recommendations and analysis. No content is created or published without explicit human action.

**D1 — Approval Required**
The agent drafts and prepares actions that must be approved by an authorised human before execution.

**D2 — Conditional Autonomy**
The agent may execute actions within defined policy constraints without human approval per action, but subject to governance rules and HITL (Human-in-the-Loop) triggers.

**D3 — Full Autonomy**
The agent operates within defined constraints with full execution authority, subject to policy enforcement and real-time risk monitoring.

Agent autonomy levels are gated by subscription plan and must be explicitly configured by workspace administrators. You accept that:

- AI-generated content may contain errors, inaccuracies, or content that requires human review before publication
- You remain solely responsible for all content published from your workspace regardless of whether it was generated or assisted by an AI agent
- ZoikoVertex's governance framework is designed to reduce but cannot eliminate the risk of inappropriate content being published
- Emergency pause controls and HITL rules must be configured appropriately for your organisation's risk tolerance`,
  },
  {
    title: "7. Approval Workflows & Governance",
    content: `ZoikoVertex provides an Approval Workflow Engine for organisations that require human review before content is published. Use of this feature does not transfer legal or regulatory compliance obligations from the Customer to ZoikoVertex.

Workspace administrators are responsible for:

- Configuring approval routing rules appropriate to their organisation's requirements
- Ensuring reviewers and approvers are adequately trained
- Maintaining oversight of governance policies and enforcement rules
- Monitoring the Governance Queue and acting on pending approvals within required timeframes

ZoikoVertex provides governance tooling as infrastructure. Compliance with applicable laws, regulations, and platform policies remains the sole responsibility of the Customer.`,
  },
  {
    title: "8. Evidence Vault & Audit Records",
    content: `The Evidence Vault provides tamper-evident audit logs, governance artefacts, and evidence packs to support legal defensibility and regulatory compliance requirements.

Evidence records generated by ZoikoVertex are provided as a best-effort service. While we implement cryptographic integrity controls and immutable logging, ZoikoVertex does not warrant that evidence records will be accepted as legally admissible evidence in any jurisdiction or proceeding.

Customers are responsible for:

- Configuring retention policies appropriate to their regulatory requirements
- Exporting and preserving evidence packs required for any specific legal or regulatory obligation
- Applying legal holds where required prior to anticipated litigation or audit

ZoikoVertex retains governance artefacts for a minimum of 12 months. Extended retention is available on Enterprise plans.`,
  },
  {
    title: "9. User Responsibilities & Acceptable Use",
    content: `You agree to use ZoikoVertex only for lawful purposes and in accordance with these Terms. You must not:

- Publish content that infringes intellectual property rights, including copyright, trademark, or proprietary rights of any third party
- Publish content that is defamatory, harassing, threatening, obscene, or otherwise unlawful
- Use ZoikoVertex to engage in spam, misleading advertising, or deceptive practices
- Attempt to reverse engineer, decompile, or extract source code from the Platform
- Use the Platform to train competing AI models or extract data for competing services
- Circumvent, disable, or interfere with security or governance controls
- Share access credentials or allow unauthorised individuals to access your workspace
- Use the Platform in any way that violates the terms of service of any connected social media platform

ZoikoVertex reserves the right to suspend or terminate access for violations of these terms without prior notice.`,
  },
  {
    title: "10. Intellectual Property",
    content: `**ZoikoVertex IP**
The Platform, including its software, design, trademarks, and documentation, is owned by ZoikoVertex and protected by applicable intellectual property laws. These Terms do not grant you any ownership rights in the Platform.

**Customer Content**
You retain ownership of all content you create, upload, or publish through the Platform. By using the Platform, you grant ZoikoVertex a limited, non-exclusive licence to process, store, and transmit your content solely as necessary to provide the service.

**AI-Generated Content**
Content generated by ZoikoVertex AI agents is produced on your behalf and under your instruction. Responsibility for ensuring AI-generated content is accurate, appropriate, and legally compliant rests with you.

**Feedback**
If you provide suggestions or feedback about the Platform, you grant ZoikoVertex the right to use such feedback without restriction or compensation.`,
  },
  {
    title: "11. Confidentiality",
    content: `Each party agrees to keep confidential any non-public information disclosed by the other party in connection with the Platform that is designated as confidential or reasonably should be understood to be confidential.

This obligation does not apply to information that:

- Was already publicly known at the time of disclosure
- Becomes publicly known through no fault of the receiving party
- Was independently developed without reference to the confidential information
- Is required to be disclosed by law or legal process

ZoikoVertex will not disclose Customer workspace data, content, or governance records to third parties except as described in our Privacy Policy or as required by law.`,
  },
  {
    title: "12. Data Protection & Privacy",
    content: `Your use of ZoikoVertex is subject to our Privacy Policy, which is incorporated into these Terms by reference. The Privacy Policy describes how we collect, use, store, and protect your data.

For enterprise customers operating under GDPR, CCPA, or equivalent data protection regulations, ZoikoVertex is available to enter into a Data Processing Agreement (DPA) upon request. Contact us at legal@zoikogroup.com to request a DPA.`,
  },
  {
    title: "13. Disclaimers & Limitation of Liability",
    content: `**As-Is Service**
ZoikoVertex is provided "as is" and "as available" without warranties of any kind, express or implied, including warranties of merchantability, fitness for a particular purpose, or non-infringement.

**Uptime**
We strive for high availability but do not warrant uninterrupted or error-free operation. Scheduled maintenance and unforeseen outages may affect availability.

**AI Accuracy**
ZoikoVertex AI agents may produce content that is inaccurate, incomplete, or inappropriate. We do not warrant the accuracy, reliability, or suitability of AI-generated content for any purpose.

**Limitation of Liability**
To the maximum extent permitted by applicable law, ZoikoVertex's total liability for any claim arising out of or related to these Terms or the Platform shall not exceed the fees paid by you in the three months preceding the claim. In no event shall ZoikoVertex be liable for indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, or business opportunity.`,
  },
  {
    title: "14. Indemnification",
    content: `You agree to indemnify, defend, and hold harmless ZoikoVertex and its officers, directors, employees, and contractors from and against any claims, liabilities, damages, losses, and expenses (including reasonable legal fees) arising out of or related to:

- Your use of the Platform in violation of these Terms
- Content you publish or instruct agents to publish through the Platform
- Your violation of any applicable law or third-party rights
- Any breach of your representations or warranties under these Terms`,
  },
  {
    title: "15. Termination",
    content: `**By You**
You may cancel your subscription at any time through your workspace billing settings. Cancellation takes effect at the end of the current billing period. No refunds are issued for unused portions of a billing period.

**By ZoikoVertex**
We may suspend or terminate your access to the Platform immediately and without prior notice if:

- You violate these Terms or our Acceptable Use Policy
- Your payment obligations are not met
- We are required to do so by law or regulatory obligation

**Effect of Termination**
Upon termination, your right to access the Platform ceases immediately. Your data will be retained for 90 days following termination, during which you may export it. After 90 days, data will be deleted in accordance with our retention policy, unless subject to a legal hold.`,
  },
  {
    title: "16. Modifications to Terms",
    content: `ZoikoVertex reserves the right to modify these Terms at any time. When we make material changes, we will notify workspace administrators by email or via an in-platform notice at least 14 days before the changes take effect.

Continued use of the Platform after revised Terms take effect constitutes your acceptance of those changes. If you do not agree to the revised Terms, you must stop using the Platform before the effective date.`,
  },
  {
    title: "17. Governing Law & Disputes",
    content: `These Terms are governed by and construed in accordance with the laws of India, without regard to conflict of law principles. Any dispute arising out of or in connection with these Terms shall first be attempted to be resolved through good-faith negotiation between the parties.

If negotiation fails, disputes shall be resolved by binding arbitration in accordance with applicable arbitration rules. Nothing in this clause prevents either party from seeking emergency injunctive relief from a court of competent jurisdiction.`,
  },
  {
    title: "18. Contact Us",
    content: `If you have questions about these Terms or need to contact us regarding your subscription, data, or a legal matter, please reach out:

**ZoikoVertex**
Email: legal@zoikogroup.com
Privacy enquiries: privacy@zoikogroup.com
Website: https://zoikovertex.com`,
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">

      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-bold tracking-tight text-white">
            ZoikoVertex
          </Link>
          <span className="text-xs text-white/40 font-medium uppercase tracking-widest">Legal</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-6 py-16">

        {/* Title */}
        <div className="mb-12">
          <p className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Legal</p>
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">Terms of Service</h1>
          <p className="text-white/50 text-sm">
            Last updated: <span className="text-white/70">May 2025</span>
          </p>
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 leading-relaxed">
            These Terms of Service govern your access to and use of the ZoikoVertex platform. By creating an account or using any part of the platform, you agree to be bound by these Terms. Please read them carefully before use.
          </div>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-lg font-bold text-white mb-3">{section.title}</h2>
              <div className="text-white/60 text-sm leading-relaxed space-y-3">
                {section.content.split("\n\n").map((para, i) => {
                  const lines = para.split("\n");
                  return (
                    <div key={i}>
                      {lines.map((line, j) => {
                        const isBullet = line.startsWith("- ");
                        const isBold = line.startsWith("**") && line.includes("**", 2);
                        if (isBullet) {
                          return (
                            <div key={j} className="flex gap-2 mt-1">
                              <span className="text-indigo-400 shrink-0 mt-px">—</span>
                              <span>{line.slice(2).replace(/\*\*(.*?)\*\*/g, "$1")}</span>
                            </div>
                          );
                        }
                        if (isBold && lines.length > 1 && j < lines.length - 1) {
                          const boldText = line.replace(/\*\*(.*?)\*\*/g, "$1");
                          return (
                            <p key={j} className="font-semibold text-white/80 mt-3 first:mt-0">
                              {boldText}
                            </p>
                          );
                        }
                        return (
                          <p key={j} className={j > 0 ? "mt-2" : ""}>
                            {line.replace(/\*\*(.*?)\*\*/g, "$1")}
                          </p>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 border-b border-white/5" />
            </section>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-16 p-6 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl text-center">
          <p className="text-sm text-white/50">
            These Terms apply to the ZoikoVertex platform available at{" "}
            <span className="text-indigo-400">zoikovertex.com</span> and any associated subdomains or services operated by Zoiko Group.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 px-6 py-8 mt-8">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} ZoikoVertex. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-xs text-white/30">
            <Link href="/privacy" className="hover:text-white/60 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white/60 transition-colors">Terms of Service</Link>
            <a href="mailto:legal@zoikogroup.com" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
