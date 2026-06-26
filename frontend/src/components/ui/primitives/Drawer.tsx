"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

type DrawerPosition = "right" | "left";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  position?: DrawerPosition;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  full: "max-w-4xl",
};

const Z_INDEX = {
  backdrop: 50,
  content: 60,
};

export function Drawer({
  open,
  onClose,
  title,
  description,
  children,
  position = "right",
  size = "lg",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = "",
}: DrawerProps) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const focusableElementsRef = useRef<HTMLElement[]>([]);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const trapFocus = useCallback(() => {
    const content = contentRef.current;
    if (!content) return;

    const focusable = content.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    focusableElementsRef.current = Array.from(focusable);

    if (focusableElementsRef.current.length > 0) {
      focusableElementsRef.current[0].focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!closeOnEscape && e.key !== "Tab") return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const elements = focusableElementsRef.current;
        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [closeOnEscape, onClose]
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (position === "right") {
      setTouchStart(e.touches[0].clientX);
    } else {
      setTouchStart(e.touches[0].clientX);
    }
  }, [position]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStart === null) return;
    const currentX = e.touches[0].clientX;
    const delta = position === "right" ? touchStart - currentX : currentX - touchStart;
    if (delta > 100) {
      onClose();
      setTouchStart(null);
    }
  }, [position, touchStart, onClose]);

  const handleTouchEnd = useCallback(() => {
    setTouchStart(null);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousActiveElement.current = document.activeElement as HTMLElement;

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    const raf = requestAnimationFrame(() => {
      trapFocus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = "";
      document.removeEventListener("keydown", handleKeyDown);
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [open, handleKeyDown, trapFocus]);

  if (!open) return null;

  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isRight = position === "right";
  const translateX = isRight ? "translate-x-full" : "-translate-x-full";
  const translateXOpen = "translate-x-0";

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 150, ease: "easeOut" }}
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.backdrop }}
        role="presentation"
      >
        <motion.div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={closeOnOverlayClick ? onClose : undefined}
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 150, ease: "easeOut" }}
        />

        <div className={`fixed inset-y-0 ${isRight ? "right-0" : "left-0"} z-[59] flex justify-end`}>
          <motion.div
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? "drawer-title" : undefined}
            aria-describedby={description ? "drawer-description" : undefined}
            className={`flex max-h-full w-full ${SIZE_CLASSES[size]} flex-col bg-[var(--card)] border-l border-[var(--border)] shadow-2xl ${className}`}
            initial={{ x: isRight ? "100%" : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: isRight ? "100%" : "-100%" }}
            transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", damping: 25, stiffness: 200 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {(title || showCloseButton) && (
              <div className="flex items-start justify-between gap-4 p-6 border-b border-[var(--border)] shrink-0">
                <div>
                  {title && (
                    <h2 id="drawer-title" className="text-lg font-semibold text-[var(--foreground)]">
                      {title}
                    </h2>
                  )}
                  {description && (
                    <p id="drawer-description" className="mt-1 text-sm text-[var(--foreground-muted)]">
                      {description}
                    </p>
                  )}
                </div>
                {showCloseButton && (
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[var(--foreground-muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-6">{children}</div>
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}