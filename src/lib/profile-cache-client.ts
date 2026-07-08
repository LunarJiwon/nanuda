"use client";

// A comment's authorPhotoURL/authorName are snapshotted at post time (see comments-client.ts),
// so they go stale the moment the author changes their avatar or display name — and the same
// small set of authors tends to show up over and over across a post's comment thread. This module
// resolves the *current* users/{uid} doc instead, memoized per uid for the life of the page so the
// same frequently-shown profile is only ever fetched once no matter how many comments reference it.
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export interface CachedProfile {
  displayName: string;
  photoURL: string | null;
}

const cache = new Map<string, Promise<CachedProfile | null>>();

export function getCachedAuthorProfile(uid: string): Promise<CachedProfile | null> {
  let entry = cache.get(uid);
  if (!entry) {
    entry = getDoc(doc(db, "users", uid))
      .then((snap): CachedProfile | null => {
        if (!snap.exists()) return null;
        const data = snap.data();
        return { displayName: data.displayName ?? "", photoURL: data.photoURL ?? null };
      })
      .catch(() => null);
    cache.set(uid, entry);
  }
  return entry;
}
