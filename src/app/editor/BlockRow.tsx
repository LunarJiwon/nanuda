"use client";

import type { DragEvent, FocusEvent, KeyboardEvent } from "react";
import { AutoTextarea } from "@/components/AutoTextarea";
import { BlockMenu } from "@/components/BlockMenu";
import { Spinner } from "@/components/Spinner";
import { CODE_LANGUAGES, type BlockType, type EditorBlock } from "@/lib/blocks";

type FieldRefSetter = (node: HTMLTextAreaElement | HTMLInputElement | null) => void;

export function BlockRow({
  block,
  rowRef,
  menuOpen,
  uploading,
  dragIndicator,
  onToggleMenu,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onInsert,
  onContentChange,
  onFocusField,
  onEnterNewBlock,
  onBackspaceEmpty,
  registerRef,
  onImageSelect,
  onLanguageChange,
  onCodeThemeChange,
}: {
  block: EditorBlock;
  /** Attached to the row's root element so the editor can measure it for the drag-reorder FLIP
   * animation (see captureRectsForFlip/useLayoutEffect in page.tsx). */
  rowRef: (node: HTMLDivElement | null) => void;
  menuOpen: boolean;
  uploading: boolean;
  /** Which half of this row the dragged block is currently hovering over, if any — drives both
   * the before/after indicator line and (in page.tsx) the actual drop position. */
  dragIndicator: "before" | "after" | null;
  onToggleMenu: () => void;
  onRemove: () => void;
  onDragStart: (e: DragEvent<HTMLElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragEnd: () => void;
  onInsert: (type: BlockType) => void;
  onContentChange: (content: string) => void;
  onFocusField: (e: FocusEvent<HTMLTextAreaElement | HTMLInputElement>) => void;
  /** Plain Enter in the content field below fires this (new same-type block + focus it); Shift+
   * Enter is left to fall through to the field's own default (a real line break). Not wired up for
   * the "code" block — see the comment on handleBlockEnterNewBlock in page.tsx. */
  onEnterNewBlock: () => void;
  /** Backspace on an already-empty field deletes this block and moves focus to the end of the
   * previous one, matching the Notion-style convention (no-op on the very first block — see
   * handleBackspaceEmpty in page.tsx). */
  onBackspaceEmpty: () => void;
  registerRef: FieldRefSetter;
  onImageSelect: (file: File) => void;
  /** "code" blocks only. */
  onLanguageChange: (language: string) => void;
  onCodeThemeChange: (theme: "light" | "dark") => void;
}) {
  // Plain Enter -> new block; Shift+Enter falls through to the field's own default (a real line
  // break in the multi-line block types; a no-op in the single-line ones, same as any plain input).
  // Backspace on an already-empty field deletes the block instead of doing nothing.
  function handleFieldKeyDown(e: KeyboardEvent<HTMLTextAreaElement | HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (block.content.trim() !== "") return;
      e.preventDefault();
      onBackspaceEmpty();
      return;
    }
    if (e.key !== "Enter" || e.shiftKey) return;
    e.preventDefault();
    onEnterNewBlock();
  }

  const field = (() => {
    switch (block.type) {
      case "text":
        return (
          <AutoTextarea
            innerRef={registerRef}
            value={block.content}
            onChange={(e) => onContentChange(e.target.value)}
            onFocus={onFocusField}
            onKeyDown={handleFieldKeyDown}
            placeholder="이야기를 들려주세요."
            className="w-full text-[17px] leading-[1.75] text-[#22201c] py-[2px] bg-transparent outline-none placeholder:text-[#c2c0b8]"
          />
        );
      case "h2":
        return (
          <input
            ref={registerRef}
            value={block.content}
            onChange={(e) => onContentChange(e.target.value)}
            onFocus={onFocusField}
            onKeyDown={handleFieldKeyDown}
            placeholder="제목"
            className="w-full font-bold text-[24px] leading-[1.3] tracking-[-0.02em] text-[#0e0e0e] py-[6px] bg-transparent outline-none placeholder:text-[#c2c0b8]"
          />
        );
      case "list":
        return (
          <div className="flex gap-[10px] items-baseline">
            <span className="text-[#0e0e0e] text-[16px] leading-[1.75] flex-none">•</span>
            <input
              ref={registerRef}
              value={block.content}
              onChange={(e) => onContentChange(e.target.value)}
              onFocus={onFocusField}
              onKeyDown={handleFieldKeyDown}
              placeholder="목록 항목"
              className="flex-1 text-[17px] leading-[1.75] text-[#22201c] bg-transparent outline-none placeholder:text-[#c2c0b8]"
            />
          </div>
        );
      case "quote":
        return (
          <div className="border-l-[3px] border-[#0e0e0e] pl-[16px] py-[4px]">
            <AutoTextarea
              innerRef={registerRef}
              value={block.content}
              onChange={(e) => onContentChange(e.target.value)}
              onFocus={onFocusField}
              onKeyDown={handleFieldKeyDown}
              placeholder="인용문"
              className="w-full text-[18px] text-[#3a382f] bg-transparent outline-none placeholder:text-[#c2c0b8]"
            />
          </div>
        );
      case "code": {
        const isLight = block.codeTheme === "light";
        return (
          <div
            className={`rounded-[4px] px-[16px] py-[12px] my-[6px] ${
              isLight ? "bg-[#f7f6f3] border border-[#e5e3de]" : "bg-[#141414]"
            }`}
          >
            <div className="flex items-center justify-between gap-[10px] mb-[10px]">
              <select
                value={block.language || "plaintext"}
                onChange={(e) => onLanguageChange(e.target.value)}
                className={`font-mono text-[10px] tracking-[0.04em] rounded-[3px] border px-[6px] py-[3px] outline-none cursor-pointer ${
                  isLight
                    ? "bg-white text-[#54524c] border-[#e0ded8]"
                    : "bg-[#1e1e1e] text-[#a9a79e] border-[#333]"
                }`}
              >
                {CODE_LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
              <div
                className={`flex items-center rounded-[3px] border p-[1px] ${
                  isLight ? "border-[#e0ded8]" : "border-[#333]"
                }`}
              >
                {(["dark", "light"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onCodeThemeChange(t)}
                    title={t === "dark" ? "다크 테마" : "라이트 테마"}
                    className={`font-mono text-[10px] px-[7px] py-[2px] rounded-[2px] cursor-pointer ${
                      (block.codeTheme || "dark") === t
                        ? "bg-[#0e0e0e] text-white"
                        : isLight
                          ? "text-[#a9a79e]"
                          : "text-[#6f6f6f]"
                    }`}
                  >
                    {t === "dark" ? "다크" : "라이트"}
                  </button>
                ))}
              </div>
            </div>
            {/* Enter is left alone here on purpose — writing code needs it to insert a newline on
                every line, not split into a new block. Backspace-when-empty still applies, so a
                stray empty code block can be dismissed the same way as any other. */}
            <AutoTextarea
              innerRef={registerRef}
              value={block.content}
              onChange={(e) => onContentChange(e.target.value)}
              onFocus={onFocusField}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && block.content.trim() === "") {
                  e.preventDefault();
                  onBackspaceEmpty();
                }
              }}
              placeholder="// 코드를 입력하세요"
              className={`w-full font-mono text-[12.5px] leading-[1.7] bg-transparent outline-none ${
                isLight
                  ? "text-[#24221d] placeholder:text-[#a9a79e]"
                  : "text-[#e6e6e6] placeholder:text-[#5a5a5a]"
              }`}
            />
          </div>
        );
      }
      case "math":
        return (
          <div className="bg-[#faf9f7] border border-[#e8e7e3] rounded-[3px] p-[16px] text-center my-[6px]">
            <input
              ref={registerRef}
              value={block.content}
              onChange={(e) => onContentChange(e.target.value)}
              onFocus={onFocusField}
              onKeyDown={handleFieldKeyDown}
              placeholder="LaTeX 수식"
              className="w-full text-center text-[20px] text-[#141414] bg-transparent outline-none placeholder:text-[#c2c0b8]"
            />
          </div>
        );
      case "image":
      case "circuit": {
        const isCircuit = block.type === "circuit";
        if (block.imageUrl) {
          return (
            <div className="relative my-[6px]">
              {/* User-uploaded content with unpredictable dimensions — plain <img> avoids next/image's required width/height. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={block.imageUrl}
                alt={block.content}
                className={`w-full rounded-[3px] border border-[#e5e3de] ${uploading ? "opacity-40" : ""}`}
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center gap-[8px] bg-white/50 rounded-[3px] text-[11.5px] text-[#0e0e0e]">
                  <Spinner />
                  교체하는 중…
                </div>
              )}
              <label
                className={`absolute top-[8px] right-[8px] bg-white/90 border border-[#e0ded8] rounded-[3px] text-[11px] px-[8px] py-[4px] ${
                  uploading ? "opacity-50 pointer-events-none" : "cursor-pointer"
                }`}
              >
                교체
                <input
                  type="file"
                  accept="image/*"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onImageSelect(file);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
          );
        }
        return isCircuit ? (
          <label
            className={`w-full aspect-[16/9] border border-dashed border-[#cfcdc6] rounded-[3px] flex items-center justify-center gap-[8px] text-[11.5px] text-[#a9a79e] my-[6px] ${
              uploading ? "cursor-wait" : "cursor-pointer"
            }`}
            style={{
              background:
                "repeating-linear-gradient(0deg,#eceae5 0 1px,transparent 1px 20px), repeating-linear-gradient(90deg,#eceae5 0 1px,transparent 1px 20px), #f7f6f3",
            }}
          >
            {uploading ? (
              <>
                <Spinner />
                업로드 중…
              </>
            ) : (
              "＋ 회로도 / 다이어그램 업로드"
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageSelect(file);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          <label
            className={`w-full aspect-[3/2] border border-dashed border-[#cfcdc6] rounded-[3px] flex items-center justify-center gap-[8px] text-[11.5px] text-[#a9a79e] my-[6px] ${
              uploading ? "cursor-wait" : "cursor-pointer"
            }`}
            style={{ background: "repeating-linear-gradient(45deg,#ecebe6 0 10px,#f4f3ef 10px 20px)" }}
          >
            {uploading ? (
              <>
                <Spinner />
                업로드 중…
              </>
            ) : (
              "＋ 이미지 · 사진 드롭"
            )}
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImageSelect(file);
                e.target.value = "";
              }}
            />
          </label>
        );
      }
      case "divider":
        return <hr className="border-t border-[#dedcd5] my-[12px]" />;
      default:
        return null;
    }
  })();

  return (
    <div
      ref={rowRef}
      className={`group/row relative border-t-2 border-b-2 ${
        dragIndicator === "before"
          ? "border-t-[#0e0e0e] border-b-transparent"
          : dragIndicator === "after"
            ? "border-b-[#0e0e0e] border-t-transparent"
            : "border-t-transparent border-b-transparent"
      }`}
      data-editor-menu-zone={menuOpen ? "" : undefined}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <div className="flex items-start gap-[2px]">
        <div className="relative flex flex-none w-[44px] justify-end pt-[4px]">
          <button
            type="button"
            onClick={onToggleMenu}
            title="블록 추가"
            className="w-[21px] h-[24px] border-none bg-none text-[#c2c0b8] text-[15px] leading-none rounded-[4px] hover:bg-[#f2f0ec] hover:text-[#0e0e0e] cursor-pointer"
          >
            ＋
          </button>
          {/* Drag handle — grab and drop onto another block to reorder (see moveBlock/reorderBlock
              in page.tsx). Deleting used to live on this same "⋮⋮" icon, which reads as a drag
              handle in every other editor convention (Notion, etc.), so grabbing it to reorder was
              silently deleting the block instead — moved delete to a separate hover-revealed
              button on the row's right edge instead of stacking more always-visible icons here. */}
          <span
            draggable
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            title="드래그해서 순서 변경"
            className="w-[21px] h-[24px] flex items-center justify-center text-[#c2c0b8] text-[12px] leading-none rounded-[4px] hover:bg-[#f2f0ec] hover:text-[#0e0e0e] cursor-grab active:cursor-grabbing"
          >
            ⋮⋮
          </span>
          {/* Anchored to the icon column (not the row) so it always pops out beside the + button,
              regardless of how tall this block's own content is — a multi-line quote/code block
              used to push this below its own bottom edge instead of staying next to the button. */}
          {menuOpen && (
            <div className="absolute left-full top-0 ml-[6px] z-20">
              <BlockMenu onSelect={onInsert} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">{field}</div>
        <button
          type="button"
          onClick={onRemove}
          title="삭제"
          className="flex-none mt-[4px] w-[20px] h-[20px] border-none bg-none text-[#c2c0b8] text-[11px] leading-none rounded-[4px] opacity-0 group-hover/row:opacity-100 hover:bg-[#f7ecea] hover:text-[#b64a3f] focus-visible:opacity-100 transition-opacity cursor-pointer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
