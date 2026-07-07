export const metadata = {
  title: "이용약관 · 나누다",
};

// Placeholder copy only — see SETUP.md. Real legal text (drafted/reviewed by counsel) must
// replace this before real launch; this page exists so the signup form has something concrete
// to link the required terms checkbox to.
export default function TermsPage() {
  return (
    <section className="px-6 pt-16 pb-[60px] max-w-[680px] mx-auto">
      <div className="mb-[22px] border border-[#e8c9a0] bg-[#fbf3e6] rounded-[3px] px-[16px] py-[12px] text-[13px] text-[#8a6b2f]">
        이 페이지는 자리표시자(placeholder)입니다. 실제 서비스 출시 전 법률 검토를 거친 이용약관으로
        교체해야 합니다.
      </div>
      <h1 className="font-bold text-[clamp(28px,4.4vw,40px)] leading-[1.2] tracking-[-0.035em] mb-[24px]">
        이용약관
      </h1>
      <div className="text-[15.5px] leading-[1.85] text-[#2c2a26] flex flex-col gap-[16px]">
        <p className="m-0">
          나누다(&ldquo;서비스&rdquo;)를 이용해주셔서 감사합니다. 본 약관은 예시 문구이며, 실제 이용
          조건이나 회원의 권리·의무를 규정하지 않습니다.
        </p>
        <p className="m-0">1. 회원은 자신이 작성한 게시물에 대해 책임을 집니다. (예시)</p>
        <p className="m-0">2. 서비스는 사전 고지 없이 변경되거나 중단될 수 있습니다. (예시)</p>
        <p className="m-0">3. 타인의 권리를 침해하는 게시물은 삭제될 수 있습니다. (예시)</p>
        <p className="m-0 text-[#8a887f] text-[13.5px]">
          최종 업데이트: 이 문서는 실제 법률 문서가 아닙니다.
        </p>
      </div>
    </section>
  );
}
