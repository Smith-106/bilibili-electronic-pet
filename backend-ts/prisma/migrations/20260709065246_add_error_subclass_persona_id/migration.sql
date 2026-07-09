-- AlterTable
ALTER TABLE "observability_events" ADD COLUMN "error_subclass" TEXT;
ALTER TABLE "observability_events" ADD COLUMN "persona_id" TEXT;

-- CreateIndex
CREATE INDEX "observability_events_error_subclass_idx" ON "observability_events"("error_subclass");
