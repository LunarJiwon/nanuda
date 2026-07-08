export function Spinner({
  className = "w-[13px] h-[13px] border-2 border-[#d5d3ce] border-t-[#0e0e0e]",
}: {
  className?: string;
}) {
  return <span className={`inline-block flex-none rounded-full animate-spin ${className}`} />;
}
