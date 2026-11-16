import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { sanitizeFilename } from './validator.js';
import { MIME_TYPE_MAP } from './constants.js';

const STORAGE_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'data', 'media')
  : path.join(process.cwd(), 'data', 'media');

if (!fs.existsSync(STORAGE_ROOT)) {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
}

export function getPublicBaseUrl(req = null) {
  if (req) {
    const host = req.headers?.get?.('x-forwarded-host') || req.headers?.get?.('host');
    const proto = req.headers?.get?.('x-forwarded-proto') || (host && (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https');
    if (host) {
      return `${proto}://${host}`;
    }
  }
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.replace(/\/+$/, '');
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

export const storageEngine = {
  async saveFile(buffer, originalName, languageSlug, req = null) {
    const ext = path.extname(originalName).toLowerCase();
    const baseClean = sanitizeFilename(originalName).replace(ext, '');
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const safeFilename = `${baseClean}_${uniqueSuffix}${ext}`;

    const cleanLangDir = languageSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'general';
    const relativeDir = path.join(cleanLangDir);
    const targetDir = path.join(STORAGE_ROOT, relativeDir);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const fullDiskPath = path.join(targetDir, safeFilename);
    await fs.promises.writeFile(fullDiskPath, buffer);

    const storagePath = `${cleanLangDir}/${safeFilename}`.replace(/\\/g, '/');
    const baseUrl = getPublicBaseUrl(req);
    const publicUrl = `${baseUrl}/api/media/file/${storagePath}`;

    return {
      storagePath,
      fullDiskPath,
      publicUrl,
      fileSize: buffer.length,
    };
  },

  async deleteFile(storagePath) {
    try {
      const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
      const fullDiskPath = path.join(STORAGE_ROOT, normalized);
      if (fs.existsSync(fullDiskPath)) {
        await fs.promises.unlink(fullDiskPath);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting file:', err);
      return false;
    }
  },

  fileExists(storagePath) {
    const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
    const fullDiskPath = path.join(STORAGE_ROOT, normalized);
    return fs.existsSync(fullDiskPath);
  },

  getFullDiskPath(storagePath) {
    const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
    return path.join(STORAGE_ROOT, normalized);
  }
};
