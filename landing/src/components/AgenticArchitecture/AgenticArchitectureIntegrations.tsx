import Link from "next/link";

function BirdIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2.6a5.4 5.4 0 0 1-1.5.4 2.6 2.6 0 0 0 1.1-1.4 5.3 5.3 0 0 1-1.7.6A2.6 2.6 0 0 0 6.5 4.6 7.4 7.4 0 0 1 1.2 2a2.6 2.6 0 0 0 .8 3.5 2.6 2.6 0 0 1-1.2-.3v.05a2.6 2.6 0 0 0 2.1 2.6 2.6 2.6 0 0 1-1.2.05 2.6 2.6 0 0 0 2.5 1.8A5.3 5.3 0 0 1 1 10.8a7.5 7.5 0 0 0 4 1.2c4.9 0 7.6-4.1 7.6-7.6v-.35A5.4 5.4 0 0 0 14 2.6Z" stroke="currentColor" strokeWidth="0.9" strokeLinejoin="round" />
    </svg>
  );
}

function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1" />
      <path d="M1.5 12c0-2 1.6-3.3 3.5-3.3S8.5 10 8.5 12M9.5 5.3a1.7 1.7 0 1 0 0-3.4M10.5 8.9c1.5.15 2.3 1.05 2.3 2.4" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="1.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1" />
      <rect x="8" y="1.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1" />
      <rect x="1.5" y="8" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1" />
      <rect x="8" y="8" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 3.5h11v6h-7L2.5 12v-2.5H1.5v-6Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1.5 3.5h3.5l1 1.3h6.5v6.2h-11v-7.5Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
    </svg>
  );
}

function ApiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="4" width="11" height="6" rx="1" stroke="currentColor" strokeWidth="1" />
      <path d="M4 4V2.5M10 4V2.5M4 11.5V10M10 11.5V10" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

function PlugSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M5 1.5v2.5M9 1.5v2.5M3.5 4h7v2a3.5 3.5 0 0 1-7 0V4Z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round" />
      <path d="M7 9.5v3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

const CATEGORIES = [
  {
    icon: BirdIcon,
    tag: "Marketing Channels",
    title: "Social, ads, and publishing",
    items: ["LinkedIn", "Meta", "X / Twitter", "TikTok", "Google Ads", "YouTube"],
    note: "Where supported. Channel availability varies by region and tier.",
  },
  {
    icon: UsersIcon,
    tag: "CRM & Revenue",
    title: "Lead flow and attribution",
    items: ["Salesforce", "HubSpot", "Zoho", "MS Dynamics"],
    note: "CRM integrations support campaign attribution and sales handoff.",
  },
  {
    icon: GridIcon,
    tag: "Project & Work Tools",
    title: "Task and workflow coordination",
    items: ["Jira", "Asana", "Monday", "Notion", "ClickUp"],
    note: "Sync workflows, tasks, and operational status across tools.",
  },
  {
    icon: MessageIcon,
    tag: "Communication",
    title: "Approvals, alerts, escalations",
    items: ["Slack", "MS Teams", "Email", "Webhooks"],
    note: "Real-time notifications for approvals, escalations, and status.",
  },
  {
    icon: FolderIcon,
    tag: "Storage & DAM",
    title: "Assets, evidence, versions",
    items: ["Google Drive", "SharePoint", "Dropbox", "Box"],
    note: "Approved assets, evidence attachments, and version control.",
  },
  {
    icon: ApiIcon,
    tag: "Developer Access",
    title: "Enterprise extensibility",
    items: ["REST APIs", "Webhooks", "Event Streams", "Data Connectors"],
    note: "Build custom integrations and system-to-system orchestration.",
  },
];

export default function AgenticArchitectureIntegrations() {
  return (
    <section className="bg-[#080d1a] py-24">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="mb-14 max-w-xl">
          <div className="inline-flex items-center gap-2 mb-4">
            <span className="w-4 h-px bg-[#20E7F2]" />
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#20E7F2]">Integration Fabric</span>
          </div>
          <h2 className="text-[clamp(1.8rem,3.5vw,2.6rem)] font-black leading-tight text-white mb-4">
            Connected to your enterprise stack.
          </h2>
          <p className="text-white/45 text-[14.5px] leading-relaxed">
            ZoikoVertex is designed around an open integration fabric — connecting to the channels, CRMs, workflow tools, and enterprise systems your teams already use.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {CATEGORIES.map((c) => (
            <div key={c.tag} className="rounded-[14px] border border-white/10 bg-[#111D2E] p-6">
              <div className="flex items-center gap-2 mb-4 text-[#20E7F2]">
                <c.icon className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em]">{c.tag}</span>
              </div>
              <h3 className="text-white font-bold text-[15px] mb-4">{c.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {c.items.map((item) => (
                  <span
                    key={item}
                    className="text-[11.5px] text-white/60 px-2.5 py-1 rounded-[100px] border border-white/10 bg-[#182540]"
                  >
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-white/30 text-[11.5px] italic leading-relaxed">{c.note}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-white/10 bg-[#182540] p-8 flex flex-wrap items-center justify-between gap-6">
          <p className="text-white/70 text-[14px] leading-relaxed max-w-xl">
            <span className="text-white font-bold">Need a specific integration?</span>{" "}
            Speak to the ZoikoVertex enterprise team about your integration requirements, API access, and implementation roadmap.
          </p>
          <Link
            href="/request-demo"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#20E7F2] text-[#080d1a] text-sm font-bold hover:bg-[#20E7F2]/90 transition shrink-0"
          >
            <PlugSmallIcon className="w-3.5 h-3.5" />
            Discuss Integrations
          </Link>
        </div>
      </div>
    </section>
  );
}
