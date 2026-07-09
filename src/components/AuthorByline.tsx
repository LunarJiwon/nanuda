import { Avatar } from "@/components/Avatar";

/**
 * Small avatar + name shown on a post-list card so a multi-author category/archive/home list
 * identifies who wrote what — not a link, since every one of these cards is itself wrapped in a
 * <Link> to the post; nesting an inner <Link> to the profile inside that would be invalid HTML
 * and unreliable to click.
 */
export function AuthorByline({
  name,
  photoURL,
  size = 18,
  className = "",
}: {
  name: string;
  photoURL: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-[6px] min-w-0 text-[12px] text-[#77756c] ${className}`}>
      <Avatar src={photoURL} name={name} size={size} />
      <span className="truncate">{name}</span>
    </span>
  );
}
