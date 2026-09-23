import { Check } from "lucide-react";
import {
  CONTAINER,
  Eyebrow,
  Photo,
  Pill,
  SectionLede,
  SectionTitle,
  type ImageSlot,
  type Tone,
} from "./shared";

const CONTROLS: {
  image: ImageSlot;
  tag: string;
  tone: Tone;
  title: string;
  body: string;
  points: string[];
}[] = [
  {
    image: "dataEncryption",
    tag: "Data protection",
    tone: "cyan",
    title: "Data encryption at rest and in transit",
    body: "All customer data encrypted using AES-256 at rest. All data in transit protected with TLS 1.3 minimum. Encryption keys managed through a dedicated key management service with rotation policies.",
    points: [
      "AES-256 encryption at rest",
      "TLS 1.3 minimum for all data in transit",
      "Dedicated key management service",
      "Automatic key rotation policies",
      "Customer-managed encryption keys — available on Enterprise tier",
    ],
  },
  {
    image: "networkSecurity",
    tag: "Network security",
    tone: "green",
    title: "Network architecture and perimeter controls",
    body: "Multi-layer network security including Web Application Firewall, DDoS protection, private networking for internal services, and network segmentation to isolate customer data per tenant.",
    points: [
      "Web Application Firewall (WAF)",
      "DDoS mitigation and traffic scrubbing",
      "Private networking for internal service communication",
      "Network segmentation and tenant isolation",
      "Intrusion detection and prevention system (IDPS)",
    ],
  },
  {
    image: "applicationSecurity",
    tag: "Application security",
    tone: "gold",
    title: "Secure SDLC, code review, and penetration testing",
    body: "Security integrated into the software development lifecycle — mandatory code review, automated vulnerability scanning, dependency auditing, and annual third-party penetration testing.",
    points: [
      "Secure SDLC with mandatory security review gates",
      "Automated SAST and DAST scanning in CI/CD pipeline",
      "Annual third-party penetration testing",
      "Bug bounty programme — responsible disclosure",
      "Dependency vulnerability scanning and patching SLA",
    ],
  },
  {
    image: "incidentResponse",
    tag: "Incident management",
    tone: "red",
    title: "24/7 monitoring, incident response, and breach notification",
    body: "Continuous security monitoring across all platform layers with defined incident classification, escalation procedures, customer notification obligations, and post-incident review processes.",
    points: [
      "24/7 security event monitoring and alerting",
      "Defined incident classification (P0–P4)",
      "Customer notification within 72 hours of confirmed breach (GDPR aligned)",
      "Documented incident response runbooks",
      "Post-incident review and remediation tracking",
    ],
  },
  {
    image: "vulnerabilityManagement",
    tag: "Vulnerability management",
    tone: "violet",
    title: "Continuous vulnerability scanning and patch management",
    body: "Asset inventory with continuous vulnerability scanning, risk-based patch prioritisation, and defined SLAs for critical, high, and medium severity vulnerabilities across all production infrastructure.",
    points: [
      "Continuous infrastructure vulnerability scanning",
      "Critical severity patch SLA: 24 hours",
      "High severity patch SLA: 7 days",
      "Container image scanning in deployment pipeline",
      "Quarterly infrastructure security reviews",
    ],
  },
  {
    image: "peopleSecurity",
    tag: "People security",
    tone: "cyan",
    title: "Employee security controls and access governance",
    body: "Background checks for all employees, mandatory security awareness training, least-privilege access principles for production access, and privileged access management for infrastructure credentials.",
    points: [
      "Background checks for all employees and contractors",
      "Annual mandatory security awareness training",
      "Least-privilege production access with approval workflow",
      "Privileged access management (PAM) for infrastructure",
      "All production access logged in the Identity Ledger",
    ],
  },
];

const METRICS = [
  {
    value: "AES-256",
    label: "Encryption standard",
    body: "Industry-standard symmetric encryption for all customer data at rest across all storage tiers.",
  },
  {
    value: "TLS 1.3",
    label: "Transport security minimum",
    body: "All data in transit protected with TLS 1.3 minimum. Older protocols disabled on all public endpoints.",
  },
  {
    value: "Annual",
    label: "Penetration testing",
    body: "Third-party penetration testing conducted annually across all platform components and APIs.",
  },
  {
    value: "72h",
    label: "Breach notification",
    body: "Confirmed breach customer notification within 72 hours — aligned with GDPR Article 33 obligations.",
  },
];

export default function TrustCenterSecurity() {
  return (
    <section id="security-architecture" className={`${CONTAINER} scroll-mt-24 py-14 sm:py-20`}>
      <Eyebrow>Security Architecture</Eyebrow>
      <SectionTitle className="max-w-[560px]">
        Enterprise-grade security built into every layer of the platform.
      </SectionTitle>
      <SectionLede>
        ZoikoVertex is designed with security-first architecture across data,
        network, application, and identity layers. Every security control is
        documented, tested, and auditable.
      </SectionLede>

      <div className="mt-10 sm:mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {CONTROLS.map(({ image, tag, tone, title, body, points }) => (
          <article
            key={title}
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b1120]"
          >
            <div className="relative h-40">
              <Photo slot={image} sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 360px" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent from-40% to-[#080d1a]/95" />
            </div>
            <div className="flex flex-col gap-1.5 px-5 pb-6 pt-6">
              <Pill tone={tone} className="self-start text-[9.3px] uppercase tracking-[0.08em]">
                {tag}
              </Pill>
              <h3 className="pt-1 text-base font-bold leading-snug text-white/[0.88] font-[family-name:var(--font-bricolage)]">
                {title}
              </h3>
              <p className="text-xs font-light leading-5 text-white/[0.52]">{body}</p>
              <ul className="flex flex-col gap-1.5 pt-2">
                {points.map((point) => (
                  <li key={point} className="flex gap-2 text-xs font-light leading-4 text-white/[0.52]">
                    <Check className="mt-0.5 h-3 w-3 shrink-0 text-[#22C55E]" strokeWidth={2.5} />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 sm:mt-12 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
        {METRICS.map(({ value, label, body }) => (
          <div key={value} className="bg-[#0b1120] px-7 py-7">
            <div className="text-[34px] font-extrabold leading-10 text-[#22C55E] font-[family-name:var(--font-bricolage)]">
              {value}
            </div>
            <div className="mt-2 text-[9.6px] font-medium uppercase tracking-[0.12em] text-white/30 font-[family-name:var(--font-jetbrains)]">
              {label}
            </div>
            <p className="mt-3 text-xs font-light leading-5 text-white/50">{body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
