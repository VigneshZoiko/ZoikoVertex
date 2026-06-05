/**
 * checkInlinePromptGuards.ts — Phase 6.5 launch hardening.
 *
 * Closes audit Finding #2: no CI rule prevented future inline-prompt call
 * sites. This script scans the source tree for the three sentinel tokens:
 *
 *   1. `inlinePrompt`        — class/function/variable name
 *   2. `legacyInlineFallback` — the rollout-only advisory method
 *   3. `@prompt-inline`      — explicit annotation marker
 *
 * These tokens are only allowed in the audited-by-design rollout hook
 * (`backend/src/modules/prompts/GovernedModelGate.ts`). Any other match is a
 * regression and fails the script with exit code 2.
 *
 * Usage:
 *   npx ts-node scripts/checkInlinePromptGuards.ts
 *   # or
 *   npx tsx scripts/checkInlinePromptGuards.ts
 *
 * Exits:
 *   0 — clean (no violations, or a single scan with a recognized allow-list)
 *   2 — violations found (CI should fail)
 *   1 — infrastructure error (e.g. unreadable source)
 *
 * The allow-list lives in this file. New rollout hook files must be added
 * here AND approved via a governance change.
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Configuration ──────────────────────────────────────────────────────────
const ROOT = path.resolve(__dirname, '..', 'src');
const TOKENS = ['inlinePrompt', 'legacyInlineFallback', '@prompt-inline'] as const;
type Token = (typeof TOKENS)[number];

// Files where the tokens are audited and approved. ANY other file with a
// token is a violation.
//
// Two-tier allow-list:
//   • DEFAULT_ALLOWLIST — audited-by-design. New entries require governance
//     approval (recorded in the file's PR description).
//   • ROLLOUT_LEGACY_PATHS — pre-Phase-6 rollout-only call sites that are
//     mid-migration. Each entry MUST carry a `// @rollout-migration-pending`
//     comment in the source file (this script does not enforce the marker
//     presence — it is a code-review responsibility). Entries should be
//     removed as soon as the call site is migrated to governed prompts.
const DEFAULT_ALLOWLIST: ReadonlyArray<string> = [
  // The method definition itself.
  'modules/prompts/GovernedModelGate.ts',
  // The scanner's self-test (cannot guard against itself).
  'test/prompts/phase6.inlinePromptGuard.test.ts',
  // Phase 4 audit tests that intentionally exercise the fail-closed path.
  'test/prompts/phase4.governedExecution.test.ts',
  'test/prompts/phase4c.seedAndModerator.test.ts',
  'test/prompts/phase4d.governedBodies.test.ts',
  'test/prompts/phase4e.captionVision.test.ts',
];

const ROLLOUT_LEGACY_PATHS: ReadonlyArray<string> = [
  // Pre-Phase-6 rollout-only fallback paths. Each uses
  // `await GovernedModelGate.legacyInlineFallback(<use_case>, ws, reason)`
  // when the governed prompt is unavailable, then falls through to the
  // raw model call. These are part of the active rollout and will be
  // migrated per the rollout schedule.
  'domains/campaigns/schedulerController.ts',
  'domains/decisions/riskClassifier.ts',
  'domains/governance/qaController.ts',
  'domains/inbox/inboxClassifier.ts',
  'domains/inbox/inboxController.ts',
  'domains/intelligence/intelligenceController.ts',
  'modules/safety/moderationService.ts',
];

// Directories that must never be scanned (generated, deps, tests, schemas).
const SKIP_DIRS: ReadonlySet<string> = new Set([
  'node_modules',
  'dist',
  'coverage',
  '.git',
  '__snapshots__',
]);

// ─── Types ──────────────────────────────────────────────────────────────────
export interface Violation {
  file: string;
  line: number;
  token: Token;
  match: string;
}

export interface ScanResult {
  scanned_files: number;
  scanned_lines: number;
  violations: Violation[];
}

// ─── Core scanner ──────────────────────────────────────────────────────────
export function scanSourceTree(
  rootDir: string,
  allowlist: ReadonlyArray<string> = [...DEFAULT_ALLOWLIST, ...ROLLOUT_LEGACY_PATHS],
): ScanResult {
  const violations: Violation[] = [];
  let scannedFiles = 0;
  let scannedLines = 0;
  const allowSet = new Set(allowlist.map((p) => p.replace(/\\/g, '/')));

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const ent of entries) {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        if (SKIP_DIRS.has(ent.name)) continue;
        walk(full);
        continue;
      }
      if (!ent.isFile()) continue;
      if (!/\.(ts|tsx|js|jsx|mjs|cjs)$/i.test(ent.name)) continue;

      const rel = path.relative(rootDir, full).replace(/\\/g, '/');
      if (allowSet.has(rel)) continue;

      let text: string;
      try {
        text = fs.readFileSync(full, 'utf8');
      } catch {
        continue;
      }
      scannedFiles++;
      const lines = text.split(/\r?\n/);
      scannedLines += lines.length;
      lines.forEach((line, idx) => {
        for (const tok of TOKENS) {
          // Word-boundary check on identifier tokens; substring check on the
          // annotation marker (it always starts with @).
          // We always use re.exec(line) (never line.match(re)) because
          // String.prototype.match() returns a plain Array (not a
          // RegExpMatchArray) when the global flag is set, and Array.index
          // is `undefined`. re.exec() always returns a RegExpExecArray with
          // .index set, so the source-of-truth position is preserved.
          const pattern =
            tok.startsWith('@')
              ? tok
              : new RegExp(`\\b${tok}\\b`);
          const re = typeof pattern === 'string' ? new RegExp(escapeRegExp(pattern), 'g') : pattern;
          const m = re.exec(line);
          if (m && m.index !== undefined) {
            violations.push({
              file: rel,
              line: idx + 1,
              token: tok,
              match: m[0],
            });
          }
        }
      });
    }
  };

  walk(rootDir);
  return { scanned_files: scannedFiles, scanned_lines: scannedLines, violations };
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── CLI entry ─────────────────────────────────────────────────────────────
function main(): void {
  const cliAllowlist = process.argv.slice(2);
  const result = scanSourceTree(ROOT, [
    ...DEFAULT_ALLOWLIST,
    ...ROLLOUT_LEGACY_PATHS,
    ...cliAllowlist,
  ]);
  console.log(
    `[inline-prompt-guard] scanned ${result.scanned_files} files (${result.scanned_lines} lines)`,
  );
  console.log(
    `[inline-prompt-guard] allow-list: default=${DEFAULT_ALLOWLIST.length} rollout-legacy=${ROLLOUT_LEGACY_PATHS.length} cli=${cliAllowlist.length}`,
  );
  if (result.violations.length === 0) {
    console.log('[inline-prompt-guard] OK — no unauthorized inline-prompt tokens found.');
    process.exit(0);
  }
  console.error('\n[inline-prompt-guard] FAIL — inline-prompt tokens found outside the allow-list:\n');
  for (const v of result.violations) {
    console.error(`  ${v.file}:${v.line}  token=${v.token}  match=${JSON.stringify(v.match)}`);
  }
  console.error(
    `\n${result.violations.length} violation(s). Inline-prompt call sites are forbidden except in:`,
  );
  for (const a of [...DEFAULT_ALLOWLIST, ...ROLLOUT_LEGACY_PATHS, ...cliAllowlist]) {
    console.error(`  - ${a}`);
  }
  console.error(
    '\nUse GovernedModelGate.execute() instead. If you need a new rollout hook, add it to the allow-list via governance approval.',
  );
  process.exit(2);
}

// Only run main when invoked as a script (not when imported for tests).
if (require.main === module) {
  main();
}
