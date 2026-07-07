import { RotatingWord } from "@/components/RotatingWord";

export const metadata = {
  title: "소개 · 나누다",
};

export default function AboutPage() {
  return (
    <section className="px-6 pt-16 pb-[60px] max-w-[680px] mx-auto">
      <h1 className="font-bold text-[clamp(28px,4.4vw,46px)] leading-[1.2] tracking-[-0.035em] mb-[28px]">
        우리의 <RotatingWord /> 나누는 공간
      </h1>
      <div className="text-[17px] leading-[1.85] text-[#2c2a26] flex flex-col gap-[18px]">
        <p className="m-0">
          틀을 벗어나 우리의 일상을, 정보를, 예술을 한 공간에 나누다.
        </p>
        <p className="m-0">
          여러 사람의 이야기를 가꾸어나가는 나무로 성장하는 일상 기록 플랫폼 나누다입니다. 
          프로젝트 인원을 모집하는 나루터, 프로젝트를 운영하는 나루나.
          다양한 사람들이 한 공간에 모여 일상과 정보를 공유하고 나무처럼 가꾸어 나가는 나누다에서 여러분의 일상을 녹여내세요!
          
        </p>
      </div>
      <div className="mt-10 border-t border-[#e8e7e3] pt-6 grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
        <div>
          <div className="text-[22px] font-bold tracking-[-0.02em]">일상</div>
          <div className="text-[12.5px] text-[#8a887f] mt-[4px]">사진 · 에세이</div>
        </div>
        <div>
          <div className="text-[22px] font-bold tracking-[-0.02em]">정보</div>
          <div className="text-[12.5px] text-[#8a887f] mt-[4px]">코드 · 회로 · 수식</div>
        </div>
        <div>
          <div className="text-[22px] font-bold tracking-[-0.02em]">예술</div>
          <div className="text-[12.5px] text-[#8a887f] mt-[4px]">회화 · 사진 · 드로잉</div>
        </div>
        <div>
          <div className="text-[22px] font-bold tracking-[-0.02em]">글귀</div>
          <div className="text-[12.5px] text-[#8a887f] mt-[4px]">문장 · 카드</div>
        </div>
      </div>
    </section>
  );
}
