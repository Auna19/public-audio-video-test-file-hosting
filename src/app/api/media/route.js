import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { mediaRepo, auditRepo } from '@/lib/db.js';
import { storageEngine, getPublicBaseUrl } from '@/lib/storage.js';
import { validateMediaFile } from '@/lib/validator.js';
import { getAuthenticatedAdmin } from '@/lib/auth.js';
import { SUPPORTED_LANGUAGES, DOCUMENT_EXTENSIONS } from '@/lib/constants.js';
import { extractTextFromBuffer } from '@/lib/textExtractor.js';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const language = searchParams.get('language') || 'all';
    const mediaType = searchParams.get('mediaType') || 'all';
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';

    const admin = await getAuthenticatedAdmin();
    const onlyPublic = !admin || searchParams.get('scope') === 'public';

    const files = await mediaRepo.findAll({
      language,
      mediaType,
      search,
      onlyPublic,
      sort,
    });

    const baseUrl = getPublicBaseUrl(req);
    const normalizedFiles = files.map((f) => ({
      ...f,
      public_url: `${baseUrl}/api/media/file/${f.storage_path}`,
    }));

    return NextResponse.json({ files: normalizedFiles });
  } catch (error) {
    console.error('Failed to fetch media files:', error);
    return NextResponse.json({ error: 'Failed to retrieve media files' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const admin = await getAuthenticatedAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized: Administrator access required to upload files.' },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    let file = formData.get('file');
    const title = formData.get('title') || '';
    const languageCode = formData.get('language') || 'ha';
    const customLanguage = formData.get('customLanguage') || '';
    const description = formData.get('description') || '';
    const tags = formData.get('tags') || '';
    const directText = formData.get('textContent') || formData.get('text') || '';
    const sourceUrl = formData.get('sourceUrl') || formData.get('url') || '';

    let fileName = '';
    let buffer = null;
    let fileSize = 0;

    if (file && typeof file.arrayBuffer === 'function') {
      fileName = file.name;
      fileSize = file.size;
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else if (directText || sourceUrl) {
      const sanitizedTitle = (typeof title === 'string' && title.trim())
        ? title.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_')
        : 'text_document';
      fileName = `${sanitizedTitle}.txt`;
      const textToSave = directText || `Source URL: ${sourceUrl}`;
      buffer = Buffer.from(textToSave, 'utf-8');
      fileSize = buffer.length;
    } else {
      return NextResponse.json({ error: 'No media file or text content provided' }, { status: 400 });
    }

    let languageName = 'Other';
    if (languageCode === 'other') {
      languageName = customLanguage.trim() || 'Other';
    } else {
      const match = SUPPORTED_LANGUAGES.find((l) => l.code === languageCode);
      languageName = match ? match.name : 'Unknown';
    }

    const validation = validateMediaFile(fileName, fileSize, buffer);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    let extractedText = '';
    if (validation.mediaType === 'text' || DOCUMENT_EXTENSIONS.has(validation.fileExtension)) {
      if (typeof directText === 'string' && directText.trim()) {
        extractedText = directText.trim();
      } else {
        extractedText = extractTextFromBuffer(buffer, fileName);
      }
    }

    const stored = await storageEngine.saveFile(
      buffer,
      fileName,
      languageCode,
      req
    );

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const finalTitle = (typeof title === 'string' && title.trim()) ? title.trim() : fileName.replace(/\.[^/.]+$/, '');

    const record = {
      id,
      title: finalTitle,
      original_file_name: fileName,
      storage_path: stored.storagePath,
      public_url: stored.publicUrl,
      language: languageName,
      language_code: languageCode,
      media_type: validation.mediaType,
      file_extension: validation.fileExtension,
      mime_type: validation.mimeType,
      file_size: stored.fileSize,
      description: typeof description === 'string' && description.trim() ? description.trim() : (sourceUrl ? `Source: ${sourceUrl}` : null),
      tags: typeof tags === 'string' && tags.trim() ? tags.trim() : null,
      text_content: extractedText || null,
      upload_status: 'completed',
      is_public: 1,
      download_count: 0,
      created_at: now,
      updated_at: now,
      uploaded_by: admin.user,
    };

    const created = await mediaRepo.create(record);
    await auditRepo.log('UPLOAD_MEDIA', id, { title: finalTitle, storagePath: stored.storagePath });

    return NextResponse.json({
      success: true,
      file: created,
      message: 'Media uploaded successfully and public direct URL generated.',
    });
  } catch (error) {
    console.error('Upload handler error:', error);
    return NextResponse.json(
      { error: error?.message || 'An error occurred while uploading media' },
      { status: 500 }
    );
  }
}
