"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface DraftGuardContextType {
  isDirty: boolean;
  setIsDirty: (val: boolean) => void;
}

const DraftGuardContext = createContext<DraftGuardContextType>({
  isDirty: false,
  setIsDirty: () => {},
});

export function DraftGuardProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirtyState] = useState(false);

  const setIsDirty = useCallback((val: boolean) => {
    setIsDirtyState(val);
  }, []);

  return (
    <DraftGuardContext.Provider value={{ isDirty, setIsDirty }}>
      {children}
    </DraftGuardContext.Provider>
  );
}

export function useDraftGuard() {
  return useContext(DraftGuardContext);
}
