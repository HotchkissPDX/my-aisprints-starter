-- Migration number: 0002 	 2026-04-07T00:00:00.000Z

CREATE TABLE mc_questions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  question_text TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mc_questions_user_id ON mc_questions (user_id);
CREATE INDEX idx_mc_questions_user_created ON mc_questions (user_id, created_at DESC);

CREATE TABLE mc_question_choices (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL,
  sort_order INTEGER NOT NULL,
  choice_text TEXT NOT NULL,
  is_correct INTEGER NOT NULL CHECK (is_correct IN (0, 1)),
  FOREIGN KEY (question_id) REFERENCES mc_questions(id) ON DELETE CASCADE,
  UNIQUE (question_id, sort_order)
);

CREATE INDEX idx_mc_choices_question_id ON mc_question_choices (question_id);
