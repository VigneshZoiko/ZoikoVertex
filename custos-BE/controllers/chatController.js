const { validationResult } = require("express-validator");
const {
  createConversationForUser,
  deleteConversation,
  endConversation,
  generateHybridReply,
  handleHumanHandoff,
  getChatContext,
  getUnknownPrompts,
  getSessionHistory,
  listUserConversations,
  saveMessage,
  trackUnknownPrompt,
} = require("../services/chatService");

// 🔥 MAIN CHAT FUNCTION
async function sendChatMessage(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
      });
    }

    let { sessionId, message, user, language = "en", fileUrl, fileName, fileType } = req.body;

    // ✅ prevent empty messages (allow file-only messages)
    if ((!message || !message.trim()) && !fileUrl) {
      return res.status(400).json({
        success: false,
        message: "Message or file is required",
      });
    }

    // ✅ fallback language
    if (!["en", "hi"].includes(language)) {
      console.log("⚠️ Invalid language:", language);
      language = "en";
    }

    // 🔥 CREATE SESSION ONLY WHEN FIRST MESSAGE COMES
    if (!sessionId) {
      const session = await createConversationForUser(user);
      sessionId = session.sessionId;
      console.log("🆕 Created new session:", sessionId);
    }

    // ✅ SAVE USER MESSAGE
    const metadata = {};
    if (fileUrl) {
      metadata.file = { url: fileUrl, name: fileName || "file", type: fileType || "application/octet-stream" };
    }
    await saveMessage({
      sessionId,
      user,
      userEmail: user?.email || "unknown@local",
      role: "user",
      content: (message || "").trim(),
      metadata,
    });

    // ✅ GENERATE BOT REPLY (hybrid: rule-first, AI fallback)
    let reply;
    try {
      const history = await getSessionHistory(sessionId);
      reply = await generateHybridReply(message, language, history);
    } catch (err) {
      console.error("❌ Reply generation failed:", err);
      reply = {
        answer: "Sorry, something went wrong.",
        suggestions: [],
        route: null,
        intent: "error",
      };
    }

    if (reply.intent === "fallback" && reply.source !== "ai") {
      await trackUnknownPrompt(message);
    }

    // ✅ SAVE ASSISTANT MESSAGE
    const assistantMeta = {
      matchedQuestion: reply.matchedQuestion,
      confidence: reply.confidence,
      suggestions: reply.suggestions,
      route: reply.route,
      intent: reply.intent,
      source: reply.source || "rule",
    };

    if (reply.citations) {
      assistantMeta.citations = reply.citations;
    }

    if (reply.model) {
      assistantMeta.model = reply.model;
    }

    if (reply.handoffId) {
      assistantMeta.handoffId = reply.handoffId;
      assistantMeta.handoffCategory = reply.handoffCategory;
    }

    await saveMessage({
      sessionId,
      user,
      userEmail: user?.email || "unknown@local",
      role: "assistant",
      content: reply.answer,
      metadata: assistantMeta,
    });

    // ✅ RETURN RESPONSE
    return res.json({
      success: true,
      sessionId,
      message: reply,
    });
  } catch (error) {
    console.error("❌ ERROR in sendChatMessage:", error);
    next(error);
  }
}

async function getTrackedPrompts(_req, res, next) {
  try {
    const prompts = await getUnknownPrompts();
    return res.json({
      success: true,
      prompts,
    });
  } catch (error) {
    next(error);
  }
}

// 🔹 GET CHAT HISTORY
async function getChatHistory(req, res, next) {
  try {
    const messages = await getSessionHistory(req.params.sessionId);
    const context = getChatContext();

    return res.json({
      success: true,
      messages:
        messages.length > 0
          ? messages
          : [
              {
                id: "welcome",
                role: "assistant",
                content: context.welcomeMessage,
                timestamp: new Date().toISOString(),
              },
            ],
    });
  } catch (error) {
    next(error);
  }
}

// 🔹 GET UI CONTEXT
function getChatUiContext(_req, res, next) {
  try {
    return res.json({
      success: true,
      context: getChatContext(),
    });
  } catch (error) {
    next(error);
  }
}

// 🔹 GET USER SESSIONS
async function getUserSessions(req, res, next) {
  try {
    const email = (req.query.email || "").toLowerCase().trim();
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required.",
      });
    }

    const sessions = await listUserConversations(email);
    return res.json({ success: true, sessions });
  } catch (error) {
    next(error);
  }
}

// 🔹 CREATE SESSION (optional endpoint)
async function createSession(req, res, next) {
  try {
    const { user } = req.body;
    if (!user?.email) {
      return res.status(400).json({
        success: false,
        message: "User details are required.",
      });
    }

    const session = await createConversationForUser(user);
    return res.json({
      success: true,
      session,
    });
  } catch (error) {
    next(error);
  }
}

// 🔹 END SESSION
async function closeSession(req, res, next) {
  try {
    const { userEmail } = req.body;
    await endConversation(
      req.params.sessionId,
      userEmail?.toLowerCase().trim(),
    );
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// 🔹 DELETE SESSION
async function removeSession(req, res, next) {
  try {
    const userEmail = (req.query.userEmail || "").toLowerCase().trim();
    await deleteConversation(req.params.sessionId, userEmail || undefined);
    return res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

async function requestHumanHandoff(req, res, next) {
  try {
    const { sessionId, message, user } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message is required for handoff.",
      });
    }

    const reply = await handleHumanHandoff({ user, message, sessionId });

    await saveMessage({
      sessionId: sessionId || "handoff-direct",
      user,
      userEmail: user?.email || "unknown@local",
      role: "assistant",
      content: reply.answer,
      metadata: {
        intent: "handoff",
        handoffId: reply.handoffId,
        handoffCategory: reply.handoffCategory,
        source: "handoff",
      },
    });

    return res.json({
      success: true,
      sessionId,
      message: reply,
    });
  } catch (error) {
    console.error("❌ ERROR in requestHumanHandoff:", error);
    next(error);
  }
}

module.exports = {
  closeSession,
  createSession,
  getChatUiContext,
  getTrackedPrompts,
  requestHumanHandoff,
  sendChatMessage,
  getChatHistory,
  getUserSessions,
  removeSession,
};
