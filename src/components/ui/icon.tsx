import {
  faAlignLeft,
  faFileLines,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ContentDto } from "@/types/graph";

export { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const contentTypeIcons: Record<ContentDto["type"], IconDefinition> = {
  TEXT: faAlignLeft,
  DOCUMENT: faFileLines,
  AI_GENERATED: faWandMagicSparkles,
};

export const contentTypeSurface: Record<ContentDto["type"], string> = {
  TEXT: "",
  DOCUMENT: "surface-file",
  AI_GENERATED: "",
};

export const contentTypeBadge: Record<ContentDto["type"], string> = {
  TEXT: "bg-muted text-muted-foreground",
  DOCUMENT: "bg-file-border/30 text-file-foreground",
  AI_GENERATED: "bg-muted text-muted-foreground",
};

export const contentTypeAccent: Record<ContentDto["type"], string> = {
  TEXT: "text-foreground",
  DOCUMENT: "text-file-foreground",
  AI_GENERATED: "text-muted-foreground",
};
