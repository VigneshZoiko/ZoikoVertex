/**
 * verifyGovernance.ts — orchestrator for staging / pre-launch verification.
 *
 * Runs:
 *   1. verifyGovernanceMigrations  — schema-level assertions
 *   2. verifyGovernanceAppendOnly   — trigger-level assertions
 *   3. governanceEnforcementReadiness (without --live) — governed-prompt
 *      resolution for all 9 use cases
 *
 * Usage:
 *   npx ts-node scripts/verifyGovernance.ts [workspaceId]
 *
 * Exits 0 on success, 2 on any failure, 1 on infrastructure error.
 */
/* eslint-disable no-console */
import { spawn } from 'child_process';
import * as path from 'path';

function run(label: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    // Cross-platform child-process invocation. On Windows the bare token
    // `npx` resolves to nothing in the parent's PATH lookup of Node's
    // child_process; we must use shell mode (or resolve the .cmd wrapper
    // explicitly). We pin the npm bin via `npm exec` so the same call works
    // on macOS, Linux, and Windows.
    const isWin = process.platform === 'win32';
    const cmd = isWin ? 'npm.cmd' : 'npm';
    const fullArgs = ['exec', '--', 'ts-node', ...args];
    const child = spawn(cmd, fullArgs, {
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: path.resolve(__dirname, '..'),
      shell: isWin,
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => {
      const s = String(d);
      stdout += s;
      process.stdout.write(s);
    });
    child.stderr.on('data', (d) => {
      const s = String(d);
      stderr += s;
      process.stderr.write(s);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
    child.on('error', (err) => {
      resolve({ code: 1, stdout, stderr: stderr + '\nspawn error: ' + err.message });
    });
  });
}

async function main() {
  const workspaceId = process.argv[2];
  if (!workspaceId) {
    console.error('Usage: ts-node scripts/verifyGovernance.ts <workspaceId>');
    process.exit(1);
  }

  console.log('\n[verifyGovernance] staging verification starting\n');
  console.log('═'.repeat(72));

  const stages: { label: string; args: string[] }[] = [
    { label: 'migrations', args: ['scripts/verifyGovernanceMigrations.ts'] },
    { label: 'append-only triggers', args: ['scripts/verifyGovernanceAppendOnly.ts'] },
    { label: 'governed-prompt readiness (offline)', args: ['scripts/governanceEnforcementReadiness.ts', workspaceId] },
  ];

  const results: { label: string; code: number }[] = [];
  for (const s of stages) {
    console.log(`\n[stage] ${s.label}\n`);
    const r = await run(s.label, s.args);
    results.push({ label: s.label, code: r.code });
    if (r.code !== 0) {
      console.log(`\n[stage] ${s.label} exited with code ${r.code}`);
    }
    console.log('─'.repeat(72));
  }

  const allOk = results.every((r) => r.code === 0);
  console.log('\n[verifyGovernance] summary');
  for (const r of results) {
    console.log(`  ${r.code === 0 ? 'OK ' : 'FAIL'}  ${r.label}`);
  }
  console.log(
    allOk
      ? '\nAll verification stages passed. Workspace is enforcement-ready.\n'
      : '\nOne or more stages failed. Re-apply migrations or triggers before flipping PROMPT_GOVERNANCE_ENFORCED.\n',
  );
  process.exit(allOk ? 0 : 2);
}

main().catch((err) => {
  console.error('[verifyGovernance] orchestrator crashed:', err);
  process.exit(1);
});
