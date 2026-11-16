import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { storageEngine } from '@/lib/storage.js';
import { mediaRepo } from '@/lib/db.js';
import { MIME_TYPE_MAP } from '@/lib/constants.js';

export const dynamic = 'force-dynamic';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type, Accept',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export async function HEAD(req, { params }) {
  return handleMediaRequest(req, params.path, true);
}

export async function GET(req, { params }) {
  return handleMediaRequest(req, params.path, false);
}

async function handleMediaRequest(req, pathSegments, isHeadOnly) {
  try {
    if (!pathSegments || pathSegments.length === 0) {
      return new NextResponse('Not found', { status: 404 });
    }

    const storagePath = pathSegments.join('/');
    const record = await mediaRepo.findByStoragePath(storagePath);

    if (record && record.is_public === 0) {
      return new NextResponse('This media file is private or access has been disabled', {
        status: 403,
      });
    }

    const url = req.nextUrl ? req.nextUrl : new URL(req.url, 'http://localhost:3000');
    const isDownload = url.searchParams.get('download') === '1' || url.searchParams.get('dl') === '1';

    if (isDownload && !isHeadOnly && record) {
      await mediaRepo.incrementDownload(record.id);
    }

    const fullDiskPath = storageEngine.getFullDiskPath(storagePath);
    const hasLocalFile = fs.existsSync(fullDiskPath);

    // If file is not on local disk (e.g. running on Vercel), redirect to Supabase CDN URL
    if (!hasLocalFile) {
      const supabaseUrl = storageEngine.getSupabasePublicUrl(storagePath);
      if (supabaseUrl) {
        return NextResponse.redirect(supabaseUrl, { status: 307 });
      }
      return new NextResponse('Media file not found', { status: 404 });
    }

    const stat = await fs.promises.stat(fullDiskPath);
    const totalSize = stat.size;
    const ext = path.extname(storagePath).toLowerCase();
    const mimeType = record?.mime_type || MIME_TYPE_MAP[ext] || 'application/octet-stream';
    const originalFileName = record?.original_file_name || path.basename(storagePath);

    const dispositionType = isDownload ? 'attachment' : 'inline';
    const contentDisposition = `${dispositionType}; filename="${encodeURIComponent(originalFileName)}"`;

    const baseHeaders = {
      'Content-Type': mimeType,
      'Accept-Ranges': 'bytes',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type, Accept',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Content-Type, Accept-Ranges',
      'Content-Disposition': contentDisposition,
      'Cache-Control': 'public, max-age=31536000, immutable',
    };

    if (isHeadOnly) {
      baseHeaders['Content-Length'] = totalSize.toString();
      return new NextResponse(null, {
        status: 200,
        headers: baseHeaders,
      });
    }

    const rangeHeader = req.headers.get('range');
    if (rangeHeader && rangeHeader.startsWith('bytes=')) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

      if (isNaN(start) || start >= totalSize || start < 0) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      if (isNaN(end) || end >= totalSize) {
        end = totalSize - 1;
      }

      if (start > end) {
        return new NextResponse(null, {
          status: 416,
          headers: {
            'Content-Range': `bytes */${totalSize}`,
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(fullDiskPath, { start, end });

      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          ...baseHeaders,
          'Content-Range': `bytes ${start}-${end}/${totalSize}`,
          'Content-Length': chunkSize.toString(),
        },
      });
    }

    baseHeaders['Content-Length'] = totalSize.toString();
    const fileStream = fs.createReadStream(fullDiskPath);

    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
      cancel() {
        fileStream.destroy();
      },
    });

    return new NextResponse(webStream, {
      status: 200,
      headers: baseHeaders,
    });
  } catch (error) {
    console.error('File stream error:', error);
    return new NextResponse(`Internal server error: ${error.message}`, { status: 500 });
  }
}
