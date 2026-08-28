import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import {
  docFromPlain,
  isEmptyDoc,
  parseDoc,
  type TipTapDoc,
} from "@/lib/rich-text";
import { TipTapPdf } from "./tiptap-pdf";

const styles = StyleSheet.create({
  page: {
    paddingTop: 48,
    paddingBottom: 56,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    fontSize: 11,
    color: "#0f172a",
  },
  title: {
    fontFamily: "Helvetica-Bold",
    fontSize: 22,
    lineHeight: 1.25,
    marginBottom: 10,
  },
  rule: {
    height: 1,
    backgroundColor: "#0f766e",
    marginBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
});

export type NodePdfContent = {
  type: string;
  text: string | null;
};

export function docsFromContents(contents: NodePdfContent[]): TipTapDoc[] {
  const docs: TipTapDoc[] = [];
  for (const content of contents) {
    if (content.type !== "TEXT" && content.type !== "AI_GENERATED") continue;
    const doc = content.text
      ? (parseDoc(content.text) ?? docFromPlain(content.text))
      : null;
    if (!doc || isEmptyDoc(doc)) continue;
    docs.push(doc);
  }
  return docs;
}

export function NodePdfDocument({
  title,
  docs,
}: {
  title: string;
  docs: TipTapDoc[];
}) {
  return (
    <Document title={title} author="SynapseWeaver">
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.rule} />
        {docs.map((doc, index) => (
          <View key={index} style={styles.section} wrap>
            <TipTapPdf doc={doc} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

export async function renderNodePdf(input: {
  title: string;
  contents: NodePdfContent[];
}): Promise<Uint8Array> {
  const docs = docsFromContents(input.contents);
  const buffer = await renderToBuffer(
    <NodePdfDocument title={input.title} docs={docs} />,
  );
  return new Uint8Array(buffer);
}
