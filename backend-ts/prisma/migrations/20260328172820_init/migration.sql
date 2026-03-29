-- CreateTable
CREATE TABLE "comments" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL DEFAULT 'bilibili',
    "canonical_comment_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "video_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "parent_id" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "reply_jobs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "comment_id" TEXT NOT NULL,
    "canonical_comment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "length_mode" TEXT NOT NULL DEFAULT 'medium',
    "style_mode" TEXT NOT NULL DEFAULT 'doro',
    "reply_text" TEXT,
    "risk_flags" TEXT NOT NULL DEFAULT '{}',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_state" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" TEXT NOT NULL,
    "recent_phrases" TEXT NOT NULL DEFAULT '{}',
    "cooldown_enabled" BOOLEAN NOT NULL DEFAULT false,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "publish_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "platform" TEXT NOT NULL DEFAULT 'bilibili',
    "canonical_comment_id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "reply_hash" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'bili-pet-bot',
    "status" TEXT NOT NULL DEFAULT 'published',
    "published_at" DATETIME,
    "failure_reason" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "knowledge_entries" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role_cards" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "system_prompt" TEXT NOT NULL DEFAULT '',
    "tone" TEXT NOT NULL DEFAULT '{}',
    "constraints" TEXT NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "operation_audit_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "action" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '{}',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "comments_canonical_comment_id_key" ON "comments"("canonical_comment_id");

-- CreateIndex
CREATE INDEX "comments_platform_idx" ON "comments"("platform");

-- CreateIndex
CREATE INDEX "comments_canonical_comment_id_idx" ON "comments"("canonical_comment_id");

-- CreateIndex
CREATE INDEX "comments_comment_id_idx" ON "comments"("comment_id");

-- CreateIndex
CREATE INDEX "reply_jobs_comment_id_idx" ON "reply_jobs"("comment_id");

-- CreateIndex
CREATE INDEX "reply_jobs_canonical_comment_id_idx" ON "reply_jobs"("canonical_comment_id");

-- CreateIndex
CREATE INDEX "reply_jobs_status_idx" ON "reply_jobs"("status");

-- CreateIndex
CREATE INDEX "reply_jobs_created_at_idx" ON "reply_jobs"("created_at");

-- CreateIndex
CREATE INDEX "reply_jobs_status_created_at_id_idx" ON "reply_jobs"("status", "created_at", "id");

-- CreateIndex
CREATE UNIQUE INDEX "user_state_user_id_key" ON "user_state"("user_id");

-- CreateIndex
CREATE INDEX "publish_logs_platform_idx" ON "publish_logs"("platform");

-- CreateIndex
CREATE INDEX "publish_logs_canonical_comment_id_idx" ON "publish_logs"("canonical_comment_id");

-- CreateIndex
CREATE INDEX "publish_logs_comment_id_idx" ON "publish_logs"("comment_id");

-- CreateIndex
CREATE UNIQUE INDEX "publish_logs_canonical_comment_id_reply_hash_key" ON "publish_logs"("canonical_comment_id", "reply_hash");

-- CreateIndex
CREATE INDEX "knowledge_entries_category_idx" ON "knowledge_entries"("category");

-- CreateIndex
CREATE INDEX "knowledge_entries_enabled_idx" ON "knowledge_entries"("enabled");

-- CreateIndex
CREATE INDEX "knowledge_entries_updated_at_idx" ON "knowledge_entries"("updated_at");

-- CreateIndex
CREATE UNIQUE INDEX "role_cards_key_key" ON "role_cards"("key");

-- CreateIndex
CREATE INDEX "role_cards_key_idx" ON "role_cards"("key");

-- CreateIndex
CREATE INDEX "role_cards_enabled_idx" ON "role_cards"("enabled");

-- CreateIndex
CREATE INDEX "role_cards_is_active_idx" ON "role_cards"("is_active");

-- CreateIndex
CREATE INDEX "operation_audit_logs_action_idx" ON "operation_audit_logs"("action");

-- CreateIndex
CREATE INDEX "operation_audit_logs_actor_idx" ON "operation_audit_logs"("actor");

-- CreateIndex
CREATE INDEX "operation_audit_logs_target_type_idx" ON "operation_audit_logs"("target_type");

-- CreateIndex
CREATE INDEX "operation_audit_logs_created_at_idx" ON "operation_audit_logs"("created_at");
