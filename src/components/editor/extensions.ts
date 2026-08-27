import Image from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { isBlockedHref } from "@/lib/rich-text";

export function createRichTextExtensions(options: {
  openLinksOnClick: boolean;
}) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      strike: false,
      underline: false,
      horizontalRule: false,
      link: {
        openOnClick: options.openLinksOnClick,
        autolink: true,
        defaultProtocol: "https",
        HTMLAttributes: {
          rel: "noopener noreferrer",
          target: "_blank",
        },
        isAllowedUri: (url) => {
          if (!url || isBlockedHref(url)) return false;
          return true;
        },
      },
    }),
    Image.configure({
      allowBase64: false,
    }),
  ];
}
