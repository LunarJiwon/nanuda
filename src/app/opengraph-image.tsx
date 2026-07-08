import { ImageResponse } from "next/og";
import { loadPretendardFonts } from "@/lib/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CATEGORIES_DISPLAY = ["일상", "정보", "예술", "글귀"];

/** Default share-preview image for the home page and any page that doesn't define its own (e.g.
 * post/[id]'s per-post image only kicks in for that route segment) — see SETUP.md-style rationale
 * in og-fonts.ts for why Korean text needs its own font data here. */
export default async function Image() {
  const fonts = await loadPretendardFonts();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#faf9f7",
          fontFamily: "Pretendard",
        }}
      >
        <div style={{ display: "flex", fontSize: 128, fontWeight: 700, color: "#0e0e0e", letterSpacing: -4 }}>
          나누다
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 500,
            color: "#54524c",
            marginTop: 26,
            textAlign: "center",
          }}
        >
          형식에 얽매이지 않고, 담고 싶은 것을 담는 생각 공유 플랫폼
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 46 }}>
          {CATEGORIES_DISPLAY.map((label) => (
            <div
              key={label}
              style={{
                display: "flex",
                fontSize: 24,
                fontWeight: 500,
                color: "#54524c",
                border: "1px solid #d9d7d0",
                borderRadius: 999,
                padding: "10px 28px",
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
