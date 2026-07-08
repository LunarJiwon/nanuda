import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next's client-side Router Cache normally reuses a page segment for up to 5 minutes
    // (static) / 30s (dynamic) on a back/forward navigation, on top of (and regardless of) the
    // server's own ISR revalidation — so going back to a list page right after publishing/
    // deleting a post kept showing the stale pre-change list even though the server had already
    // revalidated. Zeroing both means back/forward always refetches, matching what the server
    // currently has (still cheap: ISR/`revalidate` on each list page is what actually rate-limits
    // real backend reads, this only controls the client's own reuse-without-asking behavior).
    staleTimes: {
      dynamic: 0,
      static: 30, // Next's enforced minimum — still far below the previous 180s default.
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "*.firebasestorage.app",
      },
      {
        // Google Sign-In profile photos (auth-context.tsx / Avatar.tsx render `user.photoURL`
        // directly for Google accounts that haven't uploaded a custom avatar).
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
    ],
  },
};

export default nextConfig;
