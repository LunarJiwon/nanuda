"use client";

// Client-side toggle for `follows/{followerId}_{followeeId}` — a free relationship (no payment,
// no Cloud Function involved), so firestore.rules alone is enough to enforce "only the follower
// may create/delete their own follow doc, no self-follow". See lib/follows.ts for the
// server-side count/list reads used by /profile/[handle].
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

function followDocId(followerId: string, followeeId: string): string {
  return `${followerId}_${followeeId}`;
}

export async function isFollowing(followerId: string, followeeId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "follows", followDocId(followerId, followeeId)));
  return snap.exists();
}

export async function followUser(followerId: string, followeeId: string): Promise<void> {
  await setDoc(doc(db, "follows", followDocId(followerId, followeeId)), {
    followerId,
    followeeId,
    createdAt: serverTimestamp(),
  });
}

export async function unfollowUser(followerId: string, followeeId: string): Promise<void> {
  await deleteDoc(doc(db, "follows", followDocId(followerId, followeeId)));
}
