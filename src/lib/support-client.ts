"use client";

// Reader→writer 응원(tip) flow, Toss Payments. Two steps, split across two calls because the
// payment itself happens on Toss's own hosted page (the browser navigates away and back):
//   1. createPendingSupport() — writes `supports/{orderId}` as 'pending' *before* redirecting to
//      Toss, so /support/success has something to check the returned paymentKey/amount against.
//   2. startTossPayment() — loads the Toss SDK and redirects to its hosted payment window.
// The actual charge is only captured server-side afterward by the confirmTossPayment Cloud
// Function (functions/src/index.ts) — see support/success/page.tsx.
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { loadTossPayments } from "@tosspayments/tosspayments-sdk";
import { db, functions } from "@/lib/firebase/client";

/** Fixed amount presets — also enforced server-side in firestore.rules, so a tampered client
 * request to create a support doc with an off-list amount is rejected either way. */
export const SUPPORT_AMOUNTS = [1000, 3000, 5000, 10000] as const;
export type SupportAmount = (typeof SUPPORT_AMOUNTS)[number];

function generateOrderId(): string {
  // Toss requires 6-64 chars of letters/digits/-_=; crypto.randomUUID() already satisfies that.
  return `support_${crypto.randomUUID()}`;
}

async function createPendingSupport(input: {
  orderId: string;
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  supporterId: string;
  amount: SupportAmount;
}): Promise<void> {
  await setDoc(doc(db, "supports", input.orderId), {
    postId: input.postId,
    postTitle: input.postTitle,
    authorId: input.authorId,
    authorName: input.authorName,
    supporterId: input.supporterId,
    amount: input.amount,
    status: "pending",
    createdAt: serverTimestamp(),
  });
}

/**
 * Creates the pending Firestore record, then redirects the browser to Toss's hosted payment
 * window (card only, for now — see SETUP.md). Never resolves on success (the browser navigates
 * away); throws if Toss rejects the request before the redirect (e.g. invalid params) or if the
 * user cancels.
 */
export async function startSupportPayment(input: {
  postId: string;
  postTitle: string;
  authorId: string;
  authorName: string;
  supporterId: string;
  supporterName: string;
  amount: SupportAmount;
}): Promise<void> {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  if (!clientKey) {
    throw new Error("NEXT_PUBLIC_TOSS_CLIENT_KEY가 설정되지 않았습니다.");
  }

  const orderId = generateOrderId();
  await createPendingSupport({ orderId, ...input });

  const tossPayments = await loadTossPayments(clientKey);
  const payment = tossPayments.payment({ customerKey: input.supporterId });
  await payment.requestPayment({
    method: "CARD",
    amount: { currency: "KRW", value: input.amount },
    orderId,
    orderName: `${input.postTitle} 응원`,
    customerName: input.supporterName,
    successUrl: `${window.location.origin}/support/success`,
    failUrl: `${window.location.origin}/support/fail`,
  });
}

/** Calls the confirmTossPayment Cloud Function — see support/success/page.tsx. Returns the
 * postId so the success page can link back to the post that was supported. */
export async function confirmSupportPayment(input: {
  orderId: string;
  paymentKey: string;
  amount: number;
}): Promise<{ ok: true; postId: string }> {
  const call = httpsCallable<typeof input, { ok: true; postId: string }>(functions, "confirmTossPayment");
  const result = await call(input);
  return result.data;
}
