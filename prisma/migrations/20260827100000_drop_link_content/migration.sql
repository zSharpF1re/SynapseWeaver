-- Drop LINK contents (beta: no data migration)
UPDATE "Edge"
SET "generatedFromContentId" = NULL
WHERE "generatedFromContentId" IN (
  SELECT "id" FROM "Content" WHERE "type" = 'LINK'
);

DELETE FROM "Content" WHERE "type" = 'LINK';

ALTER TABLE "Content" DROP COLUMN "url";

CREATE TYPE "ContentType_new" AS ENUM ('TEXT', 'DOCUMENT', 'AI_GENERATED');

ALTER TABLE "Content"
  ALTER COLUMN "type" TYPE "ContentType_new"
  USING ("type"::text::"ContentType_new");

DROP TYPE "ContentType";

ALTER TYPE "ContentType_new" RENAME TO "ContentType";
