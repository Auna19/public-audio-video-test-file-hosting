import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const PORT = process.env.TEST_PORT || 3005;
const BASE_URL = `http://127.0.0.1:${PORT}`;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/media?scope=public`);
      if (res.ok) {
        console.log('✓ Platform server is healthy and responding!');
        return true;
      } else {
        const errText = await res.text();
        console.log(`[Attempt ${i+1}/${maxAttempts}] HTTP status: ${res.status}, body: ${errText}`);
      }
    } catch (e) {
      if (i % 2 === 0) {
        console.log(`[Attempt ${i+1}/${maxAttempts}] Error: ${e.message}, Cause:`, e.cause);
      }
    }
    await sleep(1000);
  }
  throw new Error('Server failed to start within timeout');
}

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(message);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING FULL ACCEPTANCE & COMPATIBILITY TEST SUITE');
  console.log('======================================================\n');

  // TEST 1: Public Media Library Browsing
  console.log('--- Test 1: Public Media Library Listing & Filtering ---');
  const publicRes = await fetch(`${BASE_URL}/api/media?scope=public`);
  assert(publicRes.status === 200, 'Public media list returns HTTP 200 without login');
  const publicData = await publicRes.json();
  assert(Array.isArray(publicData.files), 'Public endpoint returns files array');
  assert(publicData.files.length >= 5, `Found ${publicData.files.length} seeded public files`);

  // Test language filter
  const hausaRes = await fetch(`${BASE_URL}/api/media?scope=public&language=ha`);
  const hausaData = await hausaRes.json();
  assert(hausaData.files.every((f) => f.language_code === 'ha'), 'Language filter "ha" correctly filters Hausa recordings');

  // TEST 2: Access Control (Public cannot mutate)
  console.log('\n--- Test 2: Access Control Verification ---');
  const unauthUploadRes = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    body: new FormData(),
  });
  assert(unauthUploadRes.status === 401, 'Unauthorized upload without login is rejected with HTTP 401');

  const unauthDeleteRes = await fetch(`${BASE_URL}/api/media/some-id`, {
    method: 'DELETE',
  });
  const unauthDeleteBody = await unauthDeleteRes.text();
  console.log(`Unauth delete status: ${unauthDeleteRes.status}, body: ${unauthDeleteBody}`);
  assert(unauthDeleteRes.status === 401, 'Unauthorized deletion without login is rejected with HTTP 401');

  // TEST 3: Admin Login & Authentication
  console.log('\n--- Test 3: Administrator Login & Session ---');
  const testUser = process.env.ADMIN_USERNAME || 'test_admin_runner';
  const testPass = process.env.ADMIN_PASSWORD || 'test_secure_pass_9876';

  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: testUser, password: testPass }),
  });
  assert(loginRes.status === 200, 'Admin login with valid credentials succeeds with HTTP 200');
  const cookieHeader = loginRes.headers.get('set-cookie');
  assert(cookieHeader && cookieHeader.includes('auth_session_token='), 'Login sets secure auth_session_token cookie');

  const authCookie = cookieHeader.split(';')[0];

  // Verify /api/auth/me
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: authCookie },
  });
  assert(meRes.status === 200, 'Session verification /api/auth/me returns authenticated: true');
  const meData = await meRes.json();
  assert(meData.user.username === 'admin', 'Authenticated user is admin');

  // TEST 4: Real File Uploads with Metadata
  console.log('\n--- Test 4: Real Audio Upload (WAV, MP3) in Nigerian Languages ---');

  const wavBytes = Buffer.from(
    'RIFF$\x00\x00\x00WAVEfmt \x10\x00\x00\x00\x01\x00\x01\x00\x80>\x00\x00\x00}\x00\x00\x02\x00\x10\x00data\x00\x00\x00\x00',
    'binary'
  );
  const formDataHausa = new FormData();
  formDataHausa.append('file', new Blob([wavBytes], { type: 'audio/wav' }), 'test_hausa_speech.wav');
  formDataHausa.append('title', 'Verified Hausa Test Recording');
  formDataHausa.append('language', 'ha');
  formDataHausa.append('description', 'Native Hausa speaker test file');
  formDataHausa.append('tags', 'hausa, asr-test, 16khz');

  const uploadHausaRes = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: formDataHausa,
  });
  const uploadHausaBody = await uploadHausaRes.text();
  console.log(`Hausa upload status: ${uploadHausaRes.status}, body: ${uploadHausaBody}`);
  assert(uploadHausaRes.status === 200, 'Hausa WAV upload succeeds with HTTP 200');
  const uploadHausaData = JSON.parse(uploadHausaBody);
  assert(uploadHausaData.success === true, 'Upload response indicates success');
  const hausaFile = uploadHausaData.file;
  assert(hausaFile.public_url.endsWith('.wav'), `Generated URL preserves .wav extension: ${hausaFile.public_url}`);
  assert(hausaFile.mime_type === 'audio/wav', 'Detected MIME type is audio/wav');

  // 4b. Upload Identical Filename (Collision resistance test)
  console.log('\n--- Test 5: Collision-Resistant Filename Handling ---');
  const formDataDup = new FormData();
  formDataDup.append('file', new Blob([wavBytes], { type: 'audio/wav' }), 'test_hausa_speech.wav');
  formDataDup.append('title', 'Second File With Same Name');
  formDataDup.append('language', 'ha');

  const uploadDupRes = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: formDataDup,
  });
  assert(uploadDupRes.status === 200, 'Duplicate filename upload succeeds without overwriting');
  const uploadDupData = await uploadDupRes.json();
  assert(uploadDupData.file.storage_path !== hausaFile.storage_path, 'Unique collision-free storage path was created');

  // 4c. Unsupported File Extension Validation Test
  console.log('\n--- Test 6: Unsupported Extension Rejection ---');
  const formDataBad = new FormData();
  formDataBad.append('file', new Blob(['hello world'], { type: 'text/plain' }), 'malicious_script.exe');
  formDataBad.append('title', 'Bad File');
  formDataBad.append('language', 'ha');

  const uploadBadRes = await fetch(`${BASE_URL}/api/media`, {
    method: 'POST',
    headers: { Cookie: authCookie },
    body: formDataBad,
  });
  assert(uploadBadRes.status === 400, 'Unsupported extension (.exe) rejected with HTTP 400');
  const badData = await uploadBadRes.json();
  assert(badData.error.includes('Unsupported file extension'), `Returned clear validation message: ${badData.error}`);

  // TEST 7: Permanent Direct Media URL & Streaming Range Requests
  console.log('\n--- Test 7: Direct Media URL Fetch, Range Requests & CORS ---');
  const directUrl = hausaFile.public_url;

  // HEAD Request
  const headRes = await fetch(directUrl, { method: 'HEAD' });
  assert(headRes.status === 200, 'Direct media URL returns HTTP 200 on HEAD request');
  assert(headRes.headers.get('content-type') === 'audio/wav', 'Content-Type is audio/wav');
  assert(headRes.headers.get('access-control-allow-origin') === '*', 'Access-Control-Allow-Origin: * is set for CORS');
  assert(headRes.headers.get('accept-ranges') === 'bytes', 'Accept-Ranges: bytes header is present');

  // Full GET Request
  const getRes = await fetch(directUrl, { method: 'GET' });
  assert(getRes.status === 200, 'Direct media URL returns HTTP 200 on GET request');
  const downloadedBuf = await getRes.arrayBuffer();
  assert(downloadedBuf.byteLength === wavBytes.length, `Downloaded payload matches uploaded size (${downloadedBuf.byteLength} bytes)`);

  // Partial Range Request (HTTP 206 Partial Content)
  const rangeRes = await fetch(directUrl, {
    headers: { Range: 'bytes=0-15' },
  });
  assert(rangeRes.status === 206, 'HTTP Range request returns HTTP 206 Partial Content');
  assert(rangeRes.headers.get('content-range')?.startsWith('bytes 0-15/'), 'Content-Range header returned accurately');

  // Download Header Verification (?download=1)
  const dlRes = await fetch(`${directUrl}?download=1`);
  assert(dlRes.headers.get('content-disposition')?.startsWith('attachment;'), 'Download query sets Content-Disposition: attachment');

  // TEST 8: External Transcription Application Import Simulation
  console.log('\n--- Test 8: External Transcription Engine URL Import Simulation ---');
  const importSimRes = await fetch(`${BASE_URL}/api/test-external-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: directUrl }),
  });
  assert(importSimRes.status === 200, 'Import simulator returned HTTP 200');
  const importSimData = await importSimRes.json();
  if (!importSimData.success) {
    console.error('Import Sim Error Details:', importSimData);
  }
  assert(importSimData.success === true, 'External import simulation passed extension and stream validation');
  assert(importSimData.analysis.corsOrigin === '*', 'External engine verified CORS origin is *');
  assert(importSimData.transcriptionSimulation.status === 'queued_for_transcription', 'File successfully queued for transcription');

  // TEST 9: Disabling Public Access & URL Invalidation
  console.log('\n--- Test 9: Disabling Public Access Blocks URL ---');
  const disableRes = await fetch(`${BASE_URL}/api/media/${hausaFile.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ is_public: 0 }),
  });
  assert(disableRes.status === 200, 'Admin disabled public access for file');

  const blockedFetchRes = await fetch(directUrl);
  assert(blockedFetchRes.status === 403, 'Direct URL immediately returns HTTP 403 when public access is disabled');

  // Re-enable public access
  await fetch(`${BASE_URL}/api/media/${hausaFile.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: authCookie },
    body: JSON.stringify({ is_public: 1 }),
  });
  const reenabledRes = await fetch(directUrl);
  assert(reenabledRes.status === 200, 'Direct URL restored when public access re-enabled');

  // TEST 10: Deletion & Permanent Storage Removal
  console.log('\n--- Test 10: Permanent Deletion & Storage Cleanup ---');
  const deleteRes = await fetch(`${BASE_URL}/api/media/${hausaFile.id}`, {
    method: 'DELETE',
    headers: { Cookie: authCookie },
  });
  assert(deleteRes.status === 200, 'Admin deleted media record');

  const deletedFetchRes = await fetch(directUrl);
  assert(deletedFetchRes.status === 404, 'Deleted file URL permanently returns HTTP 404');

  // TEST 11: Admin Dashboard Stats
  console.log('\n--- Test 11: Admin Dashboard Stats Counters ---');
  const statsRes = await fetch(`${BASE_URL}/api/stats`, {
    headers: { Cookie: authCookie },
  });
  assert(statsRes.status === 200, 'Admin stats retrieved successfully');
  const statsData = await statsRes.json();
  assert(statsData.totalFiles > 0, `Stats show ${statsData.totalFiles} total files`);
  assert(statsData.totalAudio > 0, `Stats show ${statsData.totalAudio} audio files`);
  assert(statsData.totalVideo > 0, `Stats show ${statsData.totalVideo} video files`);
  assert(statsData.totalLanguages >= 4, `Stats show ${statsData.totalLanguages} languages represented`);

  console.log('\n======================================================');
  console.log('🎉 ALL 11 TEST SUITES PASSED FLAWLESSLY (100% SUCCESS)');
  console.log('======================================================\n');
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

nextProcess.on('error', (err) => {
  console.error('Failed to spawn next process:', err);
});

nextProcess.on('exit', (code, sig) => {
  console.log(`Next process exited with code ${code} and signal ${sig}`);
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
  .then(() => runTests())
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
