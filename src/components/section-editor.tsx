"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";

function markdownishToHtml(content: string) {
  const lines = content.split("\n");
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    if (line.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${escapeHtml(line.slice(2))}</li>`);
      continue;
    }

    if (inList) {
      html.push("</ul>");
      inList = false;
    }

    html.push(line.trim() ? `<p>${escapeHtml(line)}</p>` : "<p></p>");
  }

  if (inList) {
    html.push("</ul>");
  }

  return html.join("");
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function SectionEditor({
  content,
  locked,
  onChange
}: {
  content: string;
  locked?: boolean;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !locked,
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Proposal content"
      }),
      Link.configure({
        openOnClick: false
      })
    ],
    content: markdownishToHtml(content),
    editorProps: {
      attributes: {
        class: "tiptap rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-900 shadow-panel focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-100"
      }
    },
    onUpdate({ editor: currentEditor }) {
      onChange(currentEditor.getText({ blockSeparator: "\n" }));
    }
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const next = markdownishToHtml(content);
    if (editor.getHTML() !== next) {
      editor.commands.setContent(next);
    }
    editor.setEditable(!locked);
  }, [content, editor, locked]);

  return <EditorContent editor={editor} />;
}
