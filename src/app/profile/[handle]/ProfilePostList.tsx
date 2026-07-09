"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoverImage } from "@/components/CoverImage";
import { TitleCoverCard } from "@/components/TitleCoverCard";
import { formatDate } from "@/lib/date";
import { chipClass } from "@/lib/chipStyle";
import type { Post } from "@/lib/types";

/** Photo-less posts (any category, not just 일상) get the same title/excerpt/date-readtime layout
 * as a photo card, just with a solid-color title card (see TitleCoverCard) standing in for the
 * image instead of a blank box or the broken-image-looking diagonal-stripe placeholder. */
function PostCard({ post }: { post: Post }) {
  return (
    <>
      {post.coverImageURL ? (
        <CoverImage src={post.coverImageURL} alt={post.title} aspectRatio="4/3" placeholderLabel="post" />
      ) : (
        <TitleCoverCard title={post.title} seed={post.id} />
      )}
      <span className="flex flex-col gap-[6px]">
        <span className="text-[17px] font-semibold tracking-[-0.01em] leading-[1.25]">{post.title}</span>
        <span className="text-[13px] text-[#77756c] leading-[1.55] line-clamp-4">{post.excerpt}</span>
        <span className="text-[11.5px] text-[#b0aea6] mt-[2px]">
          {formatDate(post.publishedAt)} · {post.readTime}
        </span>
      </span>
    </>
  );
}

const ALL = "__all";

/** Lets a visitor narrow an author's post grid down to a single topic — an author "creates" a
 * topic simply by tagging posts with it in the editor (see commitTagFragments in
 * src/app/editor/page.tsx), no separate topic-management feature needed. Mirrors the tag filter
 * ArchiveClient.tsx already implements for /archive, just as a left sidebar instead of top chips
 * (and scoped to one author's posts instead of the whole site). */
export function ProfilePostList({ posts }: { posts: Post[] }) {
  const [selectedTag, setSelectedTag] = useState(ALL);

  const tagList = useMemo(() => {
    const seen: string[] = [];
    posts.forEach((p) => p.tags.forEach((t) => { if (!seen.includes(t)) seen.push(t); }));
    return seen;
  }, [posts]);

  const filtered = useMemo(
    () => (selectedTag === ALL ? posts : posts.filter((p) => p.tags.includes(selectedTag))),
    [posts, selectedTag]
  );

  if (posts.length === 0) {
    return <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>;
  }

  const grid = (
    <div className="grid gap-[30px] [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
      {filtered.map((post) => (
        <Link key={post.id} href={`/post/${post.id}`} className="text-left flex flex-col gap-[12px] text-[#0e0e0e]">
          <PostCard post={post} />
        </Link>
      ))}
    </div>
  );

  if (tagList.length === 0) return grid;

  const topicButtonClass = (active: boolean) =>
    `text-left text-[13px] px-[12px] py-[7px] rounded-[2px] cursor-pointer border ${chipClass(active)}`;

  return (
    <div className="flex flex-col sm:grid sm:grid-cols-[160px_1fr] gap-[24px] sm:gap-[32px] items-start">
      <div className="flex flex-row flex-wrap sm:flex-col gap-[7px] sm:gap-[6px] sm:sticky sm:top-6 w-full">
        <button onClick={() => setSelectedTag(ALL)} className={topicButtonClass(selectedTag === ALL)}>
          전체
        </button>
        {tagList.map((tag) => (
          <button key={tag} onClick={() => setSelectedTag(tag)} className={topicButtonClass(selectedTag === tag)}>
            #{tag}
          </button>
        ))}
      </div>
      {grid}
    </div>
  );
}
