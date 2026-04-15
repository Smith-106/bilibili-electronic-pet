-- CreateTable
CREATE TABLE "pet_states" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "profile_key" TEXT NOT NULL DEFAULT 'default',
  "pet_name" TEXT NOT NULL DEFAULT 'Mochi',
  "species" TEXT,
  "archetype" TEXT,
  "mood_label" TEXT NOT NULL DEFAULT 'Curious',
  "mood_note" TEXT NOT NULL DEFAULT 'Settling into the next interaction loop.',
  "relationship_level" TEXT NOT NULL DEFAULT 'Growing',
  "relationship_note" TEXT NOT NULL DEFAULT 'Bond is still forming through repeated care actions.',
  "progress_stage" TEXT NOT NULL DEFAULT 'starter',
  "progress_label" TEXT NOT NULL DEFAULT 'Starter loop',
  "next_milestone" TEXT,
  "last_check_in_at" DATETIME,
  "needs_json" TEXT NOT NULL DEFAULT '[]',
  "proactive_signals_json" TEXT NOT NULL DEFAULT '[]',
  "state_metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "pet_actions" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "profile_key" TEXT NOT NULL DEFAULT 'default',
  "action" TEXT NOT NULL,
  "note" TEXT,
  "event_detail" TEXT NOT NULL,
  "state_metadata" TEXT NOT NULL DEFAULT '{}',
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pet_state_id" INTEGER,
  CONSTRAINT "pet_actions_pet_state_id_fkey" FOREIGN KEY ("pet_state_id") REFERENCES "pet_states" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "pet_states_profile_key_key" ON "pet_states"("profile_key");

-- CreateIndex
CREATE INDEX "pet_states_updated_at_idx" ON "pet_states"("updated_at");

-- CreateIndex
CREATE INDEX "pet_actions_profile_key_created_at_idx" ON "pet_actions"("profile_key", "created_at");

-- CreateIndex
CREATE INDEX "pet_actions_pet_state_id_created_at_idx" ON "pet_actions"("pet_state_id", "created_at");
