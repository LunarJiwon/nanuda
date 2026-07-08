import { FadeInImage } from "./FadeInImage";

function initialOf(name: string | null | undefined) {
  const source = (name && name.trim()) || "나";
  return source.charAt(0).toUpperCase();
}

/**
 * Shared avatar treatment: a real photo when one exists, otherwise the same initials-on-dark-
 * circle placeholder already used for the nav avatar in Header.tsx. Used anywhere a user's
 * avatar renders — signup preview, /profile/[handle], /profile/edit.
 */
export function Avatar({
  src,
  name,
  size = 40,
  className = "",
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}) {
  if (src) {
    return (
      <span
        // `flex` (block-level), not `inline-block` — an inline-block box is subject to the
        // parent's line-box baseline alignment, which reserves descender space below it and
        // pushes it up out of vertical center whenever the parent isn't itself a flex container
        // (e.g. Header.tsx's plain <button>). The no-photo branch below never hit this because
        // `flex` sidesteps line-box layout entirely.
        className={`relative flex rounded-full overflow-hidden shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <FadeInImage
          src={src}
          alt={name || "avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover"
          skeletonClassName="bg-[#e5e3de]"
        />
      </span>
    );
  }
  return (
    <span
      className={`flex items-center justify-center rounded-full bg-[#0e0e0e] text-white font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.4) }}
    >
      {initialOf(name)}
    </span>
  );
}
