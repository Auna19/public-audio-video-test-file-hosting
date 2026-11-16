import { NextResponse } from 'next/server';
import { mediaRepo, auditRepo } from '@/lib/db.js';
import { storageEngine, getPublicBaseUrl } from '@/lib/storage.js';
import { getAuthenticatedAdmin } from '@/lib/auth.js';
import { SUPPORTED_LANGUAGES } from '@/lib/constants.js';

export const dynamic = 'force-dynamic';

export async function GET(req, { params }) {
  try {
    const file = await mediaRepo.findById(params.id);
    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const admin = await getAuthenticatedAdmin();
    if (!file.is_public && !admin) {
      return NextResponse.json({ error: 'File access is restricted or disabled' }, { status: 403 });
    }

    const baseUrl = getPublicBaseUrl(req);
    const normalizedFile = {
      ...file,
      public_url: file.public_url && file.public_url.startsWith('http')
        ? file.public_url
        : `${baseUrl}/api/media/file/${file.storage_path}`,
    };

    return NextResponse.json({ file: normalizedFile });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to retrieve file details' }, { status: 500 });
  }
}

export async function PATCH(req, { params }) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const body = await req.json();
    const existing = await mediaRepo.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    const updates = {};
    if (typeof body.title === 'string' && body.title.trim()) {
      updates.title = body.title.trim();
    }
    if (typeof body.description === 'string') {
      updates.description = body.description.trim();
    }
    if (typeof body.tags === 'string') {
      updates.tags = body.tags.trim();
    }
    if (typeof body.is_public === 'number' || typeof body.is_public === 'boolean') {
      updates.is_public = body.is_public ? 1 : 0;
    }
    if (typeof body.language_code === 'string') {
      updates.language_code = body.language_code;
      if (body.language_code === 'other') {
        updates.language = body.customLanguage || 'Other';
      } else {
        const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === body.language_code);
        updates.language = langObj ? langObj.name : 'Unknown';
      }
    }

    const updated = await mediaRepo.update(params.id, updates);
    await auditRepo.log('UPDATE_MEDIA', params.id, updates);

    return NextResponse.json({ success: true, file: updated });
  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json({ error: 'Failed to update media file' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Admin access required' }, { status: 401 });
    }

    const existing = await mediaRepo.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    await storageEngine.deleteFile(existing.storage_path);
    await mediaRepo.delete(params.id);

    await auditRepo.log('DELETE_MEDIA', params.id, {
      title: existing.title,
      storagePath: existing.storage_path,
    });

    return NextResponse.json({ success: true, message: 'Media file and storage deleted successfully' });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete media file', stack: error.stack }, { status: 500 });
  }
}
