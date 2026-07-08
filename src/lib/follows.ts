import "server-only";

// Server-only Firestore reads for follower/following counts and lists (/profile/[handle] and its
// following/followers subpages), via the same unauthenticated public client SDK as posts.ts and
// users.ts — `follows` is publicly readable (see firestore.rules), so no auth context is needed.
import { collection, getCountFromServer, getDocs, query, where } from "firebase/firestore";
import { getPublicDb } from "@/lib/firebase/public";
import { getUserById } from "@/lib/users";
import type { AppUser } from "@/lib/types";

export async function getFollowCounts(uid: string): Promise<{ followers: number; following: number }> {
  try {
    const db = getPublicDb();
    const [followers, following] = await Promise.all([
      getCountFromServer(query(collection(db, "follows"), where("followeeId", "==", uid))),
      getCountFromServer(query(collection(db, "follows"), where("followerId", "==", uid))),
    ]);
    return { followers: followers.data().count, following: following.data().count };
  } catch (err) {
    console.error("[follows] count read failed for", uid, err);
    return { followers: 0, following: 0 };
  }
}

async function getFollowList(uid: string, direction: "followers" | "following"): Promise<AppUser[]> {
  try {
    const db = getPublicDb();
    // "followers of uid" = docs where uid is the followee; "who uid follows" = docs where uid is
    // the follower — `matchField` is the side we filter on, `otherField` is the side we resolve.
    const matchField = direction === "followers" ? "followeeId" : "followerId";
    const otherField = direction === "followers" ? "followerId" : "followeeId";
    const snap = await getDocs(query(collection(db, "follows"), where(matchField, "==", uid)));
    const otherIds = snap.docs.map((d) => d.data()[otherField] as string);
    const users = await Promise.all(otherIds.map((id) => getUserById(id)));
    return users.filter((u): u is AppUser => u !== null);
  } catch (err) {
    console.error(`[follows] ${direction} list read failed for`, uid, err);
    return [];
  }
}

export function getFollowingList(uid: string): Promise<AppUser[]> {
  return getFollowList(uid, "following");
}

export function getFollowersList(uid: string): Promise<AppUser[]> {
  return getFollowList(uid, "followers");
}
