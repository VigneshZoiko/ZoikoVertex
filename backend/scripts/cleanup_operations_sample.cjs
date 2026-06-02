/**
 * Removes ALL [SAMPLE] operations data (seed runs, their retries, and every
 * linked record). Matches both the deterministic `5eed…` ids and any run whose
 * task_name starts with "[SAMPLE]" (retries copy the name), so nothing sample
 * is left behind.
 *
 * Run: node scripts/cleanup_operations_sample.cjs
 */
require("dotenv").config();
const { createClient } = require("@supabase/supabase-js");

// Guard: destructive, uses the service-role key. Refuse to run against
// production unless explicitly forced (ALLOW_SAMPLE_CLEANUP=1).
if (process.env.NODE_ENV === "production" && process.env.ALLOW_SAMPLE_CLEANUP !== "1") {
  console.error(
    "Refusing to delete sample operations data with NODE_ENV=production. " +
    "Set ALLOW_SAMPLE_CLEANUP=1 to override (not recommended).",
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

const SEED_IDS = [
  "5eed0001-0000-0000-0000-000000000001",
  "5eed0001-0000-0000-0000-000000000002",
  "5eed0001-0000-0000-0000-000000000003",
  "5eed0001-0000-0000-0000-000000000004",
  "5eed0001-0000-0000-0000-000000000005",
  "5eed0001-0000-0000-0000-000000000006",
];

(async () => {
  // Gather every sample run id: deterministic seeds + anything named [SAMPLE]
  const byName = await sb.from("agent_runs").select("id").ilike("task_name", "[SAMPLE]%");
  const ids = Array.from(new Set([...SEED_IDS, ...((byName.data || []).map((r) => r.id))]));
  console.log(`Found ${ids.length} sample run(s) to remove.`);
  if (!ids.length) { console.log("Nothing to clean."); return; }

  // Detach retry-linkage so FK does not block deletes, then remove children.
  await sb.from("agent_runs").update({ original_run_id: null }).in("original_run_id", ids);
  for (const table of ["run_events", "runtime_control_actions", "policy_results", "queue_items", "incidents", "evidence_bundles"]) {
    const { error, count } = await sb.from(table).delete({ count: "exact" }).in("run_id", ids);
    console.log(`  ${table.padEnd(24)} removed ${error ? "ERR " + error.message : (count ?? "?")}`);
  }
  // Append-only governance triggers may block deleting run_events /
  // runtime_control_actions / evidence_bundles (by design). If the hard delete
  // of the parent run is therefore blocked by FK, fall back to archiving the
  // sample runs so they disappear from the operations UI without violating the
  // immutable audit trail.
  const { error, count } = await sb.from("agent_runs").delete({ count: "exact" }).in("id", ids);
  if (error) {
    const archived = await sb
      .from("agent_runs")
      .update({ archived_at: new Date().toISOString(), archive_reason: "[SAMPLE] cleanup" })
      .in("id", ids);
    console.log(`  ${"agent_runs".padEnd(24)} delete blocked (${error.message}); archived instead ${archived.error ? "ERR " + archived.error.message : "OK"}`);
  } else {
    console.log(`  ${"agent_runs".padEnd(24)} removed ${count ?? "?"}`);
  }
  console.log("Done. The operations page will show empty states until real runs exist.");
})().catch((e) => {
  console.error("CLEANUP FAILED:", e.message);
  process.exit(1);
});
