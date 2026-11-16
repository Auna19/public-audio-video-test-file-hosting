'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar.jsx';
import {
  Sparkles,
  Link as LinkIcon,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  ArrowRight,
  Headphones,
} from 'lucide-react';
import { SUPPORTED_EXTENSIONS } from '@/lib/constants.js';

export default function TestImportPage() {
  const [url, setUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const handleTest = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setTesting(true);
    setResult(null);

    try {
      const res = await fetch('/api/test-external-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        step: 'client_request',
        error: err?.message || 'Failed to execute import test',
      });
    } finally {
      setTesting(false);
    }
  };

  const loadSampleUrl = async (lang) => {
    try {
      const res = await fetch(`/api/media?language=${lang}&limit=1`);
      if (res.ok) {
        const data = await res.json();
        if (data.files && data.files.length > 0) {
          setUrl(data.files[0].public_url);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-8 sm:p-10 text-white shadow-xl mb-8">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 w-fit mb-3">
            <Sparkles className="h-3.5 w-3.5" /> External Transcription Import Simulator
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Verify External Transcription & ASR Compatibility
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-2xl">
            Simulates how an external AI transcription engine (like Whisper, Speechmatics, or a custom ASR pipeline)
            imports media through a direct URL: validating extensions, inspecting HTTP headers, testing CORS, and streaming the file.
          </p>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-xs border border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-emerald-600" />
            Import from a Direct File URL
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Paste any generated public direct file URL. We will validate the extension, fetch the media headers,
            sample the stream, and simulate queueing for transcription.
          </p>

          <form onSubmit={handleTest} className="mt-4 space-y-4">
            <div>
              <div className="relative">
                <input
                  type="url"
                  required
                  placeholder="http://localhost:3000/api/media/file/ha/hausa_conversation_greetings_5e9d7644.wav"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-4 py-3 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span>Quick Test Samples:</span>
                <button
                  type="button"
                  onClick={() => loadSampleUrl('ha')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-emerald-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Hausa Sample
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleUrl('ig')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-amber-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Igbo Sample
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleUrl('yo')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-indigo-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Yoruba Sample
                </button>
                <button
                  type="button"
                  onClick={() => loadSampleUrl('pcm')}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-xs text-purple-600 hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                  Pidgin Sample
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={testing || !url.trim()}
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
            >
              {testing ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin" />
                  <span>Validating & Fetching Media Stream...</span>
                </>
              ) : (
                <>
                  <span>Simulate External Import & Validate</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Supported File Endings: </span>
            <span className="font-mono">{SUPPORTED_EXTENSIONS.join(' ')}</span>
          </div>
        </div>

        {/* Results Panel */}
        {result && (
          <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            {result.success ? (
              <div className="rounded-2xl border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/30 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-100">
                      External Import & Validation Succeeded!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300">
                      The generated direct URL meets all external application requirements.
                    </p>
                  </div>
                </div>

                {result.analysis && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/60 mb-4">
                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">HTTP Status</div>
                      <div className="font-mono text-sm font-bold text-emerald-600">
                        {result.analysis.status} OK
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Content-Type</div>
                      <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {result.analysis.contentType}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">CORS Header</div>
                      <div className="font-mono text-xs font-bold text-emerald-600">
                        {result.analysis.corsOrigin}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Byte Range Seek</div>
                      <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                        {result.analysis.acceptRanges}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Total File Size</div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {(result.analysis.contentLength / 1024).toFixed(1)} KB
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Fetch Latency</div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {result.analysis.fetchDurationMs} ms
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">Stream Sampled</div>
                      <div className="font-mono text-xs text-slate-700 dark:text-slate-300">
                        {result.analysis.bytesSampled} bytes verified
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase font-semibold text-slate-400">File Extension</div>
                      <div className="font-mono text-xs font-bold text-emerald-600">
                        {result.analysis.fileExtension}
                      </div>
                    </div>
                  </div>
                )}

                {result.transcriptionSimulation && (
                  <div className="rounded-xl bg-emerald-100/70 dark:bg-emerald-900/50 p-4 border border-emerald-300 dark:border-emerald-700/80">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 dark:text-emerald-200">
                      <Headphones className="h-4 w-4" />
                      ASR Queue Status: <span className="font-mono">{result.transcriptionSimulation.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-300">
                      {result.transcriptionSimulation.message}
                    </p>
                    <div className="mt-2 text-[10px] font-mono text-emerald-700 dark:text-emerald-400">
                      Simulated Job ID: {result.transcriptionSimulation.jobId}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-300 dark:border-rose-800 bg-rose-50/60 dark:bg-rose-950/30 p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-rose-900 dark:text-rose-100">
                      Import Validation Failed
                    </h3>
                    <p className="text-xs text-rose-700 dark:text-rose-300">
                      Step: <span className="font-mono">{result.step || 'validation'}</span>
                    </p>
                  </div>
                </div>

                <div className="mt-3 rounded-xl bg-white dark:bg-slate-900 p-3.5 border border-rose-200 dark:border-rose-900/60 text-xs font-mono text-rose-700 dark:text-rose-300">
                  {result.error}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
