CREATE TABLE IF NOT EXISTS audit_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  website_url TEXT NOT NULL,
  selected_pages TEXT NOT NULL,
  report TEXT NOT NULL,
  scan_data TEXT,
  rating INTEGER,
  tags TEXT,
  comments TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_feedback_created_at
  ON audit_feedback(created_at);
