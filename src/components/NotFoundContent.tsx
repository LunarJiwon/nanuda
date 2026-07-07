import Link from "next/link";

/**
 * Shared body for every not-found.tsx in the app (root fallback + per-route overrides for
 * /post/[id] and /profile/[handle]) — Next.js renders the nearest ancestor not-found.tsx when a
 * route segment calls notFound() or simply doesn't match anything, so keeping one shared,
 * on-brand look here means every "this doesn't exist" case gets the same styled page instead of
 * Next's unstyled default.
 */
export function NotFoundContent({
  title = "페이지를 찾을 수 없습니다",
  description = "주소가 잘못되었거나, 삭제되었거나, 아직 존재하지 않는 페이지예요.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="min-h-full flex flex-col items-center justify-center px-6 py-20 text-center">
      <span className="font-mono text-[13px] text-[#b0aea6] mb-[10px]">404</span>
      <h1 className="font-bold text-[28px] sm:text-[34px] tracking-[-0.03em] mb-[12px]">{title}</h1>
      <p className="text-[14px] text-[#6b695f] leading-[1.7] max-w-[46ch] mb-[28px]">{description}</p>
      <Link
        href="/"
        className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[13.5px] font-semibold px-[20px] py-[11px] rounded-[3px]"
      >
        홈으로 돌아가기
      </Link>
    </section>
  );
}
