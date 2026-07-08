"use client";

// Client-side Firestore reads/writes for post comments. firestore.rules enforces that only a
// real, non-anonymous signed-in user may create a comment, and only the comment's author may
// delete it — this module just calls the client SDK as that user.
import {
  collection,
  doc,
  getDocs,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import type { Comment } from "@/lib/types";

function docToComment(id: string, data: DocumentData): Comment {
  return {
    id,
    postId: data.postId,
    authorId: data.authorId,
    authorName: data.authorName ?? "익명",
    authorPhotoURL: data.authorPhotoURL ?? null,
    content: data.content ?? "",
    parentId: data.parentId ?? null,
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? undefined,
    createdAt: data.createdAt?.toDate?.().toISOString?.() ?? new Date().toISOString(),
  };
}

/** Live, chronological subscription to every comment on a post (top-level comments and replies). */
export function subscribeToPostComments(postId: string, cb: (comments: Comment[]) => void): Unsubscribe {
  const q = query(collection(db, "comments"), where("postId", "==", postId), orderBy("createdAt", "asc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => docToComment(d.id, d.data()))),
    (err) => console.error("[comments] subscription failed", err)
  );
}

export interface AddCommentInput {
  postId: string;
  parentId: string | null;
  content: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
}

/** Creates the comment and increments `posts/{postId}.commentCount` atomically (single batch). */
export async function addComment(input: AddCommentInput): Promise<void> {
  const batch = writeBatch(db);
  const commentRef = doc(collection(db, "comments"));
  batch.set(commentRef, {
    postId: input.postId,
    parentId: input.parentId,
    content: input.content,
    authorId: input.authorId,
    authorName: input.authorName,
    authorPhotoURL: input.authorPhotoURL,
    createdAt: serverTimestamp(),
  });
  batch.update(doc(db, "posts", input.postId), { commentCount: increment(1) });
  await batch.commit();
}

/** Edits a comment's own text — firestore.rules restricts this to the comment's author and to
 * only the `content`/`updatedAt` fields, so postId/parentId/authorId can never be reassigned. */
export async function updateComment(commentId: string, content: string): Promise<void> {
  await updateDoc(doc(db, "comments", commentId), { content, updatedAt: serverTimestamp() });
}

/**
 * Deletes a comment and cascades to every descendant reply (a reply's `parentId` may point at
 * another reply, not just a top-level comment — see the nesting note on the `Comment` type), then
 * decrements `posts/{postId}.commentCount` by the total number of comments removed. Uses an
 * iterative BFS + a single batch rather than a transaction since deleting a comment tree isn't a
 * single-document read/write.
 *
 * Known v1 limitation (matches firestore.rules exactly, per the project brief's rule spec):
 * `comments/{commentId}` delete is gated on `resource.data.authorId == request.auth.uid`, i.e.
 * you may only delete documents *you* authored. A batch delete is all-or-nothing, so if someone
 * else's reply is nested under your top-level comment, this cascade throws permission-denied for
 * the whole batch instead of partially succeeding. Fine at blog scale (documented in SETUP.md);
 * a real fix would need a Cloud Function running with elevated privileges.
 */
export async function deleteCommentCascade(postId: string, commentId: string): Promise<void> {
  const idsToDelete = new Set<string>([commentId]);
  let frontier = [commentId];

  while (frontier.length > 0) {
    const childSnaps = await Promise.all(
      frontier.map((parentId) =>
        getDocs(query(collection(db, "comments"), where("parentId", "==", parentId)))
      )
    );
    const nextFrontier: string[] = [];
    for (const snap of childSnaps) {
      for (const d of snap.docs) {
        if (!idsToDelete.has(d.id)) {
          idsToDelete.add(d.id);
          nextFrontier.push(d.id);
        }
      }
    }
    frontier = nextFrontier;
  }

  const batch = writeBatch(db);
  for (const id of idsToDelete) batch.delete(doc(db, "comments", id));
  batch.update(doc(db, "posts", postId), { commentCount: increment(-idsToDelete.size) });
  await batch.commit();
}
