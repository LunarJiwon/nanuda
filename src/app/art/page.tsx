import Link from "next/link";
import type { Metadata } from "next";
import { CoverImage } from "@/components/CoverImage";
import { getPostsByCategory } from "@/lib/posts";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "예술 · 나누다",
  description: "벽에 걸린 작품을 천천히 지나며 보세요.",
  alternates: { canonical: "/art" },
};

export default async function ArtPage() {
  const posts = await getPostsByCategory("art");

  return (
    <section className="min-h-full bg-[#faf9f7]">
      <div className="px-6 pt-14 pb-2 max-w-[1120px] mx-auto">
        <h1 className="font-bold text-[clamp(32px,4.6vw,48px)] leading-[1.05] tracking-[-0.035em] mb-[14px]">예술</h1>
        <p className="text-[15px] text-[#6b695f] max-w-[46ch] leading-[1.6] m-0">벽에 걸린 작품을 천천히 지나며 보세요.</p>
      </div>
      <div className="max-w-[1120px] mx-auto px-6 pt-10 pb-[60px]">
        {posts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          <div className="grid gap-x-8 gap-y-[40px] [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="flex flex-col items-center gap-[12px] text-[#0e0e0e] text-center"
              >
                <CoverImage
                  src={post.coverImageURL}
                  alt={post.title}
                  aspectRatio={post.ratio || "1/1"}
                  placeholderLabel={post.subtitle || "artwork"}
                  colorA="#e4e2dc"
                  colorB="#eeece7"
                  className="rounded-none"
                />
                <span className="flex flex-col gap-[3px]">
                  <span className="text-[14px] font-semibold leading-[1.3]">{post.title}</span>
                  <span className="text-[12px] text-[#9a988f] leading-[1.4] line-clamp-2">{post.excerpt}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
