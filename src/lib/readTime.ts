/**
 * Rough reading-time estimate matching the prototype's `read: '4분'` style fields.
 * Korean text doesn't split into "words" the way English does, so this estimates from
 * non-whitespace character count instead (roughly 500 characters/minute of reading).
 */
export function computeReadTime(markdown: string): string {
  const chars = markdown.replace(/\s/g, "").length;
  const minutes = Math.max(1, Math.round(chars / 500));
  return `${minutes}분`;
}
