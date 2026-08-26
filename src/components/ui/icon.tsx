"use client";

import {
  faAlignLeft,
  faFileLines,
  faLink,
  faWandMagicSparkles,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import type { ContentDto } from "@/types/graph";

export { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const contentTypeIcons: Record<ContentDto["type"], IconDefinition> = {
  TEXT: faAlignLeft,
  LINK: faLink,
  DOCUMENT: faFileLines,
  AI_GENERATED: faWandMagicSparkles,
};
