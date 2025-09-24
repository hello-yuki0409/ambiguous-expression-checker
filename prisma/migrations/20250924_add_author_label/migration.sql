-- Add authorLabel column to Article for Phase5 analytics
ALTER TABLE "aimai"."Article"
  ADD COLUMN "authorLabel" TEXT;
