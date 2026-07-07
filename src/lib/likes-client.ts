"use client";

// Client-side Firestore reads/writes for post likes (`posts/{postId}/likes/{uid}`).
// firestore.rules restricts create/delete to the like doc's own, non-anonymous uid.
import { doc, getDoc, increment, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** Whether `uid` currently likes `postId` — used to reflect existing like state on page load. */
export async function hasLiked(postId: string, uid: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "posts", postId, "likes", uid));
  return snap.exists();
}

/**
 * Toggles a like as a single transaction: create-or-delete the like doc and increment/decrement
 * `posts/{postId}.likeCount` atomically. Returns the new liked state.
 */
export async function toggleLike(postId: string, uid: string): Promise<boolean> {
  const likeRef = doc(db, "posts", postId, "likes", uid);
  const postRef = doc(db, "posts", postId);

  return runTransaction(db, async (tx) => {
    const likeSnap = await tx.get(likeRef);
    if (likeSnap.exists()) {
      tx.delete(likeRef);
      tx.update(postRef, { likeCount: increment(-1) });
      return false;
    }
    tx.set(likeRef, { createdAt: serverTimestamp() });
    tx.update(postRef, { likeCount: increment(1) });
    return true;
  });
}
