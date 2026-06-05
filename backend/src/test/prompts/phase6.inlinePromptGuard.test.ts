/**
 * Phase 6.5 — CI guard for inline-prompt token leaks (Finding #2).
 *
 * Verifies the scanSourceTree() function in scripts/checkInlinePromptGuards.ts:
 *   1. The allow-listed file (GovernedModelGate.ts) is skipped
 *   2. Any file containing a forbidden token is reported
 *   3. The three tokens are all detected
 *   4. Word-boundary check rejects partial matches (e.g. `inlinePrompts`)
 *   5. Non-allow-listed files are scanned
 *   6. Allowed files are NOT scanned (no false positive on the rollout hook)
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanSourceTree } from '../../../scripts/checkInlinePromptGuards';

let tmpDir: string;

function write(rel: string, content: string): string {
  const full = path.join(tmpDir, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
  return full;
}

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'inline-guard-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('checkInlinePromptGuards — scanSourceTree', () => {
  it('returns no violations on a clean source tree', () => {
    write('clean/a.ts', 'export const x = 1;\n');
    write('clean/b.ts', 'export function foo() { return 42; }\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toEqual([]);
    expect(r.scanned_files).toBe(2);
  });

  it('detects inlinePrompt token in a non-allow-listed file', () => {
    write('mod/x.ts', 'export const inlinePrompt = "leak";\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].token).toBe('inlinePrompt');
    expect(r.violations[0].file).toMatch(/mod[/\\]x\.ts$/);
    expect(r.violations[0].line).toBe(1);
  });

  it('detects legacyInlineFallback token', () => {
    write('mod/y.ts', 'class A { static async legacyInlineFallback() {} }\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations.some((v) => v.token === 'legacyInlineFallback')).toBe(true);
  });

  it('detects @prompt-inline annotation marker', () => {
    write('mod/z.ts', '// @prompt-inline: needs migration\nconst x = 1;\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations.some((v) => v.token === '@prompt-inline')).toBe(true);
  });

  it('skips allow-listed files (no false positive on GovernedModelGate.ts)', () => {
    write('modules/prompts/GovernedModelGate.ts',
      'export class A { static async legacyInlineFallback() { return; } }\n' +
      'export const inlinePrompt = true;\n' +
      '// @prompt-inline rollout only\n');
    const r = scanSourceTree(tmpDir, ['modules/prompts/GovernedModelGate.ts']);
    expect(r.violations).toEqual([]);
  });

  it('preserves tenant-isolation-style boundary check: inlinePrompts is NOT a match', () => {
    write('mod/partial.ts', 'export const inlinePrompts = [];\n');
    const r = scanSourceTree(tmpDir, []);
    // Word-boundary: `inlinePrompts` is a different identifier; should not match `inlinePrompt`.
    expect(r.violations.filter((v) => v.token === 'inlinePrompt')).toEqual([]);
  });

  it('ignores non-source files (e.g. .md, .json)', () => {
    write('mod/readme.md', 'this mentions inlinePrompt in a comment\n');
    write('mod/data.json', '{"inlinePrompt": "spec text"}\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toEqual([]);
  });

  it('scans nested directories', () => {
    write('a/b/c/deep.ts', 'export const inlinePrompt = true;\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].file).toMatch(/deep\.ts$/);
  });

  it('reports multiple violations across multiple files', () => {
    write('a.ts', 'const inlinePrompt = 1;\n');
    write('b.ts', 'const legacyInlineFallback = 2;\n');
    write('c.ts', '// @prompt-inline comment\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toHaveLength(3);
    const tokens = r.violations.map((v) => v.token).sort();
    expect(tokens).toEqual(['@prompt-inline', 'inlinePrompt', 'legacyInlineFallback']);
  });

  it('returns the correct line number for violations', () => {
    write('a.ts', 'const inlinePrompt = 1;\n');
    write('b.ts', 'const legacyInlineFallback = 2;\n');
    write('c.ts', '// @prompt-inline comment\n');
    const r = scanSourceTree(tmpDir, []);
    expect(r.violations).toHaveLength(3);
    const tokens = r.violations.map((v) => v.token).sort();
    expect(tokens).toEqual(['@prompt-inline', 'inlinePrompt', 'legacyInlineFallback']);
    const inlinePrompt = r.violations.find((v) => v.token === 'inlinePrompt')!;
    expect(inlinePrompt.line).toBe(1);
    const legacy = r.violations.find((v) => v.token === 'legacyInlineFallback')!;
    expect(legacy.line).toBe(1);
    const annotation = r.violations.find((v) => v.token === '@prompt-inline')!;
    expect(annotation.line).toBe(1);
  });

  it('allow-list suppresses violations for named files', () => {
    write('mod/a.ts', 'const inlinePrompt = 1;\n');
    write('mod/b.ts', 'const legacyInlineFallback = 2;\n');
    write('mod/c.ts', '// @prompt-inline comment\n');
    const r = scanSourceTree(tmpDir, ['mod/a.ts', 'mod/b.ts']);
    expect(r.violations).toHaveLength(1);
    expect(r.violations[0].token).toBe('@prompt-inline');
    expect(r.violations[0].file).toBe('mod/c.ts');
  });

  it('handles empty directories gracefully', () => {
    const r = scanSourceTree(tmpDir, []);
    expect(r.scanned_files).toBe(0);
    expect(r.violations).toEqual([]);
  });
});
