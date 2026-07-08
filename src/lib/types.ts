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
  status: "published" | "draft";
  /** "subscribers" posts store their full body separately at posts/{id}/premium/body (not on this
   * doc at all) so the public list/detail reads that power every list page can't ever return the
   * gated content — see PremiumPostBody.tsx. `content` on a gated post is empty for that reason;
   * use `excerpt` for teaser display. */
  visibility: "public" | "subscribers";
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
  /** Monthly subscription price in KRW the author has set for themselves. Unset/0 means they
   * don't offer subscriptions — SubscribeButton and the editor's 구독자 전용 toggle both hide
   * behind this. Author-set, not platform-fixed (see the priority-2 monetization plan). */
  subscriptionPrice?: number;
  createdAt: string;
}

/**
 * `subscriptions/{authorId}_{subscriberId}` — one reader's paid subscription to one author.
 * Never created/updated by the client directly; only by confirmSubscription/cancelSubscription/
 * chargeActiveSubscriptions (functions/src/index.ts), which also own the actual Toss billing key
 * in the separate admin-only `billingKeys/{authorId}_{subscriberId}` collection.
 *
 * `currentPeriodEnd` is the single source of truth for access, deliberately independent of
 * `status`: cancelling sets status to "canceled" but leaves currentPeriodEnd alone, so the
 * subscriber keeps access through what they already paid for (see firestore.rules'
 * hasActiveAccess()) — matches the project's confirmed policy of no prorated/immediate cutoff.
 */
export interface Subscription {
  authorId: string;
  subscriberId: string;
  status: "active" | "canceled" | "past_due";
  /** KRW, snapshotted at subscribe time — a later price change by the author doesn't affect
   * already-active subscribers until they resubscribe. */
  price: number;
  /** ISO 8601 — access is valid through this instant regardless of `status`. */
  currentPeriodEnd: string;
  /** ISO 8601, null until cancelled. */
  canceledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/** `follows/{followerId}_{followeeId}` — a free, no-payment "새 글 알림 받기" relationship,
 * distinct from the paid Subscription above (which additionally unlocks 구독자 전용 content). */
export interface Follow {
  followerId: string;
  followeeId: string;
  createdAt: string;
}

export type NotificationType = "support" | "subscription_started" | "subscription_canceled" | "new_subscriber_post";

/** `notifications/{uid}/items/{id}` — always written by a Cloud Function (a client can only read
 * its own and toggle `read`), surfaced via the header's notification bell. */
export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  /** In-app path to navigate to on click, e.g. `/post/{id}` or `/profile/{handle}`. */
  link: string;
  read: boolean;
  /** ISO 8601 */
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
  /** ISO 8601, set only once the comment has been edited — used to show a "(수정됨)" hint. */
  updatedAt?: string;
  /** ISO 8601 */
  createdAt: string;
}
