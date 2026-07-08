import type { ComponentPropsWithoutRef } from "react";
import type { Element } from "hast";
import ReactMarkdown, { type ExtraProps } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import rehypeHighlight from "rehype-highlight";

/**
 * The block editor (src/lib/blocks.ts) writes the code block's theme into the fence's own meta
 * string (```js theme=dark), which mdast-util-to-hast copies onto the resulting `<code>` node's
 * `data.meta` — no custom side-channel encoding needed, just read it back off the node.
 */
function themeFromNode(node: Element | undefined): "light" | "dark" {
  const meta = node?.data?.meta;
  return typeof meta === "string" && /\btheme=light\b/.test(meta) ? "light" : "dark";
}

/**
 * Renders a post's Markdown body (see src/lib/blocks.ts for how the block editor produces it).
 * Visual rules for headings/paragraphs/code/quotes/math live in `.nanuda-prose` in globals.css
 * so they match the design's info-screen dark code blocks and math styling exactly. Code blocks
 * are additionally tokenized by rehype-highlight and colored per-block via the light/dark theme
 * the author picked in the editor (`.hljs-theme-light`/`.hljs-theme-dark` in globals.css, applied
 * to the `<pre>` via CSS `:has()` since the theme is only known on the nested `<code>` node).
 */
export function PostBody({ content }: { content: string }) {
  return (
    <div className="nanuda-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks, remarkMath]}
        rehypePlugins={[rehypeKatex, rehypeHighlight]}
        components={{
          code({ node, className, ...rest }: ComponentPropsWithoutRef<"code"> & ExtraProps) {
            // Inline code (`` `like this` ``) has no `language-*` class — leave it untouched.
            if (!/\blanguage-/.test(className ?? "")) {
              return <code className={className} {...rest} />;
            }
            const theme = themeFromNode(node);
            return (
              <code
                {...rest}
                className={`${className ?? ""} ${theme === "light" ? "hljs-theme-light" : "hljs-theme-dark"}`}
              />
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
