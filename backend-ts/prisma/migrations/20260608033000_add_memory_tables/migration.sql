CREATE TABLE "memory_spaces" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "space_key" TEXT NOT NULL,
  "space_type" TEXT NOT NULL DEFAULT 'operator',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "memory_spaces_space_key_key" ON "memory_spaces"("space_key");
CREATE INDEX "memory_spaces_space_type_idx" ON "memory_spaces"("space_type");
CREATE INDEX "memory_spaces_updated_at_idx" ON "memory_spaces"("updated_at");

CREATE TABLE "memory_items" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "space_id" INTEGER NOT NULL,
  "item_key" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "content_type" TEXT NOT NULL DEFAULT 'note',
  "source" TEXT NOT NULL DEFAULT 'operator',
  "item_metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_items_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "memory_spaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_memory_items_space_key" ON "memory_items"("space_id", "item_key");
CREATE INDEX "memory_items_space_id_content_type_idx" ON "memory_items"("space_id", "content_type");
CREATE INDEX "memory_items_updated_at_idx" ON "memory_items"("updated_at");

CREATE TABLE "memory_grants" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "space_id" INTEGER NOT NULL,
  "subject_type" TEXT NOT NULL DEFAULT 'user',
  "subject_id" TEXT NOT NULL,
  "access_level" TEXT NOT NULL DEFAULT 'read',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memory_grants_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "memory_spaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "uq_memory_grants_subject" ON "memory_grants"("space_id", "subject_type", "subject_id");
CREATE INDEX "memory_grants_subject_type_subject_id_idx" ON "memory_grants"("subject_type", "subject_id");
CREATE INDEX "memory_grants_updated_at_idx" ON "memory_grants"("updated_at");

CREATE TABLE "identity_links" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "subject_type" TEXT NOT NULL DEFAULT 'user',
  "subject_id" TEXT NOT NULL,
  "platform" TEXT NOT NULL DEFAULT 'bilibili',
  "external_id" TEXT NOT NULL,
  "display_name" TEXT,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "uq_identity_links_platform_external" ON "identity_links"("platform", "external_id");
CREATE INDEX "identity_links_subject_type_subject_id_idx" ON "identity_links"("subject_type", "subject_id");
CREATE INDEX "identity_links_updated_at_idx" ON "identity_links"("updated_at");
