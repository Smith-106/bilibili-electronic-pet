/*
  Warnings:

  - You are about to drop the column `actor` on the `operation_audit_logs` table. All the data in the column will be lost.
  - You are about to drop the column `details` on the `operation_audit_logs` table. All the data in the column will be lost.
  - You are about to alter the column `target_id` on the `operation_audit_logs` table. The data in that column could be lost. The data in that column will be cast from `String` to `Int`.

*/
-- CreateTable
CREATE TABLE "observability_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "event_type" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "comment_id" TEXT,
    "job_id" INTEGER,
    "status" TEXT,
    "duration_ms" INTEGER,
    "event_metadata" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bilibili_credentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "sessdata" TEXT NOT NULL,
    "bili_jct" TEXT NOT NULL,
    "buvid3" TEXT NOT NULL,
    "buvid4" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" DATETIME,
    "last_used_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "bilibili_videos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "bvid" TEXT NOT NULL,
    "aid" INTEGER,
    "title" TEXT,
    "owner_mid" INTEGER,
    "poll_enabled" BOOLEAN NOT NULL DEFAULT false,
    "last_polled_at" DATETIME,
    "last_poll_status" TEXT,
    "last_poll_error" TEXT,
    "last_rpid" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_operation_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL DEFAULT 'reply_job',
    "target_id" INTEGER,
    "payload" TEXT NOT NULL DEFAULT '{}',
    "ok" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_operation_audit_logs" ("action", "created_at", "id", "target_id", "target_type") SELECT "action", "created_at", "id", "target_id", "target_type" FROM "operation_audit_logs";
DROP TABLE "operation_audit_logs";
ALTER TABLE "new_operation_audit_logs" RENAME TO "operation_audit_logs";
CREATE INDEX "operation_audit_logs_action_idx" ON "operation_audit_logs"("action");
CREATE INDEX "operation_audit_logs_target_id_idx" ON "operation_audit_logs"("target_id");
CREATE INDEX "operation_audit_logs_ok_idx" ON "operation_audit_logs"("ok");
CREATE INDEX "operation_audit_logs_created_at_idx" ON "operation_audit_logs"("created_at");
CREATE INDEX "operation_audit_logs_action_ok_created_at_id_idx" ON "operation_audit_logs"("action", "ok", "created_at", "id");
CREATE INDEX "operation_audit_logs_target_id_created_at_id_idx" ON "operation_audit_logs"("target_id", "created_at", "id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "observability_events_event_type_idx" ON "observability_events"("event_type");

-- CreateIndex
CREATE INDEX "observability_events_trace_id_idx" ON "observability_events"("trace_id");

-- CreateIndex
CREATE INDEX "observability_events_comment_id_idx" ON "observability_events"("comment_id");

-- CreateIndex
CREATE INDEX "observability_events_job_id_idx" ON "observability_events"("job_id");

-- CreateIndex
CREATE INDEX "observability_events_status_idx" ON "observability_events"("status");

-- CreateIndex
CREATE INDEX "observability_events_created_at_idx" ON "observability_events"("created_at");

-- CreateIndex
CREATE INDEX "bilibili_credentials_is_active_idx" ON "bilibili_credentials"("is_active");

-- CreateIndex
CREATE INDEX "bilibili_credentials_updated_at_idx" ON "bilibili_credentials"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "bilibili_videos_bvid_key" ON "bilibili_videos"("bvid");

-- CreateIndex
CREATE INDEX "bilibili_videos_poll_enabled_last_polled_at_idx" ON "bilibili_videos"("poll_enabled", "last_polled_at");

-- CreateIndex
CREATE INDEX "bilibili_videos_last_polled_at_idx" ON "bilibili_videos"("last_polled_at");

-- CreateIndex
CREATE INDEX "bilibili_videos_updated_at_idx" ON "bilibili_videos"("updated_at");
