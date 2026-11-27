-- The fit score is gone; these two columns only fed it.
ALTER TABLE "Team" DROP COLUMN "preferredCats", DROP COLUMN "homeCity";
