"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import {
  coerceDoc,
  stringifyDoc,
  type TipTapDoc,
} from "@/lib/rich-text";
import { createRichTextExtensions } from "./extensions";
import { EditorToolbar } from "./toolbar";
import { isImageFile, uploadEditorFile } from "./upload";

type RichTextEditorProps = {
  value?: string | null;
  onChange: (json: string) => void;
};

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<Editor | null>(null);
  const [error, setError] = useState<string | null>(null);
  const initial = coerceDoc(value);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: createRichTextExtensions({ openLinksOnClick: false }),
    content: initial,
    onCreate: ({ editor: instance }) => {
      editorRef.current = instance;
      onChange(stringifyDoc(instance.getJSON() as TipTapDoc));
    },
    onUpdate: ({ editor: instance }) => {
      onChange(stringifyDoc(instance.getJSON() as TipTapDoc));
    },
    editorProps: {
      attributes: {
        class: "tiptap tiptap-editable",
      },
      handlePaste(_view, event) {
        const files = event.clipboardData?.files;
        if (!files?.length) return false;
        const images = [...files].filter(isImageFile);
        if (images.length === 0) return false;
        event.preventDefault();
        void insertImages(images);
        return true;
      },
      handleDrop(_view, event) {
        const files = event.dataTransfer?.files;
        if (!files?.length) return false;
        const images = [...files].filter(isImageFile);
        if (images.length === 0) return false;
        event.preventDefault();
        void insertImages(images);
        return true;
      },
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  async function insertImages(files: File[]) {
    const instance = editorRef.current;
    if (!instance) return;
    setError(null);
    try {
      for (const file of files) {
        const src = await uploadEditorFile(file);
        instance.chain().focus().setImage({ src }).run();
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed",
      );
    }
  }

  if (!editor) {
    return (
      <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
        Loading editor…
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
      <EditorToolbar editor={editor} onError={setError} />
      <EditorContent editor={editor} />
      {error && (
        <p className="border-t border-border px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
