import type { Metadata } from "next";
import { getAllPublishedPosts } from "@/lib/posts";
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
  return <ArchiveClient posts={posts} />;
}
