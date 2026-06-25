const fs = require("node:fs");
const path = require("node:path");

const knowledgePath = path.resolve(__dirname, "..", "data", "knowledge.json");
let knowledgeDocument = null;
try {
  knowledgeDocument = JSON.parse(fs.readFileSync(knowledgePath, "utf-8"));
} catch (e) {
  console.error("[RAG] Failed to load knowledge.json:", e.message);
  knowledgeDocument = { intents: [], faq: [], capabilities: [], branded_terms: [] };
}

function normalizeText(value = "") {
  return value.toLowerCase().replace(/[^\w\s]/g, " ").replace(/\s+/g, " ").trim();
}

function tokenize(text = "") {
  return normalizeText(text).split(" ").filter(Boolean);
}

function buildSearchIndex() {
  const entries = [];

  if (Array.isArray(knowledgeDocument.intents)) {
    for (const intent of knowledgeDocument.intents) {
      const keywords = [
        intent.label,
        ...(intent.trigger_signals || []),
        ...(intent.keywords || []),
      ];
      entries.push({
        type: "intent",
        id: intent.id,
        title: intent.label || intent.id,
        content: intent.answer_first || intent.response || "",
        keywords: [...new Set(keywords.map((k) => normalizeText(k)))],
        route: intent.route || null,
      });
    }
  }

  if (Array.isArray(knowledgeDocument.faq)) {
    for (const faq of knowledgeDocument.faq) {
      entries.push({
        type: "faq",
        id: `faq-${normalizeText(faq.q).slice(0, 30)}`,
        title: faq.q,
        content: faq.a,
        keywords: [...new Set(tokenize(faq.q + " " + faq.a))],
        route: null,
      });
    }
  }

  if (Array.isArray(knowledgeDocument.capabilities)) {
    for (const cap of knowledgeDocument.capabilities) {
      entries.push({
        type: "capability",
        id: cap.id,
        title: cap.label || cap.id,
        content: cap.safe_claim || "",
        keywords: [...new Set(tokenize((cap.label || "") + " " + (cap.safe_claim || "")))],
        route: null,
      });
    }
  }

  if (Array.isArray(knowledgeDocument.branded_terms)) {
    for (const term of knowledgeDocument.branded_terms) {
      entries.push({
        type: "branded_term",
        id: `term-${normalizeText(term.term).slice(0, 20)}`,
        title: term.term,
        content: `${term.term}: ${term.canonical_sentence || ""}`,
        keywords: [...new Set([
          normalizeText(term.term),
          ...(term.replaces || []).map((r) => normalizeText(r)),
        ])],
        route: null,
      });
    }
  }

  if (knowledgeDocument.three_key_protocol) {
    entries.push({
      type: "protocol",
      id: "three_key_protocol",
      title: "Three-Key Approval Protocol",
      content: knowledgeDocument.three_key_protocol.description + " " +
        knowledgeDocument.three_key_protocol.keys.map((k) =>
          `${k.key} (${k.holder}): ${k.description}`
        ).join(" "),
      keywords: tokenize("three key approval protocol keys approval"),
      route: "/platform/approval-governance",
    });
  }

  if (knowledgeDocument.pricing) {
    const pricingText = knowledgeDocument.pricing.tiers.map((t) =>
      `${t.name}: $${t.price_usd_monthly || "Custom"}/mo - ${t.description}`
    ).join(" ");
    entries.push({
      type: "pricing",
      id: "pricing_overview",
      title: "Pricing Overview",
      content: pricingText + " " + (knowledgeDocument.pricing.always_append || ""),
      keywords: tokenize("pricing plans cost subscription tiers price"),
      route: "/pricing",
    });
  }

  return entries;
}

const searchIndex = buildSearchIndex();

function searchKnowledgeBase(query, maxResults = 5) {
  if (!query || !query.trim()) return [];

  const queryTokens = new Set(tokenize(query));
  const scored = [];

  for (const entry of searchIndex) {
    const keywordSet = new Set(entry.keywords);
    let score = 0;

    const queryNorm = normalizeText(query);

    if (normalizeText(entry.title).includes(queryNorm)) {
      score += 15;
    }

    if (normalizeText(entry.content).includes(queryNorm)) {
      score += 8;
    }

    for (const token of queryTokens) {
      if (keywordSet.has(token)) {
        score += 3;
      }
    }

    const queryTokensArr = [...queryTokens];
    const matchedTokens = queryTokensArr.filter((t) => keywordSet.has(t));
    if (queryTokensArr.length > 0) {
      const ratio = matchedTokens.length / queryTokensArr.length;
      if (ratio >= 0.6) score += ratio * 10;
    }

    if (score > 0) {
      scored.push({ ...entry, score: Math.round(score * 10) / 10 });
    }
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function buildContext(query, maxTokens = 3000) {
  const results = searchKnowledgeBase(query, 5);
  if (results.length === 0) return null;

  let context = "";
  for (const result of results) {
    const entry = `[${result.type.toUpperCase()}] ${result.title}\n${result.content}\n`;
    if ((context.length + entry.length) > maxTokens * 4) break;
    context += entry + "\n";
  }

  return context.trim();
}

function getRelevantPages(query) {
  const results = searchKnowledgeBase(query, 3);
  const pages = [];
  const seen = new Set();

  for (const result of results) {
    if (result.route && !seen.has(result.route)) {
      seen.add(result.route);
      pages.push({
        path: result.route,
        label: result.title,
      });
    }
  }

  return pages;
}

module.exports = {
  searchKnowledgeBase,
  buildContext,
  getRelevantPages,
};
