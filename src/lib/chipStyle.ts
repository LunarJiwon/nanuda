/** Shared active/inactive chip coloring used by the archive tag filter and the editor's
 * category picker (mirrors the design's `chipStyle(active)` helper). */
export function chipClass(active: boolean): string {
  return active ? "border-[#0e0e0e] bg-[#0e0e0e] text-white" : "border-[#e0ded8] bg-white text-[#54524c]";
}
