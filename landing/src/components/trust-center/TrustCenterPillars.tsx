import { Bot, FileBadge, FileSearch, Lock, Server, Shield } from "lucide-react";
import { IconTile, type Tone } from "./shared";
import type { LucideIcon } from "lucide-react";

const PILLARS: { icon: LucideIcon; tone: Tone; title: string; body: string; href: string }[] = [
  {
    icon: Shield,
    tone: "cyan",
    title: "Security",
    body: "Encryption, network architecture, penetration testing, and vulnerability management.",
    href: "#security-architecture",
  },
  {
    icon: FileBadge,
    tone: "green",
    title: "Compliance",
    body: "SOC 2, ISO 27001, GDPR, HIPAA, FCA, NIST AI RMF, and sector-specific certifications.",
    href: "#compliance",
  },
  {
    icon: Lock,
    tone: "gold",
    title: "Privacy",
    body: "Data residency, DPA execution, subprocessor transparency, and data subject rights.",
    href: "#privacy",
  },
  {
    icon: Bot,
    tone: "violet",
    title: "Responsible AI",
    body: "Human oversight, bias controls, transparency, NIST AI RMF governance alignment.",
    href: "#responsible-ai",
  },
  {
    icon: FileSearch,
    tone: "cyan",
    title: "Audit & Evidence",
    body: "Five-layer audit engine: Audit Trail, Decision Ledger, Evidence Vault, Forensic Hub, Identity Ledger.",
    href: "#audit-engine",
  },
  {
    icon: Server,
    tone: "amber",
    title: "Infrastructure",
    body: "Uptime SLA, disaster recovery, BCP, incident response, and hosting architecture.",
    href: "#infrastructure",
  },
];

/** Six-up jump strip directly under the hero. */
export default function TrustCenterPillars() {
  return (
    <nav
      aria-label="Trust Center sections"
      className="border-y border-white/10 bg-[#0e1626]"
    >
      <div className="grid grid-cols-2 gap-px bg-white/10 md:grid-cols-3 xl:grid-cols-6">
        {PILLARS.map(({ icon, tone, title, body, href }) => (
          <a
            key={title}
            href={href}
            className="flex flex-col gap-1 bg-[#0e1626] p-5 transition-colors hover:bg-[#131c2e]"
          >
            <IconTile icon={icon} tone={tone} size="sm" />
            <span className="pt-1.5 text-sm font-bold text-white/[0.88] font-[family-name:var(--font-bricolage)]">
              {title}
            </span>
            <span className="text-xs font-light leading-4 text-white/[0.52]">
              {body}
            </span>
          </a>
        ))}
      </div>
    </nav>
  );
}
