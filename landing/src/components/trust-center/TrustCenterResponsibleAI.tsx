import {
  Bot,
  Eye,
  FileSearch,
  LibraryBig,
  Lock,
  Scale,
  TriangleAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { CONTAINER, Eyebrow, IconTile, SectionLede, SectionTitle, type Tone } from "./shared";

const PRINCIPLES: { icon: LucideIcon; tone: Tone; title: string; body: string }[] = [
  {
    icon: UserCheck,
    tone: "cyan",
    title: "Human oversight by design",
    body: "AI agents operate within configurable autonomy limits. Every action that crosses a risk, spend, policy, or sensitivity threshold requires human review before execution. No AI agent publishes content without at least one human approval.",
  },
  {
    icon: Eye,
    tone: "gold",
    title: "Transparency and explainability",
    body: "Every AI action is logged with the model used, prompt, confidence level, risk score, and output — accessible through the Audit Trail and Evidence Vault. AI-generated content is identifiable as AI-generated throughout the workflow.",
  },
  {
    icon: Scale,
    tone: "green",
    title: "Fairness and bias controls",
    body: "AI-generated content is subject to policy checks for discriminatory language, harmful stereotypes, misleading claims, and content that may adversely affect protected groups. Policy rules are configurable per organisation and jurisdiction.",
  },
  {
    icon: Lock,
    tone: "violet",
    title: "Privacy-safe AI operations",
    body: "Customer data is never used to train ZoikoVertex AI models or third-party foundation models. AI prompts containing customer data are sealed in the Evidence Vault and not retained beyond the configured retention period.",
  },
  {
    icon: TriangleAlert,
    tone: "amber",
    title: "Risk-aware escalation",
    body: "Every AI agent action is assigned a risk score based on content type, channel, jurisdiction, claim category, and autonomy threshold. High-risk actions trigger automatic escalation to the appropriate human reviewer — without requiring manual monitoring.",
  },
  {
    icon: FileSearch,
    tone: "cyan",
    title: "Accountability and evidence",
    body: "Every AI-assisted action creates a complete evidence record across the Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, and Identity Ledger — making AI accountability provable, not asserted.",
  },
  {
    icon: Bot,
    tone: "green",
    title: "No unreviewed autonomous publishing",
    body: "No AI agent — regardless of autonomy level, configuration, or integration — can publish content to any distribution channel without a completed, logged human approval. This constraint is architectural, not configurable away.",
  },
  {
    icon: LibraryBig,
    tone: "gold",
    title: "NIST AI RMF alignment",
    body: "ZoikoVertex governance architecture is designed to align with NIST AI RMF functions: Govern, Map, Measure, and Manage. Risk identification through policy checks, management through workflows, oversight through the Audit Engine, documentation through the Evidence Vault.",
  },
];

export default function TrustCenterResponsibleAI() {
  return (
    <section id="responsible-ai" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Responsible AI Governance</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        AI governance is not a feature. It is the platform architecture.
      </SectionTitle>
      <SectionLede>
        ZoikoVertex is governed agentic execution infrastructure — not
        uncontrolled AI automation. Every AI principle below is implemented as a
        platform control, not a policy statement.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PRINCIPLES.map(({ icon, tone, title, body }) => (
          <article key={title} className="rounded-2xl border border-white/10 bg-[#0b1120] p-6">
            <IconTile icon={icon} tone={tone} />
            <h3 className="mt-5 text-[15px] font-bold leading-snug text-white/90 font-[family-name:var(--font-bricolage)]">
              {title}
            </h3>
            <p className="mt-2 text-[13px] font-light leading-[1.6] text-white/50">{body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
