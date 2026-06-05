import OpenAI from 'openai';
import { env } from '../../config/env';
import { GovernedModelGate } from '../../modules/prompts/GovernedModelGate';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type Sentiment = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

// ── CRITICAL: threats, extreme abuse, slurs, calls to violence ────────────────

const CRITICAL_PATTERNS: RegExp[] = [
  // English
  /\b(i['']?ll?\s+kill\s+you|i\s+will\s+kill|kill\s+yourself|go\s+kill|go\s+die|drop\s+dead|i\s+will\s+hurt|death\s+threat|bomb\s+threat|i['']?m\s+going\s+to\s+kill|gonna\s+kill|you\s+(?:stupid\s+)?(?:cunt|nigger|faggot|kike|spic|chink|wetback|towelhead|raghead))\b/i,
  /\b(motherfucker|motherfucking|fuck\s+you\s+die|rape\s+you|sexual\s+assault|i\s+will\s+rape|piece\s+of\s+shit\s+die)\b/i,
  // Hindi (Romanized)
  /\b(madarchod|madarchot|bhenchod|bhenchot|bhencho|chutiya|gaandu|harami(?:\s+sala)?|randi|bhosdike|bhosdiwale|maa\s+ki\s+(?:aankh|gand)|teri\s+maa\s+ki|sala\s+chutiya|haraami)\b/i,
  // Spanish
  /\b(hijo\s+de\s+(?:puta|perra)|te\s+voy\s+a\s+matar|te\s+voy\s+a\s+violar|me\s+cago\s+en\s+tu|puta\s+madre|te\s+mato|maricón|maricon|eres\s+una?\s+puta)\b/i,
  // French
  /\b(fils\s+de\s+pute|va\s+te\s+faire\s+(?:foutre|enculer)|ta\s+gueule\s+sale|je\s+vais\s+te\s+tuer|encul[eé]|connasse|salope)\b/i,
  // German
  /\b(fick\s+dich|verpiss\s+dich|hurensohn|scheiß(?:kerl|typ|wichser)|ich\s+(?:töte|bringe\s+um)\s+dich|wichser)\b/i,
  // Portuguese
  /\b(filho\s+da\s+puta|filha\s+da\s+puta|vai\s+se\s+foder|vai\s+tomar\s+no\s+cu|vou\s+te\s+matar|cuzão\s+filho)\b/i,
  // Tamil (Romanized)
  /\b(otha|oombu|thevdiya|sunni|pundai|koothi|naaye\s+payale|loosu\s+punda)\b/i,
  // Telugu (Romanized)
  /\b(dengey|puku\s+kodaka|bokka|lanja\s+kodaka|lanjodaka|dengu)\b/i,
  // Arabic (Romanized)
  /\b(ibn\s+el\s+sharmouta|kos\s+ummak|yel'?an\s+abu|kes\s+emek|sharmoota|sharmouta|kalb\s+ibn)\b/i,
  // Russian (Romanized)
  /\b(poshel\s+nahuy|idi\s+nahuy|suka\s+blyad|yebal\s+tvoyu\s+mat|pizda\s+ry\b|blyad'\s+shlyukha)\b/i,
];

// ── HIGH: legal / financial threats, serious escalation intent ────────────────

const HIGH_PATTERNS: RegExp[] = [
  /\b(sue\s+you|suing\s+you|file\s+(?:a\s+)?lawsuit|take\s+(?:legal|court)\s+action|my\s+(?:lawyer|attorney)\s+will|legal\s+action\s+(?:will|shall)|class\s+action|file\s+(?:a\s+)?complaint|demand\s+(?:a\s+)?full\s+refund|chargeback|dispute\s+(?:this\s+)?charge|report\s+(?:you|this)\s+to\s+(?:bbb|ftc|consumer|authorities|police))\b/i,
  /\b(false\s+advertising|consumer\s+fraud|this\s+is\s+(?:a\s+)?scam|you(?:'re|\s+are)\s+scammers|deceptive\s+practices|bbb|better\s+business\s+bureau|consumer\s+affairs|news\s+channel|media\s+coverage|press\s+release|going\s+viral\s+about|expose\s+(?:you|your|this\s+company)|warn\s+everyone|report\s+to\s+police)\b/i,
  /\b(stolen\s+money|you\s+stole|robbery|this\s+is\s+theft|criminal\s+charges|press\s+charges|regulator|ombudsman|trading\s+standards)\b/i,
];

// ── MEDIUM: strong complaints, frustration ────────────────────────────────────

const MEDIUM_PATTERNS: RegExp[] = [
  /\b(absolutely\s+terrible|absolutely\s+horrible|absolutely\s+awful|this\s+is\s+(?:terrible|horrible|awful|disgraceful|shameful|outrageous|unacceptable|pathetic|ridiculous)|worst\s+(?:company|service|product|experience|app)|never\s+(?:buying|using|coming\s+back)\s+again|complete\s+waste\s+of\s+money|totally\s+useless|utter\s+garbage|utter\s+rubbish|absolute\s+garbage|absolute\s+rubbish)\b/i,
  /\b(very\s+disappointed|extremely\s+disappointed|so\s+disappointed|deeply\s+disappointed|furious|livid|infuriated|disgusted|appalled|shocked\s+by|utterly\s+disgusted|beyond\s+frustrated|sick\s+and\s+tired)\b/i,
  /\b(doesn'?t\s+work|stopped\s+working|keeps?\s+crashing|broken\s+product|defective|poor\s+quality|substandard|false\s+promise|misleading|ripped\s+off|overpriced\s+garbage)\b/i,
];

// ── POSITIVE markers ──────────────────────────────────────────────────────────

const POSITIVE_PATTERNS: RegExp[] = [
  /\b(love\s+(?:this|your|the)|amazing|excellent|outstanding|fantastic|wonderful|brilliant|superb|great\s+job|great\s+work|perfect|impressed|very\s+happy|very\s+satisfied|highly\s+recommend|thank\s+you\s+so\s+much|really\s+appreciate|incredibly\s+helpful|awesome|beautiful|incredible|top\s+notch|five\s+stars|5\s+stars)\b/i,
];

// ── Keyword classifier ────────────────────────────────────────────────────────

function keywordClassify(text: string): { risk_level: RiskLevel; sentiment: Sentiment } {
  if (CRITICAL_PATTERNS.some(p => p.test(text))) {
    return { risk_level: 'CRITICAL', sentiment: 'NEGATIVE' };
  }
  if (HIGH_PATTERNS.some(p => p.test(text))) {
    return { risk_level: 'HIGH', sentiment: 'NEGATIVE' };
  }
  if (MEDIUM_PATTERNS.some(p => p.test(text))) {
    return { risk_level: 'MEDIUM', sentiment: 'NEGATIVE' };
  }
  const isPositive = POSITIVE_PATTERNS.some(p => p.test(text));
  return { risk_level: 'LOW', sentiment: isPositive ? 'POSITIVE' : 'NEUTRAL' };
}

// ── Groq AI classifier (nuanced fallback) ─────────────────────────────────────

async function groqClassify(text: string, workspaceId?: string): Promise<{ risk_level: RiskLevel; sentiment: Sentiment } | null> {
  if (!env.GROQ_API_KEY) return null;
  try {
    const groq = new OpenAI({ apiKey: env.GROQ_API_KEY, baseURL: 'https://api.groq.com/openai/v1' });
    const INLINE_SYSTEM = `You are a social media content moderation classifier. Classify the message below.
Return ONLY a JSON object, no explanation:
{"risk_level":"LOW"|"MEDIUM"|"HIGH"|"CRITICAL","sentiment":"POSITIVE"|"NEUTRAL"|"NEGATIVE"}

CRITICAL: death threats, extreme abuse, slurs, explicit violence
HIGH: legal threats (sue, chargeback, fraud), serious escalation intent
MEDIUM: strong complaints, frustration, dissatisfaction
LOW: general inquiry, neutral or positive message`;
    const callModel = async (p: string): Promise<string> => {
      const c = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: p }],
        temperature: 0,
        max_tokens: 50,
      });
      return c.choices[0]?.message?.content?.trim() || '';
    };
    // Phase 4.D — prefer the governed 'inbox_message_classification' prompt; on
    // governance block, audited fallback (fail-closed in production when
    // PROMPT_GOVERNANCE_ENFORCED) to the inline classifier prompt.
    let raw: string;
    const governed = await GovernedModelGate.execute({
      useCaseKey: 'inbox_message_classification',
      workspaceId: workspaceId || '',
      variables: { content: text.slice(0, 500) },
      modelProvider: 'groq',
      invoke: callModel,
    });
    if (governed.ok) {
      raw = governed.output || '';
    } else {
      await GovernedModelGate.legacyInlineFallback('inbox_message_classification', workspaceId, `governed prompt unavailable: ${governed.code}`);
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: INLINE_SYSTEM }, { role: 'user', content: text.slice(0, 500) }],
        temperature: 0,
        max_tokens: 50,
      });
      raw = completion.choices[0]?.message?.content?.trim() || '';
    }
    const jsonMatch = raw.match(/\{.*\}/s);
    if (!jsonMatch) return null;
    const parsed = JSON.parse(jsonMatch[0]) as { risk_level: string; sentiment: string };
    const validRisk: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
    const validSentiment: Sentiment[] = ['POSITIVE', 'NEUTRAL', 'NEGATIVE'];
    if (!validRisk.includes(parsed.risk_level as RiskLevel) || !validSentiment.includes(parsed.sentiment as Sentiment)) {
      return null;
    }
    return { risk_level: parsed.risk_level as RiskLevel, sentiment: parsed.sentiment as Sentiment };
  } catch {
    return null;
  }
}

// ── Main export: hybrid keyword + AI classifier ───────────────────────────────

export async function classifyMessage(text: string, workspaceId?: string): Promise<{ risk_level: RiskLevel; sentiment: Sentiment }> {
  const keyword = keywordClassify(text);

  // CRITICAL from keywords is definitive — skip expensive Groq call
  if (keyword.risk_level === 'CRITICAL') return keyword;

  // Run Groq for nuanced classification; take the higher severity
  const ai = await groqClassify(text, workspaceId);
  if (!ai) return keyword;

  const LEVELS: RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
  const maxIdx = Math.max(LEVELS.indexOf(keyword.risk_level), LEVELS.indexOf(ai.risk_level));
  return { risk_level: LEVELS[maxIdx], sentiment: ai.sentiment };
}
