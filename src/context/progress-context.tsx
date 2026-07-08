"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ProgressContextValue {
  /** True while at least one tracked task is in flight. */
  active: boolean;
  /** Wraps an async action so the top progress bar shows for its whole duration — concurrent
   * calls are additive (the bar stays visible until the *last* one finishes), so unrelated
   * in-flight saves don't hide each other's progress. */
  withProgress: <T,>(task: () => Promise<T>) => Promise<T>;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const countRef = useRef(0);

  const withProgress = useCallback(async <T,>(task: () => Promise<T>): Promise<T> => {
    countRef.current += 1;
    setActive(true);
    try {
      return await task();
    } finally {
      countRef.current -= 1;
      if (countRef.current <= 0) {
        countRef.current = 0;
        setActive(false);
      }
    }
  }, []);

  return <ProgressContext.Provider value={{ active, withProgress }}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
