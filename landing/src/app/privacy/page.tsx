import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy | ZoikoVertex",
  description: "Privacy Policy for ZoikoVertex — Governed Autonomous Agentic-Intelligence Social Media Management Platform.",
};

const SECTIONS = [
  {
    title: "1. Who We Are",
    content: `ZoikoVertex is a governed autonomous agentic-intelligence social media management platform. We enable organisations, agencies, and teams to plan, create, approve, publish, and govern social media content across connected platforms including Facebook, Instagram, LinkedIn, X (Twitter), Pinterest, and Threads.

ZoikoVertex operates as a data processor on behalf of its customers (organisations and workspace administrators) and as a data controller for account and platform data collected during registration and use.`,
  },
  {
    title: "2. Information We Collect",
    content: `We collect the following categories of data:

**Account & Identity Data**
Name, email address, profile information, and authentication credentials provided during registration or via single sign-on.

**Workspace & Organisation Data**
Organisation name, workspace configuration, team member roles, and billing information.

**Connected Platform Data**
When you authorise ZoikoVertex to connect to a social media platform (e.g. Pinterest, Facebook, LinkedIn), we collect OAuth access tokens, account identifiers, profile names, profile images, and page or board data necessary to publish and manage content on your behalf.

**Content & Publishing Data**
Posts, captions, images, videos, schedules, campaign data, and approval workflow records created within the platform.

**Usage & Log Data**
IP addresses, browser type, device identifiers, session activity, feature usage logs, and error reports collected automatically to operate and improve the service.

**Governance & Audit Data**
Policy decisions, approval records, agent action logs, enforcement events, and governance artefacts generated as part of our Policy Center & Governance Rules Engine.`,
  },
  {
    title: "3. How We Use Your Information",
    content: `We use the information we collect to:

- Provide, operate, and maintain the ZoikoVertex platform and its features
- Authenticate users and manage workspace access and role-based permissions
- Connect to and publish content on authorised social media platforms on your behalf
- Process and store content, schedules, and campaign data as instructed by workspace administrators
- Generate governance artefacts, audit trails, and evidence records as part of policy enforcement
- Send transactional notifications related to approvals, publishing status, and account activity
- Investigate and resolve technical issues, security incidents, and policy violations
- Comply with applicable legal obligations and regulatory requirements
- Improve platform performance, reliability, and feature development

We do not sell your personal data to third parties. We do not use your content or connected social media data for advertising purposes.`,
  },
  {
    title: "4. Connected Social Media Platforms",
    content: `ZoikoVertex integrates with third-party social media platforms via OAuth 2.0. When you connect a platform account, you explicitly authorise ZoikoVertex to act on your behalf within the permissions you grant.

- **Facebook & Instagram** — Pages, business accounts, and Instagram Business Profiles via Meta's Graph API
- **LinkedIn** — Personal profiles and company pages via LinkedIn's API
- **X (Twitter)** — Accounts and posts via the Twitter API v2
- **Pinterest** — Boards and pins via Pinterest API v5
- **Threads** — Accounts and posts via the Threads API

Access tokens are encrypted at rest and in transit. You may revoke access at any time from within ZoikoVertex or directly from the connected platform's security settings. Revoking access will prevent ZoikoVertex from publishing or retrieving data on that account.`,
  },
  {
    title: "5. Data Retention",
    content: `We retain data for as long as necessary to provide the service and meet our legal obligations.

- **Account data** is retained for the duration of your subscription and for up to 90 days after account closure.
- **Content and publishing records** are retained as configured by the workspace administrator.
- **Governance artefacts and audit logs** are retained for a minimum of 12 months to support audit, compliance, and legal defensibility requirements, unless a longer retention period is required by applicable law or requested by the customer.
- **OAuth tokens** are retained while the platform connection is active and deleted upon disconnection.

Customers may request deletion of their data by contacting us at the address below.`,
  },
  {
    title: "6. Data Security",
    content: `ZoikoVertex implements enterprise-grade security measures to protect your data, including:

- TLS encryption for all data in transit
- Encryption at rest for sensitive credentials and access tokens
- Role-based access control (RBAC) and attribute-based access control (ABAC) for all workspace data
- Governance audit trails and tamper-evident evidence records
- Automated policy enforcement and resiliency controls to prevent unauthorised access or data loss

Despite these measures, no system is completely secure. We will notify affected customers of any confirmed security breach in accordance with applicable law.`,
  },
  {
    title: "7. Sharing of Information",
    content: `We do not sell, rent, or trade your personal data. We may share data with:

- **Service providers** — Infrastructure, hosting, database, and analytics providers engaged to operate the platform (e.g. Supabase, Vercel), each bound by appropriate data processing agreements.
- **Social media platforms** — Data is shared with connected platforms only as required to fulfil publishing and account management requests you authorise.
- **Legal authorities** — Where required by law, court order, or regulatory obligation, we may disclose data to relevant authorities.
- **Business transfers** — In the event of a merger, acquisition, or sale of assets, data may be transferred as part of that transaction, subject to equivalent privacy protections.`,
  },
  {
    title: "8. Your Rights",
    content: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

- **Access** — Request a copy of the personal data we hold about you
- **Correction** — Request correction of inaccurate or incomplete data
- **Deletion** — Request deletion of your personal data, subject to legal retention requirements
- **Restriction** — Request that we restrict processing of your data in certain circumstances
- **Portability** — Request your data in a structured, machine-readable format
- **Objection** — Object to processing based on legitimate interest

To exercise any of these rights, contact us at the address below. We will respond within 30 days.`,
  },
  {
    title: "9. Cookies",
    content: `ZoikoVertex uses essential cookies and session tokens required to authenticate users and maintain secure sessions. We do not use tracking or advertising cookies.

You may configure your browser to block cookies, but this may affect your ability to access the platform.`,
  },
  {
    title: "10. Third-Party Links",
    content: `ZoikoVertex may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties. We encourage you to review their privacy policies before providing any personal data.`,
  },
  {
    title: "11. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. When we make material changes, we will notify workspace administrators by email or via an in-platform notice. The date at the top of this page reflects the most recent update. Continued use of ZoikoVertex after changes take effect constitutes acceptance of the revised policy.`,
  },
  {
    title: "12. Contact Us",
    content: `If you have questions, requests, or concerns about this Privacy Policy or our data practices, please contact us:

**ZoikoVertex**
Email: privacy@zoikogroup.com
Website: https://zoikovertex.com`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-full bg-[#0a0a0f] text-white">

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
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">Privacy Policy</h1>
          <p className="text-white/50 text-sm">
            Last updated: <span className="text-white/70">May 2025</span>
          </p>
          <div className="mt-6 p-4 bg-white/5 border border-white/10 rounded-xl text-sm text-white/60 leading-relaxed">
            This Privacy Policy describes how ZoikoVertex collects, uses, stores, and protects information when you use our platform. By using ZoikoVertex, you agree to the practices described in this policy.
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
            This policy applies to the ZoikoVertex platform available at{" "}
            <span className="text-indigo-400">zoikovertex.com</span> and any associated subdomains or services.
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
            <a href="mailto:privacy@zoikogroup.com" className="hover:text-white/60 transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
