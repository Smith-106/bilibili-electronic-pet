ALTER TABLE "publish_logs" ADD COLUMN "reservation_key" TEXT;

CREATE UNIQUE INDEX "publish_logs_reservation_key_key" ON "publish_logs"("reservation_key");
CREATE INDEX "publish_logs_status_idx" ON "publish_logs"("status");

CREATE TABLE "comment_queue_backlogs" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "platform" TEXT NOT NULL DEFAULT 'bilibili',
  "canonical_comment_id" TEXT NOT NULL,
  "comment_id" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'webhook',
  "payload_json" TEXT NOT NULL DEFAULT '{}',
  "status" TEXT NOT NULL DEFAULT 'pending_requeue',
  "last_error" TEXT,
  "queue_attempts" INTEGER NOT NULL DEFAULT 0,
  "last_attempt_at" DATETIME,
  "recovered_at" DATETIME,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "comment_queue_backlogs_canonical_comment_id_key" ON "comment_queue_backlogs"("canonical_comment_id");
CREATE INDEX "comment_queue_backlogs_status_idx" ON "comment_queue_backlogs"("status");
CREATE INDEX "comment_queue_backlogs_created_at_idx" ON "comment_queue_backlogs"("created_at");
CREATE INDEX "comment_queue_backlogs_updated_at_idx" ON "comment_queue_backlogs"("updated_at");
