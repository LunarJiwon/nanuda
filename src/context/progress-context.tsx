"use client";

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

interface ProgressContextValue {
  /** True while at least one tracked task is in flight. */
  active: boolean;
  /** Wraps an async action so the top progress bar shows for its whole duration — concurrent
   * calls are additive (the bar stays visible until the *last* one finishes), so unrelated
   * in-flight saves don't hide each other's progress. */
  withProgress: <T,>(task: () => Promise<T>) => Promise<T>;
  /** Raw start/stop pair for tasks with no single awaitable promise — a page navigation, for
   * instance (see NavigationProgress.tsx), where "done" is signaled by the pathname changing
   * rather than a call resolving. Same ref-counter as withProgress, so an in-flight navigation
   * and an in-flight save compose correctly instead of one hiding the other's bar early. */
  start: () => void;
  stop: () => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState(false);
  const countRef = useRef(0);

  const start = useCallback(() => {
    countRef.current += 1;
    setActive(true);
  }, []);

  const stop = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    if (countRef.current === 0) setActive(false);
  }, []);

  const withProgress = useCallback(
    async <T,>(task: () => Promise<T>): Promise<T> => {
      start();
      try {
        return await task();
      } finally {
        stop();
      }
    },
    [start, stop]
  );

  return (
    <ProgressContext.Provider value={{ active, withProgress, start, stop }}>{children}</ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within a ProgressProvider");
  return ctx;
}
