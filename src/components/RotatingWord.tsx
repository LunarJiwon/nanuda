// Ports the design's `titlecycle` H1 animation: a vertically-cycling word inside
// "우리의 [word] 나누는 공간". The animation itself is defined in globals.css
// (`--animate-titlecycle`, `@keyframes titlecycle`).
const WORDS = ["일상을", "기록을", "오늘을", "명언을", "기술을", "지식을", "예술을", "일상을"];

export function RotatingWord() {
  return (
    <span className="inline-flex relative h-[1.2em] overflow-hidden align-bottom">
      <span className="flex flex-col animate-titlecycle">
        {WORDS.map((word, i) => (
          <span key={i} className="h-[1.2em] flex items-center">
            {word}
          </span>
        ))}
      </span>
    </span>
  );
}
