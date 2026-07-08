import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { getPostsByCategory } from "@/lib/posts";
import { formatDate } from "@/lib/date";
import type { Post } from "@/lib/types";

export const revalidate = 60;

/** Photo-less 일상 entries used to fall back to CoverImage's generic diagonal-stripe "photo"
 * placeholder, which reads as a broken/missing image for a post that was never going to have one.
 * No image-shaped box at all here instead — just the post's own title/subtitle/excerpt filling
 * the same space a photo card would occupy. */
function TextOnlyCard({ post }: { post: Post }) {
  return (
    <div className="flex flex-col gap-[8px] py-[2px]">
      <span className="text-[20px] font-bold tracking-[-0.015em] leading-[1.3]">{post.title}</span>
      {post.subtitle && <span className="text-[13.5px] text-[#77756c] leading-[1.5]">{post.subtitle}</span>}
      <p className="text-[13px] text-[#8a887f] leading-[1.6] line-clamp-4 m-0">{post.excerpt}</p>
      <span className="text-[11.5px] text-[#b0aea6] mt-[4px]">
        {formatDate(post.publishedAt)} · {post.readTime}
      </span>
    </div>
  );
}

export default async function DailyPage() {
  const posts = await getPostsByCategory("daily");

  return (
    <>
      <section className="px-6 pt-14 pb-6 max-w-[1000px] mx-auto">
        <h1 className="font-bold text-[clamp(32px,4.6vw,48px)] leading-[1.05] tracking-[-0.035em] mb-[14px]">일상</h1>
        <p className="text-[15px] text-[#6b695f] max-w-[46ch] leading-[1.6] m-0">
          사진과 짧은 글로 남기는 하루의 조각들.
        </p>
      </section>
      <section className="px-6 pt-4 pb-11 max-w-[1000px] mx-auto">
        {posts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          <div className="grid gap-[30px] [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {posts.map((post) => (
              <Link key={post.id} href={`/post/${post.id}`} className="text-left flex flex-col gap-[12px] text-[#0e0e0e]">
                {post.coverImageURL ? (
                  <>
                    <CoverImage src={post.coverImageURL} alt={post.title} aspectRatio="4/3" placeholderLabel="photo" />
                    <span className="flex flex-col gap-[6px]">
                      <span className="text-[19px] font-semibold tracking-[-0.01em] leading-[1.25]">{post.title}</span>
                      <span className="text-[13px] text-[#77756c] leading-[1.55]">{post.excerpt}</span>
                      <span className="text-[11.5px] text-[#b0aea6] mt-[2px]">
                        {formatDate(post.publishedAt)} · {post.readTime}
                      </span>
                    </span>
                  </>
                ) : (
                  <TextOnlyCard post={post} />
                )}
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
