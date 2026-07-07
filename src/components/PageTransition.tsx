"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Ports the design's `key={screen}` + `animate:appfade` screen-transition fade. */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-appfade h-full">
      {children}
    </div>
  );
}
