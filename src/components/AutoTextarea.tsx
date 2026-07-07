"use client";

import { useEffect, useRef, type ChangeEvent, type FocusEvent, type KeyboardEvent } from "react";

/** A <textarea> that grows to fit its content, used for the editor's multi-line block types. */
export function AutoTextarea({
  value,
  onChange,
  placeholder,
  className,
  onFocus,
  onKeyDown,
  innerRef,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  onFocus?: (e: FocusEvent<HTMLTextAreaElement>) => void;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  innerRef?: (node: HTMLTextAreaElement | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return (
    <textarea
      ref={(node) => {
        ref.current = node;
        innerRef?.(node);
      }}
      rows={1}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className={`resize-none overflow-hidden ${className ?? ""}`}
    />
  );
}
