-- Phase 15 schema cleanup (docs/phases/15-schema-cleanup.md). Written by hand: Prisma's own diff drops and re-adds
-- every list column, which would lose the data. Each list is converted in place; a value that isn't valid JSON stops
-- the migration instead of being lost. List columns match what Prisma generates for String[]: nullable, default empty.

-- Categories: copy each hackathon's links to a slug array, then drop the join table and the Category table.
-- In the join table "A" is the Category id and "B" the Hackathon id.
ALTER TABLE "Hackathon" ADD COLUMN "categories" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Hackathon" h SET "categories" = ARRAY(
  SELECT c."slug" FROM "_CategoryToHackathon" j JOIN "Category" c ON c."id" = j."A" WHERE j."B" = h."id" ORDER BY c."slug"
);
DROP TABLE "_CategoryToHackathon";
DROP TABLE "Category";

-- JSON-string lists become arrays. ALTER ... USING can't hold a subquery, so a helper function does the conversion.
CREATE FUNCTION "json_text_array"(s TEXT) RETURNS TEXT[] LANGUAGE sql IMMUTABLE
  AS $$ SELECT ARRAY(SELECT jsonb_array_elements_text(s::jsonb)) $$;
ALTER TABLE "Member" ALTER COLUMN "skills" DROP DEFAULT, ALTER COLUMN "skills" DROP NOT NULL,
  ALTER COLUMN "skills" TYPE TEXT[] USING "json_text_array"("skills"),
  ALTER COLUMN "skills" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Member" ALTER COLUMN "preferredRoles" DROP DEFAULT, ALTER COLUMN "preferredRoles" DROP NOT NULL,
  ALTER COLUMN "preferredRoles" TYPE TEXT[] USING "json_text_array"("preferredRoles"),
  ALTER COLUMN "preferredRoles" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Project" ALTER COLUMN "tech" DROP DEFAULT, ALTER COLUMN "tech" DROP NOT NULL,
  ALTER COLUMN "tech" TYPE TEXT[] USING "json_text_array"("tech"),
  ALTER COLUMN "tech" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Team" ALTER COLUMN "preferredCats" DROP DEFAULT, ALTER COLUMN "preferredCats" DROP NOT NULL,
  ALTER COLUMN "preferredCats" TYPE TEXT[] USING "json_text_array"("preferredCats"),
  ALTER COLUMN "preferredCats" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Hackathon" ALTER COLUMN "prizeTracks" DROP DEFAULT,
  ALTER COLUMN "prizeTracks" TYPE JSONB USING "prizeTracks"::jsonb,
  ALTER COLUMN "prizeTracks" SET DEFAULT '[]';
DROP FUNCTION "json_text_array"(TEXT);

-- The owner is the accountable assignment; preferredTech was never read; homeCity's default moves to TeamInput.
ALTER TABLE "Hackathon" DROP CONSTRAINT "Hackathon_ownerId_fkey";
ALTER TABLE "Hackathon" DROP COLUMN "ownerId";
ALTER TABLE "Team" DROP COLUMN "preferredTech", ALTER COLUMN "homeCity" DROP DEFAULT;

-- A result only at stage "results" (changeStage's rule, now one nothing can skip). Prisma doesn't model CHECK.
UPDATE "Hackathon" SET "result" = NULL WHERE "stage" <> 'results' AND "result" IS NOT NULL;
ALTER TABLE "Hackathon" ADD CONSTRAINT "Hackathon_result_needs_results_stage" CHECK ("result" IS NULL OR "stage" = 'results');
