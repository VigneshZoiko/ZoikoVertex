const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// ─── File Loader ─────────────────────────────────────────────────────────────

function loadJsonFile(fileName) {
  const filePath = path.resolve(__dirname, "..", "data", fileName);
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

// ─── Load Data ────────────────────────────────────────────────────────────────
// knowledge.json is an OBJECT — extract the arrays we need
const knowledgeData    = loadJsonFile("knowledge.json");
const intents          = knowledgeData.intents ?? [];
const faq              = knowledgeData.faq ?? [];
const pageRegistry     = knowledgeData.page_registry ?? [];
const brandedTerms     = knowledgeData.branded_terms ?? [];
const templates        = knowledgeData.templates ?? {};

// Support both old and new knowledge.json shapes
const fallbackMsg      = templates.fallback ?? knowledgeData.fallback ?? "I don't have enough information to answer that confidently.";
const greetingMsg      = templates.greeting ?? knowledgeData.greeting ?? "Hello — I'm Custos, the ZoikoVertex assistant.";
const outOfScopeMsg    = templates.out_of_scope ?? knowledgeData.out_of_scope ?? "That's outside what I can help with — I'm focused on ZoikoVertex.";
const handoffSalesMsg  = templates.handoff_sales ?? knowledgeData.handoff_sales;
const goodbyeMsg       = templates.goodbye ?? knowledgeData.goodbye;
const defaultSuggestions = knowledgeData.default_suggestions
  ?? intents.map((i) => i.label).filter(Boolean)
  ?? ["Demo", "Pricing", "Security", "Privacy", "DPA", "Careers"];
const searchRedirects  = knowledgeData.search_redirects ?? [];

const config = loadJsonFile("config.json");
const { toolContracts, workspaceConfigs, employeeSummaries, bootstrap } = config;

// ─── In-Memory Stores ─────────────────────────────────────────────────────────

const conversations  = [];
const toolLogs       = [];
const safetyLogs     = [];
const supportTickets = [];
const leads          = [];

// ─── Utilities ────────────────────────────────────────────────────────────────

function makeId(prefix) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function createSessionId()      { return makeId("session"); }
function createConversationId() { return makeId("conv"); }

function logSafety(type, message, surface, userState) {
  safetyLogs.push({
    id: makeId("safe"),
    type,
    message,
    surface,
    userState,
    timestamp: new Date().toISOString(),
  });
}

// ─── Tool Runner ──────────────────────────────────────────────────────────────

function logTool(name, input, output, authorized = true, error = null) {
  const entry = {
    id: makeId("tool"),
    tool: name,
    version: toolContracts?.[name]?.version ?? "1.0.0",
    authorized,
    input,
    output,
    error,
    timestamp: new Date().toISOString(),
  };
  toolLogs.push(entry);
  return entry;
}

function runTool(name, payload) {
  try {
    switch (name) {
      case "request_demo": {
        const lead = { id: makeId("demo"), type: "demo_request", ...payload, createdAt: new Date().toISOString() };
        leads.push(lead);
        return logTool(name, payload, lead);
      }
      case "capture_lead": {
        const lead = { id: makeId("lead"), type: "sales_lead", ...payload, createdAt: new Date().toISOString() };
        leads.push(lead);
        return logTool(name, payload, lead);
      }
      case "create_support_ticket": {
        const ticket = { id: makeId("ticket"), status: "open", ...payload, createdAt: new Date().toISOString() };
        supportTickets.push(ticket);
        return logTool(name, payload, ticket);
      }
      case "escalate_to_human": {
        const escalation = { id: makeId("esc"), status: "queued", ...payload, createdAt: new Date().toISOString() };
        return logTool(name, payload, escalation);
      }
      case "fetch_workspace_config": {
        const key = payload?.configKey;
        const result = key
          ? { [key]: workspaceConfigs?.[key] ?? "Not configured in this demo workspace." }
          : workspaceConfigs;
        return logTool(name, payload, result);
      }
      case "fetch_my_data_summary": {
        const employeeId = payload?.employeeId ?? "employee_001";
        const result = employeeSummaries?.[employeeId] ?? {
          visibility: ["No demo record found for this employee."],
          correctionRoute: "Contact your workspace admin.",
          privacyNote: "Only own-data routes are available here.",
        };
        return logTool(name, payload, result);
      }
      default:
        return logTool(name, payload, null, false, "Unknown tool");
    }
  } catch (error) {
    return logTool(name, payload, null, false, error.message);
  }
}

// ─── Safety Refusals ──────────────────────────────────────────────────────────

function refusalReply(reason) {
  if (reason === "covert_monitoring") {
    return {
      answer: "I can't help set up hidden monitoring. ZoikoVertex is built for governed, transparent marketing execution.",
      suggestions: ["What gets recorded?", "Back to Main Menu"],
      nextAction: { type: "prompt", label: "Show transparent policy setup", value: "Show me how transparent screenshot and policy setup works" },
    };
  }
  if (reason === "professional_advice") {
    return {
      answer: "ZoikoVertex does not provide legal advice. We support governance workflows, but your legal obligations remain your responsibility.",
      suggestions: ["Speak to a human agent", "Back to Main Menu"],
      nextAction: { type: "tool", label: "Escalate to a human", value: "escalate_to_human" },
    };
  }
  if (reason === "forbidden_data_access") {
    return {
      answer: "I don't have permission to show another person's data or another workspace's data. ZoikoVertex enforces strict workspace isolation.",
      suggestions: ["Back to Main Menu"],
      nextAction: { type: "prompt", label: "Show allowed report routes", value: "Show me the approved report routes for my role" },
    };
  }
  if (reason === "approval_bypass") {
    return {
      answer: "ZoikoVertex is designed to preserve governance integrity. The Three-Key Approval Protocol and publishing controls exist to protect your organisation's compliance position and accountability record. I cannot help you bypass these controls. If a workflow is blocked, the correct path is to follow the approval process or contact your Workspace Administrator.",
      suggestions: ["How does the Three-Key Approval Protocol work?", "Contact my Workspace Administrator", "Back to Main Menu"],
      nextAction: null,
    };
  }
  return {
    answer: "No. My internal configuration is not available to users. If you have a question about how I work or what I can help you with, I am happy to explain my capabilities in plain terms.",
    suggestions: ["What can Custos help with?", "Back to Main Menu"],
    nextAction: { type: "prompt", label: "What can Custos do?", value: "What can Custos help with?" },
  };
}

// ─── Intent Classifier ────────────────────────────────────────────────────────

function classifyIntent(message, userState) {
  const text = normalizeText(message);

  if (/(bypass|override|circumvent|shortcut).*(approval|protocol|gate|publish|key)/i.test(text))
    return { category: "refusal", reason: "approval_bypass" };
  if (/(ignore previous|system prompt|hidden instructions|jailbreak|bypass guardrails)/.test(text))
    return { category: "refusal", reason: "prompt_injection" };
  if (/(secretly|hidden monitoring|spy on|covert monitoring|without consent)/.test(text))
    return { category: "refusal", reason: "covert_monitoring" };
  if (/(lawsuit|legal advice|disciplinary action|terminate employee|tax advice|medical advice)/.test(text))
    return { category: "refusal", reason: "professional_advice" };
  if (/(another user|other employee|someone else's|other workspace|show me their data|cross.?workspace)/.test(text))
    return { category: "refusal", reason: "forbidden_data_access" };
  if (/(demo|book a demo|talk to sales|contact sales|request a demo)/.test(text))
    return { category: "sales", action: "request_demo" };
  if (/(price|pricing|plan|cost|subscription|quote|how much)/.test(text))
    return { category: "sales", action: "capture_lead" };
  if (/(human|agent|support team|escalate|talk to someone)/.test(text))
    return { category: "support", action: "escalate_to_human" };
  if (/(not tracking|can't log in|cannot log in|screenshot missing|reports wrong|issue|bug|problem)/.test(text))
    return { category: "support", action: userState === "public" ? "escalate_to_human" : "create_support_ticket" };

  return { category: "general" };
}

// ─── Intent Matcher (against knowledge.json intents array) ───────────────────

function matchIntent(text) {
  return intents.find((intent) => {
    const triggers = intent.trigger_signals ?? intent.keywords ?? [];
    return triggers.some((signal) => text.includes(signal.toLowerCase()));
  }) ?? null;
}

// ─── Search Redirect Matcher ─────────────────────────────────────────────────

function matchRedirect(text) {
  return searchRedirects.find((r) =>
    r.keywords.some((kw) => text.includes(kw.toLowerCase()))
  ) ?? null;
}

// ─── Core Reply Builder ───────────────────────────────────────────────────────

function buildReply({ message, userState = "public", surface = "website" }) {
  const text = normalizeText(message);
  const safetyIntent = classifyIntent(message, userState);

  // 1. Safety / refusal checks
  if (safetyIntent.category === "refusal") {
    logSafety(safetyIntent.reason, message, surface, userState);
    const refusal = refusalReply(safetyIntent.reason);
    return {
      intent: safetyIntent.category,
      answer: refusal.answer,
      suggestions: refusal.suggestions ?? [],
      route: null,
      nextAction: refusal.nextAction,
      citations: [],
      toolsUsed: [],
      quickReplies: refusal.suggestions?.slice(0, 3) ?? [],
    };
  }

  // 2. Greeting / salutations
  if (/^(hi|hello|hey|greetings|good morning|good afternoon|good evening|howdy)$/.test(text)) {
    return {
      intent: "greeting",
      answer: greetingMsg,
      suggestions: defaultSuggestions,
      route: null,
      nextAction: null,
      citations: [],
      toolsUsed: [],
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 3. Goodbye / thanks
  if (/^(bye|goodbye|see you|thanks|thank you|cheers|ok|okay|yes)$/.test(text)) {
    return {
      intent: "goodbye",
      answer: goodbyeMsg ?? "Thanks for the conversation. If you have more questions about ZoikoVertex, I'm here.",
      suggestions: defaultSuggestions,
      route: null,
      nextAction: null,
      citations: [],
      toolsUsed: [],
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 4. Out-of-scope detection
  if (/(legal advice|medical advice|financial advice|tax advice|write code|homework help|write an essay)/.test(text)) {
    return {
      intent: "out_of_scope",
      answer: outOfScopeMsg,
      suggestions: defaultSuggestions,
      route: null,
      nextAction: null,
      citations: [],
      toolsUsed: [],
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 5. Tool actions for sales/support intents (before KB match)
  const toolInvocations = [];
  if (safetyIntent.category === "sales") {
    const toolName = safetyIntent.action === "request_demo" ? "request_demo" : "capture_lead";
    const toolResult = runTool(toolName, {
      name: "App user",
      email: "pending@example.com",
      company: "Pending qualification",
      intent: safetyIntent.action,
      surface,
    });
    toolInvocations.push(toolResult);
  }

  if (safetyIntent.category === "support") {
    const toolName = safetyIntent.action === "create_support_ticket"
      ? "create_support_ticket"
      : "escalate_to_human";
    const toolResult = runTool(toolName, { issue: message, priority: "normal", surface });
    toolInvocations.push(toolResult);
  }

  // 6. Match against intents in knowledge.json
  const matched = matchIntent(text);
  if (matched) {
    const answer = matched.answer_first ?? matched.response ?? matched.safe_claim ?? fallbackMsg;
    return {
      intent: matched.id,
      answer,
      suggestions: defaultSuggestions,
      route: matched.route ?? null,
      nextAction: null,
      citations: matched.citations ?? [],
      toolsUsed: toolInvocations.map((entry) => ({
        name: entry.tool,
        id: entry.output?.id ?? entry.id,
        success: Boolean(entry.output) && !entry.error,
      })),
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 7. Match against search_redirects
  const redirect = matchRedirect(text);
  if (redirect) {
    return {
      intent: redirect.intentId ?? redirect.id ?? "redirect",
      answer: redirect.prompt ?? redirect.answer_first ?? fallbackMsg,
      suggestions: defaultSuggestions,
      route: redirect.route ?? null,
      nextAction: { type: "navigate", label: redirect.actionLabel ?? "Learn more", value: redirect.route ?? "/" },
      citations: [],
      toolsUsed: [],
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 8. FAQ match (fallback text matching before generic fallback)
  const faqMatch = faq.find((entry) =>
    entry.q && text.includes(entry.q.toLowerCase().slice(0, 20))
  );
  if (faqMatch) {
    return {
      intent: "faq",
      answer: faqMatch.a,
      suggestions: defaultSuggestions,
      route: null,
      nextAction: null,
      citations: [],
      toolsUsed: [],
      quickReplies: defaultSuggestions.slice(0, 3),
    };
  }

  // 9. Generic fallback
  return {
    intent: "fallback",
    answer: fallbackMsg,
    suggestions: defaultSuggestions,
    route: null,
    nextAction: null,
    citations: [],
    toolsUsed: [],
    quickReplies: defaultSuggestions.slice(0, 3),
  };
}

// ─── Conversation Store ───────────────────────────────────────────────────────

function recordConversation(conversation) {
  conversations.push(conversation);
}

function getConversationHistory(sessionId) {
  return conversations.filter((entry) => entry.sessionId === sessionId);
}

// ─── Bootstrap ───────────────────────────────────────────────────────────────

function getBootstrap() {
  return bootstrap;
}

// ─── Admin Overview ───────────────────────────────────────────────────────────

function getAdminOverview() {
  return {
    metrics: {
      conversations: conversations.length,
      supportTickets: supportTickets.length,
      leads: leads.length,
      safetyEvents: safetyLogs.length,
      toolInvocations: toolLogs.length,
    },
    recentConversations: conversations.slice(-5).reverse(),
    recentSafetyEvents: safetyLogs.slice(-5).reverse(),
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  createSessionId,
  createConversationId,
  logSafety,
  classifyIntent,
  runTool,
  buildReply,
  getBootstrap,
  recordConversation,
  getConversationHistory,
  getAdminOverview,
};