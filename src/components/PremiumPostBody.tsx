"use client";

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { useAuth } from "@/context/auth-context";
import { PostBody } from "@/components/PostBody";
import { SubscribeButton } from "@/components/SubscribeButton";

type AccessState = "loading" | "granted" | "denied";

/** Replaces PostBody for `visibility === "subscribers"` posts. The Server Component page can't
 * check per-visitor access (it reads Firestore via the unauthenticated public SDK — see
 * SETUP.md), so this Client Component does the gated read itself: posts/{postId}/premium/body is
 * only readable via firestore.rules' hasActiveAccess check (author or active subscriber), so a
 * permission-denied error here just means "no access", not a real failure. */
export function PremiumPostBody({
  postId,
  authorId,
  authorName,
  price,
}: {
  postId: string;
  authorId: string;
  authorName: string;
  price: number;
}) {
  const { user, loading: authLoading } = useAuth();
  const [fetchState, setFetchState] = useState<AccessState>("loading");
  const [content, setContent] = useState("");
  // Not signed in (or still an anonymous auto-account) is a pure function of auth state, so it's
  // derived at render time rather than pushed into fetchState from an effect — no fetch is ever
  // needed to know a logged-out visitor lacks access.
  const loggedOut = !authLoading && (!user || user.isAnonymous);
  const state: AccessState = loggedOut ? "denied" : fetchState;

  useEffect(() => {
    if (authLoading || loggedOut) return;
    let cancelled = false;
    getDoc(doc(db, "posts", postId, "premium", "body"))
      .then((snap) => {
        if (cancelled) return;
        if (snap.exists()) {
          setContent((snap.data().content as string | undefined) ?? "");
          setFetchState("granted");
        } else {
          setFetchState("denied");
        }
      })
      .catch(() => {
        if (!cancelled) setFetchState("denied");
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, loggedOut, postId, user]);

  if (state === "loading") {
    return <p className="text-[13px] text-[#9a988f] py-[40px] text-center">불러오는 중…</p>;
  }

  if (state === "granted") {
    return <PostBody content={content} />;
  }

  return (
    <div className="flex flex-col items-center gap-[14px] border border-[#e8e7e3] bg-[#faf9f7] rounded-[4px] px-[24px] py-[48px] text-center">
      <p className="text-[14px] text-[#54524c] m-0">이 게시글은 구독자에게만 공개됩니다.</p>
      <SubscribeButton authorId={authorId} authorName={authorName} price={price} />
    </div>
  );
}
