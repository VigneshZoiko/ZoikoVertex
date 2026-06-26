"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DraftGuardContextType {
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
  /** Call this instead of router.push when a draft may be in progress */
  requestNavigation: (href: string) => void;
  pendingHref: string | null;
  showDiscardModal: boolean;
  confirmDiscard: () => void;
  cancelDiscard: () => void;
}

const DraftGuardContext = createContext<DraftGuardContextType>({
  isDirty: false,
  setIsDirty: () => {},
  requestNavigation: () => {},
  pendingHref: null,
  showDiscardModal: false,
  confirmDiscard: () => {},
  cancelDiscard: () => {},
});

export function DraftGuardProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirtyState] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  const setIsDirty = useCallback((val: boolean) => {
    setIsDirtyState(val);
  }, []);

  const requestNavigation = useCallback((href: string) => {
    if (isDirty) {
      setPendingHref(href);
      setShowDiscardModal(true);
    } else {
      // No draft — callers handle actual navigation themselves
      setPendingHref(href);
      setShowDiscardModal(false);
    }
  }, [isDirty]);

  const confirmDiscard = useCallback(() => {
    setIsDirtyState(false);
    setShowDiscardModal(false);
    setPendingHref(null);
  }, []);

  const cancelDiscard = useCallback(() => {
    setShowDiscardModal(false);
    setPendingHref(null);
  }, []);

  return (
    <DraftGuardContext.Provider value={{ isDirty, setIsDirty, requestNavigation, pendingHref, showDiscardModal, confirmDiscard, cancelDiscard }}>
      {children}
    </DraftGuardContext.Provider>
  );
}

export function useDraftGuard() {
  return useContext(DraftGuardContext);
}
