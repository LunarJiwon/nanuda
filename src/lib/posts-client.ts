"use client";

// Client-side Firestore/Storage writes for the editor. These run in the browser as the
// authenticated user, so security rules (firestore.rules / storage.rules) — not this module —
// are what actually enforce "only the author can write their own posts".
import { addDoc, collection, doc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, listAll, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "@/lib/firebase/client";
import type { Category } from "@/lib/types";

export interface CreatePostInput {
  title: string;
  subtitle: string;
  content: string;
  excerpt: string;
  category: Category;
  tags: string[];
  authorId: string;
  authorName: string;
  coverImageURL: string | null;
  readTime: string;
  ratio?: string;
  /** "draft" for the editor's 임시저장 button — firestore.rules allows the author to create either,
   * but only "published" ones are ever publicly readable/listed (see posts.ts). */
  status: "published" | "draft";
  /** "subscribers" posts are created with `content: ""` — the real body lives in
   * posts/{id}/premium/body instead, written separately via setPremiumContent below. */
  visibility: "public" | "subscribers";
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const docRef = await addDoc(collection(db, "posts"), {
    ...input,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
    likeCount: 0,
    viewCount: 0,
  });
  return docRef.id;
}

/** Overwrites an existing 임시저장 draft's fields in place (see the editor's draftId state) so
 * repeated saves update the same doc instead of creating a new one every time. */
export async function updateDraft(postId: string, input: CreatePostInput): Promise<void> {
  await updateDoc(doc(db, "posts", postId), { ...input, updatedAt: serverTimestamp() });
}

/** Promotes an existing draft doc to published — also bumps publishedAt to now, so it sorts by
 * actual publish time rather than whenever the draft was first saved. */
export async function updateDraftAsPublished(postId: string, input: CreatePostInput): Promise<void> {
  await updateDoc(doc(db, "posts", postId), {
    ...input,
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Uploads an editor image to `posts/{tempPostId}/{filename}` (decision #9: a client-generated
 * temp ID is used so images can be uploaded before the post document exists / is first saved).
 */
export async function uploadPostImage(tempPostId: string, file: File): Promise<string> {
  const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
  const path = `posts/${tempPostId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Deletes a single previously-uploaded editor image, given its download URL. Used when a block is
 * removed or an image is replaced before the post is ever published. Missing/already-deleted
 * objects are not an error here — there's nothing left to clean up either way.
 */
export async function deletePostImage(url: string): Promise<void> {
  try {
    await deleteObject(ref(storage, url));
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code !== "storage/object-not-found") throw err;
  }
}

/**
 * Deletes every image uploaded under `posts/{tempPostId}/` (see uploadPostImage above). Called
 * when the editor is abandoned without publishing, so images uploaded ahead of the post document
 * (decision #9) don't linger in Storage forever with nothing ever referencing them.
 */
export async function deleteAllPostImages(tempPostId: string): Promise<void> {
  const folderRef = ref(storage, `posts/${tempPostId}`);
  const { items } = await listAll(folderRef);
  await Promise.all(items.map((item) => deleteObject(item).catch(() => {})));
}

/** Writes the real body of a 구독자 전용 post to posts/{postId}/premium/body — gated by
 * firestore.rules to the author or an active subscriber (see hasActiveAccess). The public post
 * doc's own `content` field is left empty for these posts (see CreatePostInput.visibility). */
export async function setPremiumContent(postId: string, content: string): Promise<void> {
  await setDoc(doc(db, "posts", postId, "premium", "body"), { content });
}
