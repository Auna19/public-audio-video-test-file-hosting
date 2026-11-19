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

      case '.pdf': {
        const text = extractPdfText(buffer);
        if (text && !text.startsWith('%PDF-') && !text.includes('endobj')) {
          return text;
        }
        return '';
      }

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
 * Decodes ASCII85 (Adobe Base85) encoded string into a Buffer
 */
function decodeAscii85(str) {
  const clean = str.replace(/<~|~>/g, '').replace(/\s+/g, '');
  const bytes = [];
  let i = 0;

  while (i < clean.length) {
    if (clean[i] === 'z') {
      bytes.push(0, 0, 0, 0);
      i++;
      continue;
    }

    const chunk = clean.slice(i, i + 5);
    i += chunk.length;

    let value = 0;
    for (let j = 0; j < chunk.length; j++) {
      value = value * 85 + (chunk.charCodeAt(j) - 33);
    }

    for (let j = chunk.length; j < 5; j++) {
      value = value * 85 + 84;
    }

    const outLength = chunk.length - 1;
    const b = [
      (value >>> 24) & 0xff,
      (value >>> 16) & 0xff,
      (value >>> 8) & 0xff,
      value & 0xff,
    ];
    for (let j = 0; j < outLength; j++) {
      bytes.push(b[j]);
    }
  }

  return Buffer.from(bytes);
}

/**
 * Decodes ASCIIHex encoded string into a Buffer
 */
function decodeHex(hexStr) {
  const clean = hexStr.replace(/\s+/g, '').replace(/>/g, '');
  return Buffer.from(clean, 'hex');
}

/**
 * Decompresses a PDF stream buffer considering Filter definitions
 */
function decompressPdfStream(streamBuffer, dictStr = '') {
  let buf = streamBuffer;

  if (
    dictStr.includes('ASCII85Decode') ||
    buf.subarray(0, 2).toString('latin1') === '<~' ||
    /^[!-u\s]+~>/.test(buf.subarray(0, 50).toString('latin1'))
  ) {
    try {
      buf = decodeAscii85(buf.toString('latin1'));
    } catch {}
  } else if (dictStr.includes('ASCIIHexDecode')) {
    try {
      buf = decodeHex(buf.toString('latin1'));
    } catch {}
  }

  try {
    return zlib.inflateSync(buf).toString('latin1');
  } catch {
    try {
      return zlib.inflateRawSync(buf).toString('latin1');
    } catch {
      return buf.toString('latin1');
    }
  }
}

/**
 * Decodes PDF string escapes and octal encodings (supporting Nigerian language hook characters)
 */
function decodePdfString(rawStr) {
  // ReportLab / Type1 / TrueType octal glyph mappings (Hausa / Yoruba / Igbo characters)
  let str = rawStr.replace(/\\([0-7]{1,3})/g, (match, octal) => {
    const code = parseInt(octal, 8);
    if (code === 1) return 'ɗ';
    if (code === 2) return 'ƙ';
    if (code === 3) return 'ɓ';
    if (code === 4) return 'ƴ';
    return String.fromCharCode(code);
  });

  return str
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\([()\\])/g, '$1');
}

/**
 * Robust PDF text stream extractor supporting compressed streams (FlateDecode, ASCII85Decode)
 */
function extractPdfText(buffer) {
  try {
    const raw = buffer.toString('latin1');
    const paragraphs = [];

    // Match each object dictionary that immediately precedes its stream
    const streamRegex = /<<((?:(?!<<)[\s\S])*?)>>\s*stream\r?\n?([\s\S]*?)endstream/g;
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const dict = match[1];
      const streamBody = Buffer.from(match[2].trim(), 'latin1');

      // Skip embedded font binaries and CID mappings that don't contain document body text
      if (
        dict.includes('/FontFile') ||
        dict.includes('/Type /Font') ||
        dict.includes('/ToUnicode') ||
        dict.includes('/CIDInit')
      ) {
        continue;
      }

      const decompressed = decompressPdfStream(streamBody, dict);

      // Extract text inside BT (Begin Text) ... ET (End Text) blocks
      const btRegex = /BT([\s\S]*?)ET/g;
      let btMatch;

      while ((btMatch = btRegex.exec(decompressed)) !== null) {
        const block = btMatch[1];
        const lines = [];

        // Match (...) Tj operators and (...) ' / " operators
        const tjRegex = /\(([\s\S]*?)\)\s*(?:Tj|'|")/g;
        let tjMatch;
        while ((tjMatch = tjRegex.exec(block)) !== null) {
          const decoded = decodePdfString(tjMatch[1]).trim();
          if (decoded) lines.push(decoded);
        }

        // Match [...] TJ array operators
        const bracketTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
        let btjMatch;
        while ((btjMatch = bracketTjRegex.exec(block)) !== null) {
          const inner = btjMatch[1].match(/\(([\s\S]*?)\)/g);
          if (inner) {
            const joined = inner
              .map((s) => decodePdfString(s.slice(1, -1)))
              .join('');
            if (joined.trim()) lines.push(joined.trim());
          }
        }

        if (lines.length > 0) {
          paragraphs.push(lines.join(' '));
        }
      }

      // Fallback within stream: if no BT/ET blocks were present, search for Tj/TJ directly
      if (paragraphs.length === 0) {
        const directTjRegex = /\(([\s\S]*?)\)\s*Tj/g;
        let directMatch;
        const directLines = [];
        while ((directMatch = directTjRegex.exec(decompressed)) !== null) {
          const decoded = decodePdfString(directMatch[1]).trim();
          if (decoded && !/^[%\/0-9\s]+$/.test(decoded)) {
            directLines.push(decoded);
          }
        }
        if (directLines.length > 0) {
          paragraphs.push(directLines.join(' '));
        }
      }
    }

    if (paragraphs.length > 0) {
      const extracted = cleanText(paragraphs.join('\n\n'));
      // Ensure we didn't extract raw PDF syntax
      if (!extracted.startsWith('%PDF-') && !extracted.includes('endobj')) {
        return extracted;
      }
    }
  } catch (err) {
    console.warn('PDF stream extraction warning:', err.message);
  }

  // Never return raw PDF file syntax
  return '';
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

  const cleaned = cleanText(result.join(' '));
  if (cleaned.startsWith('%PDF-') || cleaned.includes('endobj')) {
    return '';
  }
  return cleaned;
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
