"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useProgress } from "@/context/progress-context";

/**
 * Shows the shared top progress bar (see TopProgressBar.tsx) while an in-app page navigation is
 * in flight, not just for explicit save/publish actions. App Router has no built-in navigation-
 * start/end event, so this pairs a capture-phase click listener (start — mirrors the editor's own
 * unsaved-changes click-intercept pattern) with a `usePathname()` effect (stop — the new page has
 * already committed by the time this runs, so a pathname change is the closest thing to a
 * "navigation finished" signal available here).
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const { start, stop } = useProgress();
  // A navigation can be silently cancelled after this click — the editor's own unsaved-changes
  // guard (a separate capture-phase listener on the same click) may ask the user to confirm
  // leaving, and if they decline, the pathname never changes, so the pathname effect below would
  // never fire to stop the bar. This timeout is the fallback that un-sticks it either way.
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor || anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("/")) return; // external/mailto/etc. — no client nav to track
      if (new URL(href, window.location.origin).pathname === window.location.pathname) return;
      start();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        stop();
        timeoutRef.current = null;
      }, 4000);
    }
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [start, stop]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    stop();
    // Only `pathname` should re-fire this — `stop` is stable (useCallback with no deps), and
    // re-running on it too would be harmless but pointless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
