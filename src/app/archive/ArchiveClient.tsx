"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CATEGORY_LABEL, type Post } from "@/lib/types";
import { formatDate } from "@/lib/date";
import { chipClass } from "@/lib/chipStyle";
import { AuthorByline } from "@/components/AuthorByline";

export function ArchiveClient({
  posts,
  authorPhotos,
}: {
  posts: Post[];
  /** uid -> photoURL, flattened server-side from a Map (see page.tsx) since a Client Component
   * prop must be plain JSON-safe data. */
  authorPhotos: Record<string, string | null>;
}) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("__all");

  // Sorted by how many posts actually use each tag (ties keep first-seen order, via the stable
  // sort below) rather than first-seen order alone, so the most-used tags — the ones worth
  // recommending as a shortcut into the archive — surface first instead of wherever they
  // happened to appear chronologically.
  const tagList = useMemo(() => {
    const counts = new Map<string, number>();
    const order: string[] = [];
    posts.forEach((p) =>
      p.tags.forEach((t) => {
        if (!counts.has(t)) order.push(t);
        counts.set(t, (counts.get(t) ?? 0) + 1);
      })
    );
    return order.sort((a, b) => counts.get(b)! - counts.get(a)!);
  }, [posts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return posts.filter((p) => {
      const okTag = tag === "__all" || p.tags.includes(tag);
      const okQ = !q || (p.title + p.excerpt + p.tags.join(" ")).toLowerCase().includes(q);
      return okTag && okQ;
    });
  }, [posts, query, tag]);

  return (
    <>
      <section className="px-6 pt-14 pb-5 max-w-[900px] mx-auto">
        <h1 className="font-bold text-[clamp(30px,4.4vw,44px)] leading-[1.05] tracking-[-0.035em] mb-[22px]">
          전체 게시물
        </h1>
        <div className="relative mb-[22px]">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#9a988f"
            strokeWidth="2"
            className="absolute left-[14px] top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <circle cx="11" cy="11" r="7"></circle>
            <path d="M21 21l-4.3-4.3"></path>
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="제목, 내용, 태그 검색…"
            className="w-full text-[15px] py-[14px] pl-[42px] pr-[16px] border border-[#e0ded8] rounded-[3px] bg-[#faf9f7] text-[#0e0e0e] outline-none"
          />
        </div>
        {tagList.length > 0 && (
          <div className="text-[11px] tracking-[0.04em] text-[#a9a79e] mb-[8px]">추천 태그</div>
        )}
        <div className="flex flex-wrap gap-[7px] mb-2">
          <button
            onClick={() => setTag("__all")}
            className={`text-[12.5px] font-medium px-[12px] py-[5px] rounded-[2px] cursor-pointer border ${chipClass(
              tag === "__all"
            )}`}
          >
            전체
          </button>
          {tagList.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              className={`text-[12px] px-[11px] py-[5px] rounded-[2px] cursor-pointer border ${chipClass(
                tag === t
              )}`}
            >
              #{t}
            </button>
          ))}
        </div>
      </section>
      <section className="px-6 pt-2 pb-12 max-w-[900px] mx-auto flex flex-col">
        {filtered.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="text-left border-t border-[#eeece8] py-[18px] flex items-baseline justify-between gap-4 text-[#0e0e0e]"
          >
            <span className="flex flex-col gap-[4px] min-w-0">
              <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">{post.title}</span>
              <span className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px]">
                <AuthorByline name={post.authorName} photoURL={authorPhotos[post.authorId] ?? null} size={16} />
                <span className="text-[12.5px] text-[#8a887f]">
                  {CATEGORY_LABEL[post.category]} · {formatDate(post.publishedAt)}
                </span>
              </span>
            </span>
            <span className="text-[11px] text-[#b0aea6] whitespace-nowrap">
              #{post.tags[0] || ""}
            </span>
          </Link>
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-[#9a988f] text-[13px] py-10">검색 결과가 없습니다.</p>
        )}
      </section>
    </>
  );
}
