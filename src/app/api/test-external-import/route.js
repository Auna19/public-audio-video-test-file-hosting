import { NextResponse } from 'next/server';
import { SUPPORTED_EXTENSIONS } from '@/lib/constants.js';

export async function POST(req) {
  try {
    const { url } = await req.json();

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid URL format' }, { status: 400 });
    }

    // Step 1: Validate file extension
    const pathname = parsedUrl.pathname;
    const matchExt = pathname.match(/\.([a-z0-9]+)$/i);
    const ext = matchExt ? `.${matchExt[1].toLowerCase()}` : '';

    if (!ext || !SUPPORTED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({
        success: false,
        step: 'extension_validation',
        error: `Extension validation failed: "${ext || 'none'}" is not a supported audio or video format. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`,
      });
    }

    // Step 2: Fetch headers (simulate external server fetching media)
    const startTime = Date.now();
    let headRes;
    try {
      headRes = await fetch(url, {
        method: 'HEAD',
        headers: {
          'User-Agent': 'ExternalTranscriptionEngine/1.0 (Speech-to-Text Importer)',
        },
      });
    } catch (err) {
      return NextResponse.json({
        success: false,
        step: 'network_fetch',
        error: `Could not connect to URL: ${err?.message || 'Connection failed'}`,
      });
    }

    if (!headRes.ok && headRes.status !== 405) {
      return NextResponse.json({
        success: false,
        step: 'http_status_check',
        error: `External server returned HTTP ${headRes.status} ${headRes.statusText}`,
      });
    }

    // Step 3: Fetch initial bytes to verify media stream and content-type
    const getRes = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'ExternalTranscriptionEngine/1.0 (Speech-to-Text Importer)',
        Range: 'bytes=0-1024',
      },
    });

    const durationMs = Date.now() - startTime;
    const contentType = getRes.headers.get('content-type') || headRes.headers.get('content-type') || 'unknown';
    const contentLength = headRes.headers.get('content-length') || getRes.headers.get('content-length') || 'unknown';
    const acceptRanges = getRes.headers.get('accept-ranges') || headRes.headers.get('accept-ranges') || 'none';
    const cors = getRes.headers.get('access-control-allow-origin') || headRes.headers.get('access-control-allow-origin') || 'none';

    const arrayBuffer = await getRes.arrayBuffer();
    const bytesReceived = arrayBuffer.byteLength;

    if (bytesReceived === 0) {
      return NextResponse.json({
        success: false,
        step: 'stream_read',
        error: 'Media URL responded but returned 0 bytes payload.',
      });
    }

    return NextResponse.json({
      success: true,
      url,
      analysis: {
        fileExtension: ext,
        contentType,
        contentLength: contentLength !== 'unknown' ? parseInt(contentLength, 10) : bytesReceived,
        acceptRanges,
        corsOrigin: cors,
        fetchDurationMs: durationMs,
        bytesSampled: bytesReceived,
        status: getRes.status,
      },
      transcriptionSimulation: {
        jobId: `asr_${Math.random().toString(36).substring(2, 10)}`,
        status: 'queued_for_transcription',
        message: `Successfully validated and imported "${pathname.split('/').pop()}". File queued into ASR transcription pipeline.`,
      },
    });
  } catch (error) {
    console.error('Import tester error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'External import test failed' },
      { status: 500 }
    );
  }
}
