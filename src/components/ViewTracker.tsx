"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/auth-context";
import { recordView } from "@/lib/views-client";

/**
 * Invisible component mounted on the post detail page. Fires once per mount (after the
 * anonymous-or-real auth uid is ready) to dedupe the view count — see src/lib/views-client.ts.
 */
export function ViewTracker({ postId }: { postId: string }) {
  const { user, loading } = useAuth();
  const recordedRef = useRef(false);

  useEffect(() => {
    if (loading || !user || recordedRef.current) return;
    recordedRef.current = true;
    recordView(postId, user.uid).catch((err) => console.error("[views] record failed", err));
  }, [loading, user, postId]);

  return null;
}
