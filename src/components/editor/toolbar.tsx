"use client";

import type { Editor } from "@tiptap/react";
import {
  faBold,
  faHeading,
  faImage,
  faItalic,
  faLink,
  faList,
  faListOl,
} from "@fortawesome/free-solid-svg-icons";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { isBlockedHref } from "@/lib/rich-text";
import { isImageFile, uploadEditorFile } from "./upload";

export function EditorToolbar({
  editor,
  onError,
}: {
  editor: Editor;
  onError: (message: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [uploading, setUploading] = useState(false);

  function toggleLinkForm() {
    if (editor.isActive("link")) {
      editor.chain().focus().unsetLink().run();
      setLinkOpen(false);
      return;
    }
    const current = editor.getAttributes("link").href;
    setHref(typeof current === "string" ? current : "");
    setLinkOpen((open) => !open);
  }

  function applyLink(event: FormEvent) {
    event.preventDefault();
    const next = href.trim();
    if (!next || isBlockedHref(next)) {
      onError("That link is not allowed");
      return;
    }
    onError(null);
    const chain = editor.chain().focus();
    if (editor.state.selection.empty) {
      chain.insertContent(next).extendMarkRange("link").setLink({ href: next }).run();
    } else {
      chain.extendMarkRange("link").setLink({ href: next }).run();
    }
    setLinkOpen(false);
  }

  async function insertImages(files: FileList | File[]) {
    const images = [...files].filter(isImageFile);
    if (images.length === 0) return;
    setUploading(true);
    onError(null);
    try {
      for (const file of images) {
        const src = await uploadEditorFile(file);
        editor.chain().focus().setImage({ src }).run();
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2 border-b border-border px-2 py-2">
      <div className="flex flex-wrap items-center gap-1">
        <ToolbarButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FontAwesomeIcon icon={faBold} />
        </ToolbarButton>
        <ToolbarButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FontAwesomeIcon icon={faItalic} />
        </ToolbarButton>
        <ToolbarButton
          label="Heading 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <FontAwesomeIcon icon={faHeading} />
          <span className="text-[10px] font-semibold">2</span>
        </ToolbarButton>
        <ToolbarButton
          label="Heading 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <FontAwesomeIcon icon={faHeading} />
          <span className="text-[10px] font-semibold">3</span>
        </ToolbarButton>
        <ToolbarButton
          label="Bullet list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <FontAwesomeIcon icon={faList} />
        </ToolbarButton>
        <ToolbarButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <FontAwesomeIcon icon={faListOl} />
        </ToolbarButton>
        <ToolbarButton
          label="Link"
          active={editor.isActive("link") || linkOpen}
          onClick={toggleLinkForm}
        >
          <FontAwesomeIcon icon={faLink} />
        </ToolbarButton>
        <ToolbarButton
          label="Image"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          <FontAwesomeIcon icon={faImage} />
        </ToolbarButton>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void insertImages(event.target.files);
          }}
        />
      </div>
      {linkOpen && (
        <form onSubmit={applyLink} className="flex gap-2">
          <Input
            value={href}
            onChange={(event) => setHref(event.target.value)}
            placeholder="https://…"
            aria-label="Link URL"
          />
          <Button type="submit">Add</Button>
        </form>
      )}
    </div>
  );
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex size-8 items-center justify-center gap-0.5 rounded-md text-sm ${
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      } disabled:opacity-50`}
    >
      {children}
    </button>
  );
}
