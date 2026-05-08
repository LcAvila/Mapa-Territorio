ALTER TABLE "notifications"
ADD COLUMN "targetAll" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "targetUserIds" JSONB;
