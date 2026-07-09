import Link from "next/link";
import type { Metadata } from "next";
import { AuthorByline } from "@/components/AuthorByline";
import { getPostsByCategory } from "@/lib/posts";
import { getUsersByIds } from "@/lib/users";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "글귀 · 나누다",
  description: "마음에 남은 문장을 짧은 카드로 모읍니다.",
  alternates: { canonical: "/quote" },
};

export default async function QuotePage() {
  const posts = await getPostsByCategory("quote");
  const authors = await getUsersByIds(posts.map((p) => p.authorId));

  return (
    <>
      <section className="px-6 pt-14 pb-6 max-w-[1000px] mx-auto">
        <h1 className="font-bold text-[clamp(32px,4.6vw,48px)] leading-[1.05] tracking-[-0.035em] mb-[14px]">글귀</h1>
        <p className="text-[15px] text-[#6b695f] max-w-[46ch] leading-[1.6] m-0">
          마음에 남은 문장을 짧은 카드로 모읍니다.
        </p>
      </section>
      <section className="px-6 pt-4 pb-11 max-w-[1000px] mx-auto">
        {posts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="text-left border border-[#e8e7e3] bg-[#faf9f7] px-[20px] py-[22px] rounded-[3px] flex flex-col min-h-[180px] text-[#0e0e0e]"
              >
                <span className="text-[34px] leading-[0.6] text-[#cbc7bf]">&ldquo;</span>
                <span className="text-[16.5px] font-medium leading-[1.5] tracking-[-0.01em] mt-[8px] whitespace-pre-line">
                  {post.title}
                </span>
                <span className="mt-auto pt-[16px] flex flex-col gap-[8px]">
                  <AuthorByline
                    name={post.authorName}
                    photoURL={authors.get(post.authorId)?.photoURL ?? null}
                    size={16}
                  />
                  {post.excerpt && <span className="text-[12.5px] text-[#8a887f]">— {post.excerpt}</span>}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
