/**
 * Cloud Functions for nanuda — custom email verification.
 *
 * We deliberately do NOT use Firebase Auth's built-in `sendEmailVerification()` / default email
 * template. Instead we reuse the Auth user record's `emailVerified` boolean as the single source
 * of truth (so `request.auth.token.email_verified` keeps working for free in firestore.rules and
 * on the client), but *we* set it via the Admin SDK after our own Resend-based flow below.
 * Firebase itself never sends an email as part of this.
 *
 * See SETUP.md for the required `firebase functions:secrets:set RESEND_API_KEY` step and the
 * site-origin / region assumptions baked into this file.
 */
import { onCall, onRequest, HttpsError } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp, type Firestore } from "firebase-admin/firestore";
import { randomBytes, createHash } from "node:crypto";
import { Resend } from "resend";

initializeApp();

/**
 * Sender address for all outbound verification email. The `naruna.co.kr` domain is already
 * verified in the Resend dashboard (confirmed by the project owner) — a plain constant, not a
 * secret, kept easy to find and change here if the sending domain ever changes.
 */
export const SENDER_EMAIL = "nanuda@naruna.co.kr";

/**
 * Both functions below deploy to the default 2nd-gen region. If you ever add a `region(...)`
 * override to either function, update this constant to match — `verifyEmailFunctionUrl()` below
 * depends on it.
 */
const FUNCTIONS_REGION = "us-central1";

/**
 * Public origin of the Next.js site (Firebase Hosting), used only for the *final* redirect after
 * `verifyEmailToken` finishes (`/verify-email?status=...`) — this is unrelated to
 * `verifyEmailFunctionUrl()` below, which is the Cloud Function's own URL used inside the email.
 *
 * Defaults to the project's Firebase Hosting default domain since no custom domain is configured
 * yet (see SETUP.md). A `defineString` param has a stable, non-interactive default, so it never
 * prompts at deploy time; override by creating `functions/.env` (see `.env.example`) if that
 * changes.
 */
const SITE_ORIGIN = defineString("SITE_ORIGIN", {
  default: "https://nanuda-3f1a9.web.app",
});

/**
 * Resend API key, Secret Manager-backed (the non-deprecated way to hold secrets for 2nd-gen
 * functions). Must be provisioned once, out-of-band, via:
 *   firebase functions:secrets:set RESEND_API_KEY
 * (interactive prompt — can't be automated — see SETUP.md). Never stored in a plain .env file.
 */
const RESEND_API_KEY = defineSecret("RESEND_API_KEY");

/**
 * Toss Payments secret key, Secret Manager-backed (same pattern as RESEND_API_KEY above). Never
 * sent to the client — only used server-side to call Toss's confirm API, since that call is what
 * actually authorizes charging the card (the client-side SDK only *starts* a payment attempt).
 * Provision with: firebase functions:secrets:set TOSS_SECRET_KEY
 */
const TOSS_SECRET_KEY = defineSecret("TOSS_SECRET_KEY");

const RATE_LIMIT_MS = 60_000;
const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

/**
 * Constructs `verifyEmailToken`'s own trigger URL. 2nd-gen HTTPS functions are backed by Cloud
 * Run under the hood, so the URL printed by `firebase deploy` looks like
 * `https://verifyemailtoken-<hash>-uc.a.run.app` and isn't knowable ahead of time — but Firebase
 * also keeps the legacy `https://{region}-{projectId}.cloudfunctions.net/{functionName}` alias
 * working for 2nd-gen HTTPS functions specifically so callers can keep using a predictable URL.
 * `GCLOUD_PROJECT` is populated automatically in the Cloud Functions runtime.
 */
function verifyEmailFunctionUrl(): string {
  const projectId = process.env.GCLOUD_PROJECT ?? process.env.GCP_PROJECT;
  return `https://${FUNCTIONS_REGION}-${projectId}.cloudfunctions.net/verifyEmailToken`;
}

function verificationEmailHtml(verifyUrl: string): string {
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#faf9f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#0e0e0e;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #e8e7e3;border-radius:6px;padding:32px;">
            <tr>
              <td>
                <p style="font-size:18px;font-weight:700;margin:0 0 20px;letter-spacing:-0.02em;">나누다</p>
                <p style="font-size:14px;line-height:1.6;margin:0 0 20px;">
                  안녕하세요. 나누다 계정의 이메일 주소를 인증해주세요.
                </p>
                <p style="margin:0 0 24px;">
                  <a href="${verifyUrl}"
                     style="display:inline-block;background:#0e0e0e;color:#ffffff;text-decoration:none;
                            font-size:14px;font-weight:600;padding:12px 20px;border-radius:3px;">
                    이메일 인증하기
                  </a>
                </p>
                <p style="font-size:12.5px;line-height:1.6;color:#8a887f;margin:0 0 8px;">
                  버튼이 동작하지 않으면 아래 링크를 복사해 브라우저 주소창에 붙여넣어주세요.
                </p>
                <p style="font-size:12px;line-height:1.6;color:#54524c;word-break:break-all;margin:0 0 20px;">
                  ${verifyUrl}
                </p>
                <p style="font-size:12px;line-height:1.6;color:#b0aea6;margin:0;">
                  이 링크는 24시간 동안 유효합니다. 본인이 요청한 것이 아니라면 이 메일을 무시하셔도 됩니다.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Callable — sends (or re-sends) a verification email to the signed-in user's own address.
 * Rejects anonymous/unauthenticated callers, rate-limits to one send per 60s per user, and stores
 * a hashed, 24h-expiring token in `emailVerifications/{uid}` for `verifyEmailToken` to check.
 */
export const sendVerificationEmail = onCall({ secrets: [RESEND_API_KEY] }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  if (auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "게스트 계정은 이메일 인증을 이용할 수 없습니다.");
  }

  const uid = auth.uid;
  const userRecord = await getAuth().getUser(uid);
  const email = userRecord.email;
  if (!email) {
    throw new HttpsError("failed-precondition", "계정에 등록된 이메일이 없습니다.");
  }
  if (userRecord.emailVerified) {
    throw new HttpsError("failed-precondition", "이미 인증된 이메일입니다.");
  }

  const db = getFirestore();
  const docRef = db.collection("emailVerifications").doc(uid);
  const existing = await docRef.get();
  const now = Date.now();
  if (existing.exists) {
    const lastSentAt = existing.data()?.lastSentAt as Timestamp | undefined;
    if (lastSentAt && now - lastSentAt.toMillis() < RATE_LIMIT_MS) {
      throw new HttpsError("resource-exhausted", "잠시 후 다시 시도해주세요.");
    }
  }

  const token = randomBytes(32).toString("hex");
  await docRef.set({
    tokenHash: sha256(token),
    email,
    expiresAt: Timestamp.fromMillis(now + TOKEN_TTL_MS),
    lastSentAt: Timestamp.fromMillis(now),
  });

  const verifyUrl = `${verifyEmailFunctionUrl()}?uid=${encodeURIComponent(uid)}&token=${token}`;

  const resend = new Resend(RESEND_API_KEY.value());
  const { error } = await resend.emails.send({
    from: SENDER_EMAIL,
    to: email,
    subject: "[나누다] 이메일 주소를 인증해주세요",
    html: verificationEmailHtml(verifyUrl),
  });

  if (error) {
    console.error("[sendVerificationEmail] resend error", error);
    throw new HttpsError("internal", "인증 메일 전송에 실패했습니다. 잠시 후 다시 시도해주세요.");
  }

  return { ok: true };
});

/**
 * Public HTTP GET trigger — the link inside the verification email points here with `uid` and
 * the raw `token` as query params. On success, flips `emailVerified` to true via the Admin SDK
 * and deletes the now-consumed `emailVerifications/{uid}` doc, then redirects to
 * `${SITE_ORIGIN}/verify-email?status=success`. Any failure redirects to
 * `${SITE_ORIGIN}/verify-email?status=error&reason=<short-code>` instead of rendering raw JSON,
 * since this URL is opened directly in a browser tab from an email client.
 *
 * Doesn't need the Resend secret — it never sends mail, only consumes a token.
 */
export const verifyEmailToken = onRequest(async (req, res) => {
  const origin = SITE_ORIGIN.value();

  function redirect(status: "success" | "error", reason?: string) {
    const url = new URL("/verify-email", origin);
    url.searchParams.set("status", status);
    if (reason) url.searchParams.set("reason", reason);
    res.redirect(302, url.toString());
  }

  const uid = typeof req.query.uid === "string" ? req.query.uid : "";
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!uid || !token) {
    redirect("error", "missing-params");
    return;
  }

  try {
    const db = getFirestore();
    const docRef = db.collection("emailVerifications").doc(uid);
    const snap = await docRef.get();
    if (!snap.exists) {
      redirect("error", "not-found");
      return;
    }

    const data = snap.data() as { tokenHash?: string; expiresAt?: Timestamp };
    if (!data.expiresAt || data.expiresAt.toMillis() < Date.now()) {
      redirect("error", "expired");
      return;
    }
    if (data.tokenHash !== sha256(token)) {
      redirect("error", "mismatch");
      return;
    }

    await getAuth().updateUser(uid, { emailVerified: true });
    await docRef.delete();
    redirect("success");
  } catch (err) {
    console.error("[verifyEmailToken] failed", err);
    redirect("error", "unknown");
  }
});

/**
 * Every visitor gets a stable anonymous Firebase Auth user for view-count dedup (see
 * auth-context.tsx / views-client.ts) — it grants no privileges (comments/likes/posts all require
 * a real, verified account, per firestore.rules' isVerifiedUser()), so an anonymous uid's only
 * possible Firestore footprint is its own `postViews/{postId}_{uid}` docs. Neither the Auth user
 * nor those docs ever expire on their own, so this runs weekly to delete anonymous accounts that
 * have gone quiet for ANONYMOUS_MAX_AGE_MS, plus their postViews docs, so both collections don't
 * grow forever. Never touches non-anonymous users (has a provider or email/phone) regardless of
 * activity. Deliberately does NOT decrement posts/{postId}.viewCount — the view already happened
 * and stays counted; only the "who's already been counted" dedup marker is being cleared.
 */
const ANONYMOUS_MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

export const cleanupStaleAnonymousUsers = onSchedule("every 168 hours", async () => {
  const auth = getAuth();
  const db = getFirestore();
  const cutoff = Date.now() - ANONYMOUS_MAX_AGE_MS;

  const staleUids: string[] = [];
  let pageToken: string | undefined;
  do {
    const page = await auth.listUsers(1000, pageToken);
    for (const user of page.users) {
      const isAnonymous = user.providerData.length === 0 && !user.email && !user.phoneNumber;
      if (!isAnonymous) continue;
      const lastActive = user.metadata.lastRefreshTime ?? user.metadata.lastSignInTime;
      if (!lastActive || new Date(lastActive).getTime() < cutoff) {
        staleUids.push(user.uid);
      }
    }
    pageToken = page.pageToken;
  } while (pageToken);

  if (staleUids.length === 0) {
    console.log("[cleanupStaleAnonymousUsers] no stale anonymous users found");
    return;
  }

  // Delete the dedup docs before the Auth users: if this crashes partway through, leftover Auth
  // users are harmless (just retried next week), but a postViews doc referencing an already-
  // deleted uid could theoretically confuse a future by-uid lookup.
  for (let i = 0; i < staleUids.length; i += 30) {
    // Firestore `in` queries cap at 30 values per query.
    const chunk = staleUids.slice(i, i + 30);
    const snap = await db.collection("postViews").where("uid", "in", chunk).get();
    if (snap.empty) continue;
    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  for (let i = 0; i < staleUids.length; i += 1000) {
    // Admin SDK deleteUsers caps at 1000 uids per call.
    const chunk = staleUids.slice(i, i + 1000);
    const result = await auth.deleteUsers(chunk);
    if (result.failureCount > 0) {
      console.error("[cleanupStaleAnonymousUsers] some deletions failed", result.errors);
    }
  }

  console.log(`[cleanupStaleAnonymousUsers] deleted ${staleUids.length} stale anonymous user(s)`);
});

/**
 * Callable — deletes the caller's own account: `users/{uid}`, their `handles/{handle}` doc (client
 * writes can never do this — firestore.rules has no delete rule for handles, since handles are
 * otherwise immutable for v1, see SETUP.md), and finally the Firebase Auth user itself. Runs as
 * one Admin-privileged step specifically so the handle release and the Auth deletion can't end up
 * half-done the way they could if the client deleted the Auth user first and then tried (and
 * failed, now signed out) to clean up Firestore after.
 *
 * Deliberately does NOT touch the user's existing posts/comments/likes — those stay attributed to
 * a uid that no longer resolves to an account, same as most platforms handle a deleted author.
 * Cascading that cleanup is a separate, larger feature (and comment cascade-delete already has its
 * own documented limitations — see deleteCommentCascade).
 */
export const deleteAccount = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  if (auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "게스트 계정은 탈퇴할 수 없습니다.");
  }

  const uid = auth.uid;
  const db = getFirestore();
  const userSnap = await db.collection("users").doc(uid).get();
  const handle = userSnap.data()?.handle as string | undefined;

  const batch = db.batch();
  batch.delete(db.collection("users").doc(uid));
  if (handle) batch.delete(db.collection("handles").doc(handle));
  await batch.commit();

  await getAuth().deleteUser(uid);
  return { ok: true };
});

function tossAuthHeader(): string {
  return `Basic ${Buffer.from(`${TOSS_SECRET_KEY.value()}:`).toString("base64")}`;
}

type NotificationType =
  | "support"
  | "subscription_started"
  | "subscription_canceled"
  | "new_subscriber_post"
  | "new_post";

/** Writes one `notifications/{uid}/items/{id}` doc — the only way these are ever created, see
 * firestore.rules. Never throws: a notification failing to write shouldn't fail the payment/
 * subscription flow that triggered it. */
async function writeNotification(
  db: Firestore,
  uid: string,
  notification: { type: NotificationType; title: string; body: string; link: string }
): Promise<void> {
  try {
    await db.collection("notifications").doc(uid).collection("items").add({
      ...notification,
      read: false,
      createdAt: Timestamp.now(),
    });
  } catch (err) {
    console.error("[writeNotification] failed", uid, notification.type, err);
  }
}

/** One doc per successful subscription charge — `subscriptions/{subId}` only holds *current*
 * state (price, currentPeriodEnd), so 구독 관리하기's earnings summary (earnings-client.ts) needs
 * this actual transaction log to sum instead. Best-effort: a failure here shouldn't undo an
 * already-successful Toss charge, just log it. */
async function writeSubscriptionPayment(
  db: Firestore,
  input: { authorId: string; subscriberId: string; amount: number; kind: "initial" | "renewal" }
): Promise<void> {
  try {
    await db.collection("subscriptionPayments").add({ ...input, paidAt: Timestamp.now() });
  } catch (err) {
    console.error("[writeSubscriptionPayment] failed", input.authorId, input.subscriberId, err);
  }
}

/**
 * Callable — confirms a reader→writer 응원(tip) payment with Toss after the client-side SDK
 * redirects back from Toss's hosted payment window. This confirm call is what actually captures
 * the charge; until it succeeds, Toss has only reserved the payment, not completed it. Runs as a
 * Cloud Function (not a Next.js route) specifically so the Toss secret key never has to exist
 * anywhere near the client-facing app, matching this project's existing rule that Admin-privileged
 * code lives in functions/ only.
 *
 * Trusts nothing from the client except which orderId to confirm — the *amount* actually charged
 * is cross-checked against the `supports/{orderId}` doc this project itself wrote when the
 * payment attempt started (see support-client.ts), not just whatever the client claims here.
 */
export const confirmTossPayment = onCall({ secrets: [TOSS_SECRET_KEY] }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { orderId, paymentKey, amount } = (request.data ?? {}) as {
    orderId?: string;
    paymentKey?: string;
    amount?: number;
  };
  if (!orderId || !paymentKey || typeof amount !== "number") {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }

  const db = getFirestore();
  const docRef = db.collection("supports").doc(orderId);
  const snap = await docRef.get();
  if (!snap.exists) {
    throw new HttpsError("not-found", "결제 정보를 찾을 수 없습니다.");
  }
  const data = snap.data() as {
    supporterId: string;
    amount: number;
    status: string;
    postId: string;
    postTitle: string;
    authorId: string;
  };
  if (data.supporterId !== auth.uid) {
    throw new HttpsError("permission-denied", "본인의 결제만 확인할 수 있습니다.");
  }
  if (data.status === "paid") {
    // Already confirmed — e.g. the success page effect re-ran. Idempotent.
    return { ok: true, postId: data.postId };
  }
  if (data.amount !== amount) {
    await docRef.update({ status: "failed", failedReason: "amount-mismatch" });
    throw new HttpsError("failed-precondition", "결제 금액이 일치하지 않습니다.");
  }

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: tossAuthHeader() },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });

  if (!res.ok) {
    const error = (await res.json().catch(() => ({}))) as { code?: string };
    console.error("[confirmTossPayment] Toss confirm API rejected the payment", error);
    await docRef.update({ status: "failed", failedReason: error.code ?? "unknown" });
    throw new HttpsError("internal", "결제 승인에 실패했습니다.");
  }

  await docRef.update({ status: "paid", paymentKey, paidAt: Timestamp.now() });
  await writeNotification(db, data.authorId, {
    type: "support",
    title: "새로운 응원을 받았습니다",
    body: `${data.postTitle} 글에 ${amount.toLocaleString()}원 응원이 도착했습니다.`,
    link: `/post/${data.postId}`,
  });
  return { ok: true, postId: data.postId };
});

const SUBSCRIPTION_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Callable — confirms a reader→author 구독(subscription) after the client-side SDK redirects back
 * from Toss's card-registration window (`payment.requestBillingAuth`). Two Toss calls happen here,
 * both requiring the secret key: issuing the actual billing key from the one-time `authKey`, then
 * immediately charging the first period so a subscription is never "active" without having
 * actually been paid for.
 *
 * Each author-subscriber pair gets its own independent billing key (customerKey is
 * `{subscriberId}_{authorId}`, not just the subscriber) rather than sharing one key across a
 * reader's multiple subscriptions — keeps every subscription's renewal/cancellation fully
 * independent, at the cost of re-registering a card per author subscribed to.
 */
export const confirmSubscription = onCall({ secrets: [TOSS_SECRET_KEY] }, async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  if (auth.token.firebase?.sign_in_provider === "anonymous") {
    throw new HttpsError("permission-denied", "게스트 계정은 구독할 수 없습니다.");
  }
  if (auth.token.email_verified !== true) {
    throw new HttpsError("permission-denied", "구독하려면 이메일 인증이 필요합니다.");
  }

  const { authorId, authKey, customerKey } = (request.data ?? {}) as {
    authorId?: string;
    authKey?: string;
    customerKey?: string;
  };
  if (!authorId || !authKey || !customerKey) {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }
  if (authorId === auth.uid) {
    throw new HttpsError("failed-precondition", "자신의 글은 구독할 수 없습니다.");
  }
  if (customerKey !== `${auth.uid}_${authorId}`) {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }

  const db = getFirestore();
  const subId = `${authorId}_${auth.uid}`;
  const subRef = db.collection("subscriptions").doc(subId);
  const existing = await subRef.get();
  const existingData = existing.data() as { currentPeriodEnd?: Timestamp; createdAt?: Timestamp } | undefined;
  if (existingData?.currentPeriodEnd && existingData.currentPeriodEnd.toMillis() > Date.now()) {
    // Already paid through — avoid double-charging on a retried/duplicate confirm call.
    return { ok: true };
  }

  const authorSnap = await db.collection("users").doc(authorId).get();
  const price = authorSnap.data()?.subscriptionPrice as number | undefined;
  if (!price || price <= 0) {
    throw new HttpsError("failed-precondition", "이 작가는 구독을 제공하지 않습니다.");
  }

  const issueRes = await fetch("https://api.tosspayments.com/v1/billing/authorizations/issue", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: tossAuthHeader() },
    body: JSON.stringify({ authKey, customerKey }),
  });
  if (!issueRes.ok) {
    const error = await issueRes.json().catch(() => ({}));
    console.error("[confirmSubscription] billing key issue failed", error);
    throw new HttpsError("internal", "카드 등록에 실패했습니다.");
  }
  const { billingKey } = (await issueRes.json()) as { billingKey: string };

  const authorName = (authorSnap.data()?.displayName as string | undefined) || "작가";
  const orderId = `sub_${subId}_${Date.now()}`;
  const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billingKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: tossAuthHeader() },
    body: JSON.stringify({ amount: price, customerKey, orderId, orderName: `${authorName} 구독` }),
  });
  if (!chargeRes.ok) {
    const error = await chargeRes.json().catch(() => ({}));
    console.error("[confirmSubscription] first charge failed", error);
    throw new HttpsError("internal", "결제에 실패했습니다.");
  }

  const now = Timestamp.now();
  await db.collection("billingKeys").doc(subId).set({ billingKey, customerKey });
  await writeSubscriptionPayment(db, { authorId, subscriberId: auth.uid, amount: price, kind: "initial" });
  await subRef.set(
    {
      authorId,
      subscriberId: auth.uid,
      status: "active",
      price,
      currentPeriodEnd: Timestamp.fromMillis(Date.now() + SUBSCRIPTION_PERIOD_MS),
      canceledAt: null,
      createdAt: existingData?.createdAt ?? now,
      updatedAt: now,
    },
    { merge: true }
  );

  await writeNotification(db, authorId, {
    type: "subscription_started",
    title: "새로운 구독자가 생겼습니다",
    body: "독자님이 구독을 시작했습니다.",
    link: "/profile/edit",
  });

  return { ok: true };
});

/**
 * Callable — cancels the caller's own subscription. Only flips `status`; deliberately leaves
 * `currentPeriodEnd` untouched so access continues through what's already been paid for (the
 * confirmed no-prorated-cutoff policy) — chargeActiveSubscriptions below skips anything not
 * `status == 'active'`, so this alone is what stops future renewal charges.
 */
export const cancelSubscription = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }
  const { authorId } = (request.data ?? {}) as { authorId?: string };
  if (!authorId) {
    throw new HttpsError("invalid-argument", "잘못된 요청입니다.");
  }

  const db = getFirestore();
  const subRef = db.collection("subscriptions").doc(`${authorId}_${auth.uid}`);
  const snap = await subRef.get();
  if (!snap.exists || snap.data()?.subscriberId !== auth.uid) {
    throw new HttpsError("not-found", "구독 정보를 찾을 수 없습니다.");
  }

  const now = Timestamp.now();
  await subRef.update({ status: "canceled", canceledAt: now, updatedAt: now });
  await writeNotification(db, authorId, {
    type: "subscription_canceled",
    title: "구독이 취소되었습니다",
    body: "결제한 기간이 끝날 때까지는 계속 이용할 수 있습니다.",
    link: "/profile/edit",
  });
  return { ok: true };
});

/**
 * Runs daily — charges every subscription whose `currentPeriodEnd` has passed and is still
 * `status == 'active'` (a cancelled subscription is deliberately excluded here; it simply expires
 * once its paid-through date arrives instead of being actively renewed). A failed renewal charge
 * moves the subscription to `past_due` rather than retrying automatically — access still ends
 * naturally once `currentPeriodEnd` passes either way, since that's the sole access check in
 * firestore.rules' hasActiveAccess().
 */
export const chargeActiveSubscriptions = onSchedule(
  { schedule: "every 24 hours", secrets: [TOSS_SECRET_KEY] },
  async () => {
    const db = getFirestore();
    const dueSnap = await db
      .collection("subscriptions")
      .where("status", "==", "active")
      .where("currentPeriodEnd", "<=", Timestamp.now())
      .get();

    if (dueSnap.empty) {
      console.log("[chargeActiveSubscriptions] nothing due");
      return;
    }

    for (const subDoc of dueSnap.docs) {
      const subId = subDoc.id;
      const sub = subDoc.data() as { price: number; authorId: string; subscriberId: string };
      try {
        const billingSnap = await db.collection("billingKeys").doc(subId).get();
        const billing = billingSnap.data() as { billingKey: string; customerKey: string } | undefined;
        if (!billing) {
          console.error("[chargeActiveSubscriptions] missing billing key for", subId);
          await subDoc.ref.update({ status: "past_due", updatedAt: Timestamp.now() });
          continue;
        }

        const orderId = `sub_${subId}_${Date.now()}`;
        const chargeRes = await fetch(`https://api.tosspayments.com/v1/billing/${billing.billingKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: tossAuthHeader() },
          body: JSON.stringify({
            amount: sub.price,
            customerKey: billing.customerKey,
            orderId,
            orderName: "구독 갱신 결제",
          }),
        });
        if (!chargeRes.ok) {
          const error = await chargeRes.json().catch(() => ({}));
          console.error("[chargeActiveSubscriptions] renewal charge failed for", subId, error);
          await subDoc.ref.update({ status: "past_due", updatedAt: Timestamp.now() });
          continue;
        }

        await writeSubscriptionPayment(db, {
          authorId: sub.authorId,
          subscriberId: sub.subscriberId,
          amount: sub.price,
          kind: "renewal",
        });
        await subDoc.ref.update({
          currentPeriodEnd: Timestamp.fromMillis(Date.now() + SUBSCRIPTION_PERIOD_MS),
          updatedAt: Timestamp.now(),
        });
      } catch (err) {
        console.error("[chargeActiveSubscriptions] unexpected error for", subId, err);
      }
    }
  }
);

/**
 * Fires on every write to a post, but only actually does anything on the transition INTO
 * `status == 'published'` (covers both a fresh publish and a 임시저장 draft later published) —
 * re-saving an already-published post doesn't re-notify. Two independent notification paths:
 * - `visibility: 'subscribers'` posts additionally notify every subscriber whose access is
 *   currently paid-through, not just `status == 'active'` ones, matching the same access rule as
 *   firestore.rules' hasActiveAccess().
 * - Every post (public or subscribers-only) notifies the author's followers — the free "새 글 알림
 *   받기" relationship (see the Follow type doc in src/lib/types.ts) — except those who've opted
 *   out via notificationSettings.newPost, and except anyone already notified via the subscriber
 *   path above (a follower who's also a paying subscriber shouldn't get two notices for the same
 *   post).
 */
export const notifySubscribersOfNewPost = onDocumentWritten("posts/{postId}", async (event) => {
  const before = event.data?.before?.data();
  const after = event.data?.after?.data();
  if (!after) return;
  if (before?.status === "published" || after.status !== "published") return;

  const db = getFirestore();
  const postId = event.params.postId;
  const notifyTasks: Promise<void>[] = [];
  const alreadyNotified = new Set<string>();

  if (after.visibility === "subscribers") {
    const subsSnap = await db
      .collection("subscriptions")
      .where("authorId", "==", after.authorId)
      .where("currentPeriodEnd", ">", Timestamp.now())
      .get();
    for (const d of subsSnap.docs) {
      const subscriberId = d.data().subscriberId as string;
      alreadyNotified.add(subscriberId);
      notifyTasks.push(
        writeNotification(db, subscriberId, {
          type: "new_subscriber_post",
          title: "새 구독자 전용 글이 올라왔습니다",
          body: after.title ?? "",
          link: `/post/${postId}`,
        })
      );
    }
  }

  const followsSnap = await db.collection("follows").where("followeeId", "==", after.authorId).get();
  const followerIds = followsSnap.docs
    .map((d) => d.data().followerId as string)
    .filter((uid) => !alreadyNotified.has(uid));
  if (followerIds.length > 0) {
    const followerUsers = await Promise.all(followerIds.map((uid) => db.collection("users").doc(uid).get()));
    followerUsers.forEach((snap, i) => {
      if (snap.data()?.notificationSettings?.newPost === false) return;
      notifyTasks.push(
        writeNotification(db, followerIds[i], {
          type: "new_post",
          title: `${after.authorName ?? "작가"}님의 새 글이 올라왔습니다`,
          body: after.title ?? "",
          link: `/post/${postId}`,
        })
      );
    });
  }

  await Promise.all(notifyTasks);
});
