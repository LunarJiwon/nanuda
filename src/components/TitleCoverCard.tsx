// A small, muted palette matching the site's existing warm/neutral tones (see the diagonal-stripe
// placeholder's own colorA/colorB defaults) — picked per-post by hashing an id so the same post
// always lands on the same color instead of one flickering between colors on every render.
const PALETTE: { bg: string; text: string }[] = [
  { bg: "#f4ede3", text: "#6b5642" },
  { bg: "#e9edf0", text: "#48586a" },
  { bg: "#eef1e6", text: "#4f5a3f" },
  { bg: "#f1e9ee", text: "#6a4d5f" },
  { bg: "#f4f1e3", text: "#6b6142" },
  { bg: "#e6eef0", text: "#3f6068" },
];

function paletteFor(seed: string): { bg: string; text: string } {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

/**
 * Default "cover" for a post with no image — a solid-color card built from the post's own title
 * instead of a blank box or a diagonal-stripe placeholder (which reads as a broken/missing image).
 * Color is deterministic per `seed` (pass the post id) so it doesn't shift between renders/pages.
 */
export function TitleCoverCard({
  title,
  seed,
  aspectRatio = "4/3",
  className = "",
}: {
  title: string;
  seed: string;
  aspectRatio?: string;
  className?: string;
}) {
  const { bg, text } = paletteFor(seed);
  return (
    <div
      className={`w-full flex items-center justify-center border border-[#e5e3de] px-[18px] text-center font-bold text-[15px] leading-[1.4] line-clamp-4 ${className}`}
      style={{ aspectRatio, backgroundColor: bg, color: text }}
    >
      {title}
    </div>
  );
}
