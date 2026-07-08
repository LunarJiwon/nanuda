import Link from "next/link";
import type { Metadata } from "next";
import { TagChip } from "@/components/TagChip";
import { getPostsByCategory } from "@/lib/posts";
import { formatDate } from "@/lib/date";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "정보 · 나누다",
  description: "코드 · 회로 · 수식, 그리고 자동 목차까지. 배운 것을 정리하는 방.",
  alternates: { canonical: "/info" },
};

export default async function InfoPage() {
  const posts = await getPostsByCategory("info");

  return (
    <>
      <section className="px-6 pt-14 pb-6 max-w-[860px] mx-auto">
        <h1 className="font-bold text-[clamp(30px,4.4vw,46px)] leading-[1.05] tracking-[-0.035em] mb-[14px]">정보</h1>
        <p className="text-[15px] text-[#6b695f] max-w-[52ch] leading-[1.6] m-0">
          코드 · 회로 · 수식, 그리고 자동 목차까지. 배운 것을 정리하는 방.
        </p>
      </section>
      <section className="px-6 pt-[14px] pb-11 max-w-[860px] mx-auto flex flex-col">
        {posts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          posts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="text-left border-t border-[#e8e7e3] py-[26px] flex flex-col gap-[10px] text-[#0e0e0e]"
            >
              <span className="text-[22px] font-bold leading-[1.25] tracking-[-0.02em]">{post.title}</span>
              <span className="text-[14px] text-[#6b695f] leading-[1.6] max-w-[60ch]">{post.excerpt}</span>
              <span className="flex flex-wrap gap-[6px] items-center mt-[2px]">
                {post.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} />
                ))}
                <span className="text-[11.5px] text-[#b0aea6] ml-[4px]">
                  {formatDate(post.publishedAt)} · {post.readTime}
                </span>
              </span>
            </Link>
          ))
        )}
      </section>
    </>
  );
}
