import "server-only";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  type DocumentSnapshot,
  type Query,
} from "firebase/firestore";
import { getPublicDb } from "@/lib/firebase/public";
import { CATEGORIES, type Category, type Post } from "@/lib/types";

// Server-only Firestore reads for Server Components (list/detail pages), via the plain client SDK
// (see src/lib/firebase/public.ts for why — no Admin SDK needed for public data).
// Every export here swallows errors and degrades to an empty result instead of throwing, so the
// app (and `npm run build`) keeps working even if Firestore is briefly unreachable. See SETUP.md.

function docToPost(snap: DocumentSnapshot): Post {
  const data = snap.data()!;
  return {
    id: snap.id,
    title: data.title ?? "",
    subtitle: data.subtitle ?? "",
    content: data.content ?? "",
    excerpt: data.excerpt ?? "",
    category: data.category,
    tags: data.tags ?? [],
    authorId: data.authorId ?? "",
    authorName: data.authorName ?? "",
    coverImageURL: data.coverImageURL ?? null,
    status: data.status === "draft" ? "draft" : "published",
    publishedAt: data.publishedAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
    updatedAt: data.updatedAt?.toDate?.().toISOString?.() ?? new Date(0).toISOString(),
    readTime: data.readTime ?? "",
    ratio: data.ratio ?? undefined,
    commentCount: data.commentCount ?? 0,
    likeCount: data.likeCount ?? 0,
    viewCount: data.viewCount ?? 0,
  };
}

async function runQuery(buildQuery: () => Query): Promise<Post[]> {
  try {
    const snap = await getDocs(buildQuery());
    return snap.docs.map(docToPost);
  } catch (err) {
    console.error("[posts] Firestore read failed — returning empty list. See SETUP.md.", err);
    return [];
  }
}

export async function getAllPublishedPosts(): Promise<Post[]> {
  return runQuery(() =>
    query(collection(getPublicDb(), "posts"), where("status", "==", "published"), orderBy("publishedAt", "desc"))
  );
}

export async function getPostsByCategory(category: Category): Promise<Post[]> {
  return runQuery(() =>
    query(
      collection(getPublicDb(), "posts"),
      where("status", "==", "published"),
      where("category", "==", category),
      orderBy("publishedAt", "desc")
    )
  );
}

/** One latest post per category, in the fixed order daily/info/art/quote — mirrors the
 * prototype's home-screen "최근 기록" section. */
export async function getRecentPosts(): Promise<Post[]> {
  const results = await Promise.all(
    CATEGORIES.map((category) =>
      runQuery(() =>
        query(
          collection(getPublicDb(), "posts"),
          where("status", "==", "published"),
          where("category", "==", category),
          orderBy("publishedAt", "desc"),
          limit(1)
        )
      )
    )
  );
  return results.flat();
}

/** Published posts by a single author, newest first — used by /profile/[handle]. */
export async function getPostsByAuthor(authorId: string): Promise<Post[]> {
  return runQuery(() =>
    query(
      collection(getPublicDb(), "posts"),
      where("status", "==", "published"),
      where("authorId", "==", authorId),
      orderBy("publishedAt", "desc")
    )
  );
}

export async function getPostById(id: string): Promise<Post | null> {
  try {
    const snap = await getDoc(doc(getPublicDb(), "posts", id));
    if (!snap.exists()) return null;
    const post = docToPost(snap);
    if (post.status !== "published") return null;
    return post;
  } catch (err) {
    console.error("[posts] Firestore read failed for post", id, err);
    return null;
  }
}
