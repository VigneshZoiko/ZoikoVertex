const { v4: uuidv4 } = require("uuid");

const handoffRequests = [];

const HANDOFF_CATEGORIES = {
  SALES: { label: "Sales Enquiry", route: "sales" },
  LEGAL: { label: "Legal / DPA", route: "legal" },
  SECURITY: { label: "Security Review", route: "security" },
  BILLING: { label: "Billing Support", route: "billing" },
  SUPPORT: { label: "Technical Support", route: "support" },
};

function categorizeHandoff(message, userState = "public") {
  const text = (message || "").toLowerCase();

  if (/(enterprise|corporate|custom pricing|contract|procurement|vendor)/.test(text))
    return HANDOFF_CATEGORIES.SALES;
  if (/(dpa|legal|contract review|attorney|lawyer|regulatory)/.test(text))
    return HANDOFF_CATEGORIES.LEGAL;
  if (/(security questionnaire|pentest|soc|iso|vendor assessment)/.test(text))
    return HANDOFF_CATEGORIES.SECURITY;
  if (/(billing|refund|invoice|cancel subscription|payment|charge|receipt)/.test(text))
    return HANDOFF_CATEGORIES.BILLING;
  if (/(bug|error|not working|cant log in|broken|issue|problem|technical)/.test(text))
    return HANDOFF_CATEGORIES.SUPPORT;

  return HANDOFF_CATEGORIES.SUPPORT;
}

function createHandoffTicket({ user, message, sessionId, category, context }) {
  const categoryInfo = category || categorizeHandoff(message, user?.userState);

  const ticket = {
    id: `handoff-${uuidv4().slice(0, 8)}`,
    sessionId: sessionId || uuidv4(),
    userEmail: user?.email || "unknown@local",
    userName: user?.name || "Unknown User",
    company: user?.company || "",
    category: categoryInfo,
    message: message || "No message provided",
    context: context || "",
    status: "open",
    priority: "normal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  handoffRequests.push(ticket);

  console.log(
    `[Handoff] Ticket ${ticket.id} created - ${categoryInfo.label} from ${ticket.userEmail}`,
  );

  return ticket;
}

function getHandoffTickets({ status, email } = {}) {
  let tickets = [...handoffRequests];

  if (status) {
    tickets = tickets.filter((t) => t.status === status);
  }

  if (email) {
    tickets = tickets.filter((t) => t.userEmail === email);
  }

  return tickets.sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
  );
}

function updateHandoffStatus(ticketId, status) {
  const ticket = handoffRequests.find((t) => t.id === ticketId);
  if (!ticket) return null;

  ticket.status = status;
  ticket.updatedAt = new Date().toISOString();
  return ticket;
}

function getHandoffResponse(ticket) {
  const estimatedResponseMap = {
    sales: "within 24 hours",
    legal: "within 48 hours",
    security: "within 24 hours",
    billing: "within 12 hours",
    support: "within 4 hours",
  };

  const estimatedTime = estimatedResponseMap[ticket.category.route] || "within 24 hours";

  return {
    answer: `I've created a ${ticket.category.label} request (ID: ${ticket.id}). A team member will follow up at ${ticket.userEmail} ${estimatedTime}.`,
    handoffId: ticket.id,
    category: ticket.category,
    estimatedResponse: estimatedTime,
    suggestions: ["What's the status of my request?", "Back to main menu"],
  };
}

module.exports = {
  createHandoffTicket,
  getHandoffTickets,
  updateHandoffStatus,
  getHandoffResponse,
  HANDOFF_CATEGORIES,
};
