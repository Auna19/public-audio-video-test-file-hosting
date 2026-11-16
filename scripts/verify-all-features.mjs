import { spawn } from 'child_process';

const PORT = 3010;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/media?scope=public`);
      if (res.ok) {
        console.log('✓ Platform server is healthy and responding!');
        return true;
      }
    } catch {}
    await sleep(1000);
  }
  throw new Error('Server failed to start within timeout');
}

async function runTestSuite() {
  console.log('\n=================================================================');
  console.log('🧪 COMPREHENSIVE MULTI-FEATURE & BUTTON VERIFICATION SUITE');
  console.log('=================================================================\n');

  // Pre-clean for guaranteed 0-state
  const { execSync } = await import('child_process');
  execSync('node scripts/clear-dummy-data.mjs', { stdio: 'inherit' });

  // STEP 1: Verify Public Library Empty State (Fresh Metrics)
  console.log('--- Step 1: Public Library Fresh 0-State Verification ---');
  const pubRes = await fetch(`${BASE_URL}/api/media?scope=public`);
  assert(pubRes.status === 200, 'Public library API responds with HTTP 200');
  const pubData = await pubRes.json();
  assert(Array.isArray(pubData.files), 'Returns files array');
  assert(pubData.files.length === 0, `Fresh metrics verified: total files = ${pubData.files.length} (clean 0-state)`);

  // STEP 2: Admin Login
  console.log('\n--- Step 2: Administrator Authentication ---');
  const testUser = process.env.ADMIN_USERNAME || 'test_admin_runner';
  const testPass = process.env.ADMIN_PASSWORD || 'test_secure_pass_9876';

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser, password: testPass }),
  });
  assert(loginRes.status === 200, 'Admin login succeeds with valid credentials');
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes('auth_session_token='), 'Received auth_session_token cookie');
  const authCookie = cookieHeader.split(';')[0];

  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: authCookie },
  });
  const meData = await meRes.json();
  assert(meData.authenticated === true && (meData.user?.username === 'admin' || meData.user === 'admin'), 'Session verification succeeds as admin');

  // STEP 3: Admin Languages (Verify No Crash & Add New Language)
  console.log('\n--- Step 3: Admin Languages Feature (Crash Fixed & Add Language) ---');
  const langRes = await fetch(`${BASE_URL}/api/languages`);
  assert(langRes.status === 200, 'GET /api/languages returns HTTP 200 without crashing');
  const langData = await langRes.json();
  assert(langData.languages.length >= 5, `Initial languages loaded: ${langData.languages.length}`);

  // Create new language (Kanuri)
  const newLangRes = await fetch(`${BASE_URL}/api/languages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({
      code: 'kr',
      name: 'Kanuri',
      nativeName: 'Kànurí',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    }),
  });
  assert(newLangRes.status === 200, 'Created new language category "Kanuri"');
  const newLangData = await newLangRes.json();
  assert(newLangData.language.code === 'kr', 'New language code is "kr"');

  const langResAfter = await fetch(`${BASE_URL}/api/languages`);
  const langDataAfter = await langResAfter.json();
  assert(langDataAfter.languages.some((l) => l.code === 'kr'), 'New language "Kanuri" appears in the active list');

  // STEP 4: Multiple File Upload (Simulating "Upload All" Action)
  console.log('\n--- Step 4: Multi-File Batch Upload (Simulating "Upload All" Action) ---');
  const wavBytes = Buffer.from(
    'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00',
    'binary'
  );
  const mp3Bytes = Buffer.from('ID3\x03\x00\x00\x00\x00\x00#TIT2\x00\x00\x00\x0b\x00\x00\x00Test Track\xff\xfb\x90d\x00\x00', 'binary');

  // File 1: Hausa Speech Sample
  const fd1 = new FormData();
  fd1.append('file', new Blob([wavBytes], { type: 'audio/wav' }), 'real_hausa_sample.wav');
  fd1.append('title', 'Authentic Hausa Dialogue');
  fd1.append('language', 'ha');
  fd1.append('description', 'Conversational speech recorded in Kano');
  fd1.append('tags', 'hausa, conversation, 16khz');

  // File 2: Yoruba Speech Sample
  const fd2 = new FormData();
  fd2.append('file', new Blob([mp3Bytes], { type: 'audio/mpeg' }), 'real_yoruba_sample.mp3');
  fd2.append('title', 'Authentic Yoruba Proverb');
  fd2.append('language', 'yo');
  fd2.append('description', 'Tonal narrative recorded in Ibadan');
  fd2.append('tags', 'yoruba, proverb, tones');

  // Trigger batch upload in parallel (as done by "Upload All Documents" button)
  const [up1, up2] = await Promise.all([
    fetch(`${BASE_URL}/api/media`, { method: 'POST', headers: { Cookie: authCookie }, body: fd1 }),
    fetch(`${BASE_URL}/api/media`, { method: 'POST', headers: { Cookie: authCookie }, body: fd2 }),
  ]);

  assert(up1.status === 200, 'Batch upload item 1 (Hausa WAV) succeeded with HTTP 200');
  assert(up2.status === 200, 'Batch upload item 2 (Yoruba MP3) succeeded with HTTP 200');

  const up1Data = await up1.json();
  const up2Data = await up2.json();

  const file1 = up1Data.file;
  const file2 = up2Data.file;

  assert(file1.public_url.endsWith('.wav'), `Generated URL 1 preserves .wav extension: ${file1.public_url}`);
  assert(file2.public_url.endsWith('.mp3'), `Generated URL 2 preserves .mp3 extension: ${file2.public_url}`);

  // STEP 5: Verify Fresh Metrics Track New Uploads
  console.log('\n--- Step 5: Dashboard Metrics Real-Time Tracking ---');
  const statsRes = await fetch(`${BASE_URL}/api/stats`, { headers: { Cookie: authCookie } });
  const statsData = await statsRes.json();
  assert(statsData.totalFiles === 2, `Fresh metrics tracked: totalFiles = ${statsData.totalFiles} (expected 2)`);
  assert(statsData.totalAudio === 2, `Audio files tracked = ${statsData.totalAudio}`);
  assert(statsData.totalLanguages === 2, `Languages with files tracked = ${statsData.totalLanguages}`);

  // STEP 6: Direct Media Stream & RFC 7233 Range Test
  console.log('\n--- Step 6: Direct Public URL Delivery & Byte-Range Streaming ---');
  const headRes = await fetch(file1.public_url, { method: 'HEAD' });
  assert(headRes.status === 200, 'Direct file URL returns HTTP 200 on HEAD');
  assert(headRes.headers.get('content-type') === 'audio/wav', 'Content-Type header is audio/wav');
  assert(headRes.headers.get('access-control-allow-origin') === '*', 'CORS Access-Control-Allow-Origin: * verified');
  assert(headRes.headers.get('accept-ranges') === 'bytes', 'Accept-Ranges: bytes verified');

  const rangeRes = await fetch(file1.public_url, {
    headers: { Range: 'bytes=0-20' },
  });
  assert(rangeRes.status === 206, 'Range request returns HTTP 206 Partial Content');
  assert(rangeRes.headers.get('content-range')?.startsWith('bytes 0-20/'), 'Content-Range header verified');

  // STEP 7: External Transcription Engine URL Import Test
  console.log('\n--- Step 7: External Transcription Import Simulator ---');
  const simRes = await fetch(`${BASE_URL}/api/test-external-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: file1.public_url }),
  });
  assert(simRes.status === 200, 'Import simulator returned HTTP 200');
  const simData = await simRes.json();
  assert(simData.success === true, 'Simulator validated extension and successfully imported file');
  const jobId = simData.transcriptionSimulation?.jobId || simData.job?.jobId;
  assert(jobId !== undefined, `Automated transcription job queued: ${jobId}`);

  // STEP 8: All Media Files Actions (Edit & Public Toggle)
  console.log('\n--- Step 8: All Media Files Manager Actions (Edit & Visibility) ---');
  // 8a. Edit Title & Tags
  const editRes = await fetch(`${BASE_URL}/api/media/${file1.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ title: 'Updated Hausa Title', tags: 'hausa, updated, speechmatics' }),
  });
  assert(editRes.status === 200, 'PATCH /api/media/[id] edited title and tags');
  const editData = await editRes.json();
  assert(editData.file.title === 'Updated Hausa Title', 'Title updated in database');

  // 8b. Toggle to Private
  const togglePrivRes = await fetch(`${BASE_URL}/api/media/${file1.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ is_public: 0 }),
  });
  assert(togglePrivRes.status === 200, 'Disabled public access for file');

  const blockedFetch = await fetch(file1.public_url);
  assert(blockedFetch.status === 403, 'Direct file URL returns HTTP 403 Forbidden while private');

  // 8c. Toggle back to Public
  const togglePubRes = await fetch(`${BASE_URL}/api/media/${file1.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ is_public: 1 }),
  });
  assert(togglePubRes.status === 200, 'Re-enabled public access for file');

  const restoredFetch = await fetch(file1.public_url);
  assert(restoredFetch.status === 200, 'Direct file URL restored to HTTP 200');

  // STEP 9: Audit Logs / History Verification
  console.log('\n--- Step 9: Upload History & Audit Logs ---');
  const histRes = await fetch(`${BASE_URL}/api/history`, { headers: { Cookie: authCookie } });
  assert(histRes.status === 200, 'GET /api/history returns HTTP 200');
  const histData = await histRes.json();
  assert(histData.logs.length >= 4, `Audit logs captured administrative actions (${histData.logs.length} logged events)`);

  // STEP 10: Clean up test files for pure clean slate
  console.log('\n--- Step 10: Reset to Clean Slate for User ---');
  await fetch(`${BASE_URL}/api/media/${file1.id}`, { method: 'DELETE', headers: { Cookie: authCookie } });
  await fetch(`${BASE_URL}/api/media/${file2.id}`, { method: 'DELETE', headers: { Cookie: authCookie } });

  const finalStatsRes = await fetch(`${BASE_URL}/api/stats`, { headers: { Cookie: authCookie } });
  const finalStats = await finalStatsRes.json();
  assert(finalStats.totalFiles === 0, 'Clean slate maintained: totalFiles reset to 0');

  console.log('\n=================================================================');
  console.log('🎉 ALL FEATURES, BUTTONS, AND METRICS VERIFIED (100% SUCCESS)');
  console.log('=================================================================\n');
}

const testUser = process.env.ADMIN_USERNAME || 'test_admin_runner';
const testPass = process.env.ADMIN_PASSWORD || 'test_secure_pass_9876';

const nextProcess = spawn(process.execPath, ['./node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', PORT.toString()], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: PORT.toString(),
    PUBLIC_URL: BASE_URL,
    ADMIN_USERNAME: testUser,
    ADMIN_PASSWORD: testPass,
  },
});

function killServer() {
  if (!nextProcess || !nextProcess.pid) return;
  try {
    if (process.platform === 'win32') {
      import('child_process').then(({ execSync }) => {
        try { execSync(`taskkill /pid ${nextProcess.pid} /T /F`, { stdio: 'ignore' }); } catch {}
      });
    } else {
      nextProcess.kill('SIGTERM');
    }
  } catch {}
}

waitForServer()
  .then(() => runTestSuite())
  .then(() => {
    console.log('Shutting down test server...');
    killServer();
    process.exit(0);
  })
  .catch((err) => {
    console.error('Test suite failed:', err);
    killServer();
    process.exit(1);
  });
