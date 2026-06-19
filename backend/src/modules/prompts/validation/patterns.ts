// ─────────────────────────────────────────────────────────────────────────────
// Shared detection patterns + text helpers for the post-validation agents.
//
// These constants were previously inlined in PostGovernanceService. They are
// extracted here so every validation agent (Policy, General Content, Evidence)
// draws from a single source of truth instead of duplicating regex lists.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keywords/phrases that suggest a factual claim, pricing claim, numerical
 * claim, guarantee, comparison, or performance claim.
 */
export const CLAIM_PATTERNS: RegExp[] = [
  /\bbest\b/i,
  /\bproven\b/i,
  /\bguaranteed?\b/i,
  /\bguarantee\b/i,
  /\b#1\b|\bnumber one\b|\bnumber 1\b/i,
  /\bleading\b/i,
  /\btop[- ]rated\b/i,
  /\bexclusive\b/i,
  /\bresults?\b/i,
  /\bimprove[ds]?\b/i,
  /\bincrease[ds]?\b/i,
  /\breduce[ds]?\b/i,
  /\bboost\b/i,
  /\b([0-9]+)\s*%\b/,
  // Monetary/amount claim — MUST start with a digit (e.g. ₹500, 1,000 rupees,
  // 5/per). [0-9][0-9,]* avoids matching a lone comma, which previously flagged
  // any caption containing "," as a quantified claim.
  /\b₹?\s*[0-9][0-9,]*\s*(rs\.?|rupees?)?\s*(\/|per)?\b/i,
  /\bdollars?\b|\$\s*[0-9]/i,
  /\bclinically\s+proven\b/i,
  /\bscientifically\s+(proven|backed|tested)\b/i,
  /\bstudies?\s+show\b/i,
  /\bresearch\s+(shows?|proves?|demonstrates?)\b/i,
  /\b[a-z]+er\s+than\b/i,
  /\bmore\s+effective\b/i,
  /\bfaster[- ]?acting\b/i,
  /\blong[- ]?lasting\b/i,
  /\bmoney[- ]?back\b/i,
  /\bsatisfaction\s+guaranteed\b/i,
  /\bfree\s+(trial|sample|shipping)\b/i,
  /\blimited[- ]?time\b/i,
];

/**
 * Keywords suggesting high-risk content (medical, legal, financial, etc.).
 */
export const HIGH_RISK_PATTERNS: RegExp[] = [
  /\bcure[sd]?\b/i,
  /\btreat[s]?\b/i,
  /\bdiagnos[ei]s\b/i,
  /\bmedical\b/i,
  /\bhealth\s+condition\b/i,
  /\bdisease\b/i,
  /\bsymptom[s]?\b/i,
  /\bclinical\b/i,
  /\btherapy\b/i,
  /\btherapeutic\b/i,
  /\bsurgery\b/i,
  /\bprescription\b/i,
  /\bmedication\b/i,
  /\bdrug[s]?\b/i,
  /\blegal\s+(advice|opinion|review)\b/i,
  /\battorney\b/i,
  /\blawyer\b/i,
  /\blawsuit\b/i,
  /\bregulatory\s+(approval|filing|compliance)\b/i,
  /\bfinancial\s+(advice|planning|investment)\b/i,
  /\binvestment\b/i,
  /\bsecurities\b/i,
  /\bstock[s]?\b/i,
  /\bretirement\b/i,
  /\binsurance\b/i,
  /\bloan[s]?\b/i,
  /\bmortgage\b/i,
  /\bcompliance\b/i,
  /\bHIPAA\b/i,
  /\bGDPR\b/i,
  /\bprivacy\s+policy\b/i,
  /\bterms\s+of\s+service\b/i,
  /\bdisclaimer\b/i,
];

export const VIOLENCE_SAFETY_PATTERNS: RegExp[] = [
  /\bkill\b/i,
  /\bdeath\b/i,
  /\bdie\b/i,
  /\bhate\b/i,
  /\bharassment\b/i,
  /\babuse\b/i,
  /\bviolen[ct]\b/i,
  /\battack\b/i,
  /\bweapon\b/i,
  /\bterroris[mt]\b/i,
  /\bsuicide\b/i,
  /\bself[- ]?harm\b/i,
  /\bslur\b/i,
  /\bdiscriminat\w+\b/i,
  /\bexplicit\b/i,
  /\bps inappropriate\b/i,
];

/**
 * Generic filler — English function words plus marketing/business boilerplate and
 * common call-to-action verbs. These carry no claim-specific meaning, so they must
 * NOT be allowed to make a post look "evidenced" on their own.
 */
export const GENERIC_STOPWORDS = new Set<string>([
  // function words
  'the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'your', 'you', 'our',
  'they', 'them', 'their', 'there', 'here', 'will', 'has', 'have', 'had', 'was', 'were',
  'what', 'when', 'which', 'who', 'into', 'than', 'then', 'about', 'after', 'before',
  'while', 'been', 'being', 'such', 'some', 'any', 'all', 'can', 'could', 'would',
  'should', 'may', 'might', 'must', 'not', 'but', 'yet', 'its', 'also', 'more', 'most',
  'very', 'just', 'only', 'over', 'under', 'each', 'every', 'these', 'those', 'how',
  // generic marketing / business filler
  'best', 'better', 'great', 'good', 'leading', 'proven', 'top', 'number', 'world',
  'worlds', 'global', 'industry', 'market', 'quality', 'trusted', 'premier', 'premium',
  'ultimate', 'amazing', 'awesome', 'incredible', 'company', 'companies', 'business',
  'businesses', 'brand', 'brands', 'product', 'products', 'service', 'services',
  'solution', 'solutions', 'offer', 'offers', 'today', 'new', 'latest', 'official',
  // common CTA / sentence-starter verbs (not claim substance)
  'discover', 'introducing', 'meet', 'learn', 'explore', 'try', 'join', 'shop', 'buy',
  'save', 'check', 'find', 'see', 'read', 'watch', 'click', 'get',
]);

export function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9][a-z0-9'&-]*/g) || []);
}

export function detectPatterns(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) found.push(match[0]);
  }
  return [...new Set(found)];
}

/** Extract #hashtags from arbitrary post text. */
export function extractHashtags(text: string): string[] {
  return [...new Set((text.match(/#[A-Za-z0-9_]+/g) || []).map((h) => h.toLowerCase()))];
}

/** Extract URLs / links from arbitrary post text. */
export function extractLinks(text: string): string[] {
  return [...new Set(text.match(/https?:\/\/[^\s)]+/gi) || [])];
}

/** Extract @mentions from arbitrary post text. */
export function extractMentions(text: string): string[] {
  return [...new Set((text.match(/@[A-Za-z0-9_.]+/g) || []).map((m) => m.toLowerCase()))];
}
