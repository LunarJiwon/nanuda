import Link from "next/link";

/** Site-wide footer — required business-operator disclosure (전자상거래법) plus the standard
 * terms/privacy links. Rendered once in the root layout, inside the scrollable `<main>` so it sits
 * below every page's own content rather than floating as a fixed bar. */
export function Footer() {
  return (
    <footer className="border-t border-[#e8e7e3] px-6 py-[32px] mt-[60px]">
      <div className="max-w-[1120px] mx-auto flex flex-col gap-[14px]">
        <div className="flex flex-wrap gap-x-[18px] gap-y-[6px] text-[12.5px] text-[#54524c]">
          <Link href="/about" className="hover:text-[#0e0e0e]">
            소개
          </Link>
          <Link href="/terms" className="hover:text-[#0e0e0e]">
            이용약관
          </Link>
          <Link href="/privacy" className="hover:text-[#0e0e0e]">
            개인정보처리방침
          </Link>
        </div>
        <div className="text-[11.5px] text-[#b0aea6] leading-[1.8]">
          나루나 · 대표 문지원 · 사업자등록번호 304-75-00502 · 통신판매업신고번호 등록 예정
          <br />
          사업장 주소 비공개 · 고객센터 support@naruna.co.kr
          <br />© {new Date().getFullYear()} Naruna. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
