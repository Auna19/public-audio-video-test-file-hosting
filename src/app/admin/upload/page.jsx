'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ToastContainer from '@/components/Toast.jsx';
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  Languages,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Copy,
  ExternalLink,
  Trash2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, SUPPORTED_EXTENSIONS } from '@/lib/constants.js';

export default function AdminUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [defaultLanguage, setDefaultLanguage] = useState('ha');
  const [isBulkUploading, setIsBulkUploading] = useState(false);
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

  useEffect(() => {
    fetch('/api/auth/me').then((res) => {
      if (!res.ok) router.push('/login');
    });
  }, []);

  const handleFilesAdded = (files) => {
    if (!files || files.length === 0) return;

    const newItems = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        addToast(
          `Skipped "${file.name}": Unsupported format "${ext}". Allowed: ${SUPPORTED_EXTENSIONS.join(', ')}`,
          'error'
        );
        continue;
      }

      const cleanTitle = file.name
        .replace(/\.[^/.]+$/, '')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase());

      newItems.push({
        id: Math.random().toString(36).substring(2, 10),
        file,
        title: cleanTitle,
        language: defaultLanguage,
        customLanguage: '',
        description: '',
        tags: '',
        status: 'pending',
        progress: 0,
      });
    }

    setItems((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const updateItem = (id, updates) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...updates } : item)));
  };

  const removeItem = (id) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const applyDefaultLanguageToAll = (langCode) => {
    setDefaultLanguage(langCode);
    setItems((prev) =>
      prev.map((item) =>
        item.status === 'pending' ? { ...item, language: langCode } : item
      )
    );
  };

  const uploadSingleItem = async (item) => {
    updateItem(item.id, { status: 'uploading', progress: 30, error: undefined });

    const formData = new FormData();
    formData.append('file', item.file);
    formData.append('title', item.title);
    formData.append('language', item.language);
    if (item.language === 'other') {
      formData.append('customLanguage', item.customLanguage || 'Other');
    }
    formData.append('description', item.description);
    formData.append('tags', item.tags);

    try {
      updateItem(item.id, { status: 'processing', progress: 75 });

      const res = await fetch('/api/media', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        updateItem(item.id, {
          status: 'failed',
          progress: 0,
          error: data.error || 'Upload failed',
        });
        addToast(`Upload failed for ${item.file.name}: ${data.error}`, 'error');
        return false;
      }

      updateItem(item.id, {
        status: 'completed',
        progress: 100,
        publicUrl: data.file.public_url,
      });
      addToast(`Successfully uploaded "${item.title}"! Public URL ready.`, 'success');
      return true;
    } catch (err) {
      updateItem(item.id, {
        status: 'failed',
        progress: 0,
        error: err?.message || 'Network error occurred during upload',
      });
      addToast(`Network error uploading ${item.file.name}`, 'error');
      return false;
    }
  };

  const handleUploadAll = async () => {
    const pendingItems = items.filter((i) => i.status === 'pending' || i.status === 'failed');
    if (pendingItems.length === 0) return;

    setIsBulkUploading(true);
    addToast(`Starting batch upload of ${pendingItems.length} files...`, 'info');

    // Process in batches of 3 for fast responsive uploads with real-time UI updates
    const BATCH_SIZE = 3;
    for (let i = 0; i < pendingItems.length; i += BATCH_SIZE) {
      const batch = pendingItems.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map((item) => uploadSingleItem(item)));
    }

    setIsBulkUploading(false);
    addToast('Batch upload process completed!', 'success');
  };

  const copyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    addToast('Direct file URL copied successfully!', 'success');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const completedCount = items.filter((i) => i.status === 'completed').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/admin"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white mb-2 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Dashboard
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <UploadCloud className="h-7 w-7 text-emerald-600" />
              Upload Audio & Video Samples
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Select or drag audio and video recordings in Hausa, Igbo, Yoruba, Nigerian Pidgin, or other languages.
            </p>
          </div>

          {items.length > 0 && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setItems([])}
                className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 transition"
              >
                Clear Queue
              </button>
              <button
                type="button"
                onClick={handleUploadAll}
                disabled={isBulkUploading || pendingCount === 0}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload All Pending ({pendingCount})</span>
              </button>
            </div>
          )}
        </div>

        {/* Drag & Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`cursor-pointer relative rounded-3xl border-2 border-dashed p-8 sm:p-12 text-center transition-all ${
            isDragging
              ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 scale-[1.01]'
              : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-emerald-500 hover:bg-slate-50/50 dark:hover:bg-slate-850'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={SUPPORTED_EXTENSIONS.join(',')}
            onChange={(e) => handleFilesAdded(e.target.files)}
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 border border-emerald-200 dark:border-emerald-800 shadow-sm mb-4">
              <UploadCloud className="h-8 w-8" />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Drag & Drop your media files here, or <span className="text-emerald-600 underline">browse</span>
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md">
              Supports multiple files at once. Upload recordings in Hausa, Igbo, Yoruba, Nigerian Pidgin, etc.
            </p>

            <div className="mt-5 flex flex-wrap justify-center gap-1.5 max-w-xl">
              {SUPPORTED_EXTENSIONS.map((ext) => (
                <span
                  key={ext}
                  className="rounded-md bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-mono font-medium text-slate-600 dark:text-slate-400"
                >
                  {ext}
                </span>
              ))}
            </div>

            <p className="mt-3 text-[11px] text-slate-400">
              File signature and MIME headers will be verified. Max file size: 100 MB per file.
            </p>
          </div>
        </div>

        {/* Bulk Default Language Selector */}
        {items.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Languages className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Default Language for Added Files:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => applyDefaultLanguageToAll(lang.code)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    defaultLanguage === lang.code
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prominent "Upload All Documents" Action Card */}
        {items.length > 0 && pendingCount > 0 && (
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-5 text-white shadow-lg shadow-emerald-700/20">
            <div className="flex items-center gap-3.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md shrink-0">
                <Sparkles className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-base sm:text-lg">
                  Ready to upload {pendingCount} {pendingCount === 1 ? 'file' : 'files'}
                </h3>
                <p className="text-xs text-emerald-100">
                  Click the button to start uploading all queued audio and video documents simultaneously.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUploadAll}
              disabled={isBulkUploading}
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold px-6 py-3.5 text-sm shadow-md transition active:scale-95 disabled:opacity-75 cursor-pointer shrink-0"
            >
              {isBulkUploading ? (
                <>
                  <RotateCw className="h-4 w-4 animate-spin text-emerald-700" />
                  <span>Uploading Files ({completedCount}/{items.length})...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="h-5 w-5 text-emerald-700" />
                  <span>Start Uploading All Documents ({pendingCount})</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Upload Queue List */}
        {items.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider px-1">
              <span>File Queue ({items.length})</span>
              <span>
                {completedCount} Completed / {pendingCount} Pending
              </span>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="overflow-hidden rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {item.file.type.startsWith('video') ? (
                        <FileVideo className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <FileAudio className="h-5 w-5 text-emerald-600" />
                      )}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.file.name}</span>
                        <span className="font-mono text-xs text-slate-500">
                          ({formatFileSize(item.file.size)})
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {item.file.type || 'auto-detect MIME'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.status === 'completed' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 text-xs font-semibold">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Upload Completed
                      </span>
                    )}

                    {item.status === 'uploading' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2.5 py-0.5 text-xs font-semibold">
                        <RotateCw className="h-3.5 w-3.5 animate-spin" /> Uploading ({item.progress}%)
                      </span>
                    )}

                    {item.status === 'processing' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 text-xs font-semibold">
                        <RotateCw className="h-3.5 w-3.5 animate-spin" /> Processing & Saving
                      </span>
                    )}

                    {item.status === 'failed' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2.5 py-0.5 text-xs font-semibold">
                        <AlertCircle className="h-3.5 w-3.5" /> Upload Failed
                      </span>
                    )}

                    {item.status === 'pending' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-2.5 py-0.5 text-xs font-medium">
                        Ready to upload
                      </span>
                    )}

                    {item.status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => uploadSingleItem(item)}
                        className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-xs transition"
                      >
                        Upload
                      </button>
                    )}

                    {item.status === 'failed' && (
                      <button
                        type="button"
                        onClick={() => uploadSingleItem(item)}
                        className="rounded-lg bg-rose-600 hover:bg-rose-700 px-3 py-1 text-xs font-semibold text-white shadow-xs transition"
                      >
                        Retry
                      </button>
                    )}

                    {item.status !== 'uploading' && item.status !== 'processing' && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 transition"
                        title="Remove from queue"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {item.error && (
                  <div className="mt-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 p-2.5 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
                    <span>{item.error}</span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Title
                    </label>
                    <input
                      type="text"
                      disabled={item.status === 'completed' || item.status === 'uploading'}
                      value={item.title}
                      onChange={(e) => updateItem(item.id, { title: e.target.value })}
                      placeholder="e.g. Hausa Conversation Sample"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Language
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={item.status === 'completed' || item.status === 'uploading'}
                        value={item.language}
                        onChange={(e) => updateItem(item.id, { language: e.target.value })}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {SUPPORTED_LANGUAGES.map((l) => (
                          <option key={l.code} value={l.code}>
                            {l.name}
                          </option>
                        ))}
                      </select>

                      {item.language === 'other' && (
                        <input
                          type="text"
                          disabled={item.status === 'completed' || item.status === 'uploading'}
                          placeholder="Custom language"
                          value={item.customLanguage}
                          onChange={(e) => updateItem(item.id, { customLanguage: e.target.value })}
                          className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      )}
                    </div>
                  </div>

                  <div className="md:col-span-1">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Tags (optional)
                    </label>
                    <input
                      type="text"
                      disabled={item.status === 'completed' || item.status === 'uploading'}
                      placeholder="e.g. conversational, news, 16khz"
                      value={item.tags}
                      onChange={(e) => updateItem(item.id, { tags: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Description (optional)
                    </label>
                    <input
                      type="text"
                      disabled={item.status === 'completed' || item.status === 'uploading'}
                      placeholder="Context, accent details, speaker demographics..."
                      value={item.description}
                      onChange={(e) => updateItem(item.id, { description: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {item.status === 'completed' && item.publicUrl && (
                  <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 p-3.5 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                        Generated Permanent Direct Public URL:
                      </span>
                      <a
                        href={item.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" /> Open in New Tab
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={item.publicUrl}
                        className="flex-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 select-all"
                      />
                      <button
                        type="button"
                        onClick={() => copyUrl(item.publicUrl)}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition active:scale-95 shrink-0"
                      >
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {pendingCount > 0 && (
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleUploadAll}
                  disabled={isBulkUploading}
                  className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Start Uploading All Documents ({pendingCount})</span>
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
