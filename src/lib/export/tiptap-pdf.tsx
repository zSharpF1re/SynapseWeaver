import { Link, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ReactNode } from "react";
import {
  isBlockedHref,
  toPlainText,
  type TipTapDoc,
  type TipTapMark,
  type TipTapNode,
} from "@/lib/rich-text";

const ACCENT = "#0f766e";
const MUTED = "#64748b";
const CODE_BG = "#f1f5f9";

const styles = StyleSheet.create({
  paragraph: {
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
    marginBottom: 8,
  },
  paragraphCompact: {
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.45,
    marginBottom: 2,
  },
  h2: {
    fontFamily: "Helvetica-Bold",
    fontSize: 14,
    marginTop: 10,
    marginBottom: 6,
  },
  h3: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  list: {
    marginBottom: 8,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 3,
  },
  listMarker: {
    fontFamily: "Helvetica",
    fontSize: 11,
    width: 18,
  },
  listBody: {
    flex: 1,
  },
  nestedList: {
    marginTop: 2,
    marginBottom: 0,
  },
  quote: {
    borderLeftWidth: 2,
    borderLeftColor: MUTED,
    paddingLeft: 8,
    marginBottom: 8,
  },
  quoteText: {
    fontFamily: "Helvetica-Oblique",
    fontSize: 11,
    lineHeight: 1.45,
    color: MUTED,
  },
  codeBlock: {
    backgroundColor: CODE_BG,
    padding: 8,
    marginBottom: 8,
  },
  codeBlockText: {
    fontFamily: "Courier",
    fontSize: 9,
    lineHeight: 1.4,
  },
  link: {
    color: ACCENT,
    textDecoration: "underline",
  },
});

export function TipTapPdf({ doc }: { doc: TipTapDoc }) {
  const children = doc.content ?? [];
  if (children.length === 0) return null;
  return (
    <View>
      {children.map((node, index) => (
        <Block key={index} node={node} />
      ))}
    </View>
  );
}

function Block({
  node,
  compact = false,
}: {
  node: TipTapNode;
  compact?: boolean;
}) {
  switch (node.type) {
    case "paragraph": {
      const runs = inlineRuns(node);
      if (runs.length === 0) {
        return compact ? null : <View style={{ marginBottom: 8 }} />;
      }
      return (
        <Text style={compact ? styles.paragraphCompact : styles.paragraph}>
          {runs}
        </Text>
      );
    }
    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      const runs = inlineRuns(node);
      if (runs.length === 0) return null;
      return <Text style={level === 3 ? styles.h3 : styles.h2}>{runs}</Text>;
    }
    case "bulletList":
      return <List node={node} ordered={false} nested={compact} />;
    case "orderedList":
      return <List node={node} ordered nested={compact} />;
    case "blockquote":
      return (
        <View style={styles.quote}>
          {(node.content ?? []).map((child, index) => (
            <QuoteBlock key={index} node={child} />
          ))}
        </View>
      );
    case "codeBlock": {
      const text = toPlainText(node);
      if (!text) return null;
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeBlockText}>{text}</Text>
        </View>
      );
    }
    case "image":
      return null;
    default:
      return null;
  }
}

function QuoteBlock({ node }: { node: TipTapNode }) {
  if (node.type === "paragraph") {
    const runs = inlineRuns(node);
    if (runs.length === 0) return null;
    return <Text style={styles.quoteText}>{runs}</Text>;
  }
  return <Block node={node} compact />;
}

function List({
  node,
  ordered,
  nested,
}: {
  node: TipTapNode;
  ordered: boolean;
  nested?: boolean;
}) {
  const items = (node.content ?? []).filter((child) => child.type === "listItem");
  if (items.length === 0) return null;
  const start =
    typeof node.attrs?.start === "number" && Number.isFinite(node.attrs.start)
      ? node.attrs.start
      : 1;

  return (
    <View style={nested ? styles.nestedList : styles.list}>
      {items.map((item, index) => (
        <View key={index} style={styles.listItem}>
          <Text style={styles.listMarker}>
            {ordered ? `${start + index}.` : "•"}
          </Text>
          <View style={styles.listBody}>
            {(item.content ?? []).map((child, childIndex) => (
              <Block key={childIndex} node={child} compact />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

function inlineRuns(node: TipTapNode): ReactNode[] {
  const runs: ReactNode[] = [];
  for (const [index, child] of (node.content ?? []).entries()) {
    if (child.type === "hardBreak") {
      runs.push("\n");
      continue;
    }
    if (child.type === "image") continue;
    if (child.type === "text") {
      const rendered = renderTextRun(child, index);
      if (rendered !== null) runs.push(rendered);
    }
  }
  return runs;
}

function renderTextRun(node: TipTapNode, key: number): ReactNode {
  const text = node.text ?? "";
  if (!text) return null;
  const marks = node.marks ?? [];
  const href = linkHref(marks);

  const run = (
    <Text key={href ? undefined : key} style={runStyle(marks)}>
      {text}
    </Text>
  );

  if (!href || isBlockedHref(href)) return run;

  return (
    <Link key={key} src={href} style={styles.link}>
      {run}
    </Link>
  );
}

function linkHref(marks: TipTapMark[]): string | null {
  const mark = marks.find((item) => item.type === "link");
  if (!mark || mark.type !== "link") return null;
  const href = mark.attrs.href?.trim();
  return href ? href : null;
}

function runStyle(marks: TipTapMark[]) {
  const code = marks.some((mark) => mark.type === "code");
  const bold = marks.some((mark) => mark.type === "bold");
  const italic = marks.some((mark) => mark.type === "italic");

  let fontFamily = "Helvetica";
  if (code) {
    fontFamily = bold ? "Courier-Bold" : "Courier";
  } else if (bold && italic) {
    fontFamily = "Helvetica-BoldOblique";
  } else if (bold) {
    fontFamily = "Helvetica-Bold";
  } else if (italic) {
    fontFamily = "Helvetica-Oblique";
  }

  return {
    fontFamily,
    fontSize: code ? 9 : undefined,
  };
}
