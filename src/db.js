import Database from 'better-sqlite3';

const DB_PATH = process.env.SQLITE_PATH || 'data.sqlite';

let db;

export function initDb() {
  if (db) return;

  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      origin TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      dueDate TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_actions_createdAt ON actions(createdAt);
    CREATE INDEX IF NOT EXISTS idx_actions_status ON actions(status);
    CREATE INDEX IF NOT EXISTS idx_actions_origin ON actions(origin);
  `);
}

function ensureDb() {
  if (!db) initDb();
  return db;
}

function nowIso() {
  return new Date().toISOString();
}

export function getActions({ status, origin, q } = {}) {
  const database = ensureDb();

  const where = [];
  const params = {};

  if (status) {
    where.push('status = @status');
    params.status = status;
  }
  if (origin) {
    where.push('origin = @origin');
    params.origin = origin;
  }
  if (q) {
    where.push('(title LIKE @q OR description LIKE @q)');
    params.q = `%${q}%`;
  }

  const sql = `
    SELECT id, title, description, origin, status, priority, dueDate, createdAt
    FROM actions
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY datetime(createdAt) DESC, id DESC
  `;

  return database.prepare(sql).all(params);
}

export function createAction({ title, description, origin, status, priority, dueDate }) {
  const database = ensureDb();

  const stmt = database.prepare(`
    INSERT INTO actions (title, description, origin, status, priority, dueDate, createdAt)
    VALUES (@title, @description, @origin, @status, @priority, @dueDate, @createdAt)
  `);

  const createdAt = nowIso();
  const result = stmt.run({
    title,
    description: description ?? '',
    origin,
    status: status || 'todo',
    priority: priority || 'medium',
    dueDate: dueDate || null,
    createdAt,
  });

  return database
    .prepare(
      `SELECT id, title, description, origin, status, priority, dueDate, createdAt FROM actions WHERE id = ?`
    )
    .get(result.lastInsertRowid);
}

export function updateAction(id, fields) {
  const database = ensureDb();

  const allowed = ['title', 'description', 'origin', 'status', 'priority', 'dueDate'];
  const sets = [];
  const params = { id };

  for (const key of allowed) {
    if (fields[key] === undefined) continue;
    sets.push(`${key} = @${key}`);
    params[key] = fields[key];
  }

  if (!sets.length) {
    return database
      .prepare(
        `SELECT id, title, description, origin, status, priority, dueDate, createdAt FROM actions WHERE id = ?`
      )
      .get(id);
  }

  const result = database
    .prepare(`UPDATE actions SET ${sets.join(', ')} WHERE id = @id`)
    .run(params);

  if (result.changes === 0) return null;

  return database
    .prepare(
      `SELECT id, title, description, origin, status, priority, dueDate, createdAt FROM actions WHERE id = ?`
    )
    .get(id);
}

export function deleteAction(id) {
  const database = ensureDb();
  const result = database.prepare('DELETE FROM actions WHERE id = ?').run(id);
  return result.changes > 0;
}
