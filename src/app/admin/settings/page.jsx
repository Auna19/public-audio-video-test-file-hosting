'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Server,
  Link as LinkIcon,
  ShieldCheck,
  HardDrive,
  FileCode,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  Info,
  KeyRound,
  RefreshCw,
} from 'lucide-react';
import Toast from '@/components/Toast';

export default function AdminSettingsPage() {
  const [toast, setToast] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
    fetchStats();
  }, []);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch settings stats', err);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setToast({
      title: 'Copied!',
      message: `${label} copied to clipboard.`,
      type: 'success',
    });
  };

  return (
    <div className="space-y-6">
      {toast && (
        <Toast
          title={toast.title}
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600">
          <Settings className="h-4 w-4" /> System Configuration
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Platform & Hosting Settings
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Review direct URL formats, cloud/local storage parameters, CORS streaming headers, and administrator security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Direct URL Integration Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
              <LinkIcon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Direct File URL Engine
              </h2>
              <p className="text-xs text-slate-500">
                Permanent media delivery for external transcription engines
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Public Base Origin
              </label>
              <div className="mt-1.5 flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-800 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200">
                <span>{origin || 'http://localhost:3000'}</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(origin || 'http://localhost:3000', 'Base Origin')}
                  className="text-slate-500 hover:text-emerald-600"
                  title="Copy base origin"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-500">
                Configured automatically via request headers or NEXT_PUBLIC_APP_URL environment variable.
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Direct Public File URL Pattern
              </label>
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-900 p-3 text-xs font-mono text-emerald-400 dark:border-slate-700">
                <code>{origin || 'http://localhost:3000'}/api/media/file/audio/[file_slug]_[hash].[ext]</code>
              </div>
              <ul className="mt-2 space-y-1 text-xs text-slate-600 dark:text-slate-400">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Preserves original valid extensions (.wav, .mp3, .mp4, etc.)
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  Open CORS headers: <code className="text-[11px] text-emerald-600">Access-Control-Allow-Origin: *</code>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  HTTP 206 Partial Content / Range Request compliant
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                  No login required for public samples
                </li>
              </ul>
            </div>

            <div className="pt-2">
              <Link
                href="/test-import"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition"
              >
                <span>Launch Direct URL Import Tester</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Card 2: Storage & File Specifications */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
              <HardDrive className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Storage & Limits
              </h2>
              <p className="text-xs text-slate-500">
                Storage driver and file constraint configuration
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[11px] font-medium text-slate-500">Max Audio Size</span>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">100 MB</p>
                <span className="text-[11px] text-slate-500">per file</span>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="text-[11px] font-medium text-slate-500">Max Video Size</span>
                <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">500 MB</p>
                <span className="text-[11px] text-slate-500">per file</span>
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Storage Driver & Directory
              </span>
              <div className="mt-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs font-mono text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                Driver: Local FS / Cloud-compatible adapter<br />
                Path: /public/uploads/[media_type]/
              </div>
            </div>

            <div>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Validation & Integrity
              </span>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Files are validated against 18 allowed extensions with binary magic byte signature verification (RIFF for WAV, ID3/sync for MP3, ftyp for MP4, EBML for WebM/MKV).
              </p>
            </div>

            {stats && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center text-xs text-slate-600 dark:text-slate-400">
                  <span>Current Library Size:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {stats.storageFormatted || '0 B'} ({stats.totalFiles} files)
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Administrator Security */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Admin Authentication & Sessions
              </h2>
              <p className="text-xs text-slate-500">
                Role-based access control and session token policy
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">Active Administrator</span>
                <p className="text-[11px] text-slate-500">Role: Primary Administrator</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950 dark:text-emerald-400">
                admin
              </span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <div>
                <span className="font-medium text-slate-800 dark:text-slate-200">Session Cookie Policy</span>
                <p className="text-[11px] text-slate-500">HttpOnly, SameSite=Lax, HMAC-SHA256 signature</p>
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-300">7 Days</span>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] leading-relaxed">
                  To update administrator credentials or production secret keys, edit your environment file (<code className="font-mono font-semibold">.env.local</code>) or manage credentials securely via the database table <code className="font-mono font-semibold">admin_users</code>.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Database & Engine Telemetry */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Database & Performance
              </h2>
              <p className="text-xs text-slate-500">
                High-performance synchronous storage & audit logs
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="font-medium text-slate-800 dark:text-slate-200">Database Engine</span>
              <span className="font-mono text-emerald-600 font-semibold dark:text-emerald-400">Node.js 24 SQLite (WAL Mode)</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="font-medium text-slate-800 dark:text-slate-200">Database File</span>
              <span className="font-mono text-slate-600 dark:text-slate-400">data/platform.db</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
              <span className="font-medium text-slate-800 dark:text-slate-200">Audit Logging</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold dark:text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Enabled (audit_logs table)
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={fetchStats}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh System Metrics</span>
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Supabase Cloud Integration */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:col-span-2">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 font-bold">
              ⚡
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">
                Supabase Integration
              </h2>
              <p className="text-xs text-slate-500">
                Client library installed (<code className="font-mono text-emerald-600">@supabase/supabase-js</code>) with ready database migrations and bucket storage
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-medium text-slate-800 dark:text-slate-200">Supabase Client SDK</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Installed (@supabase/supabase-js)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-medium text-slate-800 dark:text-slate-200">SQL Schema & RLS File</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">supabase/schema.sql</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-800/40">
                <span className="font-medium text-slate-800 dark:text-slate-200">Configuration Status</span>
                <span className="text-slate-500 font-medium">Ready (Set keys in .env.local to link)</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40 flex flex-col justify-between">
              <div>
                <span className="font-semibold text-slate-800 dark:text-slate-200">Quick Connect Instructions</span>
                <ol className="mt-2 space-y-1.5 list-decimal list-inside text-slate-600 dark:text-slate-400 text-[11px] leading-relaxed">
                  <li>Run <code className="font-mono text-emerald-600">supabase/schema.sql</code> in your Supabase SQL editor.</li>
                  <li>Paste your <code className="font-mono text-emerald-600">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="font-mono text-emerald-600">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> into <code className="font-mono">.env.local</code>.</li>
                  <li>Restart the server to immediately connect!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
