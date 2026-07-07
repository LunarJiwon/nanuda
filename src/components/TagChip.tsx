export function TagChip({ tag, size = "md" }: { tag: string; size?: "sm" | "md" }) {
  const padding = size === "sm" ? "px-[7px] py-[2px]" : "px-[8px] py-[3px]";
  return (
    <span
      className={`text-[11px] text-[#54524c] bg-[#f2f0ec] border border-[#e5e3de] rounded-[2px] ${padding}`}
    >
      #{tag}
    </span>
  );
}
