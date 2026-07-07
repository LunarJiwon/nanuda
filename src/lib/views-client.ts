"use client";

// Client-side view-count dedup. Every visitor (including anonymous, see auth-context.tsx) has a
// stable uid, so `postViews/{postId}_{uid}` gives a deterministic per-visitor "have they already
// been counted" doc: creating it for the first time also increments posts/{postId}.viewCount in
// the same transaction; if it already exists we do nothing (that's the dedup).
import { doc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

export async function recordView(postId: string, uid: string): Promise<void> {
  const viewRef = doc(db, "postViews", `${postId}_${uid}`);
  const postRef = doc(db, "posts", postId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(viewRef);
    if (snap.exists()) return;
    tx.set(viewRef, { postId, uid, viewedAt: serverTimestamp() });
    tx.update(postRef, { viewCount: increment(1) });
  });
}
