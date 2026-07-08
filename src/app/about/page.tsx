import { RotatingWord } from "@/components/RotatingWord";

export const metadata = {
  title: "소개 · 나누다",
};

export default function AboutPage() {
  return (
    <section className="px-6 pt-16 pb-[80px] max-w-[680px] mx-auto">
      <h1 className="font-bold text-[clamp(28px,4.4vw,46px)] leading-[1.2] tracking-[-0.035em] mb-[54px]">
        우리의 <RotatingWord /> 나누는 공간
      </h1>

      <p className="font-bold text-[clamp(23px,3.4vw,31px)] leading-[1.5] tracking-[-0.02em] text-[#0e0e0e] mb-[24px]">
        2026년을 살아가고 있는 여러분은
        <br />
        얼마나 많은 콘텐츠를 소비했나요?
      </p>

      <div className="text-[16px] leading-[1.9] text-[#54524c] flex flex-col gap-[16px] mb-[50px]">
        <p className="m-0">
          수많은 콘텐츠들 속 우리는 짧은 시간에 강렬하고 자극적인 콘텐츠를 소비하고자 합니다. 최근에는 책을 읽는
          사람을 많이 보기 어려워졌습니다. 책은 저자의 생각을 깊이있게 들여다볼 수 있는 연결 통로라고 생각합니다.
        </p>
        <p className="m-0">
          다양한 많은 책을 통해서 여러 사람들의 생각을 들여다볼 때 우리는 어쩌면 약간의 경외심이 들 때도 있을것
          같습니다. 나와 남을 비교하고 나의 부족한 점을 만들어낼 때도 있습니다.
        </p>
      </div>

      <div className="border-t border-[#e8e7e3] pt-[40px] mb-[50px]">
        <p className="text-[19px] leading-[1.75] text-[#2c2a26] tracking-[-0.01em] m-0">
          현대 사회를 살아가고 있는 우리들은 왜, 남에게 보여지는 것을 그렇게도 중요하게 생각할까요?
          <br />
          <br />
          여러분 모두가 각자의 개성을 가지고 살아가는 존재입니다.
          <br />
          타인과 비교할 대상이 여러분이 아닌, 여러분은 자신만의 길을 개척해 나가야 합니다.
        </p>
      </div>

      <p className="text-[16px] leading-[1.9] text-[#54524c] m-0 mb-[50px]">
        우리는 현재를 살아오기까지 지난 과거에 수많은 선택을 일궈냈습니다. 그러한 선택들은 모두 여러분의 의지가
        선택한 것이 아닌 무의식이 선택한 선택들입니다. 때로는 그 선택을 후회하거나, 기뻐할 때도 있습니다.
      </p>

      <div className="bg-[#faf9f7] border border-[#e8e7e3] rounded-[4px] px-[28px] py-[34px] mb-[50px]">
        <p className="text-[18px] leading-[1.85] text-[#0e0e0e] font-medium tracking-[-0.01em] m-0">
          &lsquo;나누다&rsquo;는 단순히 여러분의 일상을 공유하는 플랫폼이라고 정의하기보다, 여러분이 현재 성장하고
          있는 그 모습 그대로를 담아내 먼 미래에 성장한 자신의 모습을 되돌아볼 수 있도록 기록을 남겨주는
          플랫폼입니다.
        </p>
      </div>

      <p className="text-[16px] leading-[1.9] text-[#54524c] m-0 mb-[64px]">
        비록 AI 시대 속에서 빠른 속도와 해결을 원하는 사람들도 많을 겁니다. 그 사람들 속에서 꾸준히 앞으로 나아가는
        모습을 기록하고 되돌아볼 때, 더 성장해 있는 모습을 볼 수 있을 겁니다.
      </p>

      <div className="border-t border-[#e8e7e3] pt-[40px] text-center">
        <p className="text-[14.5px] text-[#8a887f] mb-[16px] m-0">
          꾸준하고 묵묵히 걸어간다면 우리가 원하는 목표에 한 발자국씩 더 나아갈 수 있을겁니다.
        </p>
        <p className="font-bold text-[clamp(23px,3.4vw,30px)] leading-[1.45] tracking-[-0.02em] text-[#0e0e0e] m-0">
          나누다는 여러분의 가능성을 기록하고
          <br />
          원동력을 만들어줍니다.
        </p>
      </div>
    </section>
  );
}
