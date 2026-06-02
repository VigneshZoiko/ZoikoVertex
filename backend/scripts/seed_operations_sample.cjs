/**
 * Seeds a small, clearly-tagged sample dataset for the Agent Operations page.
 * All rows use the `[SAMPLE]` prefix and deterministic `5eed…` UUIDs so they
 * can be removed with cleanup_operations_sample.cjs.
 *
 * Columns match the LIVE database schema (introspected), which differs from
 * the repo migration. Display names that the live agent_runs table has no
 * column for (agent_name, workflow_name, etc.) are stored under `metadata`.
 *
 * Run:  node scripts/seed_operations_sample.cjs
 * Clean: node scripts/cleanup_operations_sample.cjs
 *
 * NOTE: writes to whatever Supabase the .env points at (shared with prod).
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Guard: this writes [SAMPLE] data using the service-role key. Refuse to run
// against production unless explicitly forced (ALLOW_SAMPLE_SEED=1).
if (process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_SEED !== "1") {
  console.error(
    "Refusing to seed sample operations data with NODE_ENV=production. " +
    "Set ALLOW_SAMPLE_SEED=1 to override (not recommended).",
  );
  process.exit(1);
}
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.");
  process.exit(1);
}

const sb = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const WS = "00000000-0000-0000-0000-000000000000"; // Vertex Team
const OWNER = "2af29ab6-b321-4f24-ae86-9a0dc8d698a5"; // agentarchitect@zoikogroup.com
const OWNER_NAME = "Agent Architect";
// Real agents in this workspace (agent_id is NOT NULL + FK).
const AGENT_IDS = [
  "ae8c4b48-63a5-4eeb-8b54-7de0940e5cb5",
  "72443ea8-4895-49a8-a183-626dcf56ff80",
];
const now = Date.now();
const iso = (offsetMs) => new Date(now + offsetMs).toISOString();

const RUN = {
  running: "5eed0001-0000-0000-0000-000000000001",
  queued: "5eed0001-0000-0000-0000-000000000002",
  failed: "5eed0001-0000-0000-0000-000000000003",
  blocked: "5eed0001-0000-0000-0000-000000000004",
  review: "5eed0001-0000-0000-0000-000000000005",
  completed: "5eed0001-0000-0000-0000-000000000006",
};

const runs = [
  {
    id: RUN.running, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v1.4.2", workflow_version: "v3",
    task_name: "[SAMPLE] LinkedIn Post Writer",
    task_objective: "Draft 3 LinkedIn posts on AI governance",
    current_step: "Generating draft 2/3", channel: "linkedin", trigger_source: "schedule",
    status: "RUNNING", severity: "normal", owner_id: OWNER, owner_name: OWNER_NAME, priority: 2,
    policy_result: "pending_review", evidence_status: "partial", retry_count: 0, max_retries: 3,
    started_at: iso(-1000 * 60 * 4), last_event_at: iso(-1000 * 30),
    metadata: { agent_name: "[SAMPLE] LinkedIn Post Writer", agent_type: "content", workflow_name: "Weekly Thought Leadership", brand_name: "VertexDev", campaign_name: "Q2 Brand Awareness", next_action: "Monitor" },
  },
  {
    id: RUN.queued, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v2.0.0", workflow_version: "v1",
    task_name: "[SAMPLE] X Thread Composer",
    task_objective: "Compose 5-tweet launch thread",
    current_step: "Waiting for capacity", channel: "x", trigger_source: "manual",
    status: "QUEUED", severity: "attention", owner_id: OWNER, owner_name: OWNER_NAME, priority: 3,
    policy_result: "pending_review", evidence_status: "capturing", retry_count: 0, max_retries: 3,
    last_event_at: iso(-1000 * 60 * 2),
    metadata: { agent_name: "[SAMPLE] X Thread Composer", agent_type: "content", workflow_name: "Launch Announcement", brand_name: "VertexDev", campaign_name: "Product Launch", next_action: "Reprioritize" },
  },
  {
    id: RUN.failed, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v1.1.0", workflow_version: "v2",
    task_name: "[SAMPLE] Image Generator",
    task_objective: "Render 4-slide carousel for Meta",
    current_step: "Tool call failed", channel: "meta", trigger_source: "schedule",
    status: "FAILED", severity: "critical", owner_id: OWNER, owner_name: OWNER_NAME, priority: 1,
    policy_result: "not_applicable", evidence_status: "captured",
    error_code: "TOOL_TIMEOUT", error_message: "Image provider timed out after 30s",
    retry_count: 1, max_retries: 3,
    completed_at: iso(-1000 * 60 * 10), last_event_at: iso(-1000 * 60 * 10),
    metadata: { agent_name: "[SAMPLE] Image Generator", agent_type: "media", workflow_name: "Carousel Builder", brand_name: "VertexDev", next_action: "Retry" },
  },
  {
    id: RUN.blocked, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v1.0.3", workflow_version: "v1",
    task_name: "[SAMPLE] Promo Copywriter",
    task_objective: "Write promo copy with 50% claim",
    current_step: "Blocked by policy gate", channel: "instagram", trigger_source: "manual",
    status: "POLICY_BLOCKED", severity: "critical", owner_id: OWNER, owner_name: OWNER_NAME, priority: 1,
    policy_result: "blocked", evidence_status: "captured", retry_count: 0, max_retries: 3,
    last_event_at: iso(-1000 * 60 * 15),
    metadata: { agent_name: "[SAMPLE] Promo Copywriter", agent_type: "content", workflow_name: "Discount Campaign", brand_name: "VertexDev", next_action: "Remediate" },
  },
  {
    id: RUN.review, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v1.2.0", workflow_version: "v4",
    task_name: "[SAMPLE] Newsletter Agent",
    task_objective: "Summarize product updates for newsletter",
    current_step: "Awaiting human review", channel: "email", trigger_source: "schedule",
    status: "WAITING_HUMAN_REVIEW", severity: "warning", owner_id: OWNER, owner_name: OWNER_NAME, priority: 2,
    policy_result: "warning", evidence_status: "partial", retry_count: 0, max_retries: 3,
    last_event_at: iso(-1000 * 60 * 6),
    metadata: { agent_name: "[SAMPLE] Newsletter Agent", agent_type: "content", workflow_name: "Monthly Digest", brand_name: "VertexDev", output_snapshot: "Here are this month's top 5 product updates ...", output_status: "pending_review", next_action: "Review" },
  },
  {
    id: RUN.completed, workspace_id: WS, tenant_id: WS, environment: "production",
    agent_version: "v1.5.1", workflow_version: "v2",
    task_name: "[SAMPLE] SEO Blog Writer",
    task_objective: "Write 800-word SEO blog on agent governance",
    current_step: "Delivered", channel: "web", trigger_source: "schedule",
    status: "COMPLETED", severity: "normal", owner_id: OWNER, owner_name: OWNER_NAME, priority: 3,
    policy_result: "pass", evidence_status: "export_ready", retry_count: 0, max_retries: 3,
    started_at: iso(-1000 * 60 * 60), completed_at: iso(-1000 * 60 * 40), last_event_at: iso(-1000 * 60 * 40),
    metadata: { agent_name: "[SAMPLE] SEO Blog Writer", agent_type: "content", workflow_name: "Blog Pipeline", brand_name: "VertexDev", output_snapshot: "Agent governance is the practice of ...", output_status: "published", next_action: "Export evidence" },
  },
];

const events = [
  { id: "5eed0002-0000-0000-0000-000000000001", run_id: RUN.running, event_type: "run.created", actor_type: "system", actor_name: "Scheduler", new_state: "QUEUED", created_at: iso(-1000 * 60 * 5) },
  { id: "5eed0002-0000-0000-0000-000000000002", run_id: RUN.running, event_type: "run.started", actor_type: "system", actor_name: "Runtime", previous_state: "QUEUED", new_state: "RUNNING", created_at: iso(-1000 * 60 * 4) },
  { id: "5eed0002-0000-0000-0000-000000000003", run_id: RUN.failed, event_type: "run.failed", actor_type: "system", actor_name: "Runtime", previous_state: "RUNNING", new_state: "FAILED", reason: "Image tool timeout after 30s", created_at: iso(-1000 * 60 * 10) },
  { id: "5eed0002-0000-0000-0000-000000000004", run_id: RUN.blocked, event_type: "policy.blocked", actor_type: "system", actor_name: "Policy Engine", previous_state: "RUNNING", new_state: "POLICY_BLOCKED", reason: "Unsupported discount claim", created_at: iso(-1000 * 60 * 15) },
  { id: "5eed0002-0000-0000-0000-000000000005", run_id: RUN.review, event_type: "review.requested", actor_type: "system", actor_name: "Runtime", new_state: "WAITING_HUMAN_REVIEW", created_at: iso(-1000 * 60 * 6) },
  { id: "5eed0002-0000-0000-0000-000000000006", run_id: RUN.completed, event_type: "output.delivered", actor_type: "system", actor_name: "Runtime", previous_state: "RUNNING", new_state: "COMPLETED", created_at: iso(-1000 * 60 * 40) },
];

const policy_results = [
  { id: "5eed0003-0000-0000-0000-000000000001", run_id: RUN.blocked, policy_id: WS, policy_version: "2026.1", outcome: "blocked", severity: "critical", failed_rule: "No unverifiable percentage claims", check_category: "Misleading guarantee", platform: "instagram", remediation_required: true, remediation_path: "Remove the 50% claim or attach verified source", notes: "Legal & Compliance policy" },
  { id: "5eed0003-0000-0000-0000-000000000002", run_id: RUN.review, policy_id: WS, policy_version: "2026.1", outcome: "warning", severity: "attention", failed_rule: "Tone slightly informal", check_category: "Brand voice", platform: "email", remediation_required: false, remediation_path: "Optional tone polish", notes: "Brand Governance policy" },
];

const queue_items = [
  { id: "5eed0004-0000-0000-0000-000000000001", workspace_id: WS, run_id: RUN.review, queue_type: "human_review", priority: 2, status: "open", due_at: iso(1000 * 60 * 60 * 2), sla_breached: false },
  { id: "5eed0004-0000-0000-0000-000000000002", workspace_id: WS, run_id: RUN.failed, queue_type: "failed_job", priority: 1, status: "open", due_at: iso(1000 * 60 * 30), sla_breached: false },
  { id: "5eed0004-0000-0000-0000-000000000003", workspace_id: WS, run_id: RUN.blocked, queue_type: "exception_task", priority: 1, status: "open", due_at: iso(-1000 * 60 * 5), sla_breached: true },
];

const incidents = [
  { id: "5eed0005-0000-0000-0000-000000000001", workspace_id: WS, run_id: RUN.failed, severity: "critical", category: "integration_failure", owner_id: OWNER, owner_name: OWNER_NAME, status: "open", created_by: OWNER, created_by_name: OWNER_NAME, due_at: iso(1000 * 60 * 60 * 4), root_cause: "Image provider timeout" },
];

const evidence_bundles = [
  { id: "5eed0006-0000-0000-0000-000000000001", workspace_id: WS, run_id: RUN.completed, status: "export_ready", hash: "sha256:sampledigest", storage_ref: "s3://evidence/sample/seo-blog.json" },
];

async function upsert(table, rows) {
  const { error } = await sb.from(table).upsert(rows, { onConflict: "id" });
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ✓ ${table.padEnd(24)} ${rows.length} rows`);
}

(async () => {
  console.log("Seeding [SAMPLE] operations data into workspace", WS);
  runs.forEach((r, i) => { r.agent_id = AGENT_IDS[i % AGENT_IDS.length]; });
  await upsert("agent_runs", runs);
  await upsert("run_events", events);
  await upsert("policy_results", policy_results);
  await upsert("queue_items", queue_items);
  await upsert("incidents", incidents);
  await upsert("evidence_bundles", evidence_bundles);
  console.log("Done. Refresh the Agent Operations page.");
})().catch((e) => {
  console.error("SEED FAILED:", e.message);
  process.exit(1);
});
