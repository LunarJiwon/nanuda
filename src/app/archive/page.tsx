import { getAllPublishedPosts } from "@/lib/posts";
import { ArchiveClient } from "./ArchiveClient";

// No Algolia / full-text search yet (deliberate scope cut — see SETUP.md): at this scale we
// just fetch every published post once on the server and filter client-side, matching the
// prototype's `renderVals()` filtering behavior exactly.
export const revalidate = 60;

export default async function ArchivePage() {
  const posts = await getAllPublishedPosts();
  return <ArchiveClient posts={posts} />;
}
