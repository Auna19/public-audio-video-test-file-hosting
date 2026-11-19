import path from 'path';
import {
  SUPPORTED_EXTENSIONS,
  AUDIO_EXTENSIONS,
  VIDEO_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  MIME_TYPE_MAP,
  DEFAULT_MAX_FILE_SIZE_BYTES,
} from './constants.js';

/**
 * Validates a buffer's magic bytes against expected audio/video/document signatures
 */
export function detectFileSignature(buffer) {
  if (!buffer || buffer.length < 4) {
    return {};
  }

  // PDF (%PDF)
  if (buffer.subarray(0, 4).toString('ascii') === '%PDF') {
    return { ext: '.pdf', mime: 'application/pdf', type: 'text' };
  }

  // ZIP / DOCX (PK\x03\x04)
  if (
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04
  ) {
    return {
      ext: '.docx',
      mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      type: 'text',
    };
  }

  // RIFF-based formats (WAV, AVI)
  if (buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.length >= 12) {
    const subType = buffer.subarray(8, 12).toString('ascii');
    if (subType === 'WAVE') {
      return { ext: '.wav', mime: 'audio/wav', type: 'audio' };
    }
    if (subType === 'AVI ') {
      return { ext: '.avi', mime: 'video/x-msvideo', type: 'video' };
    }
  }

  // Ogg container (OGG, OGA, OPUS)
  if (buffer.subarray(0, 4).toString('ascii') === 'OggS') {
    return { ext: '.ogg', mime: 'audio/ogg', type: 'audio' };
  }

  // FLAC
  if (buffer.subarray(0, 4).toString('ascii') === 'fLaC') {
    return { ext: '.flac', mime: 'audio/flac', type: 'audio' };
  }

  // Matroska / WebM
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    const headerStr = buffer.subarray(0, Math.min(buffer.length, 64)).toString('latin1');
    if (headerStr.includes('webm')) {
      return { ext: '.webm', mime: 'video/webm', type: 'video' };
    }
    return { ext: '.mkv', mime: 'video/x-matroska', type: 'video' };
  }

  // ISO Base Media File Format (MP4, M4A, M4V, MOV)
  if (buffer.length >= 8 && buffer.subarray(4, 8).toString('ascii') === 'ftyp') {
    const brand = buffer.subarray(8, 12).toString('ascii').toLowerCase();
    if (brand.includes('m4a') || brand.includes('mp4a')) {
      return { ext: '.m4a', mime: 'audio/mp4', type: 'audio' };
    }
    if (brand.includes('qt') || brand.includes('moov')) {
      return { ext: '.mov', mime: 'video/quicktime', type: 'video' };
    }
    return { ext: '.mp4', mime: 'video/mp4', type: 'video' };
  }

  // QuickTime MOV moov/mdat/wide without ftyp
  if (buffer.length >= 8) {
    const tag = buffer.subarray(4, 8).toString('ascii');
    if (['moov', 'mdat', 'wide', 'free', 'skip'].includes(tag)) {
      return { ext: '.mov', mime: 'video/quicktime', type: 'video' };
    }
  }

  // MP3 with ID3 tag
  if (buffer.subarray(0, 3).toString('ascii') === 'ID3') {
    return { ext: '.mp3', mime: 'audio/mpeg', type: 'audio' };
  }

  // MP3 sync frame (MPEG Audio Layer 3)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    const layer = (buffer[1] >> 1) & 0x03;
    if (layer === 1) { // Layer III
      return { ext: '.mp3', mime: 'audio/mpeg', type: 'audio' };
    }
    if (layer === 3) { // Layer I
      return { ext: '.mp3', mime: 'audio/mpeg', type: 'audio' };
    }
    // AAC ADTS
    return { ext: '.aac', mime: 'audio/aac', type: 'audio' };
  }

  // AMR
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString('ascii') === '#!AMR\n') {
    return { ext: '.amr', mime: 'audio/amr', type: 'audio' };
  }

  // MPEG Program Stream
  if (buffer[0] === 0x00 && buffer[1] === 0x00 && buffer[2] === 0x01 && (buffer[3] === 0xba || buffer[3] === 0xb3)) {
    return { ext: '.mpg', mime: 'video/mpeg', type: 'video' };
  }

  return {};
}

/**
 * Validates uploaded file by name, extension, size, and buffer content.
 */
export function validateMediaFile(
  fileName,
  fileSize,
  buffer = null,
  maxSizeBytes = DEFAULT_MAX_FILE_SIZE_BYTES
) {
  if (!fileName || typeof fileName !== 'string' || fileName.trim().length === 0) {
    return { valid: false, error: 'A valid file name is required.' };
  }

  const ext = path.extname(fileName).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file extension "${ext}". Allowed extensions: ${SUPPORTED_EXTENSIONS.join(', ')}`,
    };
  }

  if (fileSize <= 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  if (fileSize > maxSizeBytes) {
    const maxMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size (${sizeMB} MB) exceeds maximum allowed limit of ${maxMB} MB.`,
    };
  }

  const isAudio = AUDIO_EXTENSIONS.has(ext);
  const isVideo = VIDEO_EXTENSIONS.has(ext);
  const isDocument = DOCUMENT_EXTENSIONS.has(ext);

  const mediaType = isDocument ? 'text' : isAudio ? 'audio' : 'video';
  const defaultMime = MIME_TYPE_MAP[ext] || (isDocument ? 'text/plain' : isAudio ? 'audio/mpeg' : 'video/mp4');

  if (buffer && buffer.length > 0) {
    const detected = detectFileSignature(buffer);
    if (detected.type && detected.type !== mediaType) {
      // Allow general text files (e.g. .txt, .csv) that don't have binary signatures
      if (!isDocument || detected.type !== 'video') {
        // Only error if major mismatch (e.g. video renamed as audio or document)
        if ((isAudio && detected.type === 'video') || (isVideo && detected.type === 'audio')) {
          return {
            valid: false,
            error: `File signature mismatch: File was uploaded as ${mediaType} (${ext}), but content indicates ${detected.type} (${detected.ext}).`,
          };
        }
      }
    }
  }

  return {
    valid: true,
    mediaType,
    fileExtension: ext,
    mimeType: defaultMime,
  };
}

/**
 * Sanitize filename to prevent directory traversal and invalid characters
 */
export function sanitizeFilename(originalName) {
  const baseName = path.basename(originalName);
  const ext = path.extname(baseName).toLowerCase();
  const nameWithoutExt = path.basename(baseName, ext);

  const cleanName = nameWithoutExt
    .toLowerCase()
    .replace(/[^a-z0-9_\-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return (cleanName || 'media_file') + ext;
}
