"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

interface PopoverProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  position?: "bottom" | "top" | "left" | "right";
  align?: "start" | "center" | "end";
  offset?: number;
  closeOnOutsideClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const Z_INDEX = 55;

export function Popover({
  open,
  onClose,
  children,
  anchorRef,
  position = "bottom",
  align = "start",
  offset = 8,
  closeOnOutsideClick = true,
  closeOnEscape = true,
  className = "",
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = 0;
    let left = 0;

    switch (position) {
      case "bottom":
        top = anchorRect.bottom + offset;
        break;
      case "top":
        top = anchorRect.top - popoverRect.height - offset;
        break;
      case "right":
        top = anchorRect.top + (anchorRect.height - popoverRect.height) / 2;
        left = anchorRect.right + offset;
        break;
      case "left":
        top = anchorRect.top + (anchorRect.height - popoverRect.height) / 2;
        left = anchorRect.left - popoverRect.width - offset;
        break;
    }

    if (position === "bottom" || position === "top") {
      switch (align) {
        case "start":
          left = anchorRect.left;
          break;
        case "center":
          left = anchorRect.left + (anchorRect.width - popoverRect.width) / 2;
          break;
        case "end":
          left = anchorRect.right - popoverRect.width;
          break;
      }
    }

    if (left < 8) left = 8;
    if (left + popoverRect.width > viewportWidth - 8) {
      left = viewportWidth - popoverRect.width - 8;
    }
    if (top < 8) top = 8;
    if (top + popoverRect.height > viewportHeight - 8) {
      top = viewportHeight - popoverRect.height - 8;
    }

    setPopoverStyle({ top: `${top}px`, left: `${left}px` });
  }, [anchorRef, position, align, offset]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!closeOnEscape) return;
      if (e.key === "Escape") {
        onClose();
      }
    },
    [closeOnEscape, onClose]
  );

  const handleClickOutside = useCallback(
    (e: MouseEvent) => {
      if (!closeOnOutsideClick) return;
      const anchor = anchorRef.current;
      const popover = popoverRef.current;
      if (anchor && anchor.contains(e.target as Node)) return;
      if (popover && popover.contains(e.target as Node)) return;
      onClose();
    },
    [anchorRef, closeOnOutsideClick, onClose]
  );

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside, true);

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside, true);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, updatePosition, handleKeyDown, handleClickOutside]);

  if (!open) return null;

  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        ref={popoverRef}
        role="menu"
        style={{ ...popoverStyle, zIndex: Z_INDEX }}
        className={`bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg p-2 ${className}`}
        initial={false}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: position === "bottom" ? -8 : 8 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 150, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}