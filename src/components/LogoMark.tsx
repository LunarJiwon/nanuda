import Image from "next/image";

export function LogoMark({ className = "w-[26px] h-[26px]" }: { className?: string }) {
  return (
    <Image
      src="/images/logo-mark.png"
      alt="나누다"
      width={512}
      height={512}
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
