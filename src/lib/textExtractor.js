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
    .replace(/&apos;/g, "'")
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
 * Parses a /ToUnicode CMap character mapping stream into a Map<charCode, unicodeChar>
 */
function parseCMap(cmapStr) {
  const map = new Map();
  const bfcharRegex = /beginbfchar([\s\S]*?)endbfchar/g;
  let m;
  while ((m = bfcharRegex.exec(cmapStr)) !== null) {
    const lines = m[1].trim().split('\n');
    for (const line of lines) {
      const pair = line.trim().match(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/);
      if (pair) {
        const charCode = parseInt(pair[1], 16);
        const unicodeCode = parseInt(pair[2], 16);
        if (unicodeCode !== 0) {
          map.set(charCode, String.fromCodePoint(unicodeCode));
        }
      }
    }
  }
  return map;
}

/**
 * Robust PDF text stream extractor supporting compressed streams (FlateDecode, ASCII85Decode)
 * and true Unicode Font CMaps (Hausa, Igbo, Yoruba, and custom font encodings).
 */
function extractPdfText(buffer) {
  try {
    const raw = buffer.toString('latin1');

    // 1. Build map of Object Number -> CMap for all /ToUnicode CMaps in the document
    const objStreamRegex = /(\d+)\s+0\s+obj\s*<<((?:(?!<<)[\s\S])*?)>>\s*stream(?:\r\n|\n)([\s\S]*?)endstream/g;
    const cmapsByObjNum = new Map();
    let m;

    while ((m = objStreamRegex.exec(raw)) !== null) {
      const objNum = m[1];
      const dict = m[2];
      let streamBody = Buffer.from(m[3], 'latin1');
      const lenMatch = dict.match(/\/Length\s+(\d+)/);
      if (lenMatch) {
        const expectedLen = parseInt(lenMatch[1], 10);
        if (expectedLen > 0 && streamBody.length >= expectedLen) {
          streamBody = streamBody.subarray(0, expectedLen);
        }
      }

      const decompressed = decompressPdfStream(streamBody, dict);
      if (decompressed.includes('/CIDInit') || decompressed.includes('beginbfchar')) {
        cmapsByObjNum.set(objNum, parseCMap(decompressed));
      }
    }

    // 2. Map Font Name (/F2+0, /F3+0, /F1) directly to its ToUnicode CMap
    const fontObjRegex = /(\d+)\s+0\s+obj\s*<<((?:(?!<<)[\s\S])*?)>>/g;
    const fontNameToCmap = new Map();
    while ((m = fontObjRegex.exec(raw)) !== null) {
      const dict = m[2];
      const nameMatch = dict.match(/\/Name\s*\/([^\s\/]+)/);
      const toUniMatch = dict.match(/\/ToUnicode\s+(\d+)\s+0\s+R/);
      if (nameMatch && toUniMatch) {
        const fontName = nameMatch[1];
        const toUniObj = toUniMatch[1];
        if (cmapsByObjNum.has(toUniObj)) {
          fontNameToCmap.set(fontName, cmapsByObjNum.get(toUniObj));
        }
      }
    }

    // Merged fallback CMap from all fonts in document
    const mergedCmap = new Map();
    for (const cmap of cmapsByObjNum.values()) {
      for (const [code, char] of cmap.entries()) {
        if (code < 32 || code >= 127) {
          if (!mergedCmap.has(code)) mergedCmap.set(code, char);
        }
      }
    }

    function decodePdfStr(rawStr, currentFont) {
      const cmap = (currentFont && fontNameToCmap.get(currentFont)) || mergedCmap;

      // 1. Replace octal escapes (\001, \002, etc.)
      let str = rawStr.replace(/\\([0-7]{1,3})/g, (match, octal) => {
        const code = parseInt(octal, 8);
        if (cmap && cmap.has(code)) {
          return cmap.get(code);
        }
        // Fallback for Nigerian language hook characters
        if (code === 1) return 'ɗ';
        if (code === 2) return 'ƙ';
        if (code === 3) return 'ɓ';
        if (code === 4) return 'ƴ';
        return String.fromCharCode(code);
      });

      // 2. Replace raw unprintable characters using CMap if present
      const chars = [];
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i);
        if (code < 32 && cmap && cmap.has(code)) {
          chars.push(cmap.get(code));
        } else {
          chars.push(str[i]);
        }
      }
      str = chars.join('');

      return str
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\([()\\])/g, '$1');
    }

    // 3. Extract text content streams
    const streamRegex = /<<((?:(?!<<)[\s\S])*?)>>\s*stream(?:\r\n|\n)([\s\S]*?)endstream/g;
    const paragraphs = [];
    let match;

    while ((match = streamRegex.exec(raw)) !== null) {
      const dict = match[1];
      let streamBody = Buffer.from(match[2], 'latin1');
      const lenMatch = dict.match(/\/Length\s+(\d+)/);
      if (lenMatch) {
        const expectedLen = parseInt(lenMatch[1], 10);
        if (expectedLen > 0 && streamBody.length >= expectedLen) {
          streamBody = streamBody.subarray(0, expectedLen);
        }
      }

      // Skip embedded font binaries and CID metadata
      if (
        dict.includes('/FontFile') ||
        dict.includes('/Type /Font') ||
        dict.includes('/ToUnicode') ||
        dict.includes('/CIDInit')
      ) {
        continue;
      }

      const decompressed = decompressPdfStream(streamBody, dict);
      if (decompressed.includes('/CIDInit') || decompressed.includes('beginbfchar')) continue;

      // Extract text inside BT (Begin Text) ... ET (End Text) blocks
      const btRegex = /BT([\s\S]*?)ET/g;
      let btMatch;

      while ((btMatch = btRegex.exec(decompressed)) !== null) {
        const block = btMatch[1];
        const lines = [];
        let currentFont = null;

        // Track active font and extract text operators
        const opRegex = /(?:\/([^\s\/]+)\s+[\d.]+\s+Tf)|\(([\s\S]*?)\)\s*(?:Tj|'|")|\[([\s\S]*?)\]\s*TJ/g;
        let opMatch;

        while ((opMatch = opRegex.exec(block)) !== null) {
          if (opMatch[1]) {
            currentFont = opMatch[1];
          } else if (opMatch[2] !== undefined) {
            const decoded = decodePdfStr(opMatch[2], currentFont).trim();
            if (decoded) lines.push(decoded);
          } else if (opMatch[3] !== undefined) {
            const inner = opMatch[3].match(/\(([\s\S]*?)\)/g);
            if (inner) {
              const joined = inner
                .map((s) => decodePdfStr(s.slice(1, -1), currentFont))
                .join('');
              if (joined.trim()) lines.push(joined.trim());
            }
          }
        }

        if (lines.length > 0) {
          paragraphs.push(lines.join(' '));
        }
      }
    }

    if (paragraphs.length > 0) {
      const extracted = cleanText(paragraphs.join('\n\n').normalize('NFC'));
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
