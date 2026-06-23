"use client";

import { useRef, useState } from "react";

/**
 * Minimal rich-text editor: a contentEditable surface with a small toolbar.
 * Keeps the serialized HTML in a hidden input so it posts with a server action.
 * Deliberately dependency-free for the MVP; can be swapped for TipTap later
 * without touching the Note schema (body is just HTML).
 */
export function RichTextEditor({
  name,
  placeholder,
}: {
  name: string;
  placeholder?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState("");

  const exec = (cmd: string) => {
    document.execCommand(cmd, false);
    sync();
    ref.current?.focus();
  };
  const sync = () => setHtml(ref.current?.innerHTML ?? "");

  return (
    <div className="rte">
      <div className="rte-toolbar">
        <button type="button" onClick={() => exec("bold")} title="Bold">
          <b>B</b>
        </button>
        <button type="button" onClick={() => exec("italic")} title="Italic">
          <i>I</i>
        </button>
        <button type="button" onClick={() => exec("insertUnorderedList")} title="Bullet list">
          •
        </button>
        <button type="button" onClick={() => exec("insertOrderedList")} title="Numbered list">
          1.
        </button>
      </div>
      <div
        ref={ref}
        className="rte-surface"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={sync}
      />
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
