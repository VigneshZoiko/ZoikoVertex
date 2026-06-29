import { useRef } from "react";
import { HiOutlinePaperAirplane, HiOutlineTrash } from "react-icons/hi2";
import { HiOutlinePaperClip, HiOutlineXMark } from "react-icons/hi2";

export default function Composer({
  input,
  setInput,
  isTyping,
  onSend,
  onClear,
  theme,
  attachedFile,
  onFileSelect,
  onFileRemove,
}) {
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const isDark = theme === "dark";

  const handleSubmit = (event) => {
    event.preventDefault();
    if ((!input.trim() && !attachedFile) || isTyping) return;
    onSend();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      handleSubmit(event);
    }
  };

  const handleFileButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
    event.target.value = "";
  };

  const isImageFile = attachedFile?.type?.startsWith("image/");

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex-shrink-0 border-t px-4 py-2 sm:px-5 sm:py-2.5 ${
        isDark
          ? "border-[rgba(255,255,255,0.05)]"
          : "border-[rgba(43,154,217,0.16)]"
      }`}
    >
      {attachedFile && (
        <div className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
          isDark
            ? "bg-[rgba(23,51,124,0.25)] text-[#7ac8f0]"
            : "bg-[rgba(43,154,217,0.1)] text-[#1a5fa8]"
        }`}>
          {isImageFile && (
            <img
              src={attachedFile.url}
              alt={attachedFile.name}
              className="h-8 w-8 rounded object-cover"
            />
          )}
          <span className="flex-1 truncate">{attachedFile.name}</span>
          <button
            type="button"
            onClick={onFileRemove}
            className="ml-1 rounded p-0.5 hover:bg-black/10"
          >
            <HiOutlineXMark className="h-4 w-4" />
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/zip"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        className={`flex items-end gap-2.5 rounded-[18px] border px-4 py-1.5 transition-colors duration-200 ${
          isDark
            ? "border-[rgba(23,51,124,0.55)] bg-[rgba(10,22,40,0.96)] focus-within:border-[rgba(77,184,255,0.35)]"
            : "border-[rgba(43,154,217,0.26)] bg-white focus-within:border-[rgba(43,154,217,0.55)] shadow-sm"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value);
            event.target.style.height = "auto";
            event.target.style.height = `${Math.min(
              event.target.scrollHeight,
              80,
            )}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything about ZoikoVertex..."
          rows={1}
          disabled={isTyping}
          className={`flex-1 resize-none bg-transparent text-sm leading-relaxed outline-none disabled:opacity-50 ${
            isDark
              ? "text-[#d8eeff] placeholder-[#5a7da0]"
              : "text-[#0a2d5c] placeholder-[#5a7da0]"
          }`}
          style={{ maxHeight: "80px", minHeight: "22px" }}
        />

        <button
          type="button"
          onClick={handleFileButtonClick}
          disabled={isTyping}
          title="Attach file"
          className={`orbit-icon-button mb-0.5 h-8 w-8 flex-shrink-0 rounded-[11px] ${
            isDark
              ? "text-[#7ac8f0] hover:bg-[rgba(23,51,124,0.3)]"
              : "text-[#1a5fa8] hover:bg-[rgba(43,154,217,0.12)]"
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <HiOutlinePaperClip className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={onClear}
          title="Clear chat"
          className={`orbit-icon-button mb-0.5 h-8 w-8 flex-shrink-0 rounded-[11px] ${
            isDark
              ? "text-[#7ac8f0] hover:bg-[rgba(23,51,124,0.3)]"
              : "text-[#1a5fa8] hover:bg-[rgba(43,154,217,0.12)]"
          }`}
        >
          <HiOutlineTrash className="h-4 w-4 hover:text-red-500" />
        </button>

        <button
          type="submit"
          disabled={(!input.trim() && !attachedFile) || isTyping}
          title="Send"
          className="orbit-send-button mb-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[11px] transition-all hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-30"
        >
          <HiOutlinePaperAirplane className="h-4 w-4 text-[#ffffff]" />
        </button>
      </div>

      <p
        className={`mt-1 select-none text-center text-[0.58rem] tracking-wide ${
          isDark           ? "text-[#5a7da0]" : "text-[#5a7da0]"
        }`}
      >
        ZoikoVertex AI · Source-grounded · Governed responses
      </p>
    </form>
  );
}
