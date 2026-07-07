"use client";

import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { useAuth, isVerifiedUser } from "@/context/auth-context";
import { useToast } from "@/context/toast-context";
import { BlockMenu } from "@/components/BlockMenu";
import { BlockRow } from "./BlockRow";
import { BLOCK_DEFAULT_CONTENT, blocksToMarkdown, type BlockType, type EditorBlock } from "@/lib/blocks";
import { CATEGORIES, CATEGORY_LABEL, type Category } from "@/lib/types";
import { chipClass } from "@/lib/chipStyle";
import { deriveExcerpt } from "@/lib/excerpt";
import { computeReadTime } from "@/lib/readTime";
import { createPost, deleteAllPostImages, deletePostImage, uploadPostImage } from "@/lib/posts-client";

// Implementation note (documented in SETUP.md): the design's text-like blocks are
// contentEditable divs formatted via document.execCommand. We use plain <input>/<textarea>
// fields instead — visually identical — and reimplement the B/I/S/code toolbar as Markdown
// selection-wrapping (**bold**, *italic*, ~~strike~~, `code`), which is more robust than
// execCommand and keeps the stored content as plain, safe Markdown (no raw HTML). The design's
// "U" (underline) button has no Markdown equivalent, so it's shown for visual fidelity but is a
// no-op.
type FormatKind = "bold" | "italic" | "strike" | "code";

export default function EditorPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { showToast } = useToast();

  const [category, setCategory] = useState<Category>("daily");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [blocks, setBlocks] = useState<EditorBlock[]>([{ id: 1, type: "text", content: "" }]);
  const [menuFor, setMenuFor] = useState<number | "__end" | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  // Which half of the hovered row the cursor is over — determines whether the drop indicator (and
  // the actual drop) lands before or after that row, not always "before" regardless of where in
  // the row the cursor actually is.
  const [dragOver, setDragOver] = useState<{ id: number; position: "before" | "after" } | null>(null);
  const [uploadingIds, setUploadingIds] = useState<Set<number>>(new Set());
  const [publishing, setPublishing] = useState(false);

  const nextIdRef = useRef(2);
  const fieldRefs = useRef<Map<string, HTMLTextAreaElement | HTMLInputElement>>(new Map());
  const focusedFieldRef = useRef<string | null>(null);
  // Client-generated temp ID so editor images can upload to Storage before the post is saved.
  const [tempPostId] = useState(() => crypto.randomUUID());
  // Flips true only once handlePublish's Firestore write actually succeeds — read by the cleanup
  // effect below so images are only ever deleted for a post that was truly abandoned, never one
  // that just finished publishing (which navigates away right after, unmounting this page too).
  const publishedRef = useRef(false);

  // If the editor unmounts (navigating away, closing the tab isn't caught by this — see
  // deleteAllPostImages' doc comment) without ever publishing, every image already uploaded to
  // `posts/{tempPostId}/` (decision #9: images can upload before the post itself is saved) has
  // nothing left to reference it — clean them up instead of leaving them in Storage forever.
  useEffect(() => {
    return () => {
      if (!publishedRef.current) deleteAllPostImages(tempPostId).catch(() => {});
    };
  }, [tempPostId]);

  // FLIP animation for drag-reorder (see reorderBlock/captureRectsForFlip below and the
  // useLayoutEffect that plays it): rowRefs holds each block row's DOM node, keyed by block id.
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  // Positions captured right before a reorder's setBlocks call, consumed by the very next
  // useLayoutEffect run and then cleared — so ordinary content edits (which also produce a new
  // `blocks` array on every keystroke) never trigger this, only an actual reorder does.
  const pendingFlipRectsRef = useRef<Map<number, DOMRect> | null>(null);

  function registerRowRef(id: number) {
    return (node: HTMLDivElement | null) => {
      if (node) rowRefs.current.set(id, node);
      else rowRefs.current.delete(id);
    };
  }

  function captureRectsForFlip() {
    const rects = new Map<number, DOMRect>();
    rowRefs.current.forEach((node, id) => rects.set(id, node.getBoundingClientRect()));
    pendingFlipRectsRef.current = rects;
  }

  useLayoutEffect(() => {
    const prevRects = pendingFlipRectsRef.current;
    if (!prevRects) return;
    pendingFlipRectsRef.current = null;
    rowRefs.current.forEach((node, id) => {
      const prev = prevRects.get(id);
      if (!prev) return;
      const next = node.getBoundingClientRect();
      const deltaY = prev.top - next.top;
      if (Math.abs(deltaY) < 0.5) return;
      node.style.transition = "none";
      node.style.transform = `translateY(${deltaY}px)`;
      requestAnimationFrame(() => {
        node.style.transition = "transform 220ms ease";
        node.style.transform = "";
      });
    });
  }, [blocks]);

  useEffect(() => {
    // Every visitor gets a stable anonymous Firebase user for view-count dedup (see
    // auth-context.tsx), so "signed in" for gating purposes means a real, non-anonymous account.
    // Unverified real users are still let in here (so they can draft) — verification is only
    // enforced at publish time, see handlePublish below.
    if (!loading && (!user || user.isAnonymous)) router.replace("/login");
  }, [loading, user, router]);

  const canPublish = isVerifiedUser(user);

  const charCount = useMemo(() => {
    const all = title + " " + subtitle + " " + blocks.map((b) => b.content || "").join(" ");
    return all.replace(/\s/g, "").length;
  }, [title, subtitle, blocks]);

  // These return ref-callback / event-handler closures that read/write plain refs (not
  // component state), which is the standard escape hatch for imperative DOM access — safe here
  // since nothing in render ever reads fieldRefs/focusedFieldRef.
  /* eslint-disable react-hooks/refs -- these return ref-callback / event-handler closures that
     read/write plain refs outside of render (registered via the `ref`/`onFocus` props below),
     which is the standard escape hatch for imperative DOM access. */
  function registerRef(key: string) {
    return (node: HTMLTextAreaElement | HTMLInputElement | null) => {
      if (node) fieldRefs.current.set(key, node);
      else fieldRefs.current.delete(key);
    };
  }

  function handleFocusField(key: string) {
    return () => {
      focusedFieldRef.current = key;
    };
  }
  /* eslint-enable react-hooks/refs */

  function applyFieldValue(key: string, value: string) {
    if (key === "title") setTitle(value);
    else if (key === "sub") setSubtitle(value);
    else if (key.startsWith("block:")) {
      const id = Number(key.slice("block:".length));
      setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, content: value } : b)));
    }
  }

  function wrapSelection(kind: FormatKind) {
    const key = focusedFieldRef.current;
    if (!key) return;
    const el = fieldRefs.current.get(key);
    if (!el) return;
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    if (start === end) return;
    const wrapper = kind === "bold" ? "**" : kind === "italic" ? "*" : kind === "strike" ? "~~" : "`";
    const value = el.value;
    const next = value.slice(0, start) + wrapper + value.slice(start, end) + wrapper + value.slice(end);
    applyFieldValue(key, next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + wrapper.length, end + wrapper.length);
    });
  }

  function toggleMenu(anchor: number | "__end") {
    setMenuFor((cur) => (cur === anchor ? null : anchor));
  }

  // Closes the open block-insert menu on an outside click. Only one menu is ever open at a time
  // (single `menuFor` state), and whichever block/end-of-list zone currently owns it marks its own
  // wrapper with `data-editor-menu-zone` (see BlockRow.tsx and the end-of-list wrapper below) — so
  // a click anywhere else, including inside a *different*, currently-closed block, correctly
  // closes it. Clicking the toggle button that owns the open menu is itself inside that zone, so
  // this leaves closing-via-re-click to the button's own onClick (toggleMenu) as before.
  useEffect(() => {
    if (menuFor === null) return;
    function handlePointerDown(e: PointerEvent) {
      const target = e.target as Element | null;
      if (target?.closest("[data-editor-menu-zone]")) return;
      setMenuFor(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [menuFor]);

  function insertBlock(anchor: number | "__end", type: BlockType): number {
    const id = nextIdRef.current++;
    const newBlock: EditorBlock = {
      id,
      type,
      content: BLOCK_DEFAULT_CONTENT[type],
      ...(type === "code" ? { language: "plaintext", codeTheme: "dark" as const } : {}),
    };
    setBlocks((bs) => {
      if (anchor === "__end") return [...bs, newBlock];
      const idx = bs.findIndex((b) => b.id === anchor);
      if (idx === -1) return [...bs, newBlock];
      return [...bs.slice(0, idx + 1), newBlock, ...bs.slice(idx + 1)];
    });
    return id;
  }

  function insertAfter(anchor: number | "__end", type: BlockType) {
    insertBlock(anchor, type);
    setMenuFor(null);
  }

  /** Plain Enter in a block's content field (see BlockRow's handleFieldKeyDown) creates a new,
   * same-type block right after it and focuses it — Shift+Enter falls through to the field's own
   * default behavior (a real line break, for the multi-line block types). Not wired to the "code"
   * block: pressing Enter while writing code needs to insert a newline, not split into a new block
   * on every line. */
  function handleBlockEnterNewBlock(afterId: number, type: BlockType) {
    const id = insertBlock(afterId, type);
    requestAnimationFrame(() => {
      fieldRefs.current.get(`block:${id}`)?.focus();
    });
  }

  function removeBlock(id: number) {
    setBlocks((bs) => {
      if (bs.length <= 1) return bs;
      const removed = bs.find((b) => b.id === id);
      if (removed?.imageUrl) deletePostImage(removed.imageUrl).catch(() => {});
      return bs.filter((b) => b.id !== id);
    });
  }

  function handleLanguageChange(id: number, language: string) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, language } : b)));
  }

  function handleCodeThemeChange(id: number, codeTheme: "light" | "dark") {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, codeTheme } : b)));
  }

  /** Moves the dragged block to sit right before/after the drop-target block, per `position`
   * (from which half of the target row the cursor was over — see handleBlockDragOver). Native
   * HTML5 drag-and-drop (draggable + dataTransfer) rather than a library — desktop-mouse-only, but
   * this is a writing surface used from a desktop browser, and it avoids a dependency for a small
   * feature. */
  function reorderBlock(fromId: number, toId: number, position: "before" | "after") {
    if (fromId === toId) return;
    captureRectsForFlip();
    setBlocks((bs) => {
      const fromIdx = bs.findIndex((b) => b.id === fromId);
      const toIdx = bs.findIndex((b) => b.id === toId);
      if (fromIdx === -1 || toIdx === -1) return bs;
      const next = [...bs];
      const [moved] = next.splice(fromIdx, 1);
      // Removing `fromIdx` shifts every later index down by one, so if the target was *after* the
      // dragged block, its own index in `next` (post-removal) is `toIdx - 1`, not `toIdx`.
      let insertAt = fromIdx < toIdx ? toIdx - 1 : toIdx;
      if (position === "after") insertAt += 1;
      next.splice(insertAt, 0, moved);
      return next;
    });
  }

  function handleBlockDragStart(id: number) {
    return (e: DragEvent<HTMLElement>) => {
      setDraggingId(id);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(id));
    };
  }

  function handleBlockDragOver(id: number) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (draggingId === null || draggingId === id) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const position = e.clientY - rect.top > rect.height / 2 ? "after" : "before";
      setDragOver((cur) => (cur?.id === id && cur.position === position ? cur : { id, position }));
    };
  }

  function handleBlockDrop(id: number) {
    return (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const fromId = Number(e.dataTransfer.getData("text/plain"));
      const position = dragOver?.id === id ? dragOver.position : "before";
      if (fromId) reorderBlock(fromId, id, position);
      setDraggingId(null);
      setDragOver(null);
    };
  }

  function handleBlockDragEnd() {
    setDraggingId(null);
    setDragOver(null);
  }

  /** Adds every non-empty, whitespace-split fragment as a tag (deduped, `#` stripped). */
  function commitTagFragments(raw: string) {
    const fragments = raw
      .split(/\s+/)
      .map((f) => f.trim().replace(/^#/, ""))
      .filter(Boolean);
    if (!fragments.length) return;
    setTags((t) => {
      const merged = [...t];
      for (const f of fragments) if (!merged.includes(f)) merged.push(f);
      return merged;
    });
  }

  /** Typing a space commits whatever word just finished as a tag immediately, matching common
   * tag-input UX — no need to press Enter after every word. Enter still commits a final word that
   * wasn't followed by a space (see handleTagKeyDown). */
  function handleTagInputChange(e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (!/\s/.test(value)) {
      setTagInput(value);
      return;
    }
    const endsWithSpace = /\s$/.test(value);
    const parts = value.split(/\s+/).filter(Boolean);
    if (endsWithSpace) {
      commitTagFragments(parts.join(" "));
      setTagInput("");
    } else {
      const pending = parts.pop() ?? "";
      commitTagFragments(parts.join(" "));
      setTagInput(pending);
    }
  }

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    commitTagFragments(tagInput);
    setTagInput("");
  }

  function removeTag(tag: string) {
    setTags((t) => t.filter((x) => x !== tag));
  }

  async function handleImageSelect(blockId: number, file: File) {
    const prevUrl = blocks.find((b) => b.id === blockId)?.imageUrl;
    setUploadingIds((s) => new Set(s).add(blockId));
    try {
      const url = await uploadPostImage(tempPostId, file);
      setBlocks((bs) =>
        bs.map((b) => (b.id === blockId ? { ...b, imageUrl: url, content: b.content || file.name } : b))
      );
      // Replacing an already-uploaded image ("교체") leaves the old file with nothing pointing to
      // it anymore — delete it now rather than waiting for the abandon-cleanup effect, which only
      // ever runs if the whole editor is abandoned, not on every in-place replace.
      if (prevUrl) deletePostImage(prevUrl).catch(() => {});
    } catch (err) {
      console.error("[editor] image upload failed", err);
      showToast("이미지 업로드에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setUploadingIds((s) => {
        const next = new Set(s);
        next.delete(blockId);
        return next;
      });
    }
  }

  async function handlePublish() {
    if (!user || user.isAnonymous) {
      router.push("/login");
      return;
    }
    // Checked client-side first (firestore.rules' `isVerifiedUser()` on `posts` create would
    // reject the write anyway) so an unverified real user gets a clear message instead of a
    // silent rules rejection.
    if (!canPublish) {
      showToast("발행하려면 이메일 인증이 필요합니다. 상단 배너에서 인증 메일을 재전송해주세요.", "error");
      return;
    }
    if (!title.trim()) {
      showToast("제목을 입력해주세요.", "error");
      return;
    }
    setPublishing(true);
    try {
      const content = blocksToMarkdown(blocks);
      const excerpt = deriveExcerpt(content || subtitle || title);
      const readTime = computeReadTime(content);
      const coverImageURL =
        blocks.find((b) => b.type === "image" && b.imageUrl)?.imageUrl ??
        blocks.find((b) => b.type === "circuit" && b.imageUrl)?.imageUrl ??
        null;

      const id = await createPost({
        title: title.trim(),
        subtitle: subtitle.trim(),
        content,
        excerpt,
        category,
        tags,
        authorId: user.uid,
        authorName: user.displayName || user.email || "익명",
        coverImageURL,
        readTime,
        ...(category === "art" ? { ratio: "1/1" } : {}),
      });
      publishedRef.current = true;
      showToast("발행되었습니다.");
      router.push(`/post/${id}`);
    } catch (err) {
      console.error("[editor] publish failed", err);
      showToast("발행에 실패했습니다. 잠시 후 다시 시도해주세요.", "error");
    } finally {
      setPublishing(false);
    }
  }

  if (loading || !user || user.isAnonymous) {
    return <div className="px-6 py-16 text-center text-[#9a988f] text-[13px]">불러오는 중…</div>;
  }

  return (
    <>
      <div className="sticky top-0 z-[16] bg-white/95 backdrop-blur-[10px] border-b border-[#eeece8]">
        <div className="max-w-[760px] mx-auto px-5 py-[9px] flex items-center gap-[10px] flex-wrap">
          <div className="flex gap-[5px] items-center mr-auto">
            <span className="text-[12px] text-[#8a887f] mr-[1px]">발행</span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`text-[12px] px-[11px] py-[4px] rounded-[2px] cursor-pointer border ${chipClass(
                  category === cat
                )}`}
              >
                {CATEGORY_LABEL[cat]}
              </button>
            ))}
          </div>
          <div className="flex items-center border border-[#e6e4de] rounded-[5px] p-[2px] bg-white">
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                wrapSelection("bold");
              }}
              title="굵게"
              className="w-[29px] h-[27px] border-none bg-none font-bold text-[14px] text-[#0e0e0e] rounded-[3px] hover:bg-[#f2f0ec] cursor-pointer"
            >
              B
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                wrapSelection("italic");
              }}
              title="기울임"
              className="w-[29px] h-[27px] border-none bg-none italic text-[15px] text-[#0e0e0e] rounded-[3px] hover:bg-[#f2f0ec] cursor-pointer"
            >
              I
            </button>
            <button
              type="button"
              title="밑줄 (마크다운에서는 지원되지 않습니다)"
              disabled
              className="w-[29px] h-[27px] border-none bg-none underline text-[14px] text-[#0e0e0e] rounded-[3px] opacity-40 cursor-not-allowed"
            >
              U
            </button>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                wrapSelection("strike");
              }}
              title="취소선"
              className="w-[29px] h-[27px] border-none bg-none line-through text-[14px] text-[#0e0e0e] rounded-[3px] hover:bg-[#f2f0ec] cursor-pointer"
            >
              S
            </button>
            <span className="w-px h-[15px] bg-[#e6e4de] mx-[3px]" />
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                wrapSelection("code");
              }}
              title="인라인 코드"
              className="w-[34px] h-[27px] border-none bg-none font-mono text-[12px] text-[#0e0e0e] rounded-[3px] hover:bg-[#f2f0ec] cursor-pointer"
            >
              &lt;/&gt;
            </button>
          </div>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishing}
            className="border border-[#0e0e0e] bg-[#0e0e0e] text-white text-[12.5px] font-semibold px-[15px] py-[6px] rounded-[2px] disabled:opacity-60 cursor-pointer"
          >
            {publishing ? "발행 중…" : "발행"}
          </button>
        </div>
      </div>

      <section className="px-5 pt-8 pb-24 max-w-[760px] mx-auto">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={handleFocusField("title")}
          ref={registerRef("title")}
          placeholder="제목 없음"
          className="w-full font-bold text-[38px] leading-[1.15] tracking-[-0.035em] text-[#0e0e0e] mb-[4px] bg-transparent outline-none placeholder:text-[#c2c0b8]"
        />
        <input
          value={subtitle}
          onChange={(e) => setSubtitle(e.target.value)}
          onFocus={handleFocusField("sub")}
          ref={registerRef("sub")}
          placeholder="한 줄 설명을 더해보세요"
          maxLength={80}
          className="w-full text-[15px] text-[#8a887f] mb-[16px] bg-transparent outline-none placeholder:text-[#c2c0b8]"
        />

        <div className="flex flex-wrap gap-[6px] items-center mb-[22px] border-b border-[#eeece8] pb-[20px]">
          {tags.map((t) => (
            <span
              key={t}
              className="group inline-flex items-center gap-[3px] text-[11.5px] text-[#54524c] bg-[#f2f0ec] border border-[#e5e3de] pl-[9px] pr-[4px] py-[3px] rounded-[2px]"
            >
              #{t}
              <button
                type="button"
                onClick={() => removeTag(t)}
                aria-label={`${t} 태그 삭제`}
                className="border-none bg-none cursor-pointer text-[#a9a79e] text-[11px] leading-none px-[2px] opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
              >
                ✕
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={handleTagInputChange}
            onKeyDown={handleTagKeyDown}
            placeholder="＋ 태그 (스페이스로 구분)"
            className="border-none bg-none text-[11.5px] text-[#54524c] px-[6px] py-[3px] w-[130px] outline-none"
          />
        </div>

        <div className="flex flex-col">
          {blocks.map((block) => (
            <BlockRow
              key={block.id}
              block={block}
              rowRef={registerRowRef(block.id)}
              menuOpen={menuFor === block.id}
              uploading={uploadingIds.has(block.id)}
              dragIndicator={dragOver?.id === block.id ? dragOver.position : null}
              onToggleMenu={() => toggleMenu(block.id)}
              onRemove={() => removeBlock(block.id)}
              onDragStart={handleBlockDragStart(block.id)}
              onDragOver={handleBlockDragOver(block.id)}
              onDrop={handleBlockDrop(block.id)}
              onDragEnd={handleBlockDragEnd}
              onInsert={(type) => insertAfter(block.id, type)}
              onEnterNewBlock={() => handleBlockEnterNewBlock(block.id, block.type)}
              onContentChange={(content) =>
                setBlocks((bs) => bs.map((b) => (b.id === block.id ? { ...b, content } : b)))
              }
              onFocusField={handleFocusField(`block:${block.id}`)}
              registerRef={registerRef(`block:${block.id}`)}
              onImageSelect={(file) => handleImageSelect(block.id, file)}
              onLanguageChange={(language) => handleLanguageChange(block.id, language)}
              onCodeThemeChange={(theme) => handleCodeThemeChange(block.id, theme)}
            />
          ))}
        </div>

        <div className="relative" data-editor-menu-zone={menuFor === "__end" ? "" : undefined}>
          <div className="mt-[10px] flex items-center justify-between border-t border-[#eeece8] pt-[12px]">
            <button
              type="button"
              onClick={() => toggleMenu("__end")}
              className="border-none bg-none cursor-pointer text-[12px] text-[#a9a79e] p-0"
            >
              ＋ 블록 추가 <span className="text-[#d4d2ca]">/ 명령어</span>
            </button>
            <span className="text-[11px] text-[#c2c0b8]">
              <span className="font-mono">{charCount}</span>자 · 임시저장됨
            </span>
          </div>
          {menuFor === "__end" && (
            <div className="absolute left-0 top-full mt-[2px] z-20">
              <BlockMenu onSelect={(type) => insertAfter("__end", type)} />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
