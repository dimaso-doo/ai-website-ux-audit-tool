import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { FeedbackInput } from "@/lib/audit/types";

const databaseUrl = process.env.DATABASE_URL || join(process.cwd(), "data", "audit-feedback.sqlite");

export function saveAuditFeedback(input: FeedbackInput) {
  const db = getDatabase();
  const insert = db.prepare(`
    INSERT INTO audit_feedback (
      website_url,
      selected_pages,
      report,
      scan_data,
      rating,
      tags,
      comments,
      created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  insert.run(
    input.websiteUrl,
    JSON.stringify(input.selectedPages),
    input.report,
    input.scanData ? JSON.stringify(input.scanData) : null,
    input.rating ?? null,
    JSON.stringify(input.tags || []),
    input.comments || "",
  );
}

export function getDimasoStyleMemory() {
  const db = getDatabase();
  const rows = db
    .prepare(
      `SELECT rating, tags, comments
       FROM audit_feedback
       WHERE comments IS NOT NULL AND comments != ''
       ORDER BY created_at DESC
       LIMIT 20`,
    )
    .all() as Array<{ rating: number | null; tags: string; comments: string }>;

  if (!rows.length) return "";

  return rows
    .map((row, index) => {
      const tags = safeParseTags(row.tags);
      return `${index + 1}. Rating: ${row.rating ?? "not provided"}; Tags: ${tags.join(", ") || "none"}; Feedback: ${row.comments}`;
    })
    .join("\n");
}

export function getDatabasePath() {
  return databaseUrl;
}

function getDatabase() {
  mkdirSync(dirname(databaseUrl), { recursive: true });
  const db = new DatabaseSync(databaseUrl);
  db.exec(`
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
  `);
  return db;
}

function safeParseTags(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
