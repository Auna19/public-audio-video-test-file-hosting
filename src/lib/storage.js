import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { sanitizeFilename } from './validator.js';
import { MIME_TYPE_MAP } from './constants.js';
import { supabaseAdmin, isSupabaseConfigured } from './supabase.js';

const STORAGE_ROOT = process.env.VERCEL
  ? path.join('/tmp', 'data', 'media')
  : path.join(process.cwd(), 'data', 'media');

if (!fs.existsSync(STORAGE_ROOT)) {
  try {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  } catch {}
}

export function getPublicBaseUrl(req = null) {
  if (req) {
    const host = req.headers?.get?.('x-forwarded-host') || req.headers?.get?.('host');
    const proto =
      req.headers?.get?.('x-forwarded-proto') ||
      (host && (host.includes('localhost') || host.includes('127.0.0.1')) ? 'http' : 'https');
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
  async saveFile(buffer, originalName, languageSlug, req = null, customMime = null) {
    const ext = path.extname(originalName).toLowerCase();
    const baseClean = sanitizeFilename(originalName).replace(ext, '');
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const safeFilename = `${baseClean}_${uniqueSuffix}${ext}`;

    const cleanLangDir = languageSlug.toLowerCase().replace(/[^a-z0-9_-]/g, '_') || 'general';
    const storagePath = `${cleanLangDir}/${safeFilename}`.replace(/\\/g, '/');
    const mimeType = customMime || MIME_TYPE_MAP[ext] || 'application/octet-stream';

    // 1. Save to local disk for local caching and fallback
    let fullDiskPath = null;
    try {
      const targetDir = path.join(STORAGE_ROOT, cleanLangDir);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fullDiskPath = path.join(targetDir, safeFilename);
      await fs.promises.writeFile(fullDiskPath, buffer);
    } catch (fsErr) {
      console.warn('Local disk save skipped (expected in serverless):', fsErr.message);
    }

    // 2. Upload to Supabase Storage if configured
    let publicUrl = null;
    if (isSupabaseConfigured && supabaseAdmin) {
      try {
        const { data: uploadData, error: uploadErr } = await supabaseAdmin.storage
          .from('media-library')
          .upload(storagePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadErr) {
          console.error('Supabase storage upload error:', uploadErr);
        } else {
          const { data: pubData } = supabaseAdmin.storage
            .from('media-library')
            .getPublicUrl(storagePath);
          if (pubData?.publicUrl) {
            publicUrl = pubData.publicUrl;
          }
        }
      } catch (sbErr) {
        console.error('Failed to upload to Supabase storage:', sbErr);
      }
    }

    // Fallback to internal streaming URL if Supabase URL not generated
    const baseUrl = getPublicBaseUrl(req);
    if (!publicUrl) {
      publicUrl = `${baseUrl}/api/media/file/${storagePath}`;
    }

    return {
      storagePath,
      fullDiskPath,
      publicUrl,
      fileSize: buffer.length,
    };
  },

  async deleteFile(storagePath) {
    try {
      // Delete from local disk
      const normalized = path.normalize(storagePath).replace(/^(\.\.[\/\\])+/, '');
      const fullDiskPath = path.join(STORAGE_ROOT, normalized);
      if (fs.existsSync(fullDiskPath)) {
        await fs.promises.unlink(fullDiskPath);
      }

      // Delete from Supabase Storage
      if (isSupabaseConfigured && supabaseAdmin) {
        await supabaseAdmin.storage.from('media-library').remove([storagePath]);
      }
      return true;
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
  },

  getSupabasePublicUrl(storagePath) {
    if (isSupabaseConfigured && supabaseAdmin) {
      const { data } = supabaseAdmin.storage.from('media-library').getPublicUrl(storagePath);
      return data?.publicUrl || null;
    }
    return null;
  },
};
