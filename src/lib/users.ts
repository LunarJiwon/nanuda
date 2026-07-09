import "server-only";

import { doc, getDoc } from "firebase/firestore";
import { getPublicDb } from "@/lib/firebase/public";
import type { AppUser } from "@/lib/types";

// Server-only Firestore reads for user profiles (Server Components — /profile/[handle]), via the
// plain client SDK (see src/lib/firebase/public.ts). Mirrors src/lib/posts.ts: swallow errors and
// degrade to null rather than throwing, so a transient Firestore issue 404s the profile page
// instead of crashing the server render.

function docToUser(uid: string, data: Record<string, unknown>): AppUser {
  return {
    uid,
    displayName: (data.displayName as string) ?? "",
    photoURL: (data.photoURL as string | null) ?? null,
    coverURL: (data.coverURL as string | null) ?? null,
    email: (data.email as string | null) ?? null,
    handle: (data.handle as string | undefined) ?? undefined,
    subscriptionPrice: (data.subscriptionPrice as number | undefined) || undefined,
    bio: (data.bio as string) ?? "",
    links: (data.links as AppUser["links"]) ?? {},
    createdAt:
      (data.createdAt as { toDate?: () => Date })?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
  };
}

export async function getUserById(uid: string): Promise<AppUser | null> {
  try {
    const snap = await getDoc(doc(getPublicDb(), "users", uid));
    if (!snap.exists()) return null;
    return docToUser(snap.id, snap.data());
  } catch (err) {
    console.error("[users] Firestore read failed for user", uid, err);
    return null;
  }
}

/** Bulk-resolves post-list authors for cards that show a byline (see AuthorByline.tsx) — dedupes
 * ids first since a category/archive page's posts are usually written by a handful of repeat
 * authors, not one Firestore read per post. Missing users are simply absent from the returned
 * map (same "degrade rather than throw" convention as getUserById). */
export async function getUsersByIds(uids: string[]): Promise<Map<string, AppUser>> {
  const unique = Array.from(new Set(uids));
  const users = await Promise.all(unique.map((uid) => getUserById(uid)));
  const map = new Map<string, AppUser>();
  unique.forEach((uid, i) => {
    const user = users[i];
    if (user) map.set(uid, user);
  });
  return map;
}

/** Resolves `@handle` -> uid via the `handles/{handle}` collection, then loads the user doc. */
export async function getUserByHandle(handle: string): Promise<AppUser | null> {
  try {
    const handleSnap = await getDoc(doc(getPublicDb(), "handles", handle));
    if (!handleSnap.exists()) return null;
    const uid = handleSnap.data()?.uid;
    if (!uid) return null;
    return getUserById(uid);
  } catch (err) {
    console.error("[users] Firestore read failed for handle", handle, err);
    return null;
  }
}
