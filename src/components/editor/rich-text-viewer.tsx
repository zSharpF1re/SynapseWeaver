"use client";

import { faLink } from "@fortawesome/free-solid-svg-icons";
import { EditorContent, useEditor } from "@tiptap/react";
import { FontAwesomeIcon } from "@/components/ui/icon";
import { collectLinks, parseDoc, type TipTapDoc } from "@/lib/rich-text";
import { createRichTextExtensions } from "./extensions";

export function RichTextViewer({ doc }: { doc: TipTapDoc }) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: createRichTextExtensions({ openLinksOnClick: true }),
    content: doc,
    editorProps: {
      attributes: {
        class: "tiptap",
      },
    },
  });

  if (!editor) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }

  return <EditorContent editor={editor} />;
}

export function ContentLinks({ doc }: { doc: TipTapDoc }) {
  const links = collectLinks(doc);
  if (links.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border pt-3">
      <p className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <FontAwesomeIcon icon={faLink} />
        Links
      </p>
      <ul className="space-y-1">
        {links.map((link) => (
          <li key={link.href} className="text-sm">
            <a
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-full items-start gap-2 text-link-foreground hover:underline"
            >
              <FontAwesomeIcon icon={faLink} className="mt-0.5 shrink-0" />
              <span className="min-w-0">
                <span className="break-all">{link.label}</span>
                {link.label !== link.href && (
                  <span className="ml-2 break-all text-xs text-muted-foreground">
                    {link.href}
                  </span>
                )}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function RichTextBody({
  text,
  showLinks = true,
}: {
  text: string | null;
  showLinks?: boolean;
}) {
  const doc = parseDoc(text);
  if (!doc) {
    return (
      <p className="whitespace-pre-wrap text-sm text-foreground">
        {text ?? "(empty)"}
      </p>
    );
  }

  return (
    <div className="text-sm">
      <RichTextViewer doc={doc} />
      {showLinks && <ContentLinks doc={doc} />}
    </div>
  );
}
