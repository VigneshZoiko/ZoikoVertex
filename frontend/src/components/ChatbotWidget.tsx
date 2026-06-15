"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Bot, Minimize2 } from "lucide-react";

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
}

const INITIAL_MESSAGES: Message[] = [
  {
    id: 1,
    role: "bot",
    text: "Hi there! 👋 I'm your ZoikoVertex assistant. How can I help you today?",
  },
];

const QUICK_REPLIES = [
  "How do I create a campaign?",
  "Explain governance workflows",
  "What roles can I assign?",
];

export default function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      inputRef.current?.focus();
    }
  }, [open, messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const reply: Message = {
        id: Date.now() + 1,
        role: "bot",
        text: getBotReply(text.trim()),
      };
      setMessages((prev) => [...prev, reply]);
      setTyping(false);
    }, 1000);
  };

  return (
    <>
      {/* Chat panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-[340px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-white/10 transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{ background: "#111318", maxHeight: "520px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 shrink-0" style={{ background: "linear-gradient(135deg, #1a56db 0%, #1e429f 100%)" }}>
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold leading-none">ZoikoVertex Assistant</p>
            <p className="text-white/70 text-xs mt-0.5">Always here to help</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <Minimize2 className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3" style={{ minHeight: 0 }}>
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "bot" && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                  <Bot className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-white/8 text-[var(--foreground)] rounded-bl-sm border border-white/8"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex justify-start">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-white/8 border border-white/8 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-white/50 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}

          {/* Quick replies — only shown after initial bot message */}
          {messages.length === 1 && !typing && (
            <div className="flex flex-wrap gap-2 mt-1">
              {QUICK_REPLIES.map((qr) => (
                <button
                  key={qr}
                  onClick={() => sendMessage(qr)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 transition-colors"
                >
                  {qr}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-white/8 flex gap-2 items-center shrink-0">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
            placeholder="Type a message…"
            className="flex-1 bg-white/6 border border-white/10 rounded-xl px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-white/30 outline-none focus:border-blue-500/50 transition-colors"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || typing}
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors shrink-0"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>

      {/* FAB trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
        style={{ background: "linear-gradient(135deg, #1a56db 0%, #1e429f 100%)" }}
        aria-label="Open chat assistant"
      >
        {open ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
            <path
              d="M13 3C7.477 3 3 7.03 3 12c0 2.16.82 4.14 2.17 5.7L4 23l5.57-1.44A10.1 10.1 0 0 0 13 22c5.523 0 10-4.03 10-9s-4.477-9-10-9Z"
              fill="white"
              fillOpacity="0.95"
            />
            <path
              d="M9 12h1M12.5 12h1M16 12h1"
              stroke="#1a56db"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>
    </>
  );
}

function getBotReply(input: string): string {
  const q = input.toLowerCase();
  if (q.includes("campaign")) return "To create a campaign, go to Campaigns → New Campaign. You can set budget, platforms, and schedule from there.";
  if (q.includes("governance") || q.includes("workflow")) return "Governance workflows enforce review gates before content is published. Configure rules under Governance → Rules.";
  if (q.includes("role")) return "Roles are managed under Access & Organization. You can assign roles like ADMIN, CONTENT_CREATOR, REVIEWER and more.";
  if (q.includes("help") || q.includes("support")) return "You can reach support via the Support page in the sidebar, or email us at support@zoiko.com.";
  return "I'm not sure about that yet, but your team is working on expanding my knowledge! Try the Support page for detailed help.";
}
