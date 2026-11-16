import fs from 'fs';
import path from 'path';

// 1. Load .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
for (const line of envFile.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = (match[2] || '').trim().replace(/^['"]|['"]$/g, '');
    process.env[match[1]] = val;
  }
}

const { storageEngine } = await import('../src/lib/storage.js');
const { mediaRepo, auditRepo, languageRepo } = await import('../src/lib/db.js');
const { supabaseAdmin, isSupabaseConfigured } = await import('../src/lib/supabase.js');

console.log('Seeding script starting... isSupabaseConfigured:', isSupabaseConfigured);

// Helper to generate a multi-tone harmonic PCM WAV buffer
function generateHarmonicWav(frequencies, durationSeconds = 6, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = Math.floor(sampleRate * durationSeconds);
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);

  // fmt chunk
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * numChannels * (bitsPerSample / 8), 28);
  buffer.writeUInt16LE(numChannels * (bitsPerSample / 8), 32);
  buffer.writeUInt16LE(bitsPerSample, 34);

  // data chunk
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    // Envelope (fade in 0.1s, fade out 0.2s)
    let env = 1.0;
    if (t < 0.1) env = t / 0.1;
    if (t > durationSeconds - 0.2) env = Math.max(0, (durationSeconds - t) / 0.2);

    let val = 0;
    for (let f = 0; f < frequencies.length; f++) {
      const freq = frequencies[f];
      // Subtle vibrato/modulation
      const mod = Math.sin(2 * Math.PI * 4 * t) * 2;
      val += Math.sin(2 * Math.PI * (freq + mod) * t) / frequencies.length;
    }

    const sample = Math.floor(val * env * 0.45 * 32767);
    buffer.writeInt16LE(sample, 44 + i * 2);
  }

  return buffer;
}

async function seed() {
  // Fetch sample mp4 and mp3 assets once
  console.log('Downloading standard test video and audio templates...');
  let videoBuffer = null;
  let mp3Buffer = null;

  try {
    const vRes = await fetch('https://www.w3schools.com/html/mov_bbb.mp4');
    if (vRes.ok) {
      videoBuffer = Buffer.from(await vRes.arrayBuffer());
      console.log('Loaded test video buffer:', videoBuffer.length, 'bytes');
    }
  } catch (err) {
    console.warn('Could not fetch test video from web:', err.message);
  }

  try {
    const aRes = await fetch('https://www.w3schools.com/html/horse.mp3');
    if (aRes.ok) {
      mp3Buffer = Buffer.from(await aRes.arrayBuffer());
      console.log('Loaded test MP3 buffer:', mp3Buffer.length, 'bytes');
    }
  } catch (err) {
    console.warn('Could not fetch test MP3 from web:', err.message);
  }

  const libraryItems = [
    // HAUSA (ha)
    {
      title: 'Hausa Acoustic Flute & Gangan Drum Rhythm',
      originalName: 'hausa_acoustic_rhythm_44k.wav',
      language: 'Hausa',
      languageCode: 'ha',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Traditional Northern Nigerian acoustic melody test file with gentle flute scales and acoustic percussion.',
      tags: 'hausa, acoustic, flute, northern, test sample',
      buffer: generateHarmonicWav([261.63, 329.63, 392.0, 523.25], 7), // C major chord harmonic
    },
    {
      title: 'Hausa Speech Cadence & Dialogue Benchmark',
      originalName: 'hausa_speech_cadence_sample.wav',
      language: 'Hausa',
      languageCode: 'ha',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Standard speech test sample for audio benchmark and vocal clarity analysis in Hausa language processing.',
      tags: 'hausa, speech, benchmark, dialogue, voice',
      buffer: generateHarmonicWav([220.0, 277.18, 329.63, 440.0], 5), // A major
    },
    {
      title: 'Hausa News Radio Broadcast Segment (MP3)',
      originalName: 'hausa_radio_news_bulletin.mp3',
      language: 'Hausa',
      languageCode: 'ha',
      mediaType: 'audio',
      fileExt: '.mp3',
      mimeType: 'audio/mpeg',
      description: 'Audio recording sample simulating studio radio broadcasting with clear voice compression.',
      tags: 'hausa, broadcast, radio, voice, mp3',
      buffer: mp3Buffer || generateHarmonicWav([293.66, 369.99, 440.0], 6),
    },
    {
      title: 'Hausa Cultural Heritage Video Feature (MP4)',
      originalName: 'hausa_cultural_heritage_test.mp4',
      language: 'Hausa',
      languageCode: 'ha',
      mediaType: 'video',
      fileExt: '.mp4',
      mimeType: 'video/mp4',
      description: 'High-definition MP4 test video with AAC audio track suitable for streaming players and video download verification.',
      tags: 'hausa, video, cultural, mp4, test file',
      buffer: videoBuffer,
    },

    // YORUBA (yo)
    {
      title: 'Yoruba Tonal Pronunciation Acoustic Guide',
      originalName: 'yoruba_tonal_guide_sample.wav',
      language: 'Yoruba',
      languageCode: 'yo',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'High-frequency tone differentiation test file demonstrating do-re-mi high, mid, and low tonal inflections.',
      tags: 'yoruba, tonal, pronunciation, linguistics, acoustic',
      buffer: generateHarmonicWav([349.23, 440.0, 523.25, 698.46], 8), // F major
    },
    {
      title: 'Yoruba Talking Drum Resonance Sample',
      originalName: 'yoruba_talking_drum_resonance.wav',
      language: 'Yoruba',
      languageCode: 'yo',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Rhythmic percussive audio recording modeling Dundun talking drum acoustic dynamics.',
      tags: 'yoruba, percussion, talking drum, dundun, rhythm',
      buffer: generateHarmonicWav([196.0, 246.94, 293.66, 392.0], 6), // G major
    },
    {
      title: 'Yoruba Folk Storytelling & Chant (MP3)',
      originalName: 'yoruba_folktale_narration.mp3',
      language: 'Yoruba',
      languageCode: 'yo',
      mediaType: 'audio',
      fileExt: '.mp3',
      mimeType: 'audio/mpeg',
      description: 'Narrative storytelling voice recording with background ambiance for speech recognition testing.',
      tags: 'yoruba, narration, folktale, story, mp3',
      buffer: mp3Buffer || generateHarmonicWav([261.63, 392.0, 523.25], 5),
    },
    {
      title: 'Yoruba Cultural Festival Video Sample (MP4)',
      originalName: 'yoruba_festival_stream_test.mp4',
      language: 'Yoruba',
      languageCode: 'yo',
      mediaType: 'video',
      fileExt: '.mp4',
      mimeType: 'video/mp4',
      description: 'Full MP4 test video stream with synchronized audio track and video controls.',
      tags: 'yoruba, video, festival, stream, test',
      buffer: videoBuffer,
    },

    // IGBO (ig)
    {
      title: 'Igbo Central Dialect Acoustic Narrative',
      originalName: 'igbo_central_dialect_test.wav',
      language: 'Igbo',
      languageCode: 'ig',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Clear speech audio sample featuring standard Central Igbo articulation and intonation.',
      tags: 'igbo, central dialect, articulation, speech, wav',
      buffer: generateHarmonicWav([329.63, 392.0, 493.88, 659.25], 7), // E minor
    },
    {
      title: 'Igbo Ogene & Highlife Instrumental Rhythm',
      originalName: 'igbo_ogene_highlife_sample.wav',
      language: 'Igbo',
      languageCode: 'ig',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Traditional bell percussion rhythm test file with vibrant acoustic overtone characteristics.',
      tags: 'igbo, ogene, highlife, percussion, music',
      buffer: generateHarmonicWav([261.63, 329.63, 392.0, 440.0, 523.25], 6), // Pentatonic
    },
    {
      title: 'Igbo Proverbs & Cultural Dialogue (MP3)',
      originalName: 'igbo_proverbs_dialogue.mp3',
      language: 'Igbo',
      languageCode: 'ig',
      mediaType: 'audio',
      fileExt: '.mp3',
      mimeType: 'audio/mpeg',
      description: 'Short spoken dialogue recording covering traditional Igbo proverbs and conversational idioms.',
      tags: 'igbo, proverbs, idioms, dialogue, mp3',
      buffer: mp3Buffer || generateHarmonicWav([220.0, 329.63, 440.0], 5),
    },
    {
      title: 'Igbo Traditional Performance Video (MP4)',
      originalName: 'igbo_dance_performance_test.mp4',
      language: 'Igbo',
      languageCode: 'ig',
      mediaType: 'video',
      fileExt: '.mp4',
      mimeType: 'video/mp4',
      description: 'Playable test video demonstrating fast playback, resolution scaling, and volume modulation.',
      tags: 'igbo, video, dance, performance, mp4',
      buffer: videoBuffer,
    },

    // NIGERIAN PIDGIN (pcm)
    {
      title: 'Wazobia Pidgin Radio Talkshow Audio',
      originalName: 'wazobia_pidgin_talkshow_44k.wav',
      language: 'Nigerian Pidgin',
      languageCode: 'pcm',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Energetic Nigerian Pidgin English broadcast sample with conversational phrasing and speech dynamics.',
      tags: 'pidgin, naija, wazobia, broadcast, talkshow',
      buffer: generateHarmonicWav([293.66, 369.99, 440.0, 587.33], 8), // D major
    },
    {
      title: 'Naija Street Vox Pop Audio Sample',
      originalName: 'pidgin_street_vox_pop.wav',
      language: 'Nigerian Pidgin',
      languageCode: 'pcm',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Spontaneous street dialogue audio sample in Nigerian Pidgin English.',
      tags: 'pidgin, vox pop, street dialogue, naija, audio',
      buffer: generateHarmonicWav([261.63, 329.63, 392.0, 523.25], 5),
    },
    {
      title: 'Pidgin Comedy Sketch Audio Clip (MP3)',
      originalName: 'pidgin_comedy_sketch_test.mp3',
      language: 'Nigerian Pidgin',
      languageCode: 'pcm',
      mediaType: 'audio',
      fileExt: '.mp3',
      mimeType: 'audio/mpeg',
      description: 'Humorous spoken voice recording in Pidgin English with dynamic vocal inflection.',
      tags: 'pidgin, comedy, voice, speech, mp3',
      buffer: mp3Buffer || generateHarmonicWav([349.23, 440.0, 523.25], 6),
    },
    {
      title: 'Lagos Marketplace Scene Video (MP4)',
      originalName: 'lagos_market_scene_test.mp4',
      language: 'Nigerian Pidgin',
      languageCode: 'pcm',
      mediaType: 'video',
      fileExt: '.mp4',
      mimeType: 'video/mp4',
      description: 'High quality test video file with stereo sound and seekable timeline.',
      tags: 'pidgin, video, lagos, marketplace, mp4',
      buffer: videoBuffer,
    },

    // ENGLISH (West African) (en)
    {
      title: 'West African English Studio News Broadcast',
      originalName: 'english_west_african_news.wav',
      language: 'English',
      languageCode: 'en',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Formal English speech audio sample with West African phonological characteristics.',
      tags: 'english, news, broadcast, studio, speech',
      buffer: generateHarmonicWav([220.0, 261.63, 329.63, 440.0], 7), // A minor
    },
    {
      title: 'Academic Lecture Speech Sample (English)',
      originalName: 'english_academic_lecture.wav',
      language: 'English',
      languageCode: 'en',
      mediaType: 'audio',
      fileExt: '.wav',
      mimeType: 'audio/wav',
      description: 'Longer speech sample tailored for transcription and automated acoustic analysis testing.',
      tags: 'english, lecture, academic, speech, education',
      buffer: generateHarmonicWav([261.63, 329.63, 392.0, 523.25], 9),
    },
    {
      title: 'Technology Conference Keynote Video (MP4)',
      originalName: 'technology_keynote_presentation.mp4',
      language: 'English',
      languageCode: 'en',
      mediaType: 'video',
      fileExt: '.mp4',
      mimeType: 'video/mp4',
      description: 'Full resolution video test sample with audio track for platform streaming verification.',
      tags: 'english, video, conference, keynote, mp4',
      buffer: videoBuffer,
    },
  ];

  console.log(`\nUploading and registering ${libraryItems.length} test media files...`);

  let count = 0;
  for (const item of libraryItems) {
    if (!item.buffer) {
      console.warn(`Skipping ${item.title}: No buffer available`);
      continue;
    }

    try {
      // 1. Save file via storageEngine (uploads to Supabase Storage + saves locally)
      const stored = await storageEngine.saveFile(
        item.buffer,
        item.originalName,
        item.languageCode,
        null,
        item.mimeType
      );

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const record = {
        id,
        title: item.title,
        original_file_name: item.originalName,
        storage_path: stored.storagePath,
        public_url: stored.publicUrl,
        language: item.language,
        language_code: item.languageCode,
        media_type: item.mediaType,
        file_extension: item.fileExt,
        mime_type: item.mimeType,
        file_size: stored.fileSize,
        description: item.description,
        tags: item.tags,
        upload_status: 'completed',
        is_public: 1,
        download_count: Math.floor(Math.random() * 25) + 3, // Initial realistic downloads
        created_at: now,
        updated_at: now,
        uploaded_by: 'admin',
      };

      // 2. Insert into mediaRepo (writes to Supabase DB + SQLite)
      await mediaRepo.create(record);
      count++;
      console.log(`[${count}/${libraryItems.length}] Uploaded: ${item.title} -> ${stored.publicUrl}`);
    } catch (err) {
      console.error(`Failed to seed ${item.title}:`, err);
    }
  }

  // 3. Log audit record
  await auditRepo.log('SEED_LIBRARY', 'platform', {
    message: `Initialized test library with ${count} media files`,
    count,
  });

  // 4. Verify stats
  const stats = await mediaRepo.getStats();
  console.log('\n=======================================');
  console.log('Seeding Complete! Platform Stats:');
  console.log('Total Files:', stats.totalFiles);
  console.log('Total Audio:', stats.totalAudio);
  console.log('Total Video:', stats.totalVideo);
  console.log('Total Languages:', stats.totalLanguages);
  console.log('Total Downloads:', stats.totalDownloads);
  console.log('=======================================\n');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal seeding error:', err);
    process.exit(1);
  });
