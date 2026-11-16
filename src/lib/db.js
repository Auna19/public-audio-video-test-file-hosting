import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SUPPORTED_LANGUAGES } from './constants.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'platform.db');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let dbInstance = null;

export function getDb() {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS media_files (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_file_name TEXT NOT NULL,
      storage_path TEXT NOT NULL,
      public_url TEXT NOT NULL,
      language TEXT NOT NULL,
      language_code TEXT NOT NULL,
      media_type TEXT NOT NULL,
      file_extension TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      description TEXT,
      tags TEXT,
      upload_status TEXT NOT NULL DEFAULT 'completed',
      is_public INTEGER NOT NULL DEFAULT 1,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      uploaded_by TEXT DEFAULT 'admin'
    );

    CREATE INDEX IF NOT EXISTS idx_media_language ON media_files(language_code);
    CREATE INDEX IF NOT EXISTS idx_media_type ON media_files(media_type);
    CREATE INDEX IF NOT EXISTS idx_media_is_public ON media_files(is_public);
    CREATE INDEX IF NOT EXISTS idx_media_created ON media_files(created_at DESC);

    CREATE TABLE IF NOT EXISTS languages (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      native_name TEXT,
      badge_color TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      target_id TEXT,
      details TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // Seed default languages if table is empty
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM languages`).get();
  if (countRow.count === 0) {
    const insertLang = db.prepare(`
      INSERT INTO languages (code, name, native_name, badge_color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    const now = new Date().toISOString();
    for (const lang of SUPPORTED_LANGUAGES) {
      insertLang.run(lang.code, lang.name, lang.nativeName || '', lang.badgeColor, now);
    }
  }
}

export const mediaRepo = {
  findAll(options = {}) {
    const db = getDb();
    let query = `SELECT * FROM media_files WHERE 1=1`;
    const params = [];

    if (options.onlyPublic) {
      query += ` AND is_public = 1`;
    }

    if (options.language && options.language !== 'all') {
      query += ` AND language_code = ?`;
      params.push(options.language);
    }

    if (options.mediaType && options.mediaType !== 'all') {
      query += ` AND media_type = ?`;
      params.push(options.mediaType);
    }

    if (options.search && options.search.trim()) {
      query += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR original_file_name LIKE ?)`;
      const term = `%${options.search.trim()}%`;
      params.push(term, term, term, term);
    }

    switch (options.sort) {
      case 'oldest':
        query += ` ORDER BY created_at ASC`;
        break;
      case 'size_desc':
        query += ` ORDER BY file_size DESC`;
        break;
      case 'downloads_desc':
        query += ` ORDER BY download_count DESC, created_at DESC`;
        break;
      case 'newest':
      default:
        query += ` ORDER BY created_at DESC`;
        break;
    }

    const stmt = db.prepare(query);
    return stmt.all(...params);
  },

  findById(id) {
    const db = getDb();
    const stmt = db.prepare(`SELECT * FROM media_files WHERE id = ?`);
    return stmt.get(id) || null;
  },

  findByStoragePath(storagePath) {
    const db = getDb();
    const stmt = db.prepare(`SELECT * FROM media_files WHERE storage_path = ?`);
    return stmt.get(storagePath) || null;
  },

  create(record) {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO media_files (
        id, title, original_file_name, storage_path, public_url,
        language, language_code, media_type, file_extension, mime_type,
        file_size, description, tags, upload_status, is_public,
        download_count, created_at, updated_at, uploaded_by
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `);

    stmt.run(
      record.id,
      record.title,
      record.original_file_name,
      record.storage_path,
      record.public_url,
      record.language,
      record.language_code,
      record.media_type,
      record.file_extension,
      record.mime_type,
      record.file_size,
      record.description || null,
      record.tags || null,
      record.upload_status || 'completed',
      record.is_public ?? 1,
      record.download_count ?? 0,
      record.created_at,
      record.updated_at,
      record.uploaded_by || 'admin'
    );

    return record;
  },

  update(id, updates = {}) {
    const db = getDb();
    const current = this.findById(id);
    if (!current) return null;

    const fields = [];
    const values = [];

    const allowedKeys = [
      'title',
      'language',
      'language_code',
      'description',
      'tags',
      'is_public',
      'download_count',
      'upload_status',
    ];

    for (const key of allowedKeys) {
      if (updates[key] !== undefined) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) return current;

    fields.push(`updated_at = ?`);
    values.push(new Date().toISOString());

    values.push(id);
    const sql = `UPDATE media_files SET ${fields.join(', ')} WHERE id = ?`;
    db.prepare(sql).run(...values);

    return this.findById(id);
  },

  incrementDownload(id) {
    const db = getDb();
    db.prepare(`UPDATE media_files SET download_count = download_count + 1 WHERE id = ?`).run(id);
  },

  delete(id) {
    const db = getDb();
    const res = db.prepare(`DELETE FROM media_files WHERE id = ?`).run(id);
    return res.changes > 0;
  },

  getStats() {
    const db = getDb();
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM media_files`).get();
    const audioRow = db.prepare(`SELECT COUNT(*) as count FROM media_files WHERE media_type = 'audio'`).get();
    const videoRow = db.prepare(`SELECT COUNT(*) as count FROM media_files WHERE media_type = 'video'`).get();
    const langRow = db.prepare(`SELECT COUNT(DISTINCT language_code) as count FROM media_files`).get();
    const dlRow = db.prepare(`SELECT COALESCE(SUM(download_count), 0) as total FROM media_files`).get();
    const recentRows = db.prepare(`SELECT * FROM media_files ORDER BY created_at DESC LIMIT 5`).all();

    return {
      totalFiles: totalRow.count,
      totalAudio: audioRow.count,
      totalVideo: videoRow.count,
      totalLanguages: langRow.count,
      totalDownloads: dlRow.total,
      recentUploads: recentRows,
    };
  }
};

export const languageRepo = {
  findAll() {
    const db = getDb();
    const rows = db.prepare(`SELECT * FROM languages ORDER BY name ASC`).all();
    // Count files per language
    const counts = db.prepare(`
      SELECT language_code, COUNT(*) as file_count
      FROM media_files
      GROUP BY language_code
    `).all();

    const countMap = {};
    for (const c of counts) {
      countMap[c.language_code] = c.file_count;
    }

    return rows.map((r) => ({
      code: r.code,
      name: r.name,
      nativeName: r.native_name,
      badgeColor: r.badge_color || 'bg-slate-100 text-slate-800 border-slate-300',
      fileCount: countMap[r.code] || 0,
      createdAt: r.created_at,
    }));
  },

  create({ code, name, nativeName, badgeColor }) {
    const db = getDb();
    const cleanCode = code.toLowerCase().trim();
    const cleanName = name.trim();
    const color = badgeColor || 'bg-teal-100 text-teal-800 border-teal-300';
    const now = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO languages (code, name, native_name, badge_color, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(cleanCode, cleanName, nativeName ? nativeName.trim() : '', color, now);

    return {
      code: cleanCode,
      name: cleanName,
      nativeName: nativeName || '',
      badgeColor: color,
      fileCount: 0,
      createdAt: now,
    };
  }
};

export const auditRepo = {
  log(action, targetId = null, details = null) {
    const db = getDb();
    db.prepare(`
      INSERT INTO audit_logs (id, action, target_id, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      action,
      targetId || null,
      details ? JSON.stringify(details) : null,
      new Date().toISOString()
    );
  },

  getRecent(limit = 50) {
    const db = getDb();
    return db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`).all(limit);
  }
};
