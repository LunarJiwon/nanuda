import Link from "next/link";
import { CoverImage } from "@/components/CoverImage";
import { getPostsByCategory } from "@/lib/posts";

export const revalidate = 60;

export default async function ArtPage() {
  const posts = await getPostsByCategory("art");

  return (
    <section className="bg-[#efece7] min-h-full">
      <div className="px-6 pt-14 pb-2 max-w-[1120px] mx-auto">
        <h1 className="font-bold text-[clamp(32px,4.6vw,48px)] leading-[1.05] tracking-[-0.035em] mb-[14px]">예술</h1>
        <p className="text-[15px] text-[#6b695f] max-w-[46ch] leading-[1.6] m-0">벽에 걸린 작품을 천천히 지나며 보세요.</p>
      </div>
      <div className="max-w-[1120px] mx-auto px-6 pt-10 pb-[60px]">
        {posts.length === 0 ? (
          <p className="text-center text-[#9a988f] text-[13px] py-10">아직 기록이 없습니다.</p>
        ) : (
          <div
            className="border-t-2 border-[#d8d4cc] border-b border-b-[#ddd9d1] grid gap-x-8 gap-y-5 px-7 pt-[52px] pb-14 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]"
            style={{
              background: "linear-gradient(180deg,#f6f4f0,#efece7)",
              boxShadow: "inset 0 18px 40px -30px rgba(0,0,0,0.25)",
            }}
          >
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="border-none bg-none flex flex-col items-center text-[#0e0e0e]"
              >
                <span className="bg-white p-[16px] border border-[#cbc7bf] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.35)] block">
                  <CoverImage
                    src={post.coverImageURL}
                    alt={post.title}
                    aspectRatio={post.ratio || "1/1"}
                    placeholderLabel={post.subtitle || "artwork"}
                    colorA="#e4e2dc"
                    colorB="#eeece7"
                    className="min-w-[150px] !border-0 text-[10.5px] text-[#a9a79e]"
                  />
                </span>
                <span className="mt-[14px] bg-[#fbfaf8] border border-[#ddd9d1] px-[12px] py-[6px] text-center max-w-[200px]">
                  <span className="block text-[14px] font-semibold leading-[1.3]">{post.title}</span>
                  <span className="block text-[9.5px] text-[#9a988f] mt-[2px]">{post.excerpt}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
