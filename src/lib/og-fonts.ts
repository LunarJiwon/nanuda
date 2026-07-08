import "server-only";

// Satori (the renderer behind next/og's ImageResponse) has no built-in Korean glyph coverage, so
// every generated OG image must ship its own font data or Korean text renders as tofu boxes.
// Pretendard isn't on next/font/google, so its static TTF is fetched from the same jsDelivr CDN
// build already used for the site's own stylesheet (see layout.tsx) — pinned to an exact version
// with immutable cache headers, so Next's fetch cache keeps this to one real network call.
const PRETENDARD_BASE = "https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/public/static/alternative";

export async function loadPretendardFonts(): Promise<
  { name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" }[]
> {
  const [bold, medium] = await Promise.all([
    fetch(`${PRETENDARD_BASE}/Pretendard-Bold.ttf`).then((res) => res.arrayBuffer()),
    fetch(`${PRETENDARD_BASE}/Pretendard-Medium.ttf`).then((res) => res.arrayBuffer()),
  ]);
  return [
    { name: "Pretendard", data: bold, weight: 700, style: "normal" },
    { name: "Pretendard", data: medium, weight: 500, style: "normal" },
  ];
}
