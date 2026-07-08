import type { MetadataRoute } from "next";

/** Next.js serves this as /robots.txt automatically. Auth-gated/account pages have nothing worth
 * indexing and shouldn't show up in search results pointing at a login wall. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/editor",
        "/settings",
        "/profile/edit",
        "/login",
        "/onboarding",
        "/verify-email",
        "/subscribe/",
        "/support/",
      ],
    },
    sitemap: "https://nanuda.life/sitemap.xml",
  };
}
