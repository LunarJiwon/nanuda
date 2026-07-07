import { FadeInImage } from "./FadeInImage";
import { StripedPlaceholder } from "./StripedPlaceholder";

export function CoverImage({
  src,
  alt,
  aspectRatio = "4/3",
  placeholderLabel,
  colorA,
  colorB,
  className = "",
}: {
  src: string | null;
  alt: string;
  aspectRatio?: string;
  placeholderLabel: string;
  colorA?: string;
  colorB?: string;
  className?: string;
}) {
  if (src) {
    return (
      <div className={`relative w-full overflow-hidden border border-[#e5e3de] ${className}`} style={{ aspectRatio }}>
        <FadeInImage src={src} alt={alt} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" />
      </div>
    );
  }
  return (
    <StripedPlaceholder
      label={placeholderLabel}
      aspectRatio={aspectRatio}
      colorA={colorA}
      colorB={colorB}
      className={className}
    />
  );
}
