import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.join(process.cwd(), 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const DB_PATH = path.join(DATA_DIR, 'platform.db');

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

const db = new DatabaseSync(DB_PATH);

// Initialize schema if not present
db.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS media_files (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT NOT NULL,
    language TEXT NOT NULL,
    language_code TEXT NOT NULL,
    media_type TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    description TEXT,
    tags TEXT,
    upload_status TEXT NOT NULL DEFAULT 'completed',
    is_public INTEGER NOT NULL DEFAULT 1,
    download_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    uploaded_by TEXT DEFAULT 'admin'
  );

  CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    action TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    timestamp TEXT NOT NULL
  );
`);

/**
 * Generate a valid 16kHz Mono 16-bit PCM WAV file with voice-like harmonic formant synthesis
 */
function createSyntheticSpeechWav(durationSeconds = 4, baseFreq = 160) {
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // "fmt " subchunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // Subchunk1Size for PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(1, 22); // NumChannels = 1 (Mono)
  buffer.writeUInt32LE(sampleRate, 24); // SampleRate = 16000 Hz
  buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate = SampleRate * NumChannels * BitsPerSample/8
  buffer.writeUInt16LE(2, 32); // BlockAlign = NumChannels * BitsPerSample/8
  buffer.writeUInt16LE(16, 34); // BitsPerSample = 16

  // "data" subchunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  // Generate speech-like harmonic formants (F0 fundamental + formants F1 and F2)
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Cadence / syllable rhythm (3-4 syllables per sec)
    const envelope = Math.sin(Math.PI * 4 * t) > 0 ? Math.abs(Math.sin(Math.PI * 4 * t)) : 0.08;

    // Pitch variation across words
    const pitch = baseFreq + Math.sin(2 * Math.PI * 1.5 * t) * 25;

    // Harmonic formants
    const s1 = Math.sin(2 * Math.PI * pitch * t);
    const s2 = 0.5 * Math.sin(2 * Math.PI * (pitch * 2.2) * t);
    const s3 = 0.25 * Math.sin(2 * Math.PI * (pitch * 3.5) * t);

    const sample = Math.max(-1, Math.min(1, (s1 + s2 + s3) * envelope * 0.7));
    const intSample = Math.floor(sample * 32767);
    buffer.writeInt16LE(intSample, 44 + i * 2);
  }

  return buffer;
}

/**
 * Generate a valid WebM media file buffer (with standard EBML / Matroska header)
 */
function createSyntheticWebM(durationSec = 3) {
  // Valid EBML Header for WebM:
  // 1A 45 DF A3 (EBML ID) + 40 20 (size 32)
  // 42 86 81 01 (EBMLVersion = 1)
  // 42 F7 81 01 (EBMLReadVersion = 1)
  // 42 F2 81 04 (EBMLMaxIDLength = 4)
  // 42 F3 81 08 (EBMLMaxSizeLength = 8)
  // 42 82 84 77 65 62 6D (DocType = "webm")
  // 42 87 81 02 (DocTypeVersion = 2)
  // 42 85 81 02 (DocTypeReadVersion = 2)
  const ebmlHeader = Buffer.from([
    0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0xf7, 0x81,
    0x01, 0x42, 0xf2, 0x81, 0x04, 0x42, 0xf3, 0x81, 0x08, 0x42, 0x82, 0x84,
    0x77, 0x65, 0x62, 0x6d, 0x42, 0x87, 0x81, 0x02, 0x42, 0x85, 0x81, 0x02,
  ]);

  // Segment header + info placeholder
  const segmentHeader = Buffer.from([
    0x18, 0x53, 0x80, 0x67, 0x01, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
  ]);

  // Additional dummy video clusters to simulate stream size
  const payload = Buffer.alloc(12000, 0x00);
  for (let i = 0; i < payload.length; i += 4) {
    payload.writeUInt32BE(0x1f43b675 ^ i, i);
  }

  return Buffer.concat([ebmlHeader, segmentHeader, payload]);
}

/**
 * Generate a valid MP4 media container buffer (with ftyp box)
 */
function createSyntheticMp4() {
  // ftyp box
  const ftyp = Buffer.from([
    0x00, 0x00, 0x00, 0x20, // size 32
    0x66, 0x74, 0x79, 0x70, // 'ftyp'
    0x69, 0x73, 0x6f, 0x6d, // major_brand: 'isom'
    0x00, 0x00, 0x02, 0x00, // minor_version: 512
    0x69, 0x73, 0x6f, 0x6d, // compatible_brand: 'isom'
    0x69, 0x73, 0x6f, 0x32, // 'iso2'
    0x61, 0x76, 0x63, 0x31, // 'avc1'
    0x6d, 0x70, 0x34, 0x31, // 'mp41'
  ]);

  // moov box
  const moov = Buffer.from([
    0x00, 0x00, 0x00, 0x28, // size 40
    0x6d, 0x6f, 0x6f, 0x76, // 'moov'
    0x00, 0x00, 0x00, 0x20, // mvhd size 32
    0x6d, 0x76, 0x68, 0x64, // 'mvhd'
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x03, 0xe8, // timescale 1000
    0x00, 0x00, 0x0b, 0xb8, // duration 3000 ms
  ]);

  // mdat box
  const mdatHeader = Buffer.from([
    0x00, 0x00, 0x40, 0x00, // size 16384
    0x6d, 0x64, 0x61, 0x74, // 'mdat'
  ]);
  const mdatPayload = Buffer.alloc(16384 - 8, 0xaa);

  return Buffer.concat([ftyp, moov, mdatHeader, mdatPayload]);
}

/**
 * Generate a valid MP3 buffer with ID3v2 header and valid MPEG 1 Layer III audio frames
 */
function createSyntheticMp3(durationSec = 3) {
  // ID3v2.3 header
  const id3Header = Buffer.from([
    0x49, 0x44, 0x33, // "ID3"
    0x03, 0x00,       // version 2.3.0
    0x00,             // flags
    0x00, 0x00, 0x00, 0x20 // tag size (32 bytes)
  ]);
  const id3Body = Buffer.alloc(32, 0);

  // Generate MPEG 1 Layer III frames:
  // Frame header: 0xFF, 0xFB, 0x90, 0x64 (MPEG-1, Layer III, 128kbps, 44.1kHz, stereo, no padding)
  // Frame size = 144 * 128000 / 44100 = 417 bytes
  const frameHeader = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  const framePayload = Buffer.alloc(417 - 4, 0x55);
  const oneFrame = Buffer.concat([frameHeader, framePayload]);

  const frameCount = Math.floor(durationSec * (44100 / 1152));
  const frames = [];
  for (let i = 0; i < frameCount; i++) {
    frames.push(oneFrame);
  }

  return Buffer.concat([id3Header, id3Body, ...frames]);
}

const seedItems = [
  // Hausa
  {
    title: 'Hausa Conversation & Daily Greetings Sample',
    original_file_name: 'hausa_conversation_greetings.wav',
    language: 'Hausa',
    language_code: 'ha',
    media_type: 'audio',
    file_extension: '.wav',
    mime_type: 'audio/wav',
    description: 'Clean recording of native Hausa greetings (Ina kwana, lafiya lau) for automatic speech recognition.',
    tags: 'hausa, greetings, conversational, 16khz, clean',
    generator: () => createSyntheticSpeechWav(5, 140),
  },
  {
    title: 'Hausa News & Interview Recording',
    original_file_name: 'hausa_news_broadcast.mp3',
    language: 'Hausa',
    language_code: 'ha',
    media_type: 'audio',
    file_extension: '.mp3',
    mime_type: 'audio/mpeg',
    description: 'Radio news broadcast style recording in standard Kano Hausa accent.',
    tags: 'hausa, news, broadcast, studio, male voice',
    generator: () => createSyntheticMp3(4),
  },

  // Igbo
  {
    title: 'Igbo Proverbs & Dialogue Sample',
    original_file_name: 'igbo_proverbs_dialogue.wav',
    language: 'Igbo',
    language_code: 'ig',
    media_type: 'audio',
    file_extension: '.wav',
    mime_type: 'audio/wav',
    description: 'Asụsụ Igbo proverbs and conversational expressions spoken in Central Igbo dialect.',
    tags: 'igbo, central igbo, proverbs, speech, asusu igbo',
    generator: () => createSyntheticSpeechWav(6, 175),
  },
  {
    title: 'Igbo Community Interview Audio',
    original_file_name: 'igbo_interview_sample.mp3',
    language: 'Igbo',
    language_code: 'ig',
    media_type: 'audio',
    file_extension: '.mp3',
    mime_type: 'audio/mpeg',
    description: 'Interview session with local speaker discussing market trade in Onitsha/Enugu dialect.',
    tags: 'igbo, interview, conversational, trade',
    generator: () => createSyntheticMp3(3.5),
  },

  // Yoruba
  {
    title: 'Yoruba Narrative & Storytelling Audio',
    original_file_name: 'yoruba_narrative_sample.wav',
    language: 'Yoruba',
    language_code: 'yo',
    media_type: 'audio',
    file_extension: '.wav',
    mime_type: 'audio/wav',
    description: 'Èdè Yorùbá narrative sample demonstrating tonal pitch variations and standard grammar.',
    tags: 'yoruba, narrative, tonal, ede yoruba, standard yoruba',
    generator: () => createSyntheticSpeechWav(5.5, 190),
  },
  {
    title: 'Yoruba News & Current Affairs Recording',
    original_file_name: 'yoruba_news_bulletin.mp4',
    language: 'Yoruba',
    language_code: 'yo',
    media_type: 'video',
    file_extension: '.mp4',
    mime_type: 'video/mp4',
    description: 'Short video broadcast snippet with Yoruba subtitles and clean speech audio.',
    tags: 'yoruba, video, broadcast, news, mp4',
    generator: () => createSyntheticMp4(),
  },

  // Nigerian Pidgin
  {
    title: 'Nigerian Pidgin Market Conversation Sample',
    original_file_name: 'pidgin_market_gist.wav',
    language: 'Nigerian Pidgin',
    language_code: 'pcm',
    media_type: 'audio',
    file_extension: '.wav',
    mime_type: 'audio/wav',
    description: 'Everyday Lagos / Warri street Pidgin dialogue: "How you dey?", "Wetin dey happen?".',
    tags: 'pidgin, naija, brokin, market gist, street, lagos',
    generator: () => createSyntheticSpeechWav(4.5, 160),
  },
  {
    title: 'Nigerian Pidgin Radio Commentary',
    original_file_name: 'pidgin_radio_gist.mp3',
    language: 'Nigerian Pidgin',
    language_code: 'pcm',
    media_type: 'audio',
    file_extension: '.mp3',
    mime_type: 'audio/mpeg',
    description: 'High energy Pidgin English radio host banter for multilingual ASR evaluation.',
    tags: 'pidgin, radio, fast-paced, high energy, lagos',
    generator: () => createSyntheticMp3(4),
  },

  // Nigerian English & Video
  {
    title: 'Nigerian English Tech Interview Sample',
    original_file_name: 'nigerian_english_tech_interview.wav',
    language: 'English',
    language_code: 'en',
    media_type: 'audio',
    file_extension: '.wav',
    mime_type: 'audio/wav',
    description: 'West African Nigerian accented English speaking about software engineering and AI.',
    tags: 'english, nigerian accent, tech, professional, 16khz',
    generator: () => createSyntheticSpeechWav(5, 150),
  },
  {
    title: 'Multilingual Speech Demonstration Video',
    original_file_name: 'multilingual_speech_demo.webm',
    language: 'Nigerian Pidgin',
    language_code: 'pcm',
    media_type: 'video',
    file_extension: '.webm',
    mime_type: 'video/webm',
    description: 'Video test recording demonstrating audiovisual speech cues in WebM format.',
    tags: 'video, webm, a-v sync, multimodal, pidgin',
    generator: () => createSyntheticWebM(3),
  },
];

async function runSeed() {
  console.log('Seeding initial Nigerian language media files...');
  const baseUrl = process.env.PUBLIC_URL || 'http://localhost:3000';

  for (const item of seedItems) {
    const langDir = path.join(MEDIA_DIR, item.language_code);
    if (!fs.existsSync(langDir)) {
      fs.mkdirSync(langDir, { recursive: true });
    }

    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    const baseName = item.original_file_name.replace(item.file_extension, '');
    const filename = `${baseName}_${uniqueSuffix}${item.file_extension}`;
    const fullDiskPath = path.join(langDir, filename);

    // Generate binary buffer
    const buffer = item.generator();
    fs.writeFileSync(fullDiskPath, buffer);

    const storagePath = `${item.language_code}/${filename}`;
    const publicUrl = `${baseUrl}/api/media/file/${storagePath}`;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO media_files (
        id, title, original_file_name, storage_path, public_url,
        language, language_code, media_type, file_extension, mime_type,
        file_size, description, tags, upload_status, is_public,
        download_count, created_at, updated_at, uploaded_by
      ) VALUES (
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id,
      item.title,
      item.original_file_name,
      storagePath,
      publicUrl,
      item.language,
      item.language_code,
      item.media_type,
      item.file_extension,
      item.mime_type,
      buffer.length,
      item.description,
      item.tags,
      'completed',
      1,
      Math.floor(Math.random() * 25) + 3, // Initial download counts
      now,
      now,
      'admin'
    );

    console.log(`✓ Seeded [${item.language}] ${item.title} -> ${publicUrl}`);
  }

  console.log('\nSeeding complete! Database and storage initialized.');
}

runSeed().catch(console.error);
