import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { SUPPORTED_LANGUAGES, DOCUMENT_EXTENSIONS, AUDIO_EXTENSIONS, VIDEO_EXTENSIONS } from './constants.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';

const DATA_DIR = process.env.VERCEL ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'platform.db');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
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
  try {
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
        text_content TEXT,
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

    // Migration: ensure text_content column exists
    try {
      db.exec(`ALTER TABLE media_files ADD COLUMN text_content TEXT;`);
    } catch {}

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
  } catch (err) {
    console.error('Error initializing SQLite schema:', err);
  }
}

export function normalizeMediaItem(item) {
  if (!item) return item;
  const ext = (item.file_extension || '').toLowerCase();
  const isDoc = DOCUMENT_EXTENSIONS.has(ext) || item.media_type === 'text';

  let textContent = item.text_content || '';
  let description = item.description || '';

  // Extract text_content from description fallback if encoded
  if (!textContent && description && description.includes('[TEXT_CONTENT]: ')) {
    const textMatch = description.match(/\[TEXT_CONTENT\]:\s*([\s\S]*?)(?:\n\[DESC\]:\s*([\s\S]*))?$/);
    if (textMatch) {
      textContent = textMatch[1].trim();
      description = (textMatch[2] || '').trim() || null;
    }
  }

  return {
    ...item,
    media_type: isDoc ? 'text' : item.media_type,
    text_content: textContent || null,
    description: description || null,
  };
}

export const mediaRepo = {
  async findAll(options = {}) {
    const isTextFilter = options.mediaType === 'text';
    const isAudioFilter = options.mediaType === 'audio';
    const isVideoFilter = options.mediaType === 'video';

    // 1. If Supabase configured, query Supabase
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let q = supabaseAdmin.from('media_files').select('*');

        if (options.onlyPublic) {
          q = q.eq('is_public', 1);
        }
        if (options.language && options.language !== 'all') {
          q = q.eq('language_code', options.language);
        }

        if (isTextFilter) {
          const docExtList = Array.from(DOCUMENT_EXTENSIONS);
          q = q.or(`media_type.eq.text,file_extension.in.(${docExtList.join(',')})`);
        } else if (isAudioFilter) {
          const docExtList = Array.from(DOCUMENT_EXTENSIONS);
          q = q.eq('media_type', 'audio').not('file_extension', 'in', `(${docExtList.join(',')})`);
        } else if (isVideoFilter) {
          q = q.eq('media_type', 'video');
        }

        if (options.search && options.search.trim()) {
          const term = `%${options.search.trim()}%`;
          q = q.or(`title.ilike.${term},description.ilike.${term},tags.ilike.${term},original_file_name.ilike.${term}`);
        }

        switch (options.sort) {
          case 'oldest':
            q = q.order('created_at', { ascending: true });
            break;
          case 'size_desc':
            q = q.order('file_size', { ascending: false });
            break;
          case 'downloads_desc':
            q = q.order('download_count', { ascending: false }).order('created_at', { ascending: false });
            break;
          case 'newest':
          default:
            q = q.order('created_at', { ascending: false });
            break;
        }

        const { data, error } = await q;
        if (!error && Array.isArray(data)) {
          return data.map(normalizeMediaItem);
        }
        if (error) {
          console.warn('Supabase media findAll fallback to SQLite:', error.message);
        }
      } catch (err) {
        console.warn('Supabase media findAll exception:', err.message);
      }
    }

    // 2. Fallback to SQLite
    try {
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

      if (isTextFilter) {
        const docExts = Array.from(DOCUMENT_EXTENSIONS);
        const placeholders = docExts.map(() => '?').join(',');
        query += ` AND (media_type = 'text' OR file_extension IN (${placeholders}))`;
        params.push(...docExts);
      } else if (isAudioFilter) {
        const docExts = Array.from(DOCUMENT_EXTENSIONS);
        const placeholders = docExts.map(() => '?').join(',');
        query += ` AND media_type = 'audio' AND file_extension NOT IN (${placeholders})`;
        params.push(...docExts);
      } else if (isVideoFilter) {
        query += ` AND media_type = 'video'`;
      }

      if (options.search && options.search.trim()) {
        query += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR original_file_name LIKE ? OR text_content LIKE ?)`;
        const term = `%${options.search.trim()}%`;
        params.push(term, term, term, term, term);
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
      const rows = stmt.all(...params);
      return rows.map(normalizeMediaItem);
    } catch (e) {
      console.error('SQLite findAll error:', e);
      return [];
    }
  },

  async findById(id) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin.from('media_files').select('*').eq('id', id).maybeSingle();
        if (!error && data) {
          return normalizeMediaItem(data);
        }
      } catch {}
    }
    try {
      const db = getDb();
      const stmt = db.prepare(`SELECT * FROM media_files WHERE id = ?`);
      const row = stmt.get(id);
      return row ? normalizeMediaItem(row) : null;
    } catch {
      return null;
    }
  },

  async findByStoragePath(storagePath) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('media_files')
          .select('*')
          .eq('storage_path', storagePath)
          .maybeSingle();
        if (!error && data) {
          return normalizeMediaItem(data);
        }
      } catch {}
    }
    try {
      const db = getDb();
      const stmt = db.prepare(`SELECT * FROM media_files WHERE storage_path = ?`);
      const row = stmt.get(storagePath);
      return row ? normalizeMediaItem(row) : null;
    } catch {
      return null;
    }
  },

  async create(record) {
    let createdRecord = { ...record };

    // 1. Supabase write with automatic constraint & schema fallback
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let payload = { ...record };

        // Attempt 1: Full payload
        let { data, error } = await supabaseAdmin.from('media_files').insert(payload).select().maybeSingle();

        // If error mentions missing text_content column (PGRST204)
        if (error && (error.message?.includes('text_content') || error.code === 'PGRST204')) {
          console.warn('Supabase media_files missing text_content column; storing in description fallback.');
          delete payload.text_content;
          if (record.text_content) {
            payload.description = record.description
              ? `[TEXT_CONTENT]: ${record.text_content}\n[DESC]: ${record.description}`
              : `[TEXT_CONTENT]: ${record.text_content}`;
          }
          const res = await supabaseAdmin.from('media_files').insert(payload).select().maybeSingle();
          data = res.data;
          error = res.error;
        }

        // If error mentions media_type check constraint (23514)
        if (error && (error.message?.includes('check constraint') || error.message?.includes('media_type') || error.code === '23514')) {
          console.warn('Supabase media_type check constraint fallback to audio.');
          payload.media_type = 'audio';
          delete payload.text_content;
          if (record.text_content && !payload.description?.includes('[TEXT_CONTENT]:')) {
            payload.description = record.description
              ? `[TEXT_CONTENT]: ${record.text_content}\n[DESC]: ${record.description}`
              : `[TEXT_CONTENT]: ${record.text_content}`;
          }
          const retryRes = await supabaseAdmin.from('media_files').insert(payload).select().maybeSingle();
          data = retryRes.data;
          error = retryRes.error;
        }

        // If error mentions language foreign key constraint (23503)
        if (error && (error.code === '23503' || error.message?.includes('languages') || error.message?.includes('language_code'))) {
          console.warn('Supabase language foreign key violation; ensuring language exists in languages table.');
          try {
            await supabaseAdmin.from('languages').upsert({
              code: payload.language_code || 'other',
              name: payload.language || 'Other',
              native_name: payload.language || 'Custom Language',
              badge_color: 'bg-zinc-100 text-zinc-800 border-zinc-300',
              created_at: new Date().toISOString()
            });
            const retryLang = await supabaseAdmin.from('media_files').insert(payload).select().maybeSingle();
            data = retryLang.data;
            error = retryLang.error;
          } catch {}
        }

        if (error) {
          console.error('Supabase media create error:', error.message);
        } else if (data) {
          createdRecord = normalizeMediaItem({ ...record, ...data });
        }
      } catch (err) {
        console.error('Supabase media create exception:', err);
      }
    }

    // 2. Local SQLite write
    try {
      const db = getDb();
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO media_files (
          id, title, original_file_name, storage_path, public_url,
          language, language_code, media_type, file_extension, mime_type,
          file_size, description, tags, text_content, upload_status, is_public,
          download_count, created_at, updated_at, uploaded_by
        ) VALUES (
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?, ?, ?,
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
        record.text_content || null,
        record.upload_status || 'completed',
        record.is_public ?? 1,
        record.download_count ?? 0,
        record.created_at,
        record.updated_at,
        record.uploaded_by || 'admin'
      );
    } catch (e) {
      console.warn('SQLite media create warning:', e.message);
    }

    return createdRecord;
  },

  async update(id, updates = {}) {
    const now = new Date().toISOString();
    let updatePayload = { ...updates, updated_at: now };

    // Supabase update
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        let sbPayload = { ...updatePayload };
        let { error } = await supabaseAdmin.from('media_files').update(sbPayload).eq('id', id);

        if (error && (error.message?.includes('text_content') || error.code === 'PGRST204')) {
          delete sbPayload.text_content;
          if (updates.text_content) {
            sbPayload.description = updates.description
              ? `[TEXT_CONTENT]: ${updates.text_content}\n[DESC]: ${updates.description}`
              : `[TEXT_CONTENT]: ${updates.text_content}`;
          }
          const res = await supabaseAdmin.from('media_files').update(sbPayload).eq('id', id);
          error = res.error;
        }

        if (error && (error.message?.includes('check constraint') || error.message?.includes('media_type') || error.code === '23514')) {
          sbPayload.media_type = 'audio';
          await supabaseAdmin.from('media_files').update(sbPayload).eq('id', id);
        }
      } catch (err) {
        console.error('Supabase media update error:', err);
      }
    }

    // SQLite update
    try {
      const db = getDb();
      const fields = [];
      const values = [];

      const allowedKeys = [
        'title',
        'language',
        'language_code',
        'description',
        'tags',
        'text_content',
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

      if (fields.length > 0) {
        fields.push(`updated_at = ?`);
        values.push(now);
        values.push(id);
        db.prepare(`UPDATE media_files SET ${fields.join(', ')} WHERE id = ?`).run(...values);
      }
    } catch (e) {
      console.warn('SQLite media update warning:', e.message);
    }

    return await this.findById(id);
  },

  async incrementDownload(id) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data } = await supabaseAdmin.from('media_files').select('download_count').eq('id', id).maybeSingle();
        if (data) {
          await supabaseAdmin
            .from('media_files')
            .update({ download_count: (Number(data.download_count) || 0) + 1 })
            .eq('id', id);
        }
      } catch {}
    }
    try {
      const db = getDb();
      db.prepare(`UPDATE media_files SET download_count = download_count + 1 WHERE id = ?`).run(id);
    } catch {}
  },

  async delete(id) {
    let deleted = false;
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { error } = await supabaseAdmin.from('media_files').delete().eq('id', id);
        if (!error) deleted = true;
      } catch {}
    }
    try {
      const db = getDb();
      const res = db.prepare(`DELETE FROM media_files WHERE id = ?`).run(id);
      if (res.changes > 0) deleted = true;
    } catch {}
    return deleted;
  },

  async getStats() {
    // 1. Supabase instant stats calculation
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('media_files')
          .select('media_type, file_extension, language_code, download_count, is_public');

        if (!error && Array.isArray(data)) {
          let totalAudio = 0;
          let totalVideo = 0;
          let totalText = 0;
          let totalDownloads = 0;
          const langSet = new Set();

          for (const row of data) {
            const ext = row.file_extension?.toLowerCase();
            const isDoc = DOCUMENT_EXTENSIONS.has(ext) || row.media_type === 'text';

            if (isDoc) {
              totalText++;
            } else if (row.media_type === 'audio') {
              totalAudio++;
            } else if (row.media_type === 'video') {
              totalVideo++;
            }

            if (row.language_code) langSet.add(row.language_code);
            totalDownloads += Number(row.download_count) || 0;
          }

          return {
            totalFiles: data.length,
            totalAudio,
            totalVideo,
            totalText,
            totalLanguages: langSet.size,
            totalDownloads,
          };
        }
      } catch (err) {
        console.warn('Supabase stats error, falling back to SQLite:', err.message);
      }
    }

    // 2. High-speed single aggregated query in SQLite
    try {
      const db = getDb();
      const rows = db.prepare(`
        SELECT media_type, file_extension, language_code, download_count FROM media_files
      `).all();

      let totalAudio = 0;
      let totalVideo = 0;
      let totalText = 0;
      let totalDownloads = 0;
      const langSet = new Set();

      for (const row of rows) {
        const ext = row.file_extension?.toLowerCase();
        const isDoc = DOCUMENT_EXTENSIONS.has(ext) || row.media_type === 'text';

        if (isDoc) {
          totalText++;
        } else if (row.media_type === 'audio') {
          totalAudio++;
        } else if (row.media_type === 'video') {
          totalVideo++;
        }

        if (row.language_code) langSet.add(row.language_code);
        totalDownloads += Number(row.download_count) || 0;
      }

      return {
        totalFiles: rows.length,
        totalAudio,
        totalVideo,
        totalText,
        totalLanguages: langSet.size,
        totalDownloads,
      };
    } catch (e) {
      return {
        totalFiles: 0,
        totalAudio: 0,
        totalVideo: 0,
        totalText: 0,
        totalLanguages: 0,
        totalDownloads: 0,
      };
    }
  },
};

export const languageRepo = {
  async findAll() {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: langs, error: lErr } = await supabaseAdmin.from('languages').select('*').order('name');
        const { data: media } = await supabaseAdmin.from('media_files').select('language_code');

        if (!lErr && Array.isArray(langs)) {
          const countMap = {};
          if (Array.isArray(media)) {
            for (const m of media) {
              countMap[m.language_code] = (countMap[m.language_code] || 0) + 1;
            }
          }
          return langs.map((r) => ({
            code: r.code,
            name: r.name,
            nativeName: r.native_name,
            badgeColor: r.badge_color || 'bg-slate-100 text-slate-800 border-slate-300',
            fileCount: countMap[r.code] || 0,
            createdAt: r.created_at,
          }));
        }
      } catch {}
    }

    try {
      const db = getDb();
      const rows = db.prepare(`SELECT * FROM languages ORDER BY name ASC`).all();
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
    } catch {
      return SUPPORTED_LANGUAGES.map((l) => ({ ...l, fileCount: 0 }));
    }
  },

  async create({ code, name, nativeName, badgeColor }) {
    const cleanCode = code.toLowerCase().trim();
    const cleanName = name.trim();
    const color = badgeColor || 'bg-teal-100 text-teal-800 border-teal-300';
    const now = new Date().toISOString();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('languages').upsert({
          code: cleanCode,
          name: cleanName,
          native_name: nativeName ? nativeName.trim() : '',
          badge_color: color,
        });
      } catch {}
    }

    try {
      const db = getDb();
      db.prepare(`
        INSERT OR REPLACE INTO languages (code, name, native_name, badge_color, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(cleanCode, cleanName, nativeName ? nativeName.trim() : '', color, now);
    } catch {}

    return {
      code: cleanCode,
      name: cleanName,
      nativeName: nativeName || '',
      badgeColor: color,
      fileCount: 0,
      createdAt: now,
    };
  },

  async delete(code) {
    const cleanCode = code.toLowerCase().trim();
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('languages').delete().eq('code', cleanCode);
      } catch {}
    }
    try {
      const db = getDb();
      const res = db.prepare(`DELETE FROM languages WHERE code = ?`).run(cleanCode);
      return res.changes > 0;
    } catch {
      return false;
    }
  },
};

export const auditRepo = {
  async log(action, targetId = null, details = null) {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('audit_logs').insert({
          id,
          action,
          target_id: targetId ? String(targetId) : null,
          details: details || {},
          timestamp: now,
        });
      } catch {}
    }

    try {
      const db = getDb();
      db.prepare(`
        INSERT INTO audit_logs (id, action, target_id, details, timestamp)
        VALUES (?, ?, ?, ?, ?)
      `).run(
        id,
        action,
        targetId ? String(targetId) : null,
        details ? JSON.stringify(details) : null,
        now
      );
    } catch {}
  },

  async getRecent(limit = 50) {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('audit_logs')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limit);
        if (!error && Array.isArray(data)) return data;
      } catch {}
    }

    try {
      const db = getDb();
      return db.prepare(`SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?`).all(limit);
    } catch {
      return [];
    }
  },

  async clear() {
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        await supabaseAdmin.from('audit_logs').delete().neq('action', '');
      } catch {}
    }
    try {
      const db = getDb();
      db.prepare(`DELETE FROM audit_logs`).run();
    } catch {}
  },
};
