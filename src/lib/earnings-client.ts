"use client";

// Author-facing revenue summary for 구독 관리하기 (/settings/subscription) — sums the author's own
// paid supports (tips) and subscriptionPayments (initial + renewal charges), then applies the
// platform fee to show what a manual settlement payout would actually be. See functions/src/
// index.ts's writeSubscriptionPayment for where the latter collection gets written, and
// firestore.rules for why an author can query (not just get) their own records in both.
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/client";

/** Confirmed policy: platform keeps 20% of both tip and subscription revenue. */
export const PLATFORM_FEE_RATE = 0.2;

export interface EarningsSummary {
  totalSupportAmount: number;
  totalSubscriptionAmount: number;
  totalGross: number;
  platformFee: number;
  netPayout: number;
}

export async function getAuthorEarnings(authorId: string): Promise<EarningsSummary> {
  const [supportsSnap, subscriptionPaymentsSnap] = await Promise.all([
    getDocs(
      query(collection(db, "supports"), where("authorId", "==", authorId), where("status", "==", "paid"))
    ),
    getDocs(query(collection(db, "subscriptionPayments"), where("authorId", "==", authorId))),
  ]);

  const totalSupportAmount = supportsSnap.docs.reduce((sum, d) => sum + (d.data().amount ?? 0), 0);
  const totalSubscriptionAmount = subscriptionPaymentsSnap.docs.reduce(
    (sum, d) => sum + (d.data().amount ?? 0),
    0
  );
  const totalGross = totalSupportAmount + totalSubscriptionAmount;
  const platformFee = Math.round(totalGross * PLATFORM_FEE_RATE);

  return {
    totalSupportAmount,
    totalSubscriptionAmount,
    totalGross,
    platformFee,
    netPayout: totalGross - platformFee,
  };
}

export interface SubscriberStats {
  total: number;
  active: number;
}

/** Counts an author's subscriptions — "active" means currently paid-through, independent of
 * `status` (mirrors firestore.rules' hasActiveAccess: a cancelled-but-not-yet-expired
 * subscription still counts). */
export async function getAuthorSubscriberStats(authorId: string): Promise<SubscriberStats> {
  const snap = await getDocs(query(collection(db, "subscriptions"), where("authorId", "==", authorId)));
  const now = Date.now();
  let active = 0;
  for (const d of snap.docs) {
    const end = d.data().currentPeriodEnd?.toMillis?.() ?? 0;
    if (end > now) active += 1;
  }
  return { total: snap.size, active };
}
