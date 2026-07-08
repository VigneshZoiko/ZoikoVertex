import { useEffect, useRef, useState } from "react";
import TypingDots from "./TypingDots";

const animatedIds = new Set();

// ─── Module-level audio context singleton ────────────────────────────────────
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (
      window.AudioContext ||
      window.webkitAudioContext
    )();
  }
  return audioCtx;
}

// ─── Notify sound ─────────────────────────────────────────────────────────────
async function playDoneSound() {
  try {
    const ac = getAudioContext();

    if (ac.state !== "running") {
      await ac.resume();
    }

    const t = ac.currentTime;

    [[880, 0], [660, 0.15]].forEach(([freq, offset]) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();

      osc.connect(gain);
      gain.connect(ac.destination);

      osc.type = "sine";

      osc.frequency.setValueAtTime(freq, t + offset);

      gain.gain.setValueAtTime(0, t + offset);
      gain.gain.linearRampToValueAtTime(0.05, t + offset + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2);

      osc.start(t + offset);
      osc.stop(t + offset + 0.2);

      osc.onended = () => {
        osc.disconnect();
        gain.disconnect();
      };
    });

  } catch (_) {
    // audio is optional
  }
}

const _rawFileBase = (typeof process !== "undefined" && process.env?.NEXT_PUBLIC_CUSTOS_API_URL) || "http://localhost:5000/api";
const FILE_BASE_URL = _rawFileBase.replace(/\/api\/?$/, "");

function isImageType(mime) {
  return mime?.startsWith("image/");
}

function FileAttachment({ file, isDark }) {
  const fileUrl = file.url?.startsWith("/")
    ? `${FILE_BASE_URL}${file.url}`
    : file.url;
  const isImage = isImageType(file.type);

  if (isImage) {
    return (
      <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="block mt-1.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={fileUrl}
          alt={file.name}
          className="max-w-full max-h-48 rounded-lg object-cover border"
        />
      </a>
    );
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
        isDark
          ? "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] text-[#7ac8f0] hover:bg-[rgba(255,255,255,0.08)]"
          : "border-[rgba(43,154,217,0.2)] bg-[rgba(43,154,217,0.05)] text-[#1a5fa8] hover:bg-[rgba(43,154,217,0.1)]"
      }`}
    >
      <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
      <span className="flex-1 truncate">{file.name}</span>
    </a>
  );
}

export default function MessageBubble({
  msg,
  onSuggestion,
  theme,
  isNew,
  bottomRef,
}) {
  const isUser = msg.role === "user";
  const isDark = theme === "dark";
  const body = msg.text ?? msg.content ?? "";
  const isStringBody = typeof body === "string";

  const shouldAnimate =
    !isUser && isStringBody && !msg.typing && isNew && !animatedIds.has(msg.id);

  const [displayed, setDisplayed] = useState(
    shouldAnimate ? "" : isStringBody ? body : "",
  );
  const [animating, setAnimating] = useState(shouldAnimate);
  const rafRef = useRef(null);

  useEffect(() => {
    if (!shouldAnimate) return;

    animatedIds.add(msg.id);

    const words = body.split(" ");
    const totalWords = words.length;
    const DURATION_MS = Math.min(3000, Math.max(400, totalWords * 55));
    const intervalMs = DURATION_MS / totalWords;

    let wordIndex = 0;
    let lastTime = null;
    let accumulated = 0;

    function step(timestamp) {
      if (!lastTime) lastTime = timestamp;
      accumulated += timestamp - lastTime;
      lastTime = timestamp;

      const target = Math.min(
        totalWords,
        Math.floor(accumulated / intervalMs) + 1,
      );

      if (target > wordIndex) {
        wordIndex = target;
        setDisplayed(words.slice(0, wordIndex).join(" "));
        bottomRef?.current?.scrollIntoView({ behavior: "smooth" });
      }

      if (wordIndex < totalWords) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        setDisplayed(body);
        setAnimating(false);
        bottomRef?.current?.scrollIntoView({ behavior: "smooth" });

        // ─── Play notify sound 100ms after animation completes ─────────────
        setTimeout(playDoneSound, 100);
      }
    }

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderedBody = isStringBody ? (animating ? displayed : body) : body;

  function linkify(text) {
    // Strip markdown link syntax: [text](url) -> url
    text = text.replace(/\[([^\]]*)\]\(([^)]+)\)/g, '$2');
    const urlRegex = /(https?:\/\/[^\s<]+|[a-z0-9][a-z0-9.-]*\.[a-z]{2,}(?:\/[^\s<]*)?(?=[\s<]|$))/gi;
    const emailRegex = /([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/gi;
    const parts = [];
    let lastIndex = 0;

    const matches = [];
    let m;
    while ((m = urlRegex.exec(text)) !== null) {
      matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], type: 'url' });
    }
    while ((m = emailRegex.exec(text)) !== null) {
      matches.push({ index: m.index, end: m.index + m[0].length, text: m[0], type: 'email' });
    }
    matches.sort((a, b) => a.index - b.index);

    for (const match of matches) {
      if (match.index < lastIndex) continue;
      if (match.index > lastIndex) {
        parts.push(text.slice(lastIndex, match.index));
      }
      const href = match.type === 'email'
        ? `mailto:${match.text}`
        : match.text.startsWith('http')
          ? match.text
          : `https://${match.text}`;
      parts.push(
        <a key={match.index} href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 decoration-1 hover:opacity-80 transition-opacity" style={{ color: 'var(--accent, #2b9ad9)' }}>
          {match.text}
        </a>
      );
      lastIndex = match.end;
    }
    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }
    return parts.length > 0 ? parts : text;
  }

  function renderText(text) {
    const paragraphs = text.split("\n\n");
    return paragraphs.map((para, pi) => (
      <span key={pi}>
        {para.split("\n").map((line, li) => (
          <span key={li}>
            {linkify(line)}
            {li < para.split("\n").length - 1 && <br />}
          </span>
        ))}
        {pi < paragraphs.length - 1 && (
          <span style={{ display: "block", height: "0.85em" }} />
        )}
      </span>
    ));
  }

  return (
    <div
      className={`flex w-full gap-2.5 ${isUser ? "justify-end" : "justify-start"} mb-4`}
      style={{ animation: "msgIn 0.22s ease both" }}
    >
      {!isUser && (
        <div className="relative h-8 w-8">
          <div className="h-8 w-8 rounded-full bg-[#e6f4f7] flex items-center justify-center overflow-hidden border-2 border-[#4db8ff]">
            <span className="text-[0.72rem] font-semibold text-[#1d4e61]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/chatbot/zoikovertex-favicon.png" alt="Custos" className="h-full w-full object-contain" />
            </span>
          </div>
        </div>
      )}

      <div
        className={`flex flex-col gap-2 ${isUser ? "items-end" : "items-start"} max-w-[85%]`}
      >
        <div
          className={
            isUser
              ? "rounded-2xl rounded-tr-sm bg-gradient-to-br from-[#2b9ad9] to-[#1a5fa8] px-4 py-2.5 text-[#ffffff] font-semibold text-sm shadow-lg"
              : isDark
                ? "rounded-2xl rounded-tl-sm border border-[rgba(77,184,255,0.15)] bg-[rgba(13,31,58,0.85)] px-4 py-3 text-[#c8dafc] text-sm shadow-md"
                : "rounded-2xl rounded-tl-sm border border-[rgba(43,154,217,0.25)] bg-white px-4 py-3 text-[#103040] text-sm shadow-md"
          }
        >
          {msg.typing ? (
            <TypingDots />
          ) : isStringBody ? (
            <span style={{ lineHeight: "1.45", display: "block" }}>
              {renderText(renderedBody)}
            </span>
          ) : (
            body
          )}
          {msg.file && <FileAttachment file={msg.file} isDark={isDark} />}
        </div>

        {!isUser && !msg.typing && !animating && msg.source === "handoff" && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`rounded-full px-2 py-0.5 text-[0.55rem] font-semibold uppercase tracking-wider ${
              isDark
                ? "bg-[rgba(34,197,94,0.15)] text-[#22c55e] border border-[rgba(34,197,94,0.3)]"
                : "bg-[rgba(34,197,94,0.1)] text-[#15803d] border border-[rgba(34,197,94,0.25)]"
            }`}>
              Human Agent
            </span>
          </div>
        )}

        {!isUser && !msg.typing && !animating && msg.citations?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-0.5">
            {msg.citations.map((c, i) => (
              <span
                key={i}
                className={`rounded-full border px-2 py-0.5 text-[0.6rem] font-medium ${
                  isDark
                    ? "border-[rgba(77,184,255,0.15)] bg-[rgba(13,31,58,0.5)] text-[#5a7da0]"
                    : "border-[rgba(43,154,217,0.3)] bg-[rgba(43,154,217,0.08)] text-[#1a5fa8]"
                }`}
              >
                {c.title}
              </span>
            ))}
          </div>
        )}

        {!isUser &&
          !msg.typing &&
          !animating &&
          msg.suggestions?.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {msg.suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => onSuggestion(s)}
                  className={`rounded-full border px-3 py-1 text-[0.71rem] font-medium transition-all active:scale-95 ${
                    isDark
                    ? "border-[rgba(77,184,255,0.2)] bg-[rgba(13,31,58,0.65)] text-[#7ac8f0] hover:border-[#4db8ff] hover:bg-[rgba(23,51,124,0.3)] hover:text-[#4db8ff]"
                    : "border-[rgba(43,154,217,0.35)] bg-[rgba(43,154,217,0.07)] text-[#2b9ad9] hover:border-[#4db8ff] hover:bg-[rgba(43,154,217,0.15)] hover:text-[#1a5fa8]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-0.5">
          <div
            className={`h-8 w-8 rounded-[13px] flex items-center justify-center text-[0.68rem] font-bold bg-green-300 ${
              isDark
                ? "border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.07)] text-[#7ac8f0]"
                : "border border-[rgba(43,154,217,0.3)] bg-[rgba(43,154,217,0.1)] text-[#1a5fa8]"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/chatbot/avatar.svg"
              alt="User avatar"
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}