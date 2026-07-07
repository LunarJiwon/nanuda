"use client";

// Client-side Firestore/Storage writes for the editor. These run in the browser as the
// authenticated user, so security rules (firestore.rules / storage.rules) — not this module —
// are what actually enforce "only the author can write their own posts".
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
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
}

export async function createPost(input: CreatePostInput): Promise<string> {
  const docRef = await addDoc(collection(db, "posts"), {
    ...input,
    status: "published",
    publishedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    commentCount: 0,
    likeCount: 0,
    viewCount: 0,
  });
  return docRef.id;
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
