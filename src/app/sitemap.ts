import type { MetadataRoute } from "next";
import { getAllPublishedPosts } from "@/lib/posts";

const BASE_URL = "https://nanuda.life";

// Without this, Next statically generates the sitemap once at build time and never touches it
// again — a post published between deploys would never appear in it.
export const revalidate = 3600;

/** Next.js serves this as /sitemap.xml automatically. Every published post's URL is listed here
 * regardless of visibility — a 구독자 전용 post's paywall page is itself a real, publicly-viewable
 * URL (see PremiumPostBody.tsx), so hiding it from the sitemap would only hurt its own discovery
 * without actually protecting the gated content, which is already enforced by firestore.rules. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPublishedPosts();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE_URL, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/daily`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/info`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/art`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/quote`, changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/archive`, changeFrequency: "daily", priority: 0.7 },
    { url: `${BASE_URL}/about`, changeFrequency: "monthly", priority: 0.3 },
  ];

  const postRoutes: MetadataRoute.Sitemap = posts.map((post) => ({
    url: `${BASE_URL}/post/${post.id}`,
    lastModified: post.updatedAt,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [...staticRoutes, ...postRoutes];
}
