// ============================================================
// ZoikoVertex — Text Normalization Utility
//
// Defeats the common evasion tactics that fool naive substring
// keyword scanners:
//   - leetspeak     : "ph0n3" / "fvck" / "@$$" / "h@te"
//   - separators    : "f.u.c.k", "f_u_c_k", "f u c k"
//   - char doubling : "fuuuck"
//   - homoglyphs    : "ⅼoser" (latin small letter l → digit one)
//   - hidden unicode: zero-width spaces, RTL markers
//   - mixed case    : "FuCk"
//
// The normalized form is what the matcher works against. Both
// the dictionary patterns AND the input string go through the
// same pipeline so the comparison is apples-to-apples.
// ============================================================

// ---------- Character substitution table ----------
// Keep this aligned with the most common leetspeak / homoglyphs.
// Order matters: multi-char substitutions are applied first.
const MULTI_CHAR_SUBS: Array<[RegExp, string]> = [
  [/\$\$/g, "ss"], // "a$$" → "ass" via separate single-char rules
  [/\(\)/g, "o"], // "f()ck" → "fock"
  [/!\|/g, "h"], // "!|ate" → "hate"
  [/\\\//g, "v"], // "\\/" → "v"
];

// Single-character substitution lookup table.
const CHAR_SUBS: Record<string, string> = {
  "0": "o",
  "1": "i",
  "2": "z",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "|": "i",
  "+": "t",
  "(": "c",
  ")": "c",
  "*": "",
  "ⅼ": "l", // U+217C
  "І": "i", // U+0406 cyrillic-capital-i
  "о": "o", // U+043E cyrillic-small-o
  "а": "a", // U+0430 cyrillic-small-a
  "е": "e", // U+0435 cyrillic-small-e
  "с": "c", // U+0441 cyrillic-small-c
  "р": "p", // U+0440 cyrillic-small-er
};

// Unicode control / zero-width characters that must be stripped.
const ZERO_WIDTH_RE = /[​-‏‪-‮⁠-⁯﻿]/g;

// ---------- Pipeline stages ----------

function stripZeroWidth(input: string): string {
  return input.replace(ZERO_WIDTH_RE, "");
}

function applyMultiCharSubs(input: string): string {
  let out = input;
  for (const [re, repl] of MULTI_CHAR_SUBS) {
    out = out.replace(re, repl);
  }
  return out;
}

function applySingleCharSubs(input: string): string {
  let out = "";
  for (const ch of input) {
    out += CHAR_SUBS[ch] !== undefined ? CHAR_SUBS[ch] : ch;
  }
  return out;
}

function collapseRepeats(input: string): string {
  // Collapse 3+ consecutive identical letters down to 2.
  // "fuuuck" → "fuuck", "loooove" → "loove". Two-letter limit
  // preserves legitimate words like "book", "see".
  return input.replace(/([a-z])\1{2,}/g, "$1$1");
}

function collapseSeparators(input: string): string {
  // Strip ANY non-alphanumeric character between two letters when
  // doing so produces a single alpha run. This catches:
  //   "f.u.c.k"   → "fuck"
  //   "f u c k"   → "fuck"
  //   "f-u-c-k"   → "fuck"
  //   "f_u_c_k"   → "fuck"
  // Performed before final lowercase so we don't strip word-internal
  // hyphens in legitimate phrases like "well-known" (those have
  // multiple chars on each side and survive).
  return input.replace(/(\b[a-z])(?:[^a-z0-9]+([a-z])){2,}\b/gi, (m) =>
    m.replace(/[^a-z0-9]/gi, ""),
  );
}

function squashWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

// ---------- Public API ----------

export interface NormalizeOptions {
  /** Apply leetspeak & homoglyph substitutions. Default: true. */
  substituteChars?: boolean;
  /** Collapse 3+ repeated chars to 2. Default: true. */
  collapseRepeats?: boolean;
  /** Strip non-alpha separators inside short word-fragments. Default: true. */
  collapseSeparators?: boolean;
}

/**
 * Produce a canonical form for substring / pattern matching.
 * Applied identically to dictionary patterns and inputs.
 */
export function normalizeForMatching(
  input: string,
  opts: NormalizeOptions = {},
): string {
  const {
    substituteChars = true,
    collapseRepeats: doCollapseRepeats = true,
    collapseSeparators: doCollapseSeparators = true,
  } = opts;

  let text = input;
  text = stripZeroWidth(text);
  text = text.toLowerCase();
  text = applyMultiCharSubs(text);
  if (substituteChars) text = applySingleCharSubs(text);
  if (doCollapseSeparators) text = collapseSeparators(text);
  if (doCollapseRepeats) text = collapseRepeats(text);
  text = squashWhitespace(text);
  return text;
}
