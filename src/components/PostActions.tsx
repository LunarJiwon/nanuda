"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { useConfirm } from "@/context/confirm-context";
import { deletePost } from "@/lib/posts-client";
import type { Category } from "@/lib/types";

/** 수정/삭제 for the post's own author — hidden entirely for everyone else, same self-gating
 * pattern as ProfileEditButton. Server Component pages can't check auth themselves, hence the
 * small client island. */
export function PostActions({
  postId,
  authorId,
  category,
}: {
  postId: string;
  authorId: string;
  category: Category;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [deleting, setDeleting] = useState(false);

  if (user?.uid !== authorId) return null;

  async function handleDelete() {
    // Irreversible — confirm before deleting, same convention as comment/account deletion.
    const confirmed = await confirm("게시글을 삭제하시겠습니까? 되돌릴 수 없습니다.", {
      confirmLabel: "삭제",
      danger: true,
    });
    if (!confirmed) return;
    setDeleting(true);
    try {
      await deletePost(postId);
      showToast("게시글이 삭제되었습니다.");
      router.push(`/${category}`);
    } catch (err) {
      console.error("[post] delete failed", err);
      showToast("삭제에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
      setDeleting(false);
    }
  }

  return (
    <div className="flex items-center gap-[10px]">
      <Link href={`/editor?edit=${postId}`} className="text-[12px] text-[#8a887f] hover:text-[#0e0e0e]">
        수정
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="text-[12px] text-[#b64a3f] cursor-pointer disabled:opacity-60"
      >
        {deleting ? "삭제 중…" : "삭제"}
      </button>
    </div>
  );
}
