"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, ChevronRight, ChevronDown, BookOpen, Megaphone, Send,
  Bot, ShieldCheck, Archive, Plug, Settings, BarChart2,
  X, ThumbsUp, ThumbsDown, ExternalLink, Info,
  AlertTriangle, CheckCircle2, Users, Lock, Globe,
  Zap, Database, FileText, Eye, Activity,
} from "lucide-react";

/* ─── ZoikoVertex Theme Tokens ──────────────────────────────────────────── */
const C = {
  bg:        "#0d1a30",
  bgDeep:    "#080e1a",
  bgPanel:   "#0a1526",
  bgCard:    "#0f1e35",
  bgHover:   "#1a2d48",
  border:    "rgba(32,231,242,0.10)",
  borderHi:  "rgba(32,231,242,0.22)",
  accent:    "#20E7F2",
  accentDim: "rgba(32,231,242,0.15)",
  accentGlow:"rgba(32,231,242,0.06)",
  text:      "#ffffff",
  muted:     "#A9B8C7",
  muted2:    "#5E7A92",
};

/* ─── Tiny shared components ────────────────────────────────────────────── */

function H1({ children }: { children: React.ReactNode }) {
  return <h1 style={{ color: C.text, fontSize: 30, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 10, lineHeight: 1.2 }}>{children}</h1>;
}
function H2({ id, children }: { id?: string; children: React.ReactNode }) {
  return <h2 id={id} style={{ color: C.text, fontSize: 20, fontWeight: 700, marginTop: 36, marginBottom: 10, paddingTop: id ? 8 : 0 }}>{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 style={{ color: C.text, fontSize: 14, fontWeight: 600, marginTop: 22, marginBottom: 8 }}>{children}</h3>;
}
function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.8, marginBottom: 12 }}>{children}</p>;
}
function UL({ items }: { items: string[] }) {
  return (
    <ul style={{ marginBottom: 16, paddingLeft: 0, listStyle: "none" }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.accent, marginTop: 8, flexShrink: 0 }} />
          <span style={{ color: C.muted, fontSize: 13.5, lineHeight: 1.75 }} dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}
function Note({ children, type = "info" }: { children: React.ReactNode; type?: "info" | "warning" | "success" }) {
  const m = {
    info:    { bg: "rgba(32,231,242,0.06)",  border: "rgba(32,231,242,0.20)",  icon: <Info style={{ width: 14, height: 14, color: C.accent,      flexShrink: 0, marginTop: 1 }} /> },
    warning: { bg: "rgba(251,191,36,0.06)",  border: "rgba(251,191,36,0.25)",  icon: <AlertTriangle style={{ width: 14, height: 14, color: "#FBBF24", flexShrink: 0, marginTop: 1 }} /> },
    success: { bg: "rgba(52,211,153,0.06)",  border: "rgba(52,211,153,0.25)",  icon: <CheckCircle2  style={{ width: 14, height: 14, color: "#34D399", flexShrink: 0, marginTop: 1 }} /> },
  }[type];
  return (
    <div style={{ display: "flex", gap: 10, padding: "10px 14px", borderRadius: 10, border: `1px solid ${m.border}`, background: m.bg, marginBottom: 16 }}>
      {m.icon}
      <span style={{ color: C.muted, fontSize: 13, lineHeight: 1.65 }}>{children}</span>
    </div>
  );
}
function T({ headers, rows }: { headers: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <div style={{ overflowX: "auto", marginBottom: 20, borderRadius: 10, border: `1px solid ${C.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: C.accentGlow }}>
            {headers.map((h, i) => (
              <th key={i} style={{ textAlign: "left", padding: "9px 14px", fontSize: 11, fontWeight: 700, color: C.accent, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: i < rows.length - 1 ? `1px solid ${C.border}` : "none", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", fontSize: 13, color: C.muted, lineHeight: 1.55, verticalAlign: "top" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Badge({ children, color = C.accent }: { children: string; color?: string }) {
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 700, color, background: `${color}18`, border: `1px solid ${color}30`, marginRight: 6 }}>{children}</span>;
}
function CodeBlock({ children }: { children: string }) {
  return (
    <pre style={{ background: C.bgDeep, border: `1px solid ${C.border}`, borderRadius: 10, padding: "14px 16px", fontSize: 12.5, color: "#a5f3fc", overflowX: "auto", marginBottom: 16, lineHeight: 1.7 }}>
      <code>{children}</code>
    </pre>
  );
}

/* ─── Data types ────────────────────────────────────────────────────────── */

type Section = { id: string; title: string; content: React.ReactNode };
type Category = {
  id: string; label: string; icon: React.ElementType; color: string;
  tagline: string;
  quickLinks: { title: string; desc: string; sectionId: string }[];
  sections: Section[];
};

/* ─── Documentation Content ─────────────────────────────────────────────── */

const CATS: Category[] = [

  /* ════════════════════════════════════════════════════════
     1. GETTING STARTED
  ════════════════════════════════════════════════════════ */
  {
    id: "start", label: "Getting Started", icon: BookOpen, color: "#3b82f6",
    tagline: "Everything you need to go from zero to a fully governed workspace.",
    quickLinks: [
      { title: "What is ZoikoVertex?", desc: "The governed agentic architecture explained — three planes, 15 bounded contexts.", sectionId: "what-is" },
      { title: "First Steps", desc: "Connect accounts, invite your team, configure governance — in under 30 min.", sectionId: "first-steps" },
      { title: "Architecture Deep-Dive", desc: "Three-plane design, autonomy levels D0–D3, commercial tier breakdown.", sectionId: "architecture" },
      { title: "User Roles Reference", desc: "All 20 RBAC roles and what each one can and cannot do.", sectionId: "roles-ref" },
    ],
    sections: [
      {
        id: "what-is", title: "What is ZoikoVertex?",
        content: (
          <>
            <P>ZoikoVertex is a <strong style={{ color: C.text }}>governed autonomous agentic-intelligence social media management platform</strong> built for enterprises and regulated industries — financial services, healthcare, pharma, legal, and public sector.</P>
            <P>Unlike standard social media tools, every action in ZoikoVertex is <strong style={{ color: C.text }}>policy-aware, attributable to a human or agent identity, reversible under audit, and defensible in legal discovery.</strong> It is built as infrastructure — not just SaaS.</P>
            <H2>Three-Plane Architecture</H2>
            <T
              headers={["Plane", "Purpose", "Key Components"]}
              rows={[
                ["Control Plane", "Governance, identity, policy enforcement, approval routing", "Governance Engine, Policy Center, Approval Rules, Identity Ledger"],
                ["Data Plane", "Connector ingestion, scheduled publishing, attribution, analytics", "Social Inbox, Publishing Hub, Calendar, Media Vault, Analytics Engine"],
                ["Intelligence Plane", "Agent reasoning, optimisation, ROI forecasting, risk scoring", "Agent Studio, Workflow Engine, AI Campaigns, Prompt Governance"],
              ]}
            />
            <H2>15 Bounded Contexts</H2>
            <P>ZoikoVertex is built on 15 bounded contexts with no direct cross-context database access. Every interaction flows through defined APIs with full audit attribution.</P>
            <UL items={[
              "Identity & Access — users, roles, authentication, API keys",
              "Governance Engine — policies, approval rules, decision trees",
              "Campaign Management — Meta/Google campaigns and boost ads",
              "Publishing Hub — organic post scheduling, approval, publication",
              "Social Inbox — multi-platform message ingestion and reply",
              "Media Vault — asset management, version control, brand compliance",
              "Analytics Engine — performance data, attribution, ROI reporting",
              "Agent Runtime — agent execution, decision tracing, autonomy enforcement",
              "Workflow Orchestration — multi-step, multi-agent pipelines",
              "Knowledge Management — brand voice, product data, policy library",
              "Evidence Vault — immutable records, legal holds, forensic export",
              "Audit Trail — append-only action log with full attribution",
              "Integration Layer — OAuth connectors, webhooks, data connectors",
              "Notification & Alerting — SLA alerts, risk signals, governance notifications",
              "Superadmin — multi-workspace platform administration",
            ]} />
            <H2>Core Design Principles</H2>
            <UL items={[
              "<strong style='color:#fff'>Governance fails closed</strong> — agents degrade to Assistive Mode on any policy failure, never proceed without authorisation",
              "<strong style='color:#fff'>Autonomy is earned</strong> — agents progress through D0 to D3 trust levels with governance review at each step",
              "<strong style='color:#fff'>Evidence is a product asset</strong> — every action produces immutable, legally defensible audit records",
              "<strong style='color:#fff'>Human accountability is explicit</strong> — every approval is attributed to a named, authenticated identity",
              "<strong style='color:#fff'>Zero-bypass architecture</strong> — no role or agent can circumvent the governed execution path",
              "<strong style='color:#fff'>Private chain-of-thought</strong> — model reasoning is never exposed; only decision traces (what was decided and acted upon) are visible",
            ]} />
            <Note type="info">ZoikoVertex is designed so that compliance officers, legal teams, and executives can trust the platform — not just the marketing team.</Note>
          </>
        ),
      },
      {
        id: "first-steps", title: "First Steps",
        content: (
          <>
            <P>A new workspace can be fully configured in under 30 minutes following this sequence.</P>
            <H2>Step 1 — Connect Ad Accounts</H2>
            <P>Go to <strong style={{ color: C.text }}>Integrations → Platform Accounts</strong>. Connect Meta (Facebook/Instagram) and Google Ads via OAuth. For agencies: your agency&apos;s ad accounts are used for all client campaigns — clients do not connect their own.</P>
            <Note type="warning">If no ad accounts are connected, campaigns save as DRAFT and cannot be published. Connect at least one platform before creating campaigns.</Note>
            <H2>Step 2 — Invite Your Team</H2>
            <P>Go to <strong style={{ color: C.text }}>Access &amp; Organisation → Users &amp; Access</strong>. Click <strong style={{ color: C.text }}>Invite User</strong>, enter their email, and assign one of the 20 available roles. They receive a secure sign-up link (expires in 48 hours).</P>
            <Note type="info">Assign the minimum role needed. A Creator cannot approve content; an Approver cannot modify campaigns — this separation is intentional and required for governance compliance.</Note>
            <H2>Step 3 — Configure Governance Rules</H2>
            <P>Go to <strong style={{ color: C.text }}>Governance → Approval Rules</strong>. At minimum, create one rule: <em>all content submitted for publishing requires approval by at least one Approver.</em> You can build more granular rules from there.</P>
            <H2>Step 4 — Upload Brand Standards</H2>
            <P>Go to <strong style={{ color: C.text }}>Governance → Brand Standards</strong>. Upload your brand voice guide, approved vocabulary list, and visual identity rules. These become the policy baseline for AI agent content generation.</P>
            <H2>Step 5 — Create Your First Campaign</H2>
            <P>Go to <strong style={{ color: C.text }}>Campaigns → New Campaign</strong>. The six-step wizard covers: platform, campaign type, budget, targeting, creative, and review. Save as Draft to submit for governance review, or publish directly if your rules allow it.</P>
            <H2>Step 6 — Schedule Organic Content</H2>
            <P>Go to <strong style={{ color: C.text }}>Publishing Hub</strong>. Create a post, generate AI copy, attach media, set a publish time, and submit for approval. Once approved, the post is scheduled automatically.</P>
            <Note type="success">All six steps above can be completed in under 30 minutes for an initial workspace setup.</Note>
          </>
        ),
      },
      {
        id: "architecture", title: "Platform Architecture",
        content: (
          <>
            <H2>Agent Autonomy Levels</H2>
            <P>Every AI agent in ZoikoVertex operates at one of four autonomy levels. Moving from a lower level to a higher level requires explicit governance approval.</P>
            <T
              headers={["Level", "Name", "What the Agent Can Do", "Who Can Grant"]}
              rows={[
                ["D0", "Insight Only", "Surfaces recommendations and analysis. Zero execution capability. Human decides everything.", "Default — no grant required"],
                ["D1", "Approval Required", "Plans full actions, prepares execution packages, but blocks before every step pending explicit human approval.", "Agent Architect or Governance Admin"],
                ["D2", "Conditional Autonomy", "Executes independently within defined policy constraints. Any violation auto-escalates for human review before continuing.", "Governance Admin only"],
                ["D3", "Full Autonomy", "Executes fully within constraints. All decisions logged and reversible. Emergency lock can halt all D3 agents instantly.", "Workspace Owner + Governance Admin. Enterprise plan only."],
              ]}
            />
            <H2>Commercial Tiers</H2>
            <T
              headers={["Feature", "Starter", "Core", "Professional", "Enterprise"]}
              rows={[
                ["Users", "Up to 5", "Up to 15", "Up to 50", "Unlimited"],
                ["Campaigns (Meta/Google)", "✓", "✓", "✓", "✓"],
                ["Publishing Hub", "✓", "✓", "✓", "✓"],
                ["Social Inbox", "✓", "✓", "✓", "✓"],
                ["Analytics Engine", "Basic", "Standard", "Full", "Full + Custom"],
                ["Approval Workflows", "—", "Basic", "Full multi-step", "Full + SLA enforcement"],
                ["AI Agents", "—", "—", "D0 / D1", "D0 through D3"],
                ["Evidence Vault", "—", "—", "Read-only", "Full + Legal Export Packs"],
                ["Collusion Monitor", "—", "—", "—", "✓"],
                ["Forensic Investigation", "—", "—", "—", "✓"],
                ["SSO / SAML", "—", "—", "—", "✓"],
                ["Dedicated CSM", "—", "—", "—", "✓"],
              ]}
            />
          </>
        ),
      },
      {
        id: "roles-ref", title: "User Roles Reference",
        content: (
          <>
            <P>ZoikoVertex uses a 20-role RBAC system. Roles are assigned per workspace and determine which sections are visible and what actions can be taken. Assign the minimum role needed — separation of duties is a core governance requirement.</P>
            <T
              headers={["Role", "Category", "Can Do", "Cannot Do"]}
              rows={[
                ["ADMIN", "Administration", "Everything except billing and workspace deletion", "Billing changes, workspace deletion"],
                ["WORKSPACE_OWNER", "Administration", "Billing, plan changes, workspace deletion, all admin actions", "—"],
                ["GOVERNANCE_ADMIN", "Governance", "Configure approval rules, policies, approve escalations, override risk flags", "Billing, workspace deletion"],
                ["AGENT_ARCHITECT", "Agents", "Create, configure, and version agents, workflows, and prompts", "Deploy to production — requires Agent Operator"],
                ["AGENT_OPERATOR", "Agents", "Deploy agents, monitor operations feed, manage autonomy levels", "Create or modify agent definitions"],
                ["KNOWLEDGE_MANAGER", "Content", "Create, version, and approve knowledge base content", "Deploy agents or run campaigns"],
                ["CAMPAIGN_MANAGER", "Campaigns", "Create, launch, pause, resume, and delete campaigns", "Approve governance submissions"],
                ["CREATOR", "Content", "Create posts and campaign assets, submit for governance review", "Approve, publish, or reject content"],
                ["REVIEWER", "Governance", "Review and annotate submitted content, flag for revision", "Issue final approval or reject"],
                ["VALIDATOR", "Governance", "Validate content against brand and policy standards", "Issue final approval or reject"],
                ["APPROVER", "Governance", "Issue final approval for content publication", "Create content or run campaigns"],
                ["PUBLISHER", "Content", "Schedule and publish approved content", "Create content or approve submissions"],
                ["COMPLIANCE_REVIEWER", "Compliance", "Access Risk, Evidence, and Audit features, annotate records", "Modify content or configuration"],
                ["AUDITOR", "Compliance", "Read-only access to all audit and evidence features", "Modify anything — strictly read-only"],
                ["SECURITY_ADMIN", "Security", "User access management, API keys, security settings, IP allowlists", "Content creation or governance decisions"],
                ["PRIVACY_ADMIN", "Privacy", "Data retention rules, consent records, GDPR/CCPA controls", "Content creation or campaign management"],
                ["BRAND_REVIEWER", "Content", "Lock and unlock media assets, approve brand compliance", "Issue content approval or run campaigns"],
                ["DEVELOPER", "Integration", "Create/revoke API keys, configure webhooks, view integration health", "Content creation or governance decisions"],
                ["VIEWER", "Read-only", "View all sections in read-only mode", "Create, edit, approve, or delete anything"],
              ]}
            />
            <Note type="warning">Roles with approval authority (APPROVER, GOVERNANCE_ADMIN, VALIDATOR) cannot also hold CREATOR or CAMPAIGN_MANAGER roles in regulated deployments — this dual-role separation is enforced by Governance Admins.</Note>
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     2. CAMPAIGNS & PUBLISHING
  ════════════════════════════════════════════════════════ */
  {
    id: "campaigns", label: "Campaigns & Publishing", icon: Megaphone, color: "#f59e0b",
    tagline: "Paid campaigns, organic content, scheduling, and the social inbox.",
    quickLinks: [
      { title: "Campaigns", desc: "Create, launch, pause, and manage Meta and Google Ads campaigns.", sectionId: "campaigns-detail" },
      { title: "Publishing Hub", desc: "Schedule organic posts, generate AI copy, and submit for governance approval.", sectionId: "publishing-detail" },
      { title: "Social Inbox", desc: "Governed multi-platform inbox with assignment, SLA tracking, and AI replies.", sectionId: "inbox-detail" },
      { title: "Media Vault", desc: "Centralised asset library with version control and brand compliance locking.", sectionId: "media-vault" },
    ],
    sections: [
      {
        id: "campaigns-detail", title: "Campaigns",
        content: (
          <>
            <P>Campaigns are paid advertising initiatives on Meta (Facebook/Instagram) and Google Ads, managed entirely within ZoikoVertex. The agency&apos;s own connected ad accounts are used for all client campaigns.</P>
            <H2>Creating a Campaign — Six-Step Wizard</H2>
            <T
              headers={["Step", "What You Configure"]}
              rows={[
                ["1. Platform", "Meta Ads or Google Ads"],
                ["2. Campaign Type", "AWARENESS, TRAFFIC, ENGAGEMENT, LEADS, or SALES"],
                ["3. Budget & Schedule", "Daily or lifetime budget, currency, start date, optional end date"],
                ["4. Targeting", "Age range, gender, locations (city / country / radius), interests, custom audiences"],
                ["5. Ad Creative", "Headline (max 255 chars), body copy, call-to-action, image or video upload"],
                ["6. Review & Submit", "Save as DRAFT, submit for governance review, or (if rules allow) publish immediately"],
              ]}
            />
            <H2>Campaign Statuses</H2>
            <T
              headers={["Status", "Meaning", "Next Actions"]}
              rows={[
                ["DRAFT", "Saved locally. Not submitted to Meta/Google yet.", "Edit, Submit for Review, Delete"],
                ["PENDING_REVIEW", "Awaiting internal governance approval.", "Approver can Approve or Reject"],
                ["APPROVED", "Governance cleared. Awaiting publish.", "Publish Now or Schedule"],
                ["ACTIVE", "Live on the ad platform and spending.", "Pause, View Stats"],
                ["PAUSED", "Spend stopped. Campaign data preserved.", "Resume, Edit, Delete"],
                ["SCHEDULED", "Approved and set to go live at a future date.", "Edit schedule, Cancel"],
                ["COMPLETED", "End date reached.", "Duplicate as new campaign"],
                ["REJECTED", "Denied in governance review.", "View rejection reason, Edit, Resubmit"],
                ["FAILED", "Technical failure at Meta/Google API.", "Retry, View error detail"],
              ]}
            />
            <H2>AI Ad Copy Generation</H2>
            <P>On Step 5 of the campaign wizard, click the AI wand icon next to the ad copy field. Enter a brief prompt (product, audience, goal) and optional length instructions. ZoikoVertex calls the Groq API (Llama 3.3 70B) and inserts the generated copy into the editor. Regenerate as many times as needed — each attempt is free.</P>
            <H2>Meta Ads — Advanced Controls</H2>
            <UL items={[
              "<strong style='color:#fff'>Ad-level pause/resume</strong> — toggle individual ads inside a campaign without pausing the campaign itself",
              "<strong style='color:#fff'>Auto-deletion sync</strong> — if a campaign is deleted directly in Meta Ads Manager, ZoikoVertex detects the deletion on next page load and removes the local record automatically",
              "<strong style='color:#fff'>Boost detection</strong> — virtual boost ads (created by Meta&apos;s Boost Post) are detected and displayed as read-only items; they cannot be individually paused via the ZoikoVertex API",
              "<strong style='color:#fff'>Pixel tracking</strong> — go to Campaigns → Meta Pixels to manage your pixel IDs and verify installation",
            ]} />
            <H2>Google Ads Integration</H2>
            <P>Create Search and Display campaigns. ZoikoVertex manages ad group, keyword, and creative submission via the Google Ads API. Campaigns created in ZoikoVertex appear in your Google Ads Manager account within minutes of activation.</P>
            <Note type="warning">Campaign budgets set in ZoikoVertex are applied at the ad account level. Changes made directly in Meta Ads Manager or Google Ads Manager will not sync back to ZoikoVertex automatically — always manage budgets from ZoikoVertex to maintain a consistent record.</Note>
          </>
        ),
      },
      {
        id: "publishing-detail", title: "Publishing Hub",
        content: (
          <>
            <P>The Publishing Hub is the central interface for creating, scheduling, and governing organic social content before it goes live.</P>
            <H2>Post Editor</H2>
            <UL items={[
              "<strong style='color:#fff'>Platform selector</strong> — choose one or more: Facebook, Instagram, LinkedIn, X/Twitter, YouTube, Pinterest, Threads",
              "<strong style='color:#fff'>Copy editor</strong> — character count with per-platform limits enforced (X: 280 chars, LinkedIn: 3000 chars, etc.)",
              "<strong style='color:#fff'>AI Generate</strong> — describe what you want; AI generates platform-appropriate copy via Groq",
              "<strong style='color:#fff'>Media picker</strong> — select from Media Vault or upload directly (images, video, GIFs)",
              "<strong style='color:#fff'>Schedule</strong> — set a specific date and time or use AI-recommended optimal posting times",
              "<strong style='color:#fff'>Submit for Review</strong> — routes to your configured approval chain before any publish attempt",
            ]} />
            <H2>Post Statuses</H2>
            <T
              headers={["Status", "Meaning", "Who Acts Next"]}
              rows={[
                ["DRAFT", "In progress. Not submitted yet.", "Creator"],
                ["PENDING_REVIEW", "Submitted and waiting for governance approval.", "Reviewer / Validator / Approver"],
                ["CHANGES_REQUESTED", "Reviewer asked for revision without formal rejection.", "Creator"],
                ["APPROVED", "All required approvals collected. Ready to publish.", "Publisher or Scheduler"],
                ["SCHEDULED", "Approved and queued for a future publish time.", "System (auto-publishes at scheduled time)"],
                ["PUBLISHED", "Live on the platform.", "View, Archive"],
                ["REJECTED", "Denied in governance. Returned with reason.", "Creator (revise and resubmit)"],
                ["FAILED", "Publish attempt failed at platform API level.", "Creator or Admin (retry)"],
              ]}
            />
            <H2>AI Content Generation in Detail</H2>
            <P>Click the wand icon in the post editor. A panel opens with two fields:</P>
            <UL items={[
              "<strong style='color:#fff'>Prompt</strong> — describe the content: product name, audience, tone, goal, key message",
              "<strong style='color:#fff'>Length</strong> — short (under 100 chars), medium (100–280), long (280+), or platform default",
            ]} />
            <P>ZoikoVertex submits the prompt to <strong style={{ color: C.text }}>POST /api/v1/ai/generate-ad-copy</strong> (authenticated, plan-rate-limited). The Groq API returns up to 5 variations. Click any variation to insert it into the editor.</P>
            <H2>Publish Queue</H2>
            <P>Approved posts enter the Publish Queue. The queue shows next scheduled post, platform distribution, and any pending failures requiring retry. Admins and Publishers can re-order, reschedule, or remove posts from the queue.</P>
            <Note type="info">Governance approval is checked at publish time, not just at submission time. If a policy changes between approval and publishing, the post will be flagged and held for re-review.</Note>
          </>
        ),
      },
      {
        id: "calendar-detail", title: "Calendar & Review Queue",
        content: (
          <>
            <H2>Content Calendar</H2>
            <P>A time-based view of all scheduled posts, active campaigns, and governance deadlines. Toggle between month, week, and day views.</P>
            <UL items={[
              "Click any item to open its full detail view",
              "Drag and drop to reschedule posts that have not yet been submitted for approval",
              "Colour-coded by status: SCHEDULED (cyan), PENDING_REVIEW (amber), PUBLISHED (green), FAILED (red)",
              "Filter by platform, campaign, assignee, or content type",
              "Export calendar view as CSV or PDF for reporting",
            ]} />
            <H2>Review Queue</H2>
            <P>The Review Queue is where Reviewers, Validators, and Approvers action governance submissions. It shows all items awaiting action, sorted by SLA urgency.</P>
            <T
              headers={["Action", "Who Can Take It", "What Happens"]}
              rows={[
                ["Approve", "APPROVER, GOVERNANCE_ADMIN", "Passes this stage of the approval chain. If it&apos;s the final stage, post becomes APPROVED."],
                ["Request Changes", "REVIEWER, VALIDATOR, APPROVER", "Status becomes CHANGES_REQUESTED. Creator is notified with the reviewer&apos;s comment."],
                ["Reject", "APPROVER, GOVERNANCE_ADMIN", "Post becomes REJECTED. Rejection reason is mandatory and stored in the Evidence Vault."],
                ["Escalate", "Any reviewer role", "Routes the item to a Governance Admin or senior approver."],
                ["Annotate", "Any reviewer role", "Adds a compliance note to the submission record — does not change status."],
              ]}
            />
            <Note type="warning">Approval decisions are legally binding actions. Each one is written to the immutable Evidence Vault and cannot be altered after the fact.</Note>
          </>
        ),
      },
      {
        id: "inbox-detail", title: "Social Inbox",
        content: (
          <>
            <P>The Social Inbox aggregates all incoming messages, comments, mentions, and DMs from connected social platforms into a single governed, attributable workspace.</P>
            <H2>Three-Panel Layout</H2>
            <T
              headers={["Panel", "Contents"]}
              rows={[
                ["Left — Conversation List", "All conversations sorted by recency. Unread count badge per conversation. Platform icon (FB, IG, LI, X, etc.). Assignment status chip. SLA urgency indicator."],
                ["Centre — Thread View", "Full conversation thread with timestamps. Reply composer at bottom. Attach media, use AI-suggested replies, or type manually. Conversation status controls."],
                ["Right — Contact & Metadata", "Sender profile, platform metadata, conversation history, tags, assignment history, and all actions taken on this conversation."],
              ]}
            />
            <H2>Conversation Management</H2>
            <UL items={[
              "<strong style='color:#fff'>Assign</strong> — route a conversation to a specific team member",
              "<strong style='color:#fff'>Status</strong> — Open, Pending (waiting on customer), Resolved, Escalated",
              "<strong style='color:#fff'>Tag</strong> — custom labels for filtering and reporting (e.g. complaint, praise, inquiry, escalation)",
              "<strong style='color:#fff'>Priority</strong> — Low, Normal, High, Urgent",
            ]} />
            <H2>SLA Tracking</H2>
            <T
              headers={["Metric", "Description"]}
              rows={[
                ["First Response Time", "Time from message received to first reply sent"],
                ["Resolution Time", "Time from conversation opened to status set to Resolved"],
                ["SLA Breach Alert", "Notification fires when 80% of the SLA window has elapsed"],
                ["SLA Breach Log", "Breaches are logged in the Audit Trail and Evidence Vault"],
              ]}
            />
            <H2>AI-Assisted Replies</H2>
            <P>Click the AI wand in the reply composer. ZoikoVertex analyses the conversation context, the sender&apos;s platform, and your brand voice guidelines, and generates up to 3 reply options. Select one to insert into the composer. All AI-generated replies are flagged as &ldquo;AI Draft&rdquo; until a human edits or approves them.</P>
            <Note type="info">All replies sent from the Social Inbox are attributed to the sending user in the Audit Trail — the system never sends replies autonomously without at least D2 autonomy level configured.</Note>
          </>
        ),
      },
      {
        id: "media-vault", title: "Media Vault",
        content: (
          <>
            <P>The Media Vault is the centralised asset library for all images, videos, GIFs, and documents used across campaigns and posts.</P>
            <H2>Uploading Assets</H2>
            <UL items={[
              "Upload from your device or import from a URL",
              "Supported formats: JPEG, PNG, WebP, GIF, MP4, MOV, PDF, SVG",
              "Max file size: 100MB for video, 10MB for images",
              "Automatic metadata extraction: dimensions, duration, file size, format",
            ]} />
            <H2>Version Control</H2>
            <P>Every asset can have multiple versions. When you upload a new version of an existing asset, all previous versions are preserved and accessible. Posts and campaigns reference a specific version — updating an asset does not retroactively change already-published content.</P>
            <H2>Brand Compliance Lock</H2>
            <P>BRAND_REVIEWER roles can <strong style={{ color: C.text }}>lock</strong> assets that have been officially approved. Locked assets:</P>
            <UL items={[
              "Cannot be overwritten or deleted by any role other than BRAND_REVIEWER or ADMIN",
              "Are flagged as Brand-Approved in the asset picker",
              "Appear at the top of search results when selecting assets for campaigns",
            ]} />
            <H2>Searching and Filtering</H2>
            <UL items={[
              "Search by file name, tag, or content description",
              "Filter by file type, brand-lock status, upload date, uploader",
              "Bulk-select for download, tagging, or deletion",
            ]} />
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     3. ANALYTICS
  ════════════════════════════════════════════════════════ */
  {
    id: "analytics", label: "Analytics", icon: BarChart2, color: "#8b5cf6",
    tagline: "Cross-platform performance data, attribution, ROI reporting, and content scoring.",
    quickLinks: [
      { title: "Analytics Overview", desc: "Campaign and content performance across all connected platforms.", sectionId: "analytics-overview" },
      { title: "ROI & Attribution", desc: "Multi-touch attribution models, conversion tracking, and spend efficiency.", sectionId: "roi-attribution" },
      { title: "Content Performance", desc: "Post-level engagement scoring, reach, impressions, and A/B results.", sectionId: "content-perf" },
      { title: "Custom Reports", desc: "Build, schedule, and export custom reports to stakeholders.", sectionId: "custom-reports" },
    ],
    sections: [
      {
        id: "analytics-overview", title: "Analytics Overview",
        content: (
          <>
            <P>The Analytics Engine aggregates campaign and content performance data from all connected platforms into a single, real-time, cross-platform dashboard.</P>
            <H2>Dashboard Views</H2>
            <T
              headers={["View", "Contents"]}
              rows={[
                ["Executive Summary", "Total reach, total spend, blended ROAS, best-performing campaign, top platform — one number per KPI"],
                ["Campaign Performance", "Per-campaign breakdown: impressions, clicks, CTR, conversions, CPA, ROAS, spend vs. budget"],
                ["Content Performance", "Per-post: reach, impressions, engagement rate, saves, shares, link clicks"],
                ["Audience Insights", "Demographics breakdown (age, gender, location) across paid and organic audiences"],
                ["Platform Comparison", "Side-by-side metric comparison across Meta, Google, LinkedIn, X, YouTube"],
              ]}
            />
            <H2>Key Metrics Reference</H2>
            <T
              headers={["Metric", "Definition"]}
              rows={[
                ["Reach", "Unique accounts that saw your content at least once"],
                ["Impressions", "Total times your content was displayed (includes multiple views by same user)"],
                ["Engagement Rate", "(Likes + Comments + Shares + Saves) ÷ Reach × 100"],
                ["CTR (Click-Through Rate)", "Clicks ÷ Impressions × 100"],
                ["CPA (Cost Per Acquisition)", "Total spend ÷ Conversions"],
                ["ROAS (Return on Ad Spend)", "Conversion Value ÷ Total Spend"],
                ["CPM (Cost Per Mille)", "Cost per 1000 impressions"],
                ["Frequency", "Average number of times each person saw the ad"],
              ]}
            />
          </>
        ),
      },
      {
        id: "roi-attribution", title: "ROI & Attribution",
        content: (
          <>
            <H2>Attribution Models</H2>
            <T
              headers={["Model", "How It Works", "Best For"]}
              rows={[
                ["Last Click", "100% of conversion credit given to the last ad clicked", "Direct response campaigns with short conversion windows"],
                ["First Click", "100% credit to the first touchpoint", "Brand awareness measurement"],
                ["Linear", "Equal credit distributed across all touchpoints", "Multi-touch journeys"],
                ["Time Decay", "More credit to touchpoints closer to conversion", "Campaigns with longer consideration cycles"],
                ["Data-Driven", "ML model weights credit based on actual conversion paths in your account", "Accounts with 50+ conversions/week (Enterprise)"],
              ]}
            />
            <H2>Conversion Tracking</H2>
            <UL items={[
              "Meta pixel installation verified from Campaigns → Meta Pixels",
              "Google conversion tracking via Google Ads API",
              "Custom conversion events: purchase, lead form, sign-up, page view, scroll depth",
              "Offline conversion import (CSV upload) for enterprise accounts",
            ]} />
            <H2>Spend vs. Performance Benchmarks</H2>
            <P>ZoikoVertex compares your campaign performance against anonymised industry benchmarks (your sector and region) to contextualise whether your CTR, CPA, and ROAS are above or below the market average.</P>
          </>
        ),
      },
      {
        id: "content-perf", title: "Content Performance",
        content: (
          <>
            <H2>Post Scoring</H2>
            <P>Every published post receives an <strong style={{ color: C.text }}>Engagement Score</strong> (0–100) calculated 24 hours, 7 days, and 30 days post-publish. The score factors in: engagement rate, reach growth rate, save rate, and share rate — weighted by platform norms.</P>
            <H2>Best Time to Post</H2>
            <P>ZoikoVertex analyses your historical post performance by day and hour to recommend optimal publish windows per platform. Recommendations are shown in the Publishing Hub when setting a schedule time.</P>
            <H2>Hashtag and Keyword Analysis</H2>
            <UL items={[
              "Top performing hashtags from your posts over the last 90 days",
              "Competitor hashtag comparison (requires Social Listening add-on)",
              "Keyword co-occurrence map — which topics appear together in your top posts",
            ]} />
          </>
        ),
      },
      {
        id: "custom-reports", title: "Custom Reports",
        content: (
          <>
            <H2>Report Builder</H2>
            <P>Go to <strong style={{ color: C.text }}>Analytics → Custom Reports</strong>. Click <strong style={{ color: C.text }}>New Report</strong>. Select:</P>
            <UL items={[
              "<strong style='color:#fff'>Data sources</strong> — campaigns, posts, inbox, audience, or combined",
              "<strong style='color:#fff'>Dimensions</strong> — platform, campaign, content type, team member, date range",
              "<strong style='color:#fff'>Metrics</strong> — any combination of available KPIs",
              "<strong style='color:#fff'>Visualisation</strong> — bar chart, line chart, data table, scorecard",
              "<strong style='color:#fff'>Date range</strong> — preset (7d/30d/90d/12m) or custom range",
            ]} />
            <H2>Scheduled Delivery</H2>
            <P>Set a report to run automatically and email a PDF or CSV to specified recipients. Frequencies: daily, weekly, monthly, or custom cron. Recipients do not need a ZoikoVertex account to receive emailed reports.</P>
            <H2>Export Formats</H2>
            <UL items={[
              "<strong style='color:#fff'>PDF</strong> — branded report with charts and tables",
              "<strong style='color:#fff'>CSV</strong> — raw data for further analysis in Excel/Sheets",
              "<strong style='color:#fff'>JSON</strong> — structured data for integration with BI tools (Looker, Tableau, Power BI)",
            ]} />
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     4. AI AGENTS
  ════════════════════════════════════════════════════════ */
  {
    id: "agents", label: "AI Agents", icon: Bot, color: "#20E7F2",
    tagline: "Create, govern, and orchestrate autonomous AI agents with full audit trails.",
    quickLinks: [
      { title: "Agents Overview", desc: "Agent identity, autonomy levels D0–D3, and what makes ZoikoVertex agents different.", sectionId: "agents-overview" },
      { title: "Agent Studio", desc: "Create, configure, version, and deploy individual AI agents.", sectionId: "agent-studio" },
      { title: "Workflow Orchestration", desc: "Multi-step, multi-agent pipelines with governance checkpoints.", sectionId: "workflows" },
      { title: "Knowledge Bases", desc: "Brand voice, product data, compliance rules — what agents know and how.", sectionId: "knowledge" },
    ],
    sections: [
      {
        id: "agents-overview", title: "Agents Overview",
        content: (
          <>
            <P>AI agents in ZoikoVertex are <strong style={{ color: C.text }}>governed autonomous workers</strong> — not chatbots. They are identity-bearing actors with defined roles, scoped permissions, an auditable autonomy level, and a complete, immutable trace of every decision they make.</P>
            <H2>Agent Identity</H2>
            <UL items={[
              "Every agent has a unique system ID, name, avatar, and type designation",
              "Agent actions are attributed in all audit logs as <em>[Agent Name] via [Workspace]</em>",
              "Agents cannot impersonate human identities — all agentic activity is clearly labelled",
              "Agents have their own scope permissions separate from any human user&apos;s permissions",
              "Agents can be suspended, quarantined, or rolled back to a previous version at any time",
            ]} />
            <H2>What Makes ZoikoVertex Agents Different</H2>
            <T
              headers={["Standard AI Tools", "ZoikoVertex Agents"]}
              rows={[
                ["Black-box inference — no trace of what happened", "Full decision trace — every input, output, and decision logged"],
                ["No identity — actions attributed to the account", "Named agent identity — legally separable from human actors"],
                ["No approval gates — executes immediately", "Governance gates — can require human approval at each step"],
                ["Cannot be audited", "Full evidence vault records, suitable for legal discovery"],
                ["Cannot be rolled back", "Every config change versioned — rollback to any prior state instantly"],
              ]}
            />
            <H2>Agent Types</H2>
            <T
              headers={["Type", "Primary Capability"]}
              rows={[
                ["Content Agent", "Drafts captions, threads, articles, campaign copy, email copy"],
                ["Research Agent", "Analyses trends, competitor signals, and brand sentiment"],
                ["Optimisation Agent", "Recommends posting times, channel sequencing, budget adjustments"],
                ["Governance Agent", "Checks claims for policy compliance, flags risk, annotates submissions"],
                ["Response Agent", "Drafts replies for the Social Inbox, suggests escalation"],
                ["Compliance Agent", "Reviews content against regulatory requirements and flags violations"],
                ["Performance Insight Agent", "Analyses campaign data and proposes data-backed optimisations"],
              ]}
            />
          </>
        ),
      },
      {
        id: "agent-studio", title: "Agent Studio",
        content: (
          <>
            <P>Agent Studio is where Agent Architects create, configure, and deploy individual AI agents. Every configuration change creates a new version — no changes are destructive.</P>
            <H2>Creating an Agent — Step by Step</H2>
            <T
              headers={["Step", "What to Configure"]}
              rows={[
                ["1. Name & Type", "Display name, description, and type (Content, Research, Optimisation, etc.)"],
                ["2. Autonomy Level", "D0 to D3 — D0 is the default; higher levels require Governance Admin approval"],
                ["3. Permitted Actions", "Draft, Recommend, Analyze, Schedule, Publish, Reply, Moderate, Escalate, Report, Export"],
                ["4. Prohibited Actions", "Actions explicitly blocked regardless of autonomy level — cannot be bypassed"],
                ["5. Channel Scope", "Which social platforms the agent can act on: LinkedIn, X, Facebook, Instagram, YouTube, Blog/CMS, Internal"],
                ["6. Knowledge Bases", "Which knowledge bases the agent can query when generating content"],
                ["7. Governance Gates", "Which actions require human approval before execution"],
                ["8. Rate Limits", "Max actions per hour, max spend per day (for campaign-capable agents)"],
                ["9. Active Hours", "Restrict agent activity to specific hours/days"],
                ["10. Deploy", "Deploy to Staging (safe sandbox) or Production"],
              ]}
            />
            <H2>Versioning and Rollback</H2>
            <UL items={[
              "Every save creates a new version with a timestamp and the name of the saving user",
              "Version history shows a full diff of what changed between any two versions",
              "Rollback to any previous version in one click — rollback is itself versioned and audited",
              "Production agents cannot be downgraded in autonomy level without Governance Admin approval",
            ]} />
            <H2>Agent Templates</H2>
            <P>ZoikoVertex ships with 8 pre-built agent templates to accelerate deployment:</P>
            <UL items={[
              "Content Research Agent — reads knowledge bases, produces briefs. No publishing.",
              "Content Drafting Agent — drafts posts and captions. No external actions.",
              "Social Response Agent — drafts inbox replies. No auto-reply by default.",
              "Scheduling Recommendation Agent — recommends timing. No posting.",
              "Compliance Review Agent — flags policy issues. No content creation.",
              "Performance Insight Agent — analyses campaigns. Read-only analytics.",
              "SMB Starter Agent — simple draft + recommend for small teams.",
              "Enterprise Governance Agent — cross-brand policy review, evidence bundling.",
            ]} />
          </>
        ),
      },
      {
        id: "workflows", title: "Workflow Orchestration",
        content: (
          <>
            <P>Workflows are multi-step, multi-agent pipelines that automate complex operations with configurable governance checkpoints.</P>
            <H2>Built-In Workflow Types</H2>
            <T
              headers={["Workflow", "Typical Steps"]}
              rows={[
                ["Content Pipeline", "Brief → Draft (AI) → Brand Review → Governance Approval → Schedule → Publish"],
                ["Campaign Launch", "Brief → Creative (AI) → Targeting → Legal Review → Budget Approval → Activate"],
                ["Crisis Response", "Signal Detected → Alert Team → Pause Campaigns → Assess → Draft Response → Approve → Publish"],
                ["Campaign Handoff", "Source Agent releases ownership → Handoff review → Target Agent takes control"],
                ["Compliance Sweep", "Scheduled scan → Flag violations → Route to Compliance Reviewer → Remediation → Evidence record"],
              ]}
            />
            <H2>Approval Gates Within Workflows</H2>
            <P>Each step in a workflow can be configured with an approval gate:</P>
            <UL items={[
              "<strong style='color:#fff'>Single approver</strong> — one specific named individual must approve",
              "<strong style='color:#fff'>Role gate</strong> — any holder of a specified role may approve",
              "<strong style='color:#fff'>Quorum gate</strong> — a defined number of approvers must approve (e.g. 2 of 3)",
              "<strong style='color:#fff'>Sequential gate</strong> — Approver A must approve before Approver B is asked",
              "<strong style='color:#fff'>Unanimous gate</strong> — all configured approvers must approve",
            ]} />
            <H2>Workflow Monitoring</H2>
            <P>The Agent Operations view shows live status of every running workflow: current step, time elapsed, approvals collected vs. required, and any blockers. Agents and Operators can inject a comment, escalate a stuck step, or terminate a workflow entirely.</P>
          </>
        ),
      },
      {
        id: "autonomy-controls", title: "Autonomy Controls",
        content: (
          <>
            <P>Autonomy Controls is the Human-in-the-Loop (HITL) configuration centre — the mechanism by which humans stay in control of agents at all times.</P>
            <H2>Emergency Lock</H2>
            <P>The Emergency Lock button (red, on the Autonomy Controls page) <strong style={{ color: C.text }}>immediately suspends all agent execution across the entire workspace.</strong> All in-progress tasks are paused and queued for human review. An audit record is created with the identity of the person who triggered the lock.</P>
            <Note type="warning">Only WORKSPACE_OWNER and ADMIN roles can trigger and lift the Emergency Lock. Lifting the lock requires a written justification that is stored in the Evidence Vault.</Note>
            <H2>Negative Knowledge</H2>
            <P>Configure topics, phrases, and content categories that agents must <strong style={{ color: C.text }}>never engage with</strong>, regardless of autonomy level:</P>
            <UL items={[
              "Specific competitor names or products",
              "Regulatory topics requiring specialist sign-off (e.g. medical claims, financial projections)",
              "Crisis or sensitive subject areas",
              "Custom banned phrases from your legal or compliance team",
            ]} />
            <P>Negative Knowledge is enforced at the Decision Engine level. An agent attempting to generate content that matches a Negative Knowledge rule will receive a silent policy block and log an evidence record — the agent cannot reason around or bypass this constraint.</P>
          </>
        ),
      },
      {
        id: "knowledge", title: "Knowledge Bases",
        content: (
          <>
            <P>Knowledge Bases are curated information stores that agents query when generating content, making decisions, or answering questions about your brand.</P>
            <H2>Knowledge Base Types</H2>
            <T
              headers={["Type", "Typical Contents", "Who Manages"]}
              rows={[
                ["Brand Voice", "Tone guidelines, vocabulary, writing style rules, dos and don&apos;ts, example posts", "KNOWLEDGE_MANAGER"],
                ["Product Catalogue", "Product names, descriptions, prices, USPs, technical specs, availability", "KNOWLEDGE_MANAGER"],
                ["Campaign History", "Past campaign objectives, performance summaries, creative learnings, audience insights", "CAMPAIGN_MANAGER"],
                ["Compliance Rules", "Legal restrictions, regulatory requirements, banned phrases, required disclosures", "GOVERNANCE_ADMIN"],
                ["Audience Profiles", "Persona definitions, demographic data, psychographics, engagement patterns", "KNOWLEDGE_MANAGER"],
                ["FAQ Library", "Frequently asked questions and approved answers for Social Inbox response agents", "KNOWLEDGE_MANAGER"],
              ]}
            />
            <H2>Versioning Knowledge</H2>
            <P>Every change to a knowledge base entry creates a new version. Agents are pinned to a specific version of a knowledge base until an Agent Architect explicitly updates the reference. This prevents unexpected behaviour when policies are updated mid-campaign.</P>
          </>
        ),
      },
      {
        id: "prompt-governance", title: "Prompt Governance",
        content: (
          <>
            <P>Prompt Governance manages the full lifecycle of all AI system prompts used by agents — from creation and review, through versioning and approval, to retirement.</P>
            <H2>Prompt Lifecycle</H2>
            <T
              headers={["Stage", "Who Acts", "What Happens"]}
              rows={[
                ["Draft", "Agent Architect", "Prompt written and saved. Not active yet."],
                ["Under Review", "Governance Admin", "Reviewed for policy compliance, safety, and alignment with brand standards."],
                ["Approved", "Governance Admin", "Prompt is active and agents can be assigned to use it."],
                ["Deprecated", "Agent Architect / Governance Admin", "Retired from active use. All prior outputs referencing this prompt are preserved in the Evidence Vault."],
                ["Rejected", "Governance Admin", "Denied — reason is mandatory and stored. Architect can revise and resubmit."],
              ]}
            />
            <H2>Prompt Audit Records</H2>
            <P>Every time an agent runs using a prompt, a Prompt Execution Record is written to the Evidence Vault. It includes: the prompt version used, the input provided to the agent, and the output produced. This record is immutable.</P>
            <Note type="warning">Private model chain-of-thought is never exposed in ZoikoVertex. Only decision traces (what was decided and acted upon) are visible — not internal model reasoning steps.</Note>
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     5. GOVERNANCE
  ════════════════════════════════════════════════════════ */
  {
    id: "governance", label: "Governance", icon: ShieldCheck, color: "#10b981",
    tagline: "Approval workflows, policies, brand standards, risk controls, and content safety.",
    quickLinks: [
      { title: "Approval Rules", desc: "Define what requires review, who reviews it, and what happens when SLAs are missed.", sectionId: "approval-rules" },
      { title: "Policy Center", desc: "Regulatory, legal, internal, and platform-specific compliance policies.", sectionId: "policy-center" },
      { title: "Risk & Safety", desc: "Real-time risk scoring, content safety scanner, and intelligence signals.", sectionId: "risk-safety" },
      { title: "Collusion & Forensic", desc: "Coordinated inauthentic behaviour detection and investigation tooling.", sectionId: "collusion-forensic" },
    ],
    sections: [
      {
        id: "governance-overview", title: "Governance Overview",
        content: (
          <>
            <P>Governance is the <strong style={{ color: C.text }}>control layer</strong> that ensures every piece of content and every agent action has been properly reviewed, approved, and attributed before it reaches the outside world.</P>
            <H2>How It Works</H2>
            <UL items={[
              "Every content submission triggers an evaluation against your configured Approval Rules",
              "The system determines which approvers are required and in what order",
              "Content cannot be published until all required approvals are collected",
              "Any violation — policy breach, missing approval, or risk threshold breach — causes the system to <strong style='color:#fff'>fail closed</strong>: the action is blocked, not passed",
              "All governance decisions are immutable once recorded",
            ]} />
            <Note type="info">Governance rules are configured through the ZoikoVertex UI — no code changes required. Rules take effect immediately upon saving.</Note>
          </>
        ),
      },
      {
        id: "approval-rules", title: "Approval Rules",
        content: (
          <>
            <P>Approval Rules define when content must be reviewed and who must review it before it can be published.</P>
            <H2>Rule Builder Components</H2>
            <T
              headers={["Component", "Options"]}
              rows={[
                ["Trigger Condition", "Content type (post/campaign/ad), platform (Meta/LinkedIn/etc.), keyword match in copy, spend threshold exceeded, AI-generated flag, agent-created flag"],
                ["Approver Type", "Named individual, role-based (any holder of specified role), quorum (N of M), sequential (A then B), unanimous"],
                ["SLA Deadline", "Time allowed from submission to approval (hours). Default: 4 hours for posts, 24 hours for campaigns."],
                ["On SLA Breach", "Notify Governance Admin, auto-escalate to next approver tier, or block until manually cleared"],
                ["On Rejection", "Return to creator with mandatory reason, archive for compliance record, or escalate to Governance Admin"],
                ["Risk Threshold Override", "If risk score exceeds threshold, route to GOVERNANCE_ADMIN regardless of standard approval chain"],
              ]}
            />
            <H2>Example Rule Configurations</H2>
            <UL items={[
              "<strong style='color:#fff'>All content → any Approver</strong> — simple baseline rule; everything needs at least one approved",
              "<strong style='color:#fff'>AI-generated content → VALIDATOR + APPROVER sequential</strong> — extra validation before final approval",
              "<strong style='color:#fff'>Spend over £1,000 → Campaign Manager + Governance Admin quorum 2/2</strong> — high-spend campaigns need dual sign-off",
              "<strong style='color:#fff'>Keywords: [medication, clinical trial, cure] → Compliance Reviewer mandatory</strong> — regulated content requires specialist review",
            ]} />
            <Note type="warning">Approval rules are enforced at the Decision Engine level. They cannot be bypassed by any user role or agent, regardless of autonomy level.</Note>
          </>
        ),
      },
      {
        id: "policy-center", title: "Policy Center & Brand Standards",
        content: (
          <>
            <H2>Policy Center</H2>
            <P>The Policy Center stores and manages compliance policies. Policies are version-controlled, searchable, and attached to Approval Rules.</P>
            <T
              headers={["Policy Type", "Examples"]}
              rows={[
                ["Regulatory", "FCA financial promotions rules (COBS 4), HIPAA patient data restrictions, ASA advertising standards"],
                ["Legal", "Copyright and IP usage rules, endorsement disclosure requirements, comparative advertising limits"],
                ["Internal", "Spokesperson approval requirements, executive communication lockdown rules, M&A silent periods"],
                ["Platform", "Meta ad policies, LinkedIn professional standards, Google Ads restricted content categories"],
                ["Crisis", "Topics that trigger crisis protocol — auto-pause all active campaigns, notify crisis team"],
              ]}
            />
            <H2>Brand Standards</H2>
            <P>Brand Standards is the single source of truth for your organisation&apos;s brand voice, visual identity, and content guidelines.</P>
            <UL items={[
              "Brand voice and tone guidelines (formal, informal, conversational, authoritative)",
              "Approved vocabulary and banned phrases",
              "Visual standards — logo usage rules, approved colour palette, font specifications",
              "Approved creative templates with pre-cleared assets",
              "Platform-specific guidelines per social channel",
              "Competitor mention policy",
            ]} />
          </>
        ),
      },
      {
        id: "risk-safety", title: "Risk, Safety & Signals",
        content: (
          <>
            <H2>Risk Scoring</H2>
            <P>Every content submission and agent action receives an automated <strong style={{ color: C.text }}>Risk Score</strong> (0–100) combining:</P>
            <UL items={[
              "<strong style='color:#fff'>Policy match score</strong> — how closely the content aligns with or violates active policies",
              "<strong style='color:#fff'>Brand compliance score</strong> — alignment with brand voice and visual standards",
              "<strong style='color:#fff'>Platform risk score</strong> — likelihood of ad disapproval based on platform-specific rules",
              "<strong style='color:#fff'>Creator history score</strong> — historical rejection rate for this creator",
              "<strong style='color:#fff'>Spend exposure score</strong> — risk-adjusted spend value of the campaign",
            ]} />
            <T
              headers={["Score Range", "Classification", "Action"]}
              rows={[
                ["0–29", "Low Risk", "Normal approval chain"],
                ["30–59", "Medium Risk", "Additional reviewer automatically added to chain"],
                ["60–79", "High Risk", "COMPLIANCE_REVIEWER mandatory before standard approval chain"],
                ["80–100", "Critical Risk", "GOVERNANCE_ADMIN review required. Standard chain suspended until cleared."],
              ]}
            />
            <H2>Content Safety Scanner</H2>
            <P>An always-on scanner reviews all content before it enters the approval queue. It detects:</P>
            <UL items={[
              "Hate speech, discrimination, exclusionary language",
              "Misinformation patterns and unverifiable factual claims",
              "NSFW content (images and text)",
              "Regulatory trigger phrases (financial promises, medical claims)",
              "Crisis keywords that should trigger crisis protocol",
              "Personally identifiable information (PII) in ad copy",
            ]} />
            <H2>Signals Intelligence</H2>
            <P>Signals provides real-time intelligence feeds relevant to your content strategy and risk posture:</P>
            <T
              headers={["Signal Type", "Source", "Possible Action"]}
              rows={[
                ["Brand Sentiment", "Social listening across connected platforms", "Alert team if negative sentiment spikes"],
                ["Competitor Activity", "Public post monitoring of specified competitor accounts", "Notify Campaign Manager"],
                ["Platform Policy Updates", "Official platform developer newsfeeds", "Flag for Governance Admin review"],
                ["Regulatory Alerts", "Regulatory body RSS and announcement feeds", "Auto-add to Policy Center review queue"],
                ["Crisis Indicators", "Keyword monitoring + sentiment spike detection", "Trigger crisis protocol, pause campaigns"],
              ]}
            />
          </>
        ),
      },
      {
        id: "collusion-forensic", title: "Collusion Monitor & Forensic Investigation",
        content: (
          <>
            <H2>Collusion Monitor</H2>
            <P>The Collusion Monitor detects patterns of <strong style={{ color: C.text }}>coordinated inauthentic behaviour</strong> and governance circumvention within your workspace:</P>
            <UL items={[
              "<strong style='color:#fff'>Circular approval</strong> — User A approves User B&apos;s content, User B approves User A&apos;s content, with no independent review",
              "<strong style='color:#fff'>Rubber-stamping</strong> — an approver approves content in under 5 seconds without apparent review",
              "<strong style='color:#fff'>Agent-human collusion</strong> — agent and its creator approve each other&apos;s submissions in a loop",
              "<strong style='color:#fff'>Split circumvention</strong> — content is broken into fragments to avoid per-piece governance thresholds",
            ]} />
            <P>Detected patterns raise a Risk Alert in the Evidence Vault and notify the Governance Admin.</P>
            <H2>Forensic Investigation</H2>
            <P>For formal investigations, go to <strong style={{ color: C.text }}>Governance → Forensic Investigation</strong>. Create a case by specifying scope:</P>
            <UL items={[
              "<strong style='color:#fff'>Actor-based</strong> — all actions by a specific user or agent",
              "<strong style='color:#fff'>Content-based</strong> — all actions related to a specific post, campaign, or asset",
              "<strong style='color:#fff'>Time-boxed</strong> — all actions within a specified date range",
              "<strong style='color:#fff'>Event-based</strong> — all actions related to a specific governance event",
            ]} />
            <P>The system automatically pulls all relevant Evidence Vault records into the case file. Cases can be <strong style={{ color: C.text }}>Referred</strong> to external bodies (regulators, legal team) with a full signed evidence export (PDF + JSON + chain-of-custody document).</P>
            <Note type="info">Evidence Packs include a cryptographic hash of every included record. Any tampering with exported records is detectable by comparing the hash. Available on Enterprise plans.</Note>
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     6. EVIDENCE
  ════════════════════════════════════════════════════════ */
  {
    id: "evidence", label: "Evidence", icon: Archive, color: "#ef4444",
    tagline: "Immutable audit trail, evidence vault, legal holds, and identity ledger.",
    quickLinks: [
      { title: "Audit Trail", desc: "Complete, append-only log of every action taken by humans, agents, and the system.", sectionId: "audit-trail" },
      { title: "Evidence Vault", desc: "Structured, signed, legally-defensible evidence records and export packs.", sectionId: "evidence-vault" },
      { title: "Legal Holds", desc: "Freeze records for legal proceedings and manage hold lifecycle.", sectionId: "legal-holds" },
      { title: "Identity Ledger", desc: "Permanent record of every identity that has ever existed in your workspace.", sectionId: "identity-ledger" },
    ],
    sections: [
      {
        id: "audit-trail", title: "Audit Trail",
        content: (
          <>
            <P>The Audit Trail is a <strong style={{ color: C.text }}>complete, append-only log of every action</strong> taken in ZoikoVertex — by humans, agents, and the system itself. Nothing is ever deleted from the Audit Trail.</P>
            <H2>What Is Logged</H2>
            <T
              headers={["Category", "Events Logged"]}
              rows={[
                ["Authentication", "Every login, logout, failed login, session expiry, password change, 2FA events"],
                ["Content", "Create, edit, submit, approve, reject, publish, archive, delete for every post and campaign asset"],
                ["Campaigns", "Create, edit, submit, activate, pause, resume, complete, delete — including all spend changes"],
                ["Agent Actions", "Every agent execution: decision made, action taken, output produced, prompt version used"],
                ["Governance", "Every approval, rejection, escalation, annotation, rule change, policy update"],
                ["Configuration", "Every settings change — who changed what, previous value, new value"],
                ["Access", "Every role assignment, role removal, API key creation, API key revocation"],
                ["API Calls", "Every authenticated API call: endpoint, user identity, timestamp, response code"],
              ]}
            />
            <H2>Filtering and Search</H2>
            <UL items={[
              "Filter by actor (user name, agent name, system)",
              "Filter by event type or category",
              "Filter by date range",
              "Full-text search across all log fields",
              "Export filtered results as CSV or JSON",
            ]} />
            <Note type="success">The Audit Trail satisfies logging requirements for SOC 2 Type II, ISO 27001, FCA COBS 4, HIPAA, and GDPR Article 30 out of the box.</Note>
          </>
        ),
      },
      {
        id: "evidence-vault", title: "Evidence Vault",
        content: (
          <>
            <P>The Evidence Vault stores <strong style={{ color: C.text }}>structured, signed evidence records</strong> that are legally defensible and suitable for regulatory submission, legal discovery, or litigation support.</P>
            <H2>Evidence Record Types</H2>
            <T
              headers={["Type", "What It Captures"]}
              rows={[
                ["Approval Record", "Who approved, when (ms precision), what content or action, which policy version was active at time of approval, digital signature"],
                ["Rejection Record", "Who rejected, when, mandatory rejection reason, reviewer identity, content state at time of rejection"],
                ["Agent Decision", "Agent identity, model used, prompt version, input provided, output generated, autonomy level active"],
                ["Policy Acknowledgement", "User confirmed reading a policy before performing a restricted action — timestamped and signed"],
                ["Emergency Action", "Emergency lock trigger, crisis protocol activation — identity, time, written justification"],
                ["Escalation Record", "Why escalated, from whom, to whom, stated reason, outcome and resolution"],
                ["Collusion Alert", "Pattern detected, actors involved, evidence references, risk score"],
              ]}
            />
            <H2>Evidence Integrity</H2>
            <P>Every record includes:</P>
            <UL items={[
              "A <strong style='color:#fff'>SHA-256 cryptographic hash</strong> of the record contents",
              "A <strong style='color:#fff'>server-side timestamp</strong> (cannot be altered client-side)",
              "The <strong style='color:#fff'>identity token</strong> of the actor (human or agent)",
              "A <strong style='color:#fff'>chain-of-custody reference</strong> linking to related records",
            ]} />
            <Note type="warning">Evidence Vault records are append-only. They cannot be modified or deleted. Attempting to alter a record is detectable via hash mismatch and is itself logged.</Note>
            <H2>Evidence Packs</H2>
            <P>Generate a bundled Evidence Pack for any investigation or regulatory submission. Packs contain:</P>
            <UL items={[
              "All relevant Vault records in machine-readable JSON",
              "Human-readable PDF report with signatures",
              "Chain-of-custody document listing every access to the records",
              "A root hash covering the entire pack — any tampering invalidates the root",
            ]} />
          </>
        ),
      },
      {
        id: "legal-holds", title: "Legal Holds",
        content: (
          <>
            <P>Legal Holds freeze all Evidence Vault records related to a specific scope — preventing any automatic deletion, archival, or data retention policy from affecting records while legal proceedings are active.</P>
            <H2>Creating a Legal Hold</H2>
            <UL items={[
              "Go to Evidence → Legal Holds → New Hold",
              "Name the hold and provide a legal reference (case number, matter name)",
              "Define the scope: by actor, by content, by date range, by campaign, or a combination",
              "Assign a Hold Manager (must be GOVERNANCE_ADMIN or WORKSPACE_OWNER)",
              "Set an estimated review date (can be extended)",
              "The system immediately prevents any retention policy from affecting in-scope records",
            ]} />
            <H2>Releasing a Hold</H2>
            <P>Releasing a Legal Hold requires:</P>
            <UL items={[
              "A written release justification",
              "Approval from the Hold Manager",
              "If the hold was placed by an external request (regulator, court), a reference to the release authority",
            ]} />
            <P>The release action is itself logged in the Evidence Vault.</P>
            <Note type="warning">Legal Holds are available on Enterprise plans only. Consult your legal team before placing or releasing any hold in a live legal proceeding.</Note>
          </>
        ),
      },
      {
        id: "identity-ledger", title: "Identity Ledger",
        content: (
          <>
            <P>The Identity Ledger maintains a <strong style={{ color: C.text }}>permanent, immutable record of every identity</strong> that has ever existed in your workspace — human users, AI agents, and API keys — and every action taken under each identity.</P>
            <H2>What the Ledger Records</H2>
            <T
              headers={["Identity Type", "Recorded Information"]}
              rows={[
                ["Human User", "Name, email, all roles ever held (with date ranges), all actions taken, all login events, suspension/removal events"],
                ["AI Agent", "Name, all versions with configs, all executions, all autonomy level changes, suspension/retirement events"],
                ["API Key", "Key name, creating user, scope, creation timestamp, all API calls made, revocation event"],
              ]}
            />
            <H2>Non-Deletability</H2>
            <P>Even when a user is suspended or removed from the workspace, their Identity Ledger record is <strong style={{ color: C.text }}>preserved permanently</strong>. This is required for post-departure audit investigations — you must be able to reconstruct who did what, even after they leave.</P>
            <Note type="info">The Identity Ledger satisfies FCA SM&CR individual accountability requirements, where regulated firms must maintain records of senior managers&apos; decisions and actions.</Note>
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     7. INTEGRATIONS
  ════════════════════════════════════════════════════════ */
  {
    id: "integrations", label: "Integrations", icon: Plug, color: "#06b6d4",
    tagline: "Social platforms, REST API, webhooks, and data connectors.",
    quickLinks: [
      { title: "Platform Accounts", desc: "Connect Meta, Google Ads, LinkedIn, X, YouTube, Pinterest, Threads.", sectionId: "platform-accounts" },
      { title: "REST API", desc: "API keys, base URL, authentication, and endpoint reference.", sectionId: "rest-api" },
      { title: "Webhooks", desc: "Configure real-time event delivery to your external systems.", sectionId: "webhooks" },
      { title: "Data Connectors", desc: "BigQuery, Slack, Teams, Zapier, and custom HTTP event streams.", sectionId: "data-connectors" },
    ],
    sections: [
      {
        id: "platform-accounts", title: "Platform Accounts",
        content: (
          <>
            <T
              headers={["Platform", "Capabilities", "Auth Method", "Status"]}
              rows={[
                ["Meta (Facebook/Instagram)", "Campaigns, ad boosts, organic posts, Social Inbox, Pixel management", "OAuth 2.0 → Meta Business login", "Full support"],
                ["Google Ads", "Search and Display campaigns, budget management", "OAuth 2.0 → Google Account", "Full support"],
                ["LinkedIn", "Organic posts, Social Inbox comments and DMs", "OAuth 2.0 → LinkedIn OAuth", "Full support"],
                ["X / Twitter", "Organic posts, Social Inbox mentions and DMs", "OAuth 2.0 → Twitter OAuth", "Full support"],
                ["YouTube", "Organic video posts and community posts", "OAuth 2.0 → Google Account", "Full support"],
                ["Pinterest", "Organic Pin creation and board management", "OAuth 2.0 → Pinterest OAuth", "Full support"],
                ["Threads", "Organic posts and inbox replies", "OAuth 2.0 → Instagram OAuth", "Full support"],
              ]}
            />
            <H2>Connecting a Platform Account</H2>
            <UL items={[
              "Go to <strong style='color:#fff'>Integrations → Platform Accounts</strong>",
              "Click <strong style='color:#fff'>Connect</strong> next to the platform",
              "Authenticate via OAuth — you are redirected to the platform&apos;s authorisation page",
              "Select the pages, ad accounts, or profiles you want to connect",
              "Return to ZoikoVertex — the account is now active",
            ]} />
            <H2>Token Health Monitoring</H2>
            <P>OAuth tokens expire. ZoikoVertex monitors token expiry and alerts the DEVELOPER or ADMIN role 7 days before a token expires. Expired tokens cause the connected platform to show as Disconnected and all publishing and campaign actions for that platform are blocked until the token is refreshed.</P>
            <Note type="info">For Meta and Google Ads, the <strong style={{ color: C.text }}>agency&apos;s own ad accounts are used for all campaigns</strong>. Clients do not connect their own accounts.</Note>
          </>
        ),
      },
      {
        id: "rest-api", title: "REST API",
        content: (
          <>
            <H2>Base URL</H2>
            <CodeBlock>{`https://your-instance.zoikovertex.com/api/v1`}</CodeBlock>
            <H2>Authentication</H2>
            <P>All API calls require a Bearer token in the Authorization header:</P>
            <CodeBlock>{`Authorization: Bearer <your-api-key>`}</CodeBlock>
            <P>API keys are created in <strong style={{ color: C.text }}>Integrations → API &amp; Webhooks</strong>. Each key has a scope (read-only or read/write) and can be revoked at any time.</P>
            <H2>Key Endpoint Groups</H2>
            <T
              headers={["Group", "Base Path", "Example Endpoints"]}
              rows={[
                ["Campaigns", "/campaigns", "GET /campaigns, POST /campaigns, PATCH /campaigns/:id/pause"],
                ["Posts", "/posts", "GET /posts, POST /posts, PATCH /posts/:id/submit"],
                ["Inbox", "/inbox", "GET /inbox/conversations, POST /inbox/reply"],
                ["Analytics", "/analytics", "GET /analytics/campaigns, GET /analytics/posts"],
                ["Agents", "/agents", "GET /agents, POST /agents/:id/execute"],
                ["Governance", "/governance", "GET /governance/approvals, POST /governance/approvals/:id/approve"],
                ["AI", "/ai", "POST /ai/generate-ad-copy, POST /ai/generate-post-copy"],
                ["Audit", "/audit", "GET /audit/trail, GET /audit/evidence"],
              ]}
            />
            <H2>Rate Limits</H2>
            <T
              headers={["Plan", "Requests/min", "Requests/day"]}
              rows={[
                ["Starter", "60", "5,000"],
                ["Core", "120", "20,000"],
                ["Professional", "300", "100,000"],
                ["Enterprise", "1,000", "Unlimited"],
              ]}
            />
            <Note type="info">Rate limit headers are returned on every response: <code style={{ color: C.accent }}>X-RateLimit-Limit</code>, <code style={{ color: C.accent }}>X-RateLimit-Remaining</code>, <code style={{ color: C.accent }}>X-RateLimit-Reset</code>.</Note>
          </>
        ),
      },
      {
        id: "webhooks", title: "Webhooks",
        content: (
          <>
            <P>Webhooks deliver real-time event notifications to your external systems when specific events occur in ZoikoVertex.</P>
            <H2>Available Events</H2>
            <T
              headers={["Event", "Description"]}
              rows={[
                ["content.published", "A post went live on a connected platform"],
                ["content.rejected", "A governance reviewer rejected a post"],
                ["content.approval_requested", "Content entered the approval queue"],
                ["campaign.activated", "A campaign went live on Meta or Google"],
                ["campaign.paused", "A campaign was paused"],
                ["campaign.failed", "A campaign submission to Meta/Google failed"],
                ["approval.completed", "All required approvals were collected"],
                ["agent.escalation", "An agent escalated an action for human review"],
                ["agent.executed", "An agent completed an execution step"],
                ["evidence.alert", "A new risk or compliance alert was raised"],
                ["inbox.new_message", "A new message arrived in the Social Inbox"],
                ["user.invited", "A new user was invited to the workspace"],
              ]}
            />
            <H2>Webhook Payload Shape</H2>
            <CodeBlock>{`{
  "event": "content.published",
  "workspace_id": "ws_abc123",
  "timestamp": "2026-06-15T10:30:00.000Z",
  "actor": { "type": "user", "id": "u_xyz", "name": "Vignesh" },
  "data": { ... event-specific payload ... }
}`}</CodeBlock>
            <H2>Delivery Guarantees</H2>
            <UL items={[
              "Your endpoint must respond with HTTP 200 within 5 seconds",
              "Failed deliveries are retried up to 3 times with exponential backoff (5s, 25s, 125s)",
              "After 3 failures, the event is marked as Dead Letter and can be manually replayed from the Webhooks dashboard",
              "Webhook signatures are included in the <code style='color:#20E7F2'>X-Zoiko-Signature</code> header (HMAC-SHA256)",
            ]} />
          </>
        ),
      },
      {
        id: "data-connectors", title: "Data Connectors & Health",
        content: (
          <>
            <H2>Available Connectors</H2>
            <T
              headers={["Connector", "What It Does"]}
              rows={[
                ["BigQuery", "Exports campaign and post performance data to your BigQuery dataset on a configurable schedule (hourly/daily)"],
                ["Snowflake", "Same as BigQuery — exports to Snowflake schema"],
                ["Amazon Redshift", "Exports to Redshift cluster"],
                ["Slack", "Posts governance notifications, approval requests, and alerts to specified Slack channels"],
                ["Microsoft Teams", "Same as Slack — for Teams users"],
                ["Zapier", "Triggers Zaps from ZoikoVertex events — connects to 5,000+ apps"],
                ["Custom HTTP", "Raw event stream in JSON to any HTTP endpoint — your own internal tooling"],
              ]}
            />
            <H2>Integration Health Dashboard</H2>
            <P>Go to <strong style={{ color: C.text }}>Integrations → Integration Health</strong>. Every connected service shows:</P>
            <UL items={[
              "<strong style='color:#fff'>Status</strong> — Green (Operational), Amber (Degraded), Red (Down), Grey (Disconnected)",
              "<strong style='color:#fff'>OAuth token expiry</strong> — days remaining before re-auth required",
              "<strong style='color:#fff'>API response time</strong> — rolling 24h average latency to the platform API",
              "<strong style='color:#fff'>Rate limit headroom</strong> — current usage vs. your platform API rate limits",
              "<strong style='color:#fff'>Last successful sync</strong> — timestamp of the last successful data operation",
              "<strong style='color:#fff'>Error log</strong> — last 50 errors for the integration with full error messages",
            ]} />
          </>
        ),
      },
    ],
  },

  /* ════════════════════════════════════════════════════════
     8. SYSTEM & ADMIN
  ════════════════════════════════════════════════════════ */
  {
    id: "system", label: "System & Admin", icon: Settings, color: "#64748b",
    tagline: "Workspace settings, billing, security, privacy, and platform administration.",
    quickLinks: [
      { title: "Workspace Settings", desc: "Name, timezone, currency, 2FA policy, and session controls.", sectionId: "workspace-settings" },
      { title: "Security & Privacy", desc: "2FA, SSO, IP allowlist, data retention, and GDPR controls.", sectionId: "security-privacy" },
      { title: "Notifications", desc: "Configure alert channels, priority thresholds, and delivery methods.", sectionId: "notifications" },
      { title: "Developer Console", desc: "API key management, webhook configuration, and system diagnostics.", sectionId: "developer-console" },
    ],
    sections: [
      {
        id: "workspace-settings", title: "Workspace Settings",
        content: (
          <>
            <H2>General Configuration</H2>
            <T
              headers={["Setting", "Description", "Who Can Change"]}
              rows={[
                ["Workspace Name", "Display name shown across the platform", "ADMIN, WORKSPACE_OWNER"],
                ["Workspace Logo", "Logo shown in headers and reports", "ADMIN, WORKSPACE_OWNER"],
                ["Default Timezone", "Used for scheduling posts and campaign times", "ADMIN"],
                ["Default Currency", "Default for campaign budget display", "ADMIN"],
                ["Content Approval SLA", "Default time window for approval (hours)", "GOVERNANCE_ADMIN"],
                ["Agent Execution Hours", "Restrict all agent activity to business hours only", "GOVERNANCE_ADMIN"],
                ["2FA Enforcement", "Require 2FA for all users or for specific roles", "SECURITY_ADMIN"],
                ["Session Timeout", "Inactivity timeout in minutes (default: 30)", "SECURITY_ADMIN"],
              ]}
            />
            <H2>Billing and Plan</H2>
            <P>Go to <strong style={{ color: C.text }}>Admin → Billing</strong>. Only WORKSPACE_OWNER can access billing. You can:</P>
            <UL items={[
              "View current plan and renewal date",
              "Upgrade or downgrade plan (downgrade takes effect at next billing cycle)",
              "Update payment method",
              "Download past invoices",
              "View usage metrics — users, agent executions, API calls, storage",
            ]} />
          </>
        ),
      },
      {
        id: "security-privacy", title: "Security & Privacy",
        content: (
          <>
            <H2>Authentication Security</H2>
            <UL items={[
              "<strong style='color:#fff'>Two-Factor Authentication (2FA)</strong> — TOTP app (Google Authenticator, Authy) or SMS. Enforce for all users or by role.",
              "<strong style='color:#fff'>Single Sign-On (SSO/SAML 2.0)</strong> — integrate with your identity provider (Okta, Azure AD, Google Workspace). Enterprise plan only.",
              "<strong style='color:#fff'>IP Allowlist</strong> — restrict ZoikoVertex access to specified IP ranges or CIDR blocks",
              "<strong style='color:#fff'>Session Timeout</strong> — configurable inactivity timeout; forced re-authentication",
              "<strong style='color:#fff'>Concurrent Session Limit</strong> — optionally prevent users from being logged in from multiple devices simultaneously",
            ]} />
            <H2>Data Retention</H2>
            <T
              headers={["Data Category", "Default Retention", "Minimum Recommended"]}
              rows={[
                ["Content Drafts (never published)", "90 days", "30 days"],
                ["Published Posts", "2 years", "1 year"],
                ["Campaign Records", "3 years", "2 years"],
                ["Audit Trail", "7 years", "7 years (regulatory minimum)"],
                ["Evidence Vault Records", "Permanent", "Permanent"],
                ["Identity Ledger", "Permanent (non-configurable)", "Permanent"],
              ]}
            />
            <H2>GDPR / CCPA Controls</H2>
            <UL items={[
              "<strong style='color:#fff'>Data Subject Access Request (DSAR)</strong> — export all data held for a specific user",
              "<strong style='color:#fff'>Right to Erasure</strong> — delete a user&apos;s personal data (note: Audit Trail records are retained as required by law even after erasure)",
              "<strong style='color:#fff'>Consent Records</strong> — log user consents for data processing",
              "<strong style='color:#fff'>Data Processing Agreements (DPAs)</strong> — generate and sign DPAs with team members",
              "<strong style='color:#fff'>Privacy Notice</strong> — configure the privacy notice shown during onboarding",
            ]} />
            <Note type="warning">Audit log retention below 7 years is not recommended for regulated industries. Consult your compliance team before reducing retention periods.</Note>
          </>
        ),
      },
      {
        id: "notifications", title: "Notifications",
        content: (
          <>
            <H2>Notification Channels</H2>
            <UL items={[
              "<strong style='color:#fff'>In-app</strong> — shown in the notification bell in the top nav. Persisted for 90 days.",
              "<strong style='color:#fff'>Email</strong> — sent to the user&apos;s registered email address",
              "<strong style='color:#fff'>Slack</strong> — via the Slack integration; route to specific channels by priority or type",
              "<strong style='color:#fff'>Microsoft Teams</strong> — via the Teams integration",
              "<strong style='color:#fff'>Webhook</strong> — via your configured webhook endpoint",
            ]} />
            <H2>Notification Priority Levels</H2>
            <T
              headers={["Priority", "Examples", "Default Channels"]}
              rows={[
                ["Urgent", "Emergency lock triggered, security breach, Legal Hold placed, crisis protocol activated", "In-app + Email + Slack (immediate)"],
                ["High", "Approval SLA breached, agent escalation, campaign failed, token expired", "In-app + Email"],
                ["Medium", "Content submitted for review, campaign activated, new inbox message", "In-app"],
                ["Low", "Workflow completed, report ready, new team member joined", "In-app (batched daily digest option)"],
              ]}
            />
            <H2>Notification Preferences</H2>
            <P>Each user can configure their personal notification preferences at <strong style={{ color: C.text }}>Profile → Notification Settings</strong>. Workspace Admins can set minimum notification policies — e.g. Urgent notifications cannot be muted by individual users.</P>
          </>
        ),
      },
      {
        id: "developer-console", title: "Developer Console",
        content: (
          <>
            <P>Go to <strong style={{ color: C.text }}>Integrations → Developer Console</strong>. This section is for DEVELOPER and ADMIN roles managing the technical integration layer.</P>
            <H2>API Key Management</H2>
            <UL items={[
              "Create named keys with descriptions (e.g. &ldquo;Zapier Integration — Marketing&rdquo;, &ldquo;BI Dashboard — Read Only&rdquo;)",
              "Assign scope: <strong style='color:#fff'>read-only</strong> (GET endpoints only) or <strong style='color:#fff'>read/write</strong> (all endpoints)",
              "View last-used timestamp for each key",
              "Revoke keys immediately — revocation takes effect within seconds",
              "Key values are shown only once at creation — store them securely",
            ]} />
            <H2>Webhook Endpoints</H2>
            <P>Configure one or more webhook endpoints. For each endpoint:</P>
            <UL items={[
              "Set the destination URL (must be HTTPS)",
              "Select which event types to deliver",
              "Copy the signing secret to verify webhook signatures in your receiver",
              "View delivery history — last 200 deliveries with status codes and response bodies",
              "Manually replay failed or dead-lettered events",
            ]} />
            <H2>System Diagnostics</H2>
            <P>Go to <strong style={{ color: C.text }}>Integrations → Integration Health</strong> for live service health. This shows database connectivity, background job queue depth, API gateway response time, and platform connector statuses — all in one view.</P>
          </>
        ),
      },
    ],
  },
];

/* ─── Page Component ────────────────────────────────────────────────────── */

export default function DocsPage() {
  const [activeCatId, setActiveCatId]       = useState("start");
  const [activeSectionId, setActiveSectionId] = useState("what-is");
  const [search, setSearch]                 = useState("");
  const [helpful, setHelpful]               = useState<"yes" | "no" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const mainRef   = useRef<HTMLDivElement>(null);

  const activeCat     = CATS.find(c => c.id === activeCatId)!;
  const activeSection = activeCat.sections.find(s => s.id === activeSectionId);

  const allSections = useMemo(() =>
    CATS.flatMap(c => c.sections.map(s => ({ ...s, catId: c.id, catLabel: c.label }))), []);

  const searchResults = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return null;
    return allSections.filter(s => s.title.toLowerCase().includes(q)).slice(0, 8);
  }, [search, allSections]);

  // Keyboard shortcut Ctrl+K / Cmd+K opens search
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === "Escape") setSearch("");
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const navigate = (catId: string, sectionId: string) => {
    setActiveCatId(catId);
    setActiveSectionId(sectionId);
    setSearch("");
    setHelpful(null);
    if (mainRef.current) mainRef.current.scrollTop = 0;
  };

  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; overflow: hidden; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(32,231,242,0.15); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: rgba(32,231,242,0.30); }
        .ql { transition: background 120ms, border-color 120ms, color 120ms; }
        .ql:hover { background: rgba(32,231,242,0.06) !important; }
        .nav-tab { transition: all 150ms; border-bottom: 2px solid transparent; }
        .nav-tab:hover { color: #fff !important; }
        .nav-tab.active { border-bottom-color: currentColor !important; }
        .search-result:hover { background: rgba(32,231,242,0.06) !important; }
        .card:hover { border-color: rgba(32,231,242,0.25) !important; background: rgba(32,231,242,0.04) !important; }
        .sidebar-item { transition: background 100ms, border-color 100ms, color 100ms; }
        .sidebar-item:hover { background: rgba(255,255,255,0.03) !important; }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: C.bg, color: C.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>

        {/* ── TOP NAV ──────────────────────────────────────────────────── */}
        <header style={{ height: 58, flexShrink: 0, borderBottom: `1px solid ${C.border}`, background: C.bgDeep, display: "flex", alignItems: "center", zIndex: 50 }}>

          {/* Logo block */}
          <div style={{ width: 232, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", borderRight: `1px solid ${C.border}`, height: "100%" }}>
            <Image src="/images/ZoikoVertex_Logo_SVG 1.svg" alt="ZoikoVertex" width={130} height={28} style={{ objectFit: "contain" }} />
            <span style={{ fontSize: 11, color: C.muted2, fontWeight: 600, background: C.accentDim, border: `1px solid ${C.border}`, padding: "2px 7px", borderRadius: 20, letterSpacing: "0.04em" }}>DOCS</span>
          </div>

          {/* Category tabs */}
          <nav style={{ flex: 1, display: "flex", alignItems: "stretch", height: "100%", overflowX: "auto", padding: "0 8px", gap: 0 }}>
            {CATS.map(cat => {
              const Icon = cat.icon;
              const active = cat.id === activeCatId;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate(cat.id, cat.sections[0].id)}
                  className={`nav-tab${active ? " active" : ""}`}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 14px", background: "transparent", border: "none", color: active ? cat.color : C.muted, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", whiteSpace: "nowrap", borderBottom: `2px solid ${active ? cat.color : "transparent"}` }}
                >
                  <Icon style={{ width: 13, height: 13 }} />
                  {cat.label}
                </button>
              );
            })}
          </nav>

          {/* Search + CTA */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 18px", flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 13, height: 13, color: C.muted2, pointerEvents: "none" }} />
              <input
                ref={searchRef}
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search docs..."
                style={{ width: 190, paddingLeft: 30, paddingRight: 44, paddingTop: 7, paddingBottom: 7, background: "rgba(255,255,255,0.04)", border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, outline: "none" }}
              />
              <kbd style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 10, color: C.muted2, background: "rgba(255,255,255,0.05)", padding: "2px 5px", borderRadius: 4, border: `1px solid ${C.border}`, pointerEvents: "none" }}>⌘K</kbd>

              {/* Search dropdown */}
              {searchResults && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", right: 0, width: 320, background: C.bgPanel, border: `1px solid ${C.borderHi}`, borderRadius: 12, boxShadow: "0 24px 48px rgba(0,0,0,0.6)", overflow: "hidden", zIndex: 200 }}>
                  {searchResults.length === 0
                    ? <p style={{ padding: 16, color: C.muted, fontSize: 13, textAlign: "center" }}>No results found</p>
                    : searchResults.map(s => (
                      <button key={s.id} onClick={() => navigate(s.catId, s.id)} className="search-result" style={{ width: "100%", textAlign: "left", padding: "10px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}>
                        <p style={{ color: C.text, fontSize: 13, fontWeight: 500, marginBottom: 2 }}>{s.title}</p>
                        <p style={{ color: C.muted2, fontSize: 11 }}>{s.catLabel}</p>
                      </button>
                    ))
                  }
                </div>
              )}
            </div>

            <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", background: C.accent, borderRadius: 8, color: C.bgDeep, fontSize: 13, fontWeight: 700, textDecoration: "none", whiteSpace: "nowrap" }}>
              Open App <ExternalLink style={{ width: 11, height: 11 }} />
            </Link>
          </div>
        </header>

        {/* ── BODY (flex row, each column scrolls independently) ───────── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* LEFT SIDEBAR */}
          <aside style={{ width: 232, flexShrink: 0, borderRight: `1px solid ${C.border}`, background: C.bgPanel, overflowY: "auto", padding: "16px 0 32px" }}>
            <p style={{ padding: "0 16px 6px", fontSize: 10, color: C.accent, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>{activeCat.label}</p>

            {activeCat.sections.map(s => (
              <button
                key={s.id}
                onClick={() => { setActiveSectionId(s.id); setHelpful(null); if (mainRef.current) mainRef.current.scrollTop = 0; }}
                className="sidebar-item"
                style={{ width: "100%", textAlign: "left", padding: "8px 16px 8px 18px", background: "transparent", border: "none", borderLeft: activeSectionId === s.id ? `2px solid ${activeCat.color}` : "2px solid transparent", color: activeSectionId === s.id ? C.text : C.muted, fontSize: 13, fontWeight: activeSectionId === s.id ? 600 : 400, cursor: "pointer" }}
              >
                {s.title}
              </button>
            ))}

            {/* Other categories */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.border}` }}>
              <p style={{ padding: "0 16px 8px", fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em" }}>Other Sections</p>
              {CATS.filter(c => c.id !== activeCatId).map(cat => {
                const Icon = cat.icon;
                return (
                  <button key={cat.id} onClick={() => navigate(cat.id, cat.sections[0].id)} className="sidebar-item" style={{ width: "100%", textAlign: "left", padding: "7px 16px", display: "flex", alignItems: "center", gap: 8, background: "transparent", border: "none", color: C.muted, fontSize: 12.5, cursor: "pointer" }}>
                    <Icon style={{ width: 13, height: 13, color: cat.color, flexShrink: 0 }} />
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </aside>

          {/* MAIN CONTENT */}
          <main ref={mainRef} style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>
            <div style={{ maxWidth: 780, margin: "0 auto", padding: "40px 52px 100px" }}>

              {/* Category landing hero — only when on first section */}
              {activeSectionId === activeCat.sections[0].id && (
                <>
                  <div style={{ marginBottom: 32 }}>
                    <Badge color={activeCat.color}>{activeCat.label.toUpperCase()}</Badge>
                    <H1>{activeCat.sections[0].title}</H1>
                    <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7, marginTop: 6 }}>{activeCat.tagline}</p>
                  </div>

                  {/* Quick-link cards */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12, marginBottom: 40 }}>
                    {activeCat.quickLinks.map(ql => (
                      <button key={ql.sectionId} onClick={() => navigate(activeCatId, ql.sectionId)} className="card" style={{ textAlign: "left", padding: "18px 18px 16px", borderRadius: 12, border: `1px solid ${C.border}`, background: C.bgCard, cursor: "pointer" }}>
                        <p style={{ color: C.text, fontSize: 13.5, fontWeight: 600, marginBottom: 6 }}>{ql.title}</p>
                        <p style={{ color: C.muted, fontSize: 12, lineHeight: 1.65 }}>{ql.desc}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 10, color: activeCat.color, fontSize: 12, fontWeight: 600 }}>
                          Read <ChevronRight style={{ width: 12, height: 12 }} />
                        </div>
                      </button>
                    ))}
                  </div>
                  <hr style={{ border: "none", borderTop: `1px solid ${C.border}`, marginBottom: 36 }} />
                </>
              )}

              {/* Section heading (non-landing sections) */}
              {activeSectionId !== activeCat.sections[0].id && (
                <div style={{ marginBottom: 28 }}>
                  <Badge color={activeCat.color}>{activeCat.label.toUpperCase()}</Badge>
                  <H1>{activeSection?.title}</H1>
                </div>
              )}

              {/* Content */}
              <article>{activeSection?.content}</article>

              {/* Next section link */}
              {(() => {
                const idx  = activeCat.sections.findIndex(s => s.id === activeSectionId);
                const next = activeCat.sections[idx + 1];
                return next ? (
                  <div style={{ marginTop: 56, paddingTop: 24, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 11, color: C.muted2, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 6 }}>Next</p>
                      <button onClick={() => navigate(activeCatId, next.id)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: activeCat.color, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                        {next.title} <ChevronRight style={{ width: 15, height: 15 }} />
                      </button>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>
          </main>

          {/* RIGHT PANEL */}
          <aside style={{ width: 204, flexShrink: 0, borderLeft: `1px solid ${C.border}`, background: C.bgPanel, overflowY: "auto", padding: "28px 18px 32px", display: "flex", flexDirection: "column", gap: 28 }}>

            {/* Is this helpful? */}
            <div>
              <p style={{ fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>Is this helpful?</p>
              <div style={{ display: "flex", gap: 8 }}>
                {(["yes", "no"] as const).map(v => (
                  <button key={v} onClick={() => setHelpful(v)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: `1px solid ${helpful === v ? activeCat.color : C.border}`, background: helpful === v ? C.accentDim : "transparent", color: helpful === v ? activeCat.color : C.muted, fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                    {v === "yes" ? <ThumbsUp style={{ width: 13, height: 13 }} /> : <ThumbsDown style={{ width: 13, height: 13 }} />}
                    {v === "yes" ? "Yes" : "No"}
                  </button>
                ))}
              </div>
              {helpful && <p style={{ marginTop: 8, fontSize: 11, color: C.muted2 }}>{helpful === "yes" ? "Thanks for the feedback!" : "We will work on improving this."}</p>}
            </div>

            {/* On this page */}
            <div>
              <p style={{ fontSize: 10, color: C.muted2, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.09em", marginBottom: 10 }}>On this page</p>
              {activeCat.sections.map(s => (
                <button key={s.id} onClick={() => { setActiveSectionId(s.id); setHelpful(null); if (mainRef.current) mainRef.current.scrollTop = 0; }} style={{ display: "block", width: "100%", textAlign: "left", padding: "5px 0", background: "transparent", border: "none", borderLeft: `2px solid ${activeSectionId === s.id ? activeCat.color : "transparent"}`, paddingLeft: 8, color: activeSectionId === s.id ? C.text : C.muted, fontSize: 12, fontWeight: activeSectionId === s.id ? 600 : 400, cursor: "pointer", marginBottom: 2 }}>
                  {s.title}
                </button>
              ))}
            </div>

            {/* Open app */}
            <div style={{ marginTop: "auto" }}>
              <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, color: C.muted2, fontSize: 12, textDecoration: "none" }}>
                <ExternalLink style={{ width: 12, height: 12 }} /> Open ZoikoVertex
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
