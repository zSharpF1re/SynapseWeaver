export type TipTapLinkMark = {
  type: "link";
  attrs: {
    href: string;
    target?: string | null;
    rel?: string | null;
    class?: string | null;
    title?: string | null;
  };
};

export type TipTapMark =
  | { type: "bold" }
  | { type: "italic" }
  | { type: "code" }
  | TipTapLinkMark;

export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
};

export type TipTapDoc = TipTapNode & { type: "doc" };

export type CollectedLink = {
  href: string;
  label: string;
};
