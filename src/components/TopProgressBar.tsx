"use client";

import { useProgress } from "@/context/progress-context";

/** A slim indeterminate bar directly under the header — the one place every save/publish/delete
 * action across the app shows its in-flight state, instead of each page inventing its own spinner
 * treatment. Rendered once in the root layout; pages opt in via useProgress().withProgress(...). */
export function TopProgressBar() {
  const { active } = useProgress();
  if (!active) return null;

  return (
    <div className="h-[2px] w-full flex-none overflow-hidden bg-[#eeece8]" role="progressbar" aria-label="처리 중">
      <div className="h-full w-1/3 bg-[#0e0e0e] animate-topbar-slide" />
    </div>
  );
}
