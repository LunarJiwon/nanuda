// The editor's block model + serialization to Markdown for storage.
//
// Matches the design's `menuItems` exactly (BlogApp.dc.html): text, h2, list, quote, code,
// circuit, image, math, divider. Blocks are edited as discrete units in the UI, then
// flattened to a single Markdown string on publish (decision #7 in the project brief):
//   text -> paragraph, h2 -> "## ", list -> "- ", quote -> "> ", code -> fenced block,
//   math -> "$$...$$" block, image/circuit -> "![alt](url)", divider -> "---"

export type BlockType =
  | "text"
  | "h2"
  | "list"
  | "quote"
  | "code"
  | "circuit"
  | "image"
  | "math"
  | "divider";

export interface EditorBlock {
  id: number;
  type: BlockType;
  /** Text content for text-like blocks; alt text for image/circuit blocks. */
  content: string;
  /** Populated after upload to Firebase Storage, for image/circuit blocks only. */
  imageUrl?: string;
  /** "code" blocks only — a highlight.js language name (see CODE_LANGUAGES below). */
  language?: string;
  /** "code" blocks only — which color theme the published block renders in. */
  codeTheme?: "light" | "dark";
}

/** Languages offered in the code block's language picker — highlight.js names/aliases, limited to
 * the common subset rehype-highlight registers by default (see PostBody.tsx). */
export const CODE_LANGUAGES: { value: string; label: string }[] = [
  { value: "plaintext", label: "일반 텍스트" },
  { value: "javascript", label: "JavaScript / JSX" },
  { value: "typescript", label: "TypeScript" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "php", label: "PHP" },
  { value: "ruby", label: "Ruby" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash / Shell" },
  { value: "yaml", label: "YAML" },
  { value: "json", label: "JSON" },
  { value: "xml", label: "HTML / XML" },
  { value: "css", label: "CSS" },
  { value: "markdown", label: "Markdown" },
];

export const BLOCK_MENU_ITEMS: { type: BlockType; icon: string; label: string; desc: string }[] = [
  { type: "text", icon: "¶", label: "텍스트", desc: "일반 문단" },
  { type: "h2", icon: "H", label: "제목", desc: "섹션 제목" },
  { type: "list", icon: "•", label: "목록", desc: "불릿 리스트" },
  { type: "quote", icon: "❝", label: "인용", desc: "인용문" },
  { type: "code", icon: "</>", label: "코드", desc: "문법 하이라이팅" },
  { type: "circuit", icon: "⚙", label: "회로도", desc: "다이어그램 업로드" },
  { type: "image", icon: "▦", label: "이미지", desc: "사진 · 그림" },
  { type: "math", icon: "∑", label: "수식", desc: "LaTeX 수식" },
  { type: "divider", icon: "—", label: "구분선", desc: "" },
];

export const BLOCK_DEFAULT_CONTENT: Record<BlockType, string> = {
  text: "",
  h2: "제목",
  list: "",
  quote: "인용문",
  code: "// 코드",
  circuit: "",
  image: "",
  math: "e = mc^2",
  divider: "",
};

function blockToMarkdown(b: EditorBlock): string {
  const content = b.content.trim();
  switch (b.type) {
    case "text":
      return content;
    case "h2":
      return content ? `## ${content}` : "";
    case "list":
      return content ? `- ${content}` : "";
    case "quote":
      return content ? `> ${content}` : "";
    case "code": {
      const lang = b.language || "plaintext";
      const theme = b.codeTheme === "light" ? "light" : "dark";
      // `theme=...` rides in the fence's meta string (the part of the info string after the
      // language) — standard CommonMark fences already separate `lang`/`meta`, and
      // mdast-util-to-hast copies `meta` onto the resulting <code> node's `data.meta` (see
      // PostBody.tsx), so no custom encoding or HTML-comment side-channel is needed.
      return `\`\`\`${lang} theme=${theme}\n${b.content}\n\`\`\``;
    }
    case "math":
      return content ? `$$\n${content}\n$$` : "";
    case "image":
    case "circuit":
      return b.imageUrl ? `![${content}](${b.imageUrl})` : "";
    case "divider":
      return "---";
    default:
      return "";
  }
}

/** Flattens blocks into a single Markdown document, keeping adjacent list items in one list. */
export function blocksToMarkdown(blocks: EditorBlock[]): string {
  const parts: string[] = [];
  let prevWasList = false;
  for (const b of blocks) {
    const md = blockToMarkdown(b);
    if (!md) {
      prevWasList = false;
      continue;
    }
    if (b.type === "list" && prevWasList && parts.length > 0) {
      parts[parts.length - 1] += "\n" + md;
    } else {
      parts.push(md);
    }
    prevWasList = b.type === "list";
  }
  return parts.join("\n\n");
}
