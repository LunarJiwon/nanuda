"use client";

// Client-side Firestore/Storage writes for the editor. These run in the browser as the
// authenticated user, so security rules (firestore.rules / storage.rules) — not this module —
// are what actually enforce "only the author can write their own posts".
import { deleteDoc, addDoc, collection, doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
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

export interface PostForEdit {
  title: string;
  subtitle: string;
  category: Category;
  tags: string[];
  coverImageURL: string | null;
  ratio?: string;
  status: "published" | "draft";
  visibility: "public" | "subscribers";
  /** Always the *full* body, even for a 구독자 전용 post — resolved from posts/{id}/premium/body
   * (the public doc's own `content` is empty for those) so the editor has something to load. */
  content: string;
}

/** Loads an existing post for the editor's "수정" flow — via the authenticated client SDK (not
 * posts.ts's public read) since the author must be able to load a draft or 구독자 전용 body that
 * public reads can't see. Returns null if the post doesn't exist or isn't owned by `uid` (also
 * enforced server-side by firestore.rules — this is just so the editor can redirect cleanly). */
export async function getPostForEdit(postId: string, uid: string): Promise<PostForEdit | null> {
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.authorId !== uid) return null;

  const visibility: "public" | "subscribers" = data.visibility === "subscribers" ? "subscribers" : "public";
  let content: string = data.content ?? "";
  if (visibility === "subscribers") {
    const premiumSnap = await getDoc(doc(db, "posts", postId, "premium", "body"));
    content = premiumSnap.exists() ? (premiumSnap.data().content ?? "") : "";
  }

  return {
    title: data.title ?? "",
    subtitle: data.subtitle ?? "",
    category: data.category,
    tags: data.tags ?? [],
    coverImageURL: data.coverImageURL ?? null,
    ratio: data.ratio ?? undefined,
    status: data.status === "draft" ? "draft" : "published",
    visibility,
    content,
  };
}

/** Extracts every `![alt](url)` image reference from a post's markdown — used by deletePost below
 * to find every Storage object to clean up, since (per decision #9) an image's Storage path is
 * keyed by the editor's client-generated temp id, not the post's real Firestore id, so there's no
 * folder to just delete wholesale the way deleteAllPostImages does for an abandoned draft. */
function extractImageUrls(markdown: string): string[] {
  const urls: string[] = [];
  const re = /!\[[^\]]*\]\(([^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown))) urls.push(m[1]);
  return urls;
}

/** Deletes a post entirely: every image it references (cover + inline, including the 구독자 전용
 * body's own images), the premium/body subdoc if present, and finally the post doc itself. Leaves
 * comments/likes in place — same documented scope cut as account deletion elsewhere in the app. */
export async function deletePost(postId: string): Promise<void> {
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return;
  const data = snap.data();

  const urls = new Set<string>(extractImageUrls(data.content ?? ""));
  if (data.coverImageURL) urls.add(data.coverImageURL);

  if (data.visibility === "subscribers") {
    const premiumRef = doc(db, "posts", postId, "premium", "body");
    const premiumSnap = await getDoc(premiumRef);
    if (premiumSnap.exists()) {
      for (const url of extractImageUrls(premiumSnap.data().content ?? "")) urls.add(url);
      await deleteDoc(premiumRef).catch(() => {});
    }
  }

  await Promise.all([...urls].map((url) => deletePostImage(url).catch(() => {})));
  await deleteDoc(doc(db, "posts", postId));
}
