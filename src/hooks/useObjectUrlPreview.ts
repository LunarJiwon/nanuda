"use client";

import { useEffect, useMemo } from "react";

/**
 * Live local preview of a File before it's uploaded (avatar/cover pickers on the signup form,
 * /onboarding, and /profile/edit). The URL is derived with `useMemo`, not `useState` + effect,
 * so there's no setState call inside an effect body — the effect here only ever revokes the
 * previous object URL, it never derives state.
 */
export function useObjectUrlPreview(file: File | null): string | null {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  return url;
}
