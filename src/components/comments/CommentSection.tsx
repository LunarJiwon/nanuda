"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useAuth, isRealUser, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { Avatar } from "@/components/Avatar";
import { formatDate } from "@/lib/date";
import { addComment, deleteCommentCascade, subscribeToPostComments } from "@/lib/comments-client";
import type { Comment } from "@/lib/types";

interface CommentNode extends Comment {
  replies: Comment[];
}

/**
 * Groups the flat comment list into top-level comments + their replies for the "one level of
 * visual nesting" design (see the `Comment` type doc in src/lib/types.ts): a reply's `parentId`
 * can point at another reply, not just a top-level comment, so we walk up the parent chain to
 * find each comment's top-level ancestor and group it there — every reply renders at the same
 * single indent, no matter how deep its actual reply chain is.
 */
function groupComments(comments: Comment[]): CommentNode[] {
  const byId = new Map(comments.map((c) => [c.id, c]));

  function rootIdOf(comment: Comment): string {
    let cur = comment;
    const seen = new Set<string>();
    while (cur.parentId && byId.has(cur.parentId) && !seen.has(cur.id)) {
      seen.add(cur.id);
      cur = byId.get(cur.parentId)!;
    }
    return cur.id;
  }

  const rootById = new Map<string, CommentNode>();
  const roots: CommentNode[] = [];
  for (const c of comments) {
    if (!c.parentId) {
      const node: CommentNode = { ...c, replies: [] };
      rootById.set(c.id, node);
      roots.push(node);
    }
  }
  for (const c of comments) {
    if (c.parentId) {
      const root = rootById.get(rootIdOf(c));
      // If the root itself is missing (deleted without a full cascade, or stale data), drop the
      // orphaned reply rather than crash the render.
      root?.replies.push(c);
    }
  }
  return roots;
}

function CommentForm({
  placeholder,
  onSubmit,
  onCancel,
  autoFocus,
}: {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  autoFocus?: boolean;
}) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setContent("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-[8px]">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        rows={2}
        autoFocus={autoFocus}
        className="w-full resize-none text-[13.5px] leading-[1.6] px-[12px] py-[10px] border border-[#e0ded8] rounded-[4px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
      />
      <div className="flex items-center gap-[8px] justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[12px] text-[#8a887f] px-[10px] py-[6px] cursor-pointer"
          >
            취소
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || !content.trim()}
          className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[12px] font-semibold px-[13px] py-[6px] rounded-[3px] disabled:opacity-60 cursor-pointer"
        >
          {submitting ? "게시 중…" : "게시"}
        </button>
      </div>
    </form>
  );
}

function LoginPrompt() {
  return (
    <p className="text-[13px] text-[#8a887f] border border-[#e8e7e3] bg-[#faf9f7] rounded-[4px] px-[14px] py-[12px]">
      댓글을 작성하려면{" "}
      <Link href="/login" className="text-[#0e0e0e] underline">
        로그인
      </Link>
      이 필요합니다.
    </p>
  );
}

function VerifyEmailPrompt() {
  return (
    <p className="text-[13px] text-[#8a887f] border border-[#e8e7e3] bg-[#faf9f7] rounded-[4px] px-[14px] py-[12px]">
      댓글을 작성하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.
    </p>
  );
}

function CommentRow({
  comment,
  canDelete,
  canReply,
  isReplying,
  onToggleReply,
  onDelete,
}: {
  comment: Comment;
  canDelete: boolean;
  canReply: boolean;
  isReplying: boolean;
  onToggleReply: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex gap-[10px]">
      <Avatar src={comment.authorPhotoURL} name={comment.authorName} size={30} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-semibold text-[#0e0e0e]">{comment.authorName}</span>
          <span className="text-[11.5px] text-[#b0aea6]">{formatDate(comment.createdAt)}</span>
        </div>
        <p className="text-[13.5px] leading-[1.6] text-[#2c2a26] mt-[3px] mb-[6px] whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        <div className="flex items-center gap-[12px]">
          {canReply && (
            <button
              type="button"
              onClick={onToggleReply}
              className="text-[11.5px] text-[#8a887f] cursor-pointer"
            >
              {isReplying ? "답글 취소" : "답글"}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-[11.5px] text-[#b64a3f] cursor-pointer"
            >
              삭제
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  const canPost = isRealUser(user);
  // Posting a *new* comment/reply additionally requires a verified email (firestore.rules'
  // `isVerifiedUser()` on `comments` create) — checked here first so an unverified real user gets
  // a clear inline message (VerifyEmailPrompt) instead of a silent rules rejection.
  const canCreateComment = isVerifiedUser(user);

  useEffect(() => {
    const unsubscribe = subscribeToPostComments(postId, setComments);
    return unsubscribe;
  }, [postId]);

  const tree = useMemo(() => groupComments(comments ?? []), [comments]);

  async function postComment(content: string, parentId: string | null) {
    if (!user) return;
    if (!canCreateComment) {
      showToast("댓글을 작성하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    try {
      await addComment({
        postId,
        parentId,
        content,
        authorId: user.uid,
        authorName: user.displayName || user.email || "익명",
        authorPhotoURL: user.photoURL,
      });
      setReplyingTo(null);
    } catch (err) {
      console.error("[comments] post failed", err);
      showToast("댓글 작성에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
  }

  async function handleDelete(commentId: string) {
    try {
      await deleteCommentCascade(postId, commentId);
    } catch (err) {
      console.error("[comments] delete failed", err);
      showToast("댓글 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    }
  }

  return (
    <section className="mt-[40px] pt-[26px] border-t border-[#e8e7e3]">
      <h2 className="text-[15px] font-semibold text-[#0e0e0e] mb-[16px]">
        댓글 <span className="font-mono text-[13px] text-[#8a887f]">{comments?.length ?? 0}</span>
      </h2>

      <div className="mb-[24px]">
        {!canPost ? (
          <LoginPrompt />
        ) : !canCreateComment ? (
          <VerifyEmailPrompt />
        ) : (
          <CommentForm placeholder="댓글을 남겨보세요" onSubmit={(content) => postComment(content, null)} />
        )}
      </div>

      <div className="flex flex-col gap-[20px]">
        {tree.map((root) => (
          <div key={root.id} className="flex flex-col gap-[12px]">
            <CommentRow
              comment={root}
              canDelete={user?.uid === root.authorId}
              canReply={canPost}
              isReplying={replyingTo === root.id}
              onToggleReply={() => setReplyingTo((cur) => (cur === root.id ? null : root.id))}
              onDelete={() => handleDelete(root.id)}
            />
            {replyingTo === root.id && (
              <div className="ml-[40px]">
                {canCreateComment ? (
                  <CommentForm
                    placeholder={`${root.authorName}님에게 답글 남기기`}
                    onSubmit={(content) => postComment(content, root.id)}
                    onCancel={() => setReplyingTo(null)}
                    autoFocus
                  />
                ) : (
                  <VerifyEmailPrompt />
                )}
              </div>
            )}
            {root.replies.map((reply) => (
              <div key={reply.id} className="ml-[40px] flex flex-col gap-[12px]">
                <CommentRow
                  comment={reply}
                  canDelete={user?.uid === reply.authorId}
                  canReply={canPost}
                  isReplying={replyingTo === reply.id}
                  onToggleReply={() => setReplyingTo((cur) => (cur === reply.id ? null : reply.id))}
                  onDelete={() => handleDelete(reply.id)}
                />
                {replyingTo === reply.id && (
                  <div className="ml-[40px]">
                    {canCreateComment ? (
                      <CommentForm
                        placeholder={`${reply.authorName}님에게 답글 남기기`}
                        onSubmit={(content) => postComment(content, reply.id)}
                        onCancel={() => setReplyingTo(null)}
                        autoFocus
                      />
                    ) : (
                      <VerifyEmailPrompt />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
        {comments && comments.length === 0 && (
          <p className="text-[13px] text-[#9a988f] py-[10px]">아직 댓글이 없습니다.</p>
        )}
      </div>
    </section>
  );
}
