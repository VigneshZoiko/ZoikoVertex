import { Activity, Cloud, Database, Eye, Landmark, RefreshCw, type LucideIcon } from "lucide-react";
import { Eyebrow, IconTile, Photo, SectionLede, SectionTitle, type Tone } from "./shared";

const ITEMS: { icon: LucideIcon; tone: Tone; title: string; body: string; meta: string }[] = [
  {
    icon: Cloud,
    tone: "green",
    title: "Cloud infrastructure",
    body: "Deployed on enterprise-grade cloud infrastructure (AWS primary) with multi-availability-zone architecture for high availability within regions.",
    meta: "Multi-AZ · Auto-scaling · Load balanced",
  },
  {
    icon: Activity,
    tone: "green",
    title: "Uptime commitment",
    body: "99.9% platform uptime SLA for enterprise customers. Real-time status page available. Scheduled maintenance windows communicated with minimum 5-day notice.",
    meta: "99.9% SLA · Status page: status.zoikovertex.com",
  },
  {
    icon: Database,
    tone: "gold",
    title: "Data backup and recovery",
    body: "Automated daily backups with point-in-time recovery. Backup retention configurable. Recovery Time Objective (RTO) <4 hours; Recovery Point Objective (RPO) <1 hour for Enterprise tier.",
    meta: "RTO <4h · RPO <1h · Daily backups",
  },
  {
    icon: Landmark,
    tone: "cyan",
    title: "Business Continuity Plan (BCP)",
    body: "Documented BCP covering critical system failure, regional outage, key person dependency, and supply chain disruption scenarios. Tested annually with documented results.",
    meta: "Documented · Annual testing · Reviewed by leadership",
  },
  {
    icon: RefreshCw,
    tone: "violet",
    title: "Disaster Recovery",
    body: "Cross-region disaster recovery capability for Enterprise tier. DR testing conducted biannually. Failover procedures documented and accessible to incident response team 24/7.",
    meta: "Cross-region DR · Biannual testing · Enterprise tier",
  },
  {
    icon: Eye,
    tone: "green",
    title: "Observability and monitoring",
    body: "Full-stack observability: application performance monitoring, infrastructure metrics, log aggregation, distributed tracing, and alerting. P0 incidents trigger on-call within 5 minutes.",
    meta: "24/7 on-call · 5-min P0 response · Full-stack APM",
  },
];

export default function TrustCenterInfrastructure() {
  return (
    <section id="infrastructure" className="scroll-mt-24 bg-[#0e1626]">
      <div className="grid lg:grid-cols-[45%_1fr]">
        <div className="relative h-60 sm:h-80 lg:h-auto">
          <Photo
            slot="infrastructure"
            sizes="(max-width: 1024px) 100vw, 45vw"
            className="object-[center_20%]"
          />
        </div>

        <div className="px-4 py-14 sm:px-6 sm:py-16 lg:py-24 lg:pl-14 lg:pr-[max(2rem,calc((100vw-1136px)/2))] xl:pl-[72px]">
          <Eyebrow>Infrastructure &amp; Reliability</Eyebrow>
          <SectionTitle className="max-w-[420px]">
            Built for enterprise uptime, resilience, and operational continuity.
          </SectionTitle>
          <SectionLede className="max-w-[420px]">
            ZoikoVertex infrastructure is designed for enterprise reliability —
            redundant architecture, regional failover, defined recovery
            objectives, and tested continuity plans.
          </SectionLede>

          <div className="mt-10 flex flex-col gap-3">
            {ITEMS.map(({ icon, tone, title, body, meta }) => (
              <article
                key={title}
                className="flex gap-4 rounded-xl border border-white/10 bg-[#111a2c] p-4"
              >
                <IconTile icon={icon} tone={tone} size="sm" />
                <div>
                  <h3 className="text-[14px] font-bold text-white/90 font-[family-name:var(--font-bricolage)]">
                    {title}
                  </h3>
                  <p className="mt-1 text-xs font-light leading-5 text-white/50">{body}</p>
                  <p className="mt-1 text-[9.5px] text-white/25 font-[family-name:var(--font-jetbrains)]">
                    {meta}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
