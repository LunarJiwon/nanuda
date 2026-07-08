# SETUP

나누다 (Nanuda) — Next.js + Firebase blog. This document covers everything you (the human) still
need to do manually, how to run things locally, and the scope decisions made during the build.

## 1. Manual Firebase Console steps (required)

The Firebase project (`nanuda-3f1a9`) and web app registration were already done via the CLI, and
`.env.local` already has the client SDK config. These still require the Console because the CLI
can't do them:

### 1.1 Enable Auth sign-in providers

Firebase Console → **Authentication → Sign-in method** → enable:

- **Email/Password**
- **Google**
- **Anonymous** — every visitor (including guests who never sign in) gets a stable anonymous
  Firebase user on first load (`src/context/auth-context.tsx`), used purely as a dedup key for
  the per-visitor view-count feature (`postViews/{postId}_{uid}`). It grants no extra privileges:
  comments/likes/posts all separately require a *real*, non-anonymous account
  (`isRealUser()`/`user && !user.isAnonymous`) — and *creating* any of those three additionally
  requires a verified email (`isVerifiedUser()`, §6); deleting/editing existing content you own
  does not.

(Apple is intentionally not wired up — see §4.)

### 1.2 Deploy Firestore/Storage security rules

`firestore.rules`/`storage.rules` exist locally but haven't been deployed yet (§7), so right now
the *live* project still has whatever default rules it started with. Until you run

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
```

every Firestore read from the app (`src/lib/posts.ts`/`users.ts`, see §5) will fail with
`permission-denied` rather than actually returning your published posts — harmless (every read
there catches the error and degrades to an empty list/`null` rather than crashing, so `npm run
build`/`npm run dev` still work), but nothing will render until the real rules are live.

### 1.3 Provision the Resend secret for email verification (Cloud Functions)

Email verification (§6) is sent via [Resend](https://resend.com) from a Cloud Function, not from
Firebase Auth's own built-in verification email. The Resend API key is Secret Manager-backed
(`defineSecret` from `firebase-functions/params` — the modern, non-deprecated way to hold secrets
for 2nd-gen functions), so it must be provisioned once, out-of-band, before you can deploy
`functions/`:

```bash
firebase functions:secrets:set RESEND_API_KEY
```

This is an interactive prompt (paste the key from your Resend dashboard) and can't be automated —
run it yourself once per project. It is **not** stored in any `.env` file, and never will be.

The sender address, `nanuda@naruna.co.kr`, is a plain exported constant
(`SENDER_EMAIL` in `functions/src/index.ts`) — not a secret. It assumes the `naruna.co.kr` domain
is already verified in the Resend dashboard (confirmed at build time by the project owner); if the
sending domain ever changes, update that one constant.

## 2. Running the app

```bash
npm install
npm run dev       # http://localhost:3000
```

```bash
npm run build     # production build — verified passing with no type errors
npm run start     # run the production build
npm run lint      # ESLint
```

Cloud Functions (`functions/`) are a **separate** TypeScript project with their own
`package.json`/`tsconfig.json` — not part of the Next.js app, not touched by the commands above,
and excluded from the root ESLint config (`functions/**` in `eslint.config.mjs`, since it has its
own build step instead):

```bash
cd functions
npm install
npm run build     # tsc -> functions/lib — verified passing with no type errors
```

## 3. Seeding sample content

`scripts/seed.ts` writes the prototype's mock posts (`BlogApp.dc.html` → `posts()`) into
Firestore under a real author doc, so the app has content to render.

```bash
npm run seed
```

This is the **only** place in the whole project that still wants a Firebase Admin SDK service
account key — the app itself doesn't use one (see §5). The script bypasses `firestore.rules`
(writing posts under a fake "seed author" who never signed up for real), which a normal
authenticated client write can't do, so it needs its own credentials:

1. Firebase Console → **Project Settings → Service Accounts** → **Generate new private key**
   → downloads a JSON file. Keep it out of git.
2. Copy three values from that JSON into `.env.local`:
   ```
   FIREBASE_ADMIN_PROJECT_ID=<project_id>
   FIREBASE_ADMIN_CLIENT_EMAIL=<client_email>
   FIREBASE_ADMIN_PRIVATE_KEY="<private_key, keep the \n escapes literal, wrap in quotes>"
   ```
   `FIREBASE_ADMIN_PROJECT_ID` should already be `nanuda-3f1a9`.

Skip this entirely if you'd rather just sign up through the real `/login` flow and write a post
through `/editor` — the seed script is a convenience, not a requirement. It writes:

- `users/seed-author-eden` — the author doc ("이든" / eden@nanuda.blog)
- `posts/{d1,d2,d3,i1,i2,i3,a1,a2,a3,a4,q1,q2,q3,q4}` — matching the prototype's mock IDs, so
  `/post/i1` etc. work immediately.

Safe to re-run — it upserts by fixed document ID rather than creating duplicates.

## 4. Deliberate scope cuts

These are intentional, not oversights — noted here per the project brief.

- **No Algolia / full-text search.** The archive page fetches all published posts once (Server
  Component, `getAllPublishedPosts`) and filters client-side (`ArchiveClient.tsx`), mirroring the
  prototype's `renderVals()` filtering exactly. Fine at this scale; swap in real search later
  without changing the UI.
- **Apple Sign-In is a documented no-op.** The button is fully styled to match the design
  (`src/app/login/page.tsx`), but `signInApple()` in `src/context/auth-context.tsx` just logs a
  warning. Real Sign in with Apple needs an Apple Developer Program account, a Services ID, and
  registered return URLs — none of which exist yet.
- **No drafts.** The design's editor has a single "발행" (publish) button and no draft state, so
  posts are always created with `status: 'published'`. The footer's "…자 · 임시저장됨" label is
  the prototype's decorative copy, ported as-is for visual fidelity — no autosave actually runs.
- **Comments, likes, and view counts are built** (not in the original design mockup — extended
  the existing visual language tastefully rather than inventing a new style). Two scope
  decisions worth calling out:
  - **Comment nesting is flattened to one visual level.** `comments/{commentId}.parentId` records
    the *actual* comment being replied to (which may itself be a reply), so the true reply graph
    can be arbitrarily deep, but `CommentSection.tsx` only ever renders one level of indentation —
    every reply displays directly under its top-level ancestor rather than under its literal
    parent (see the doc comment on `groupComments` in `src/components/comments/CommentSection.tsx`
    and on the `Comment` type in `src/lib/types.ts`). No infinite recursive nesting UI.
  - **Deleting a comment tree is gated by `firestore.rules`' literal author-only delete rule**
    (`resource.data.authorId == request.auth.uid`), so a top-level comment's cascade delete only
    succeeds if every descendant reply was authored by the same person; a reply from someone else
    nested underneath makes the whole batch fail (Firestore batches are all-or-nothing). Documented
    in `deleteCommentCascade` in `src/lib/comments-client.ts`. Fine at blog scale; a real fix needs
    a Cloud Function with elevated privileges.
- **Handles are immutable for v1.** `handles/{handle}` docs have no `update`/`delete` rule in
  `firestore.rules` — once claimed, a handle can never be released, changed, or transferred except
  via a manual Firestore Console edit. Accounts created before this feature shipped have no
  `handle` field at all; every place that renders a profile link treats a missing handle as "no
  public profile yet" rather than an error (see `Header.tsx`'s profile dropdown and
  `src/lib/users.ts`).
- **`/terms` is placeholder copy, not real legal text.** The signup form's required terms
  checkbox links to it so the flow is complete end-to-end, but the page content is clearly marked
  as a placeholder (`src/app/terms/page.tsx`). Replace with real, counsel-reviewed terms of
  service before real launch.
- **Editor rich text = Markdown selection-wrapping, not `contentEditable`.** The design's text
  blocks are `contentEditable` divs formatted via `document.execCommand`. This build uses plain
  `<input>`/`<textarea>` fields instead (visually identical) and reimplements the B/I/S/`</>`
  toolbar buttons as Markdown-wrapping of the current text selection (`**bold**`, `*italic*`,
  `~~strike~~`, `` `code` ``) — more robust across browsers than the deprecated `execCommand`,
  and it keeps stored content as plain, safe Markdown with no raw HTML pass-through (avoids a
  stored-XSS surface across multiple authors). The design's **U** (underline) button has no
  Markdown/CommonMark equivalent, so it's shown for visual fidelity but is a no-op — documented
  in `src/app/editor/page.tsx`.
- **Info-post table of contents is real, not hardcoded.** The design's TOC box shows fixed sample
  text; this build extracts actual `##` headings from the post's Markdown and lists them (see
  `extractH2Headings` in `src/app/post/[id]/page.tsx`). Only h2 is supported, matching the block
  editor's single heading block type (no nested h3 sub-items like the design's static example).
- **Math rendering uses KaTeX** (`remark-math` + `rehype-katex`) rather than showing raw LaTeX
  text — a small upgrade over the prototype, which never actually rendered math either.
- **Art-category `ratio`** (aspect ratio for the framed artwork) isn't exposed as an editor field
  yet — posts created via `/editor` default to `1/1`. Seeded art posts carry the prototype's
  original ratios (`3/4`, `1/1`, `4/5`, `3/2`). Add a ratio picker to the editor later if needed.

## 5. Architecture notes

- **Data reads**: Server Components read Firestore via the plain client SDK, not the Admin SDK
  (`src/lib/firebase/public.ts` → `src/lib/posts.ts`/`users.ts`) — every read they do is public
  data (published posts, public profile fields) that `firestore.rules` already exposes to
  unauthenticated requests, so there's nothing to gain from a privilege-bypassing Admin SDK here,
  and one less credential to manage. This enables the same future SSG/ISR
  (`export const revalidate = 60` on list/detail pages) either way. Admin SDK privileges are only
  actually needed where security rules must be *bypassed* or the Auth Admin API called — that's
  `functions/` (§6) and the optional seed script (§3), nowhere else. Neither of those needs a
  manual key once deployed, either: Cloud Functions get Application Default Credentials for free
  from Firebase's own infrastructure — a downloaded service-account key is only ever needed for
  running Admin-privileged code from a machine that isn't Google's (i.e. the seed script, run from
  your laptop).
- **Data writes**: the editor (`/editor`, Client Component) writes directly to Firestore/Storage
  with the client SDK (`src/lib/posts-client.ts`) as the signed-in user; `firestore.rules` /
  `storage.rules` are what actually enforce ownership, not application code.
- **Editor images**: uploaded to `posts/{tempPostId}/{filename}` in Storage, where `tempPostId` is
  a `crypto.randomUUID()` generated client-side when the editor mounts — so images can upload
  before the post document is ever saved (decision #9 in the brief).
- **Categories** are the fixed enum `daily | info | art | quote` (`src/lib/types.ts`), not a
  Firestore collection.
- **Profiles**: `src/lib/profile-client.ts` reserves an `@handle` and creates `users/{uid}` in a
  single client-side Firestore transaction (`reserveHandleAndCreateUser`) so two people racing for
  the same handle can't both win. `src/lib/users.ts` is the Server Component read side for
  `/profile/[handle]`, mirroring the `posts.ts`/`posts-client.ts` split.
- **Anonymous auth fallback**: `src/context/auth-context.tsx` signs every visitor in anonymously
  if `auth.currentUser` is null, so `user` is basically never null after the initial load — "signed
  in" for gating purposes (editor, comments, likes, Header's login link) means `isRealUser(user)`
  (`user && !user.isAnonymous`), not just `!!user`. `isVerifiedUser(user)` extends that with
  `user.emailVerified` and gates *creating* new posts/comments/likes specifically (§6) — both
  helpers are exported from `auth-context.tsx` and mirrored in `firestore.rules`.
- **Comments/likes/views** each get their own thin `*-client.ts` module
  (`comments-client.ts`, `likes-client.ts`, `views-client.ts`) following the same pattern as
  `posts-client.ts`: plain client-SDK calls, with `firestore.rules` doing the actual enforcement.
- **Cloud Functions** (`functions/`) are a separate, hand-authored TypeScript project (not
  generated via `firebase init functions`, which is interactive) — see §6 for what they do and
  §1.3 / §7 for the one manual secret-provisioning step and deploy command.

## 6. Email verification (Resend + Cloud Functions)

New posts, comments, and likes require a **verified** email address, not just a signed-in
non-anonymous account (see `isVerifiedUser()` in `firestore.rules` and
`src/context/auth-context.tsx`). Deliberately **not** using Firebase Auth's built-in
`sendEmailVerification()` / default template — the whole flow below is hand-rolled so the email
itself is on-brand (site name, plain HTML) and sent through Resend instead of Firebase's own
mailer. We still reuse Firebase Auth's own `emailVerified` boolean as the source of truth (so
`request.auth.token.email_verified` keeps working for free in security rules and
`user.emailVerified` on the client), we just set it ourselves via the Admin SDK once our own flow
succeeds.

**End-to-end flow:**

1. Email/password signup (`signUpEmail` in `src/context/auth-context.tsx`) creates the account and
   profile doc, then fire-and-forgets a call to the `sendVerificationEmail` Cloud Function
   (`src/lib/emailVerification-client.ts`). Google sign-ins skip this entirely — a Google-verified
   address already comes through with `emailVerified: true` on the Firebase user record.
2. `sendVerificationEmail` (`functions/src/index.ts`, callable, 2nd-gen, `RESEND_API_KEY` bound as
   a secret) rejects unauthenticated/anonymous callers, rate-limits to one send per 60s per user
   (`emailVerifications/{uid}.lastSentAt`), generates a random token, stores its SHA-256 hash +
   24h expiry in `emailVerifications/{uid}`, and emails a link (via Resend, from
   `nanuda@naruna.co.kr`) to `verifyEmailToken`'s own URL with `uid`/`token` query params.
3. The persistent banner (`src/components/EmailVerificationBanner.tsx`, shown in the layout
   whenever a real, non-anonymous user hasn't verified yet) also calls `sendVerificationEmail` for
   manual re-sends, with the same 60s cooldown surfaced as a visible countdown.
4. Clicking the link opens `verifyEmailToken` (`functions/src/index.ts`, public HTTP GET) directly
   in the browser. It hashes the provided token, compares it to the stored hash, checks the expiry,
   and on success calls `getAuth().updateUser(uid, { emailVerified: true })` and deletes the
   consumed `emailVerifications/{uid}` doc. Either way it 302-redirects to
   `${SITE_ORIGIN}/verify-email?status=success|error&reason=...` — it never renders anything itself
   since it's opened straight from an email client.
5. `/verify-email` (`src/app/verify-email/page.tsx`) does **not** re-run any verification logic —
   `verifyEmailToken` already did the work before redirecting here. It just reads `?status=...` and
   shows a message. On success, if this same browser tab is still signed in as that user, it calls
   `getIdToken(true)` to force-refresh the ID token so `email_verified` shows up in security rules
   immediately (no full re-login needed), then a small `refreshUser()` helper in the auth context
   re-fetches the Auth record so the persistent banner also disappears right away.

**Two configuration choices baked into `functions/src/index.ts`, both easy to change if they stop
being true:**

- `verifyEmailToken`'s own URL (used inside the email) is constructed as
  `https://{FUNCTIONS_REGION}-{projectId}.cloudfunctions.net/verifyEmailToken` rather than using
  the Cloud Run-style URL `firebase deploy` prints for 2nd-gen HTTPS functions — Firebase keeps
  that `cloudfunctions.net` alias working for 2nd-gen HTTPS functions specifically so it stays
  predictable pre-deploy. `FUNCTIONS_REGION` is hardcoded to `"us-central1"` (the default 2nd-gen
  region, since neither function sets a `region(...)` override) — update it there if that changes.
- `SITE_ORIGIN` (the redirect target in step 4) defaults to the Firebase Hosting default domain,
  `https://nanuda-3f1a9.web.app`, since no custom domain is configured yet. It's a `defineString`
  param (always has a default, so `firebase deploy` never prompts); override it by creating
  `functions/.env` from `functions/.env.example` if you add a custom domain later.

**Known caveat, left as-is by design:** if you verify from a different browser/device than the one
you're actively logged in on, that *other* session's `email_verified` claim doesn't refresh
immediately — it picks up the change on its own next natural ID token refresh (Firebase refreshes
tokens roughly hourly) or on its next full re-login. The same-tab case (by far the common one) is
covered by the `getIdToken(true)` call in step 5 above.

## 7. Deploying (not done — left for you)

Everything is deploy-ready but nothing has been deployed. Cloud Functions need the Resend secret
provisioned first (§1.3) and their own build step (`functions/` has its own `package.json`, so
`firebase.json`'s `predeploy` hook runs `npm run build` there automatically — you don't need to
build it by hand first, just make sure `npm install` has been run inside `functions/` at least
once):

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage
firebase deploy --only functions
firebase deploy --only hosting   # Next.js web frameworks integration (firebase.json -> hosting.source)
```

If your `firebase-tools` version requires it, enable the frameworks experiment first:

```bash
firebase experiments:enable webframeworks
```

## 8. Reader→writer 응원 (Toss Payments)

Post detail pages show an "응원하기" button (src/components/SupportButton.tsx) that lets a
verified, signed-in reader send the author a small fixed-amount tip (1,000/3,000/5,000/10,000원)
via Toss Payments. MVP scope, deliberately kept small — see the priority-1 monetization plan
discussed with the project owner:

- **No automatic payout to authors yet.** All payments land in the single nanuda merchant account;
  settlement to individual authors is a manual monthly step (query the `supports` collection for
  `status == 'paid'`, grouped by `authorId`) until real volume justifies building automatic split
  settlement (Toss's platform/partner settlement product, a separate merchant contract).
- **Card only** (`method: "CARD"` in `startSupportPayment`, src/lib/support-client.ts) — Toss's
  default flow for that method already includes simple-pay options (카카오페이, 네이버페이, etc.)
  in the same hosted window, so this isn't as limited as it sounds.
- **No self-tipping** — hidden client-side (SupportButton returns null on your own post) and
  enforced in `firestore.rules` (`authorId != request.auth.uid`).

**Required one-time setup** (can't be automated — needs your real Toss dashboard credentials):

1. Get your client key and secret key from
   [developers.tosspayments.com/my/api-keys](https://developers.tosspayments.com/my/api-keys) — use
   the `test_` prefixed keys until your merchant contract is approved, matching test keys are
   always available for exactly this purpose.
2. Provision the secret key (interactive prompt, same pattern as `RESEND_API_KEY` in §1.3):
   ```bash
   firebase functions:secrets:set TOSS_SECRET_KEY
   ```
3. Put the **client key** (public, safe to commit) in `.env.local` as `NEXT_PUBLIC_TOSS_CLIENT_KEY`
   for local dev, and in `apphosting.yaml`'s matching entry (currently `value: ""`) for the deployed
   site, then redeploy hosting.
4. Deploy the updated rules and functions:
   ```bash
   firebase deploy --only firestore:rules
   firebase deploy --only functions
   ```

**How it works end-to-end:**

1. `startSupportPayment` (support-client.ts) writes `supports/{orderId}` as `status: "pending"`,
   then hands off to the Toss SDK, which redirects the browser to Toss's hosted payment window.
2. Toss redirects back to `/support/success?paymentKey=...&orderId=...&amount=...` (or
   `/support/fail` on cancel/failure — the abandoned `pending` doc is harmless, just never counted).
3. The success page calls the `confirmTossPayment` Cloud Function, which is the only thing that
   actually captures the charge (via Toss's `/v1/payments/confirm` API, using the Secret
   Manager-backed secret key) — cross-checking the amount against what this app itself wrote in
   step 1, not just what the client claims in the URL. Only then does it flip the doc to
   `status: "paid"`.
