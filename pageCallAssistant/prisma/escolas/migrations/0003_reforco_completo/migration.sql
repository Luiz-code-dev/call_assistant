-- Migration aditiva: reforço completo + atividades da turma + estúdio de conteúdo
-- Nenhuma tabela, coluna ou enum existente é removida ou renomeada.

-- ── EduNetwork: configurações de rede ────────────────────────────────────────
ALTER TABLE "EduNetwork"
  ADD COLUMN IF NOT EXISTS "trackAssignmentMode" TEXT NOT NULL DEFAULT 'SUGGEST',
  ADD COLUMN IF NOT EXISTS "diagnosticAdaptive"  BOOLEAN NOT NULL DEFAULT true;

-- ── EduSkill: unidade temática e objeto de conhecimento (BNCC) ────────────────
ALTER TABLE "EduSkill"
  ADD COLUMN IF NOT EXISTS "thematicUnit"    TEXT,
  ADD COLUMN IF NOT EXISTS "knowledgeObject" TEXT;

CREATE INDEX IF NOT EXISTS "EduSkill_thematicUnit_idx" ON "EduSkill"("thematicUnit");

-- ── EduSkillPrerequisite ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EduSkillPrerequisite" (
  "id"                  TEXT NOT NULL,
  "skillId"             TEXT NOT NULL,
  "prerequisiteSkillId" TEXT NOT NULL,
  "weight"              INTEGER NOT NULL DEFAULT 1,
  "networkId"           TEXT,
  "source"              TEXT NOT NULL DEFAULT 'SPEAKFLOW',
  "status"              TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduSkillPrerequisite_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduSkillPrerequisite_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EduSkillPrerequisite_prerequisiteSkillId_fkey"
    FOREIGN KEY ("prerequisiteSkillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "EduSkillPrerequisite_skillId_prerequisiteSkillId_networkId_key"
  ON "EduSkillPrerequisite"("skillId", "prerequisiteSkillId", COALESCE("networkId", ''));

CREATE INDEX IF NOT EXISTS "EduSkillPrerequisite_skillId_idx"             ON "EduSkillPrerequisite"("skillId");
CREATE INDEX IF NOT EXISTS "EduSkillPrerequisite_prerequisiteSkillId_idx" ON "EduSkillPrerequisite"("prerequisiteSkillId");
CREATE INDEX IF NOT EXISTS "EduSkillPrerequisite_networkId_idx"           ON "EduSkillPrerequisite"("networkId");

-- ── EduSkillGuide ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EduSkillGuide" (
  "id"              TEXT NOT NULL,
  "skillId"         TEXT NOT NULL,
  "whatStudentDoes" TEXT NOT NULL,
  "commonErrors"    JSONB NOT NULL DEFAULT '[]',
  "recommendedTypes" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ageNotes"        TEXT,
  "version"         INTEGER NOT NULL DEFAULT 1,
  "networkId"       TEXT,
  "source"          TEXT NOT NULL DEFAULT 'SPEAKFLOW',
  "status"          TEXT NOT NULL DEFAULT 'DRAFT',
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduSkillGuide_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduSkillGuide_skillId_fkey"
    FOREIGN KEY ("skillId") REFERENCES "EduSkill"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EduSkillGuide_skillId_idx"   ON "EduSkillGuide"("skillId");
CREATE INDEX IF NOT EXISTS "EduSkillGuide_networkId_idx" ON "EduSkillGuide"("networkId");

-- ── EduActivity: tornar networkId e classSubjectId opcionais; novas colunas ──
ALTER TABLE "EduActivity"
  ALTER COLUMN "networkId"      DROP NOT NULL,
  ALTER COLUMN "classSubjectId" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "source"         TEXT NOT NULL DEFAULT 'PROFESSOR',
  ADD COLUMN IF NOT EXISTS "subjectCode"    TEXT,
  ADD COLUMN IF NOT EXISTS "gradeYears"     INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
  ADD COLUMN IF NOT EXISTS "skillIds"       TEXT[]    NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "version"        INTEGER   NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "derivedFromId"  TEXT,
  ADD COLUMN IF NOT EXISTS "audioPromptUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "imageUrl"       TEXT,
  ADD COLUMN IF NOT EXISTS "ageBand"        TEXT,
  ADD COLUMN IF NOT EXISTS "lessonId"       TEXT,
  ADD COLUMN IF NOT EXISTS "reviewStatus"   TEXT NOT NULL DEFAULT 'DRAFT';

CREATE INDEX IF NOT EXISTS "EduActivity_networkId_source_idx" ON "EduActivity"("networkId", "source");
CREATE INDEX IF NOT EXISTS "EduActivity_lessonId_idx"         ON "EduActivity"("lessonId");

-- ── EduQuizQuestion: novas colunas para diagnóstico adaptivo ─────────────────
ALTER TABLE "EduQuizQuestion"
  ADD COLUMN IF NOT EXISTS "skillId"          TEXT,
  ADD COLUMN IF NOT EXISTS "objectiveId"      TEXT,
  ADD COLUMN IF NOT EXISTS "misconceptionCode" TEXT;

CREATE INDEX IF NOT EXISTS "EduQuizQuestion_skillId_idx" ON "EduQuizQuestion"("skillId");

-- ── EduDiagnostic: networkId opcional + novas colunas ────────────────────────
ALTER TABLE "EduDiagnostic"
  ALTER COLUMN "networkId"  DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "source"        TEXT    NOT NULL DEFAULT 'REDE',
  ADD COLUMN IF NOT EXISTS "version"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "derivedFromId" TEXT,
  ADD COLUMN IF NOT EXISTS "adaptive"      BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS "EduDiagnostic_networkId_source_idx" ON "EduDiagnostic"("networkId", "source");

-- ── EduTrack: networkId opcional + novas colunas ─────────────────────────────
ALTER TABLE "EduTrack"
  ALTER COLUMN "networkId"  DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "source"        TEXT    NOT NULL DEFAULT 'PROFESSOR',
  ADD COLUMN IF NOT EXISTS "version"       INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "derivedFromId" TEXT;

CREATE INDEX IF NOT EXISTS "EduTrack_networkId_source_idx" ON "EduTrack"("networkId", "source");

-- ── EduLesson ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EduLesson" (
  "id"             TEXT NOT NULL,
  "networkId"      TEXT NOT NULL,
  "classSubjectId" TEXT NOT NULL,
  "teacherId"      TEXT NOT NULL,
  "date"           DATE NOT NULL,
  "title"          TEXT NOT NULL,
  "skillIds"       TEXT[]  NOT NULL DEFAULT ARRAY[]::TEXT[],
  "materials"      JSONB   NOT NULL DEFAULT '[]',
  "status"         TEXT    NOT NULL DEFAULT 'DRAFT',
  "publishedAt"    TIMESTAMP(3),
  "dueAt"          TIMESTAMP(3),
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EduLesson_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EduLesson_networkId_classSubjectId_idx" ON "EduLesson"("networkId", "classSubjectId");
CREATE INDEX IF NOT EXISTS "EduLesson_networkId_teacherId_idx"       ON "EduLesson"("networkId", "teacherId");
CREATE INDEX IF NOT EXISTS "EduLesson_networkId_date_idx"            ON "EduLesson"("networkId", "date");

-- ── EduLessonObjective ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "EduLessonObjective" (
  "id"       TEXT    NOT NULL,
  "lessonId" TEXT    NOT NULL,
  "order"    INTEGER NOT NULL,
  "text"     TEXT    NOT NULL,
  "skillId"  TEXT,
  CONSTRAINT "EduLessonObjective_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "EduLessonObjective_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "EduLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "EduLessonObjective_lessonId_idx" ON "EduLessonObjective"("lessonId");
