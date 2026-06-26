import { useState, useEffect } from "react";
import ChatBotRoot from "../custos-FE/ChatBotRoot";

const RobotIcon = ({ size = 30 }) => (
  <svg
    width={size}
    height={30}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <circle cx="32" cy="11" r="3" fill="#fff" />
    <line
      x1="32"
      y1="14"
      x2="32"
      y2="20"
      stroke="#fff"
      strokeWidth="2.4"
      strokeLinecap="round"
    />
    <rect x="14" y="20" width="36" height="26" rx="9" fill="#fff" />
    <rect x="9" y="27" width="6" height="12" rx="2.5" fill="#fff" />
    <rect x="49" y="27" width="6" height="12" rx="2.5" fill="#fff" />
    <rect x="19" y="25" width="26" height="16" rx="5" fill="#1F6FEB" />
    <ellipse cx="26" cy="33" rx="2.2" ry="3" fill="#fff" />
    <ellipse cx="38" cy="33" rx="2.2" ry="3" fill="#fff" />
    <path d="M28 46 L34 46 L34 53 Z" fill="#fff" />
  </svg>
);

const CloseIcon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 20 20"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M5 5L15 15M15 5L5 15"
      stroke="#fff"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
  </svg>
);

export default function FloatingAssistantBot({ right = 24, bottom = 24 } = {}) {
  const [isOpen, setIsOpen] = useState(false);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  return (
    <>
      <style>{`
        @keyframes ztBotFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes ztBotPulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(31,111,235,.35), 0 0 0 0 rgba(31,111,235,.45); }
          50%       { box-shadow: 0 8px 24px rgba(31,111,235,.45), 0 0 0 12px rgba(31,111,235,0); }
        }
        @keyframes ztFadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes ztPopUp {
          from { opacity: 0; transform: scale(0.92) translateY(16px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .zt-fab {
          animation: ztBotFloat 3.6s ease-in-out infinite, ztBotPulse 2.8s ease-out infinite;
          transition: transform .18s cubic-bezier(.34,1.56,.64,1);
        }
        .zt-fab:hover  { transform: scale(1.08) !important; }
        .zt-fab:active { transform: scale(.96)  !important; }
        .zt-fab-open {
          animation: none !important;
          box-shadow: 0 8px 24px rgba(31,111,235,.5) !important;
        }
        .zt-backdrop { animation: ztFadeIn .22s ease-out; }
        .zt-chat-panel { animation: ztPopUp .26s cubic-bezier(.22,1,.36,1); }
      `}</style>

      {/* Backdrop — click outside to close */}
      {isOpen && (
        <div
          className="zt-backdrop"
          onClick={() => setIsOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.35)",
            backdropFilter: "blur(0.5px)",
            WebkitBackdropFilter: "blur(5px)",
            zIndex: 8999,
          }}
        />
      )}

      {/* Floating chat container */}
      {isOpen && (
        <div
          className="zt-chat-panel"
          style={{
            position: "fixed",
            bottom: bottom - 80, // ← was bottom - 70, now sits above FAB properly
            right,
            width: 460,
            maxHeight: "calc(100vh - 100px)",
            height: "calc(100vh - 100px)",
            borderRadius: 20,
            boxShadow:
              "0 16px 48px rgba(0,0,0,.3), 0 0 0 1px rgba(31,111,235,.15)",
            zIndex: 9001,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <ChatBotRoot />
        </div>
      )}

      {/* FAB button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={
          isOpen ? "Close ZoikoTime Assistant" : "Open ZoikoTime Assistant"
        }
        title="ZoikoTime Assistant"
        className={`zt-fab${isOpen ? " zt-fab-open" : ""}`}
        style={{
          position: "fixed",
          bottom,
          right,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          background:
            "radial-gradient(circle at 30% 30%, #4F8DF7 0%, #1F6FEB 65%, #1858C2 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          zIndex: 8000,
        }}
      >
        {isOpen ? <CloseIcon /> : <RobotIcon size={32} />}
      </button>
    </>
  );
}
