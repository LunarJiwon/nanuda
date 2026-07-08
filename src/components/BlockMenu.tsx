import { BLOCK_MENU_ITEMS, type BlockType } from "@/lib/blocks";

export function BlockMenu({ onSelect }: { onSelect: (type: BlockType) => void }) {
  return (
    <div className="animate-menuin w-[248px] border border-[#e6e4de] rounded-[7px] bg-white shadow-[0_14px_34px_-14px_rgba(0,0,0,0.25)] p-[6px]">
      <div className="text-[10px] tracking-[0.08em] uppercase text-[#b8b6ad] px-[8px] pt-[4px] pb-[6px]">
        블록 삽입
      </div>
      {BLOCK_MENU_ITEMS.map((item) => (
        <button
          key={item.type}
          type="button"
          onClick={() => onSelect(item.type)}
          className="flex items-center gap-[11px] w-full text-left px-[8px] py-[7px] rounded-[5px] hover:bg-[#f4f2ee] cursor-pointer"
        >
          <span className="w-[30px] h-[30px] flex-none border border-[#e6e4de] rounded-[5px] flex items-center justify-center font-mono text-[13px] text-[#54524c] bg-[#faf9f7]">
            {item.icon}
          </span>
          <span className="flex flex-col gap-[1px] min-w-0">
            <span className="text-[13px] leading-[1.25]">{item.label}</span>
            <span className="text-[11px] text-[#a9a79e] leading-[1.25]">{item.desc}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
