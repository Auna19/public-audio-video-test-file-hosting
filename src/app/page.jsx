'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Navbar from '@/components/Navbar.jsx';
import MediaCard from '@/components/MediaCard.jsx';
import ToastContainer from '@/components/Toast.jsx';
import {
  Search,
  Filter,
  Volume2,
  Video,
  Layers,
  ArrowUpDown,
  Radio,
  FileAudio,
  CheckCircle,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, SUPPORTED_EXTENSIONS } from '@/lib/constants.js';

export default function PublicLibraryPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExt, setSelectedExt] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        scope: 'public',
        language: selectedLang,
        mediaType: selectedType,
        search,
        sort: sortBy,
      });
      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching public files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [selectedLang, selectedType, sortBy]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadFiles();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Filter by extension locally if selected
  const filteredFiles = useMemo(() => {
    if (selectedExt === 'all') return files;
    return files.filter((f) => f.file_extension.toLowerCase() === selectedExt.toLowerCase());
  }, [files, selectedExt]);

  // Group files by language for easy visual browsing
  const groupedByLanguage = useMemo(() => {
    const map = new Map();

    for (const file of filteredFiles) {
      const code = file.language_code;
      if (!map.has(code)) {
        map.set(code, {
          langName: file.language,
          code: file.language_code,
          items: [],
        });
      }
      map.get(code).items.push(file);
    }

    return Array.from(map.values());
  }, [filteredFiles]);

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-emerald-950 text-white p-8 sm:p-12 mb-10 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-md mb-4">
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              Public Media Repository for AI & ASR Testing
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Multilingual Audio & Video Test Library
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Explore and access sample audio and video recordings in different Nigerian languages.
              These files are provided for speech recognition, transcription, multilingual AI, and
              software testing purposes.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-emerald-200/90">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> Permanent Direct URLs
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> CORS Enabled for External ASR
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <CheckCircle className="h-4 w-4 text-emerald-400" /> No Auth Required for Imports
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Search & Filter Controls */}
        <div className="mb-8 space-y-4 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search recordings by title, description, tags, or file name..."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 pl-10 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              />
            </div>

            <div className="relative">
              <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 pl-10 pr-8 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition"
              >
                <option value="newest">Sort by: Newest Uploads</option>
                <option value="oldest">Sort by: Oldest First</option>
                <option value="downloads_desc">Sort by: Most Downloaded</option>
                <option value="size_desc">Sort by: Largest File Size</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="h-3 w-3" /> Language:
              </span>
              <button
                type="button"
                onClick={() => setSelectedLang('all')}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  selectedLang === 'all'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                All Languages
              </button>

              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setSelectedLang(lang.code)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                    selectedLang === lang.code
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setSelectedType('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  All Types
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('audio')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'audio'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Volume2 className="h-3 w-3" /> Audio
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType('video')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    selectedType === 'video'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <Video className="h-3 w-3" /> Video
                </button>
              </div>

              <select
                value={selectedExt}
                onChange={(e) => setSelectedExt(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Formats</option>
                {SUPPORTED_EXTENSIONS.map((ext) => (
                  <option key={ext} value={ext}>
                    {ext}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Media Results Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <div className="h-10 w-10 animate-spin rounded-full border-3 border-emerald-500 border-t-transparent" />
            <p className="mt-4 text-sm font-medium">Loading multilingual media samples...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
            <FileAudio className="mx-auto h-12 w-12 text-slate-400" />
            <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">No media files found</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
              No audio or video recordings match your current filters. Try changing your search query or language filter.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {groupedByLanguage.map((group) => (
              <section key={group.code} className="space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-200/80 dark:border-slate-800 pb-2">
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>{group.langName}</span>
                    <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-mono font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                      {group.items.length} {group.items.length === 1 ? 'file' : 'files'}
                    </span>
                  </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {group.items.map((file) => (
                    <MediaCard
                      key={file.id}
                      file={file}
                      isAdmin={false}
                      onCopySuccess={(msg) => addToast(msg, 'success')}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
