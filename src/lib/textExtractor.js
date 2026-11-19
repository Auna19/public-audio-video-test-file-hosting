import path from 'path';
import zlib from 'zlib';

/**
 * Extracts plain text from various document formats (.txt, .docx, .pdf, .csv, .json, .rtf)
 * @param {Buffer|string} input - File buffer or string
 * @param {string} fileName - File name with extension
 * @returns {string} Extracted plain text content
 */
export function extractTextFromBuffer(input, fileName = '') {
  if (!input) return '';

  if (typeof input === 'string') {
    return cleanText(input);
  }

  const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input);
  const ext = path.extname(fileName || '').toLowerCase();

  try {
    switch (ext) {
      case '.txt':
      case '.csv':
      case '.json':
      case '.md':
        return cleanText(buffer.toString('utf-8'));

      case '.rtf':
        return extractRtfText(buffer.toString('latin1'));

      case '.docx':
        return extractDocxText(buffer);

      case '.pdf':
        return extractPdfText(buffer);

      default:
        // Try UTF-8 first, fallback to ASCII printable characters
        const str = buffer.toString('utf-8');
        if (/[\x00-\x08\x0E-\x1F]/.test(str.substring(0, 500))) {
          return extractPrintableChars(buffer);
        }
        return cleanText(str);
    }
  } catch (err) {
    console.warn(`Text extraction warning for ${fileName}:`, err.message);
    return extractPrintableChars(buffer);
  }
}

/**
 * Extracts text from DOCX (zipped XML archive)
 */
function extractDocxText(buffer) {
  try {
    // DOCX is a ZIP file. Locate word/document.xml in the ZIP entries.
    let offset = 0;
    while (offset < buffer.length - 30) {
      // Local file header signature: 0x04034b50 ('PK\x03\x04')
      if (
        buffer[offset] === 0x50 &&
        buffer[offset + 1] === 0x4b &&
        buffer[offset + 2] === 0x03 &&
        buffer[offset + 3] === 0x04
      ) {
        const compressionMethod = buffer.readUInt16LE(offset + 8);
        const compressedSize = buffer.readUInt32LE(offset + 18);
        const fileNameLength = buffer.readUInt16LE(offset + 26);
        const extraFieldLength = buffer.readUInt16LE(offset + 28);

        const entryFileName = buffer
          .subarray(offset + 30, offset + 30 + fileNameLength)
          .toString('utf-8');

        const dataStart = offset + 30 + fileNameLength + extraFieldLength;

        if (entryFileName === 'word/document.xml') {
          const compData = buffer.subarray(dataStart, dataStart + compressedSize);
          let xmlContent = '';

          if (compressionMethod === 8) {
            // Deflated
            try {
              xmlContent = zlib.inflateRawSync(compData).toString('utf-8');
            } catch {
              xmlContent = zlib.inflateSync(compData).toString('utf-8');
            }
          } else if (compressionMethod === 0) {
            // Stored uncompressed
            xmlContent = compData.toString('utf-8');
          }

          if (xmlContent) {
            return parseXmlWordDocument(xmlContent);
          }
        }

        offset = dataStart + compressedSize;
      } else {
        offset++;
      }
    }
  } catch (err) {
    console.warn('DOCX zip parse fallback:', err.message);
  }

  // Fallback: search for <w:t> tags in raw buffer
  return parseXmlWordDocument(buffer.toString('latin1'));
}

/**
 * Parses word/document.xml content into formatted plain text
 */
function parseXmlWordDocument(xmlStr) {
  if (!xmlStr) return '';
  return xmlStr
    .replace(/<w:p[ >]/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<w:br\/>/g, '\n')
    .replace(/<w:t[^>]*>([^<]*)<\/w:t>/g, '$1 ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Basic PDF text stream extractor
 */
function extractPdfText(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const textPieces = [];

    // Find and decompress streams
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let match;
    while ((match = streamRegex.exec(raw)) !== null) {
      const streamBytes = Buffer.from(match[1], 'latin1');
      let decompressed = '';

      try {
        decompressed = zlib.inflateSync(streamBytes).toString('latin1');
      } catch {
        try {
          decompressed = zlib.inflateRawSync(streamBytes).toString('latin1');
        } catch {
          decompressed = match[1];
        }
      }

      // Look for text operators: (...) Tj or [...] TJ
      const tjRegex = /\(([\s\S]*?)\)\s*Tj/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(decompressed)) !== null) {
        textPieces.push(cleanPdfString(tjMatch[1]));
      }

      const bracketTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let btMatch;
      while ((btMatch = bracketTjRegex.exec(decompressed)) !== null) {
        const innerStrings = btMatch[1].match(/\(([\s\S]*?)\)/g);
        if (innerStrings) {
          const joined = innerStrings
            .map((s) => cleanPdfString(s.slice(1, -1)))
            .join(' ');
          textPieces.push(joined);
        }
      }
    }

    if (textPieces.length > 0) {
      return cleanText(textPieces.join(' '));
    }
  } catch (err) {
    console.warn('PDF stream extraction fallback:', err.message);
  }

  return extractPrintableChars(buffer);
}

function cleanPdfString(str) {
  return str
    .replace(/\\([()\\])/g, '$1')
    .replace(/\\r/g, '\r')
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t');
}

/**
 * Extracts plain text from RTF (Rich Text Format)
 */
function extractRtfText(rtfStr) {
  return rtfStr
    .replace(/\\par[d]?/g, '\n')
    .replace(/\\tab/g, '\t')
    .replace(/\{\*?\\[^{}]+;?\}/g, '')
    .replace(/\\[a-z0-9\-]+ ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Fallback to extract printable UTF-8 or ASCII sequences
 */
function extractPrintableChars(buffer) {
  const result = [];
  let currentWord = [];

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    // Printable ASCII + common newlines or tab
    if (
      (byte >= 32 && byte <= 126) ||
      byte === 10 ||
      byte === 13 ||
      byte === 9 ||
      byte >= 160
    ) {
      currentWord.push(byte);
    } else {
      if (currentWord.length >= 3) {
        result.push(Buffer.from(currentWord).toString('utf-8'));
      }
      currentWord = [];
    }
  }

  if (currentWord.length >= 3) {
    result.push(Buffer.from(currentWord).toString('utf-8'));
  }

  return cleanText(result.join(' '));
}

function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
