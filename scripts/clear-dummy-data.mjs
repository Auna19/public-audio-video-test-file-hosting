import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'platform.db');
const MEDIA_DIR = path.join(DATA_DIR, 'media');

console.log('--- Clearing Dummy Data & Resetting Fresh Metrics ---');

if (fs.existsSync(DB_PATH)) {
  const db = new DatabaseSync(DB_PATH);
  
  const beforeCount = db.prepare('SELECT COUNT(*) as count FROM media_files').get().count;
  console.log(`Current media files in database: ${beforeCount}`);

  // Delete all media files and audit logs
  db.prepare('DELETE FROM media_files').run();
  db.prepare('DELETE FROM audit_logs').run();

  const afterCount = db.prepare('SELECT COUNT(*) as count FROM media_files').get().count;
  console.log(`✓ Media files after cleanup: ${afterCount}`);

  const langCount = db.prepare('SELECT COUNT(*) as count FROM languages').get().count;
  console.log(`✓ Retained language categories: ${langCount}`);
  
  db.close();
}

// Clean physical media storage directory
if (fs.existsSync(MEDIA_DIR)) {
  const subdirs = fs.readdirSync(MEDIA_DIR);
  for (const sub of subdirs) {
    const fullSub = path.join(MEDIA_DIR, sub);
    try {
      fs.rmSync(fullSub, { recursive: true, force: true });
      console.log(`✓ Removed storage directory: ${sub}`);
    } catch (e) {
      console.error(`Failed to remove ${sub}:`, e.message);
    }
  }
}

// Recreate clean root media directory
fs.mkdirSync(MEDIA_DIR, { recursive: true });
console.log('✓ Re-initialized empty media directory at data/media');
console.log('🎉 System is now clean and ready for real uploads with 0 metrics!');
