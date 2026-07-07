"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

/**
 * Wraps next/image with a pulsing skeleton shown until the image actually finishes loading, then
 * cross-fades in. Without this, a slow image request leaves its `fill` container fully empty/
 * transparent until the bytes arrive, which reads as the image "disappearing" (nothing behind it)
 * and then abruptly popping in. Requires a `position: relative` ancestor (same requirement as any
 * `fill` image) — the skeleton is absolutely positioned to match it exactly.
 */
export function FadeInImage({
  alt,
  className = "",
  skeletonClassName = "bg-[#ecebe6]",
  onLoad,
  ...props
}: ImageProps & { skeletonClassName?: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      {!loaded && <div className={`absolute inset-0 animate-pulse ${skeletonClassName}`} />}
      <Image
        {...props}
        alt={alt}
        className={`transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"} ${className}`}
        onLoad={(e) => {
          setLoaded(true);
          onLoad?.(e);
        }}
      />
    </>
  );
}
