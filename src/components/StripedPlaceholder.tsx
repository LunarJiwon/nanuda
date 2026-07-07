/** The design's diagonal-stripe placeholder used wherever a post has no cover image. */
export function StripedPlaceholder({
  label,
  aspectRatio = "4/3",
  colorA = "#ecebe6",
  colorB = "#f4f3ef",
  stripeSize = 10,
  textClassName = "text-[11px] text-[#adaba2]",
  border = true,
  className = "",
}: {
  label: string;
  aspectRatio?: string;
  colorA?: string;
  colorB?: string;
  stripeSize?: number;
  textClassName?: string;
  border?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`w-full flex items-center justify-center font-mono ${textClassName} ${
        border ? "border border-[#e5e3de]" : ""
      } ${className}`}
      style={{
        aspectRatio,
        background: `repeating-linear-gradient(45deg, ${colorA} 0 ${stripeSize}px, ${colorB} ${stripeSize}px ${
          stripeSize * 2
        }px)`,
      }}
    >
      {label}
    </div>
  );
}
