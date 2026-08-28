import { prisma } from "@/lib/db/prisma";
import { deleteBlobIfPresent } from "@/lib/blob";
import { collectImageSrcs, parseDoc } from "@/lib/rich-text";

export function collectContentMediaUrls(
  contents: Array<{
    fileUrl: string | null;
    text: string | null;
  }>,
): string[] {
  const urls: string[] = [];
  for (const content of contents) {
    if (content.fileUrl) urls.push(content.fileUrl);
    if (content.text) {
      const doc = parseDoc(content.text);
      if (doc) urls.push(...collectImageSrcs(doc));
    }
  }
  return urls;
}

export async function deleteBlobsIfUnreferenced(
  urls: Array<string | null | undefined>,
) {
  const unique = [
    ...new Set(urls.filter((url): url is string => Boolean(url))),
  ];
  for (const url of unique) {
    const stillUsed = await prisma.content.findFirst({
      where: {
        OR: [{ fileUrl: url }, { text: { contains: url } }],
      },
      select: { id: true },
    });
    if (!stillUsed) {
      await deleteBlobIfPresent(url);
    }
  }
}
