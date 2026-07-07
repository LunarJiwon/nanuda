export type Category = "daily" | "info" | "art" | "quote";

export const CATEGORIES: Category[] = ["daily", "info", "art", "quote"];

export const CATEGORY_LABEL: Record<Category, string> = {
  daily: "일상",
  info: "정보",
  art: "예술",
  quote: "글귀",
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as string[]).includes(value);
}

/**
 * A published post. Timestamps are serialized to ISO strings at the data-access
 * boundary so this type is safe to pass from Server Components to Client Components.
 */
export interface Post {
  id: string;
  title: string;
  subtitle: string;
  /** Markdown body. See src/lib/blocks.ts for how the block editor serializes to this. */
  content: string;
  /** Short plain-text summary, derived from content (see src/lib/excerpt.ts). */
  excerpt: string;
  category: Category;
  tags: string[];
  authorId: string;
  authorName: string;
  coverImageURL: string | null;
  status: "published";
  /** ISO 8601 */
  publishedAt: string;
  /** ISO 8601 */
  updatedAt: string;
  /** Rough estimate, e.g. "4분" */
  readTime: string;
  /** Aspect ratio hint for art-category cover art, e.g. "3/4". Optional, art only. */
  ratio?: string;
  /** Denormalized counters, kept in sync via transaction/batch by the comment/like/view features. */
  commentCount: number;
  likeCount: number;
  viewCount: number;
}

/** Optional per-user profile links shown on /profile/[handle]. All optional, plain URLs. */
export interface ProfileLinks {
  website?: string;
  instagram?: string;
  twitter?: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  photoURL: string | null;
  /** Storage download URL for the /profile/[handle] cover banner, or null if unset. */
  coverURL?: string | null;
  email: string | null;
  /**
   * Unique `@handle` used in profile URLs (see `handles/{handle}` collection for the reservation
   * doc). Missing on accounts created before this feature shipped, or on Google sign-ups that
   * haven't finished the /onboarding step yet — treat as "no public profile yet", not an error.
   */
  handle?: string;
  bio?: string;
  links?: ProfileLinks;
  createdAt: string;
}

/**
 * A comment or reply on a post (top-level collection `comments/{commentId}`).
 *
 * Nesting is intentionally flattened to one visual level: `parentId` records the *actual*
 * comment being replied to (which may itself be a reply), so the true reply graph can be
 * arbitrarily deep, but the UI only ever renders one level of indentation — every reply is
 * displayed directly under its top-level ancestor rather than under its literal parent. See
 * `src/components/comments/CommentSection.tsx` for the grouping logic and rationale.
 */
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  authorPhotoURL: string | null;
  content: string;
  /** null for a top-level comment; otherwise the id of the comment being replied to. */
  parentId: string | null;
  /** ISO 8601 */
  createdAt: string;
}
