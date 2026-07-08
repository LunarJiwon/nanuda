"use client";

// Reader→author 구독(subscription) flow, Toss Payments recurring billing. Distinct from
// support-client.ts's one-time 응원 flow: this registers a card for *repeat* charges
// (requestBillingAuth issues an authKey, not a completed payment), so the actual first + every
// later charge only ever happens server-side in confirmSubscription/chargeActiveSubscriptions
// (functions/src/index.ts) — the client here only ever kicks off card registration and confirms.
import { doc, getDoc, type Timestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { db, functions } from "@/lib/firebase/client";

export interface SubscriptionStatus {
  status: "active" | "canceled" | "past_due";
  /** Access is valid through this instant regardless of `status` — see the Subscription type
   * doc's no-prorated-cutoff policy. */
  currentPeriodEnd: Date;
}

/** The signed-in reader's own subscription to `authorId`, or null if they've never subscribed.
 * Used to decide whether SubscribeButton shows "구독하기" vs "구독 중"/"구독 취소". */
export async function getMySubscription(authorId: string, subscriberId: string): Promise<SubscriptionStatus | null> {
  const snap = await getDoc(doc(db, "subscriptions", `${authorId}_${subscriberId}`));
  if (!snap.exists()) return null;
  const data = snap.data() as { status: SubscriptionStatus["status"]; currentPeriodEnd: Timestamp };
  return { status: data.status, currentPeriodEnd: data.currentPeriodEnd.toDate() };
}

/**
 * Redirects the browser to Toss's card-registration window. Never resolves on success (the
 * browser navigates away); throws if Toss rejects the request before the redirect, or the user
 * cancels.
 */
export async function startSubscriptionPayment(input: {
  authorId: string;
  authorName: string;
  subscriberId: string;
  subscriberName: string;
}): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  }

  const customerKey = `${input.subscriberId}_${input.authorId}`;
  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey });
  await payment.requestBillingAuth({
    method: "CARD",
    customerName: input.subscriberName,
    successUrl: `${window.location.origin}/subscribe/success?authorId=${encodeURIComponent(input.authorId)}`,
    failUrl: `${window.location.origin}/subscribe/fail`,
  });
}

/** Calls confirmSubscription — see subscribe/success/page.tsx. This is what actually issues the
 * billing key and charges the first period; throws on failure. */
export async function confirmSubscriptionCall(input: {
  authorId: string;
  authKey: string;
  customerKey: string;
}): Promise<void> {
  const call = httpsCallable(functions, "confirmSubscription");
  await call(input);
}

/** Cancels the caller's own subscription to `authorId`. Access continues until the already-paid
 * period ends — see the Subscription type doc. */
export async function cancelSubscriptionCall(authorId: string): Promise<void> {
  const call = httpsCallable(functions, "cancelSubscription");
  await call({ authorId });
}
