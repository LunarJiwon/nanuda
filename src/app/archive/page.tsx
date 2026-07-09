import type { Metadata } from "next";
import { getAllPublishedPosts } from "@/lib/posts";
import { getUsersByIds } from "@/lib/users";
import { ArchiveClient } from "./ArchiveClient";

// No Algolia / full-text search yet (deliberate scope cut — see SETUP.md): at this scale we
// just fetch every published post once on the server and filter client-side, matching the
// prototype's `renderVals()` filtering behavior exactly.
export const revalidate = 60;

export const metadata: Metadata = {
  title: "전체 · 나누다",
  description: "나누다의 모든 기록을 한곳에서 찾아보세요.",
  alternates: { canonical: "/archive" },
};

export default async function ArchivePage() {
  const posts = await getAllPublishedPosts();
  // A Client Component prop must be plain JSON-safe data, not a Map — so the author lookup is
  // flattened to a plain { uid: photoURL } object here rather than passed as-is.
  const authors = await getUsersByIds(posts.map((p) => p.authorId));
  const authorPhotos = Object.fromEntries(
    Array.from(authors.entries()).map(([uid, user]) => [uid, user.photoURL])
  );
  return <ArchiveClient posts={posts} authorPhotos={authorPhotos} />;
}
