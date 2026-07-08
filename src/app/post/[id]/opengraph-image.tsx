import { ImageResponse } from "next/og";
import { getPostById } from "@/lib/posts";
import { CATEGORY_LABEL } from "@/lib/types";
import { loadPretendardFonts } from "@/lib/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Only ever used for a post without a coverImageURL — page.tsx's own generateMetadata sets
 * openGraph.images explicitly once a cover image exists, which takes precedence over this file
 * convention. Renders the post's own title/subtitle so a text-only post still gets a real,
 * legible share-preview card instead of the platform-default blank/no-image one. */
export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, fonts] = await Promise.all([getPostById(id), loadPretendardFonts()]);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#faf9f7",
            fontFamily: "Pretendard",
            fontSize: 96,
            fontWeight: 700,
            color: "#0e0e0e",
          }}
        >
          나누다
        </div>
      ),
      { ...size, fonts }
    );
  }

  const secondary = post.subtitle || post.excerpt;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: "#faf9f7",
          fontFamily: "Pretendard",
          padding: 80,
        }}
      >
        <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: "#8a887f" }}>
          {CATEGORY_LABEL[post.category]}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div
            style={{
              display: "-webkit-box",
              WebkitBoxOrient: "vertical",
              WebkitLineClamp: 3,
              overflow: "hidden",
              fontSize: 64,
              fontWeight: 700,
              color: "#0e0e0e",
              lineHeight: 1.28,
            }}
          >
            {post.title}
          </div>
          {secondary && (
            <div
              style={{
                display: "-webkit-box",
                WebkitBoxOrient: "vertical",
                WebkitLineClamp: 2,
                overflow: "hidden",
                fontSize: 30,
                fontWeight: 500,
                color: "#6b695f",
                lineHeight: 1.5,
              }}
            >
              {secondary}
            </div>
          )}
        </div>
        <div style={{ display: "flex", fontSize: 28, fontWeight: 700, color: "#54524c" }}>
          나누다 · {post.authorName}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
