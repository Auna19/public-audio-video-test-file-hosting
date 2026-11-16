'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MediaCard from '@/components/MediaCard.jsx';
import ConfirmModal from '@/components/ConfirmModal.jsx';
import EditModal from '@/components/EditModal.jsx';
import ToastContainer from '@/components/Toast.jsx';
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  Languages,
  Download,
  Search,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  RefreshCw,
  HardDrive,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants.js';

export default function AdminDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [viewMode, setViewMode] = useState('table');
  const [toasts, setToasts] = useState([]);

  // Modals state
  const [deleteId, setDeleteId] = useState(null);
  const [editingFile, setEditingFile] = useState(null);

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

  const fetchStats = useCallback(async () => {
    try {
      const statsRes = await fetch('/api/stats', { cache: 'no-store' });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        scope: 'admin',
        language: selectedLang,
        mediaType: selectedType,
        search,
      });
      const filesRes = await fetch(`/api/media?${params.toString()}`, { cache: 'no-store' });
      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData.files || []);
      }
    } catch (err) {
      console.error('Failed to load media files:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedLang, selectedType, search]);

  const checkAuthAndLoad = useCallback(async () => {
    try {
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        router.push('/login');
        return;
      }
      await Promise.all([fetchStats(), loadMedia()]);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  }, [fetchStats, loadMedia, router]);

  useEffect(() => {
    checkAuthAndLoad();
    // Fast polling every 10 seconds to keep metrics always updated in real time
    const interval = setInterval(() => {
      fetchStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [selectedLang, selectedType]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMedia();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/media/${deleteId}`, { method: 'DELETE' });
      if (res.ok) {
        addToast('Media file and physical storage deleted successfully.', 'success');
        setFiles((prev) => prev.filter((f) => f.id !== deleteId));
        setStats((prev) => prev ? { ...prev, totalFiles: Math.max(0, prev.totalFiles - 1) } : null);
      } else {
        addToast('Failed to delete media file.', 'error');
      }
    } catch {
      addToast('An error occurred during deletion.', 'error');
    } finally {
      setDeleteId(null);
    }
  };

  const handleTogglePublic = async (file) => {
    try {
      const nextPublic = file.is_public ? 0 : 1;
      const res = await fetch(`/api/media/${file.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: nextPublic }),
      });
      if (res.ok) {
        const updated = await res.json();
        setFiles((prev) => prev.map((f) => (f.id === file.id ? updated.file : f)));
        addToast(
          nextPublic ? 'Public access enabled for this file.' : 'Public access disabled (URL now blocked).',
          'info'
        );
      }
    } catch {
      addToast('Failed to update public status.', 'error');
    }
  };

  const handleSaveEdit = async (id, updates) => {
    const res = await fetch(`/api/media/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      const data = await res.json();
      setFiles((prev) => prev.map((f) => (f.id === id ? data.file : f)));
      addToast('Media details updated successfully.', 'success');
    } else {
      addToast('Failed to update media file.', 'error');
    }
  };

  const copyUrl = (url) => {
    navigator.clipboard.writeText(url);
    addToast('Direct file URL copied successfully!', 'success');
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDate = (isoStr) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col">
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Administrator Dashboard
              </h1>
              <span className="rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold">
                Admin Mode
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage uploaded audio & video test samples, monitor downloads, and generate direct public URLs.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href="/admin/upload"
              className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition active:scale-95"
            >
              <UploadCloud className="h-4 w-4" />
              <span>Upload New Media</span>
            </Link>

            <button
              onClick={checkAuthAndLoad}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-xs transition"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Section 6 Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Total Files</span>
              <HardDrive className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalFiles : 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Across all formats</p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Audio Files</span>
              <FileAudio className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalAudio : 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Speech & dialogue</p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Video Files</span>
              <FileVideo className="h-4 w-4 text-indigo-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalVideo : 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">MP4, WebM, etc.</p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Languages</span>
              <Languages className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalLanguages : 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Nigerian & others</p>
          </div>

          <div className="col-span-2 lg:col-span-1 rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200/90 dark:border-slate-800">
            <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
              <span className="text-xs font-medium uppercase tracking-wider">Downloads</span>
              <Download className="h-4 w-4 text-amber-600" />
            </div>
            <div className="text-2xl font-black text-slate-900 dark:text-white">
              {stats ? stats.totalDownloads : 0}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">Total downloads</p>
          </div>
        </div>

        {/* Media Management Section */}
        <div className="rounded-2xl bg-white dark:bg-slate-900 shadow-xs border border-slate-200/90 dark:border-slate-800 overflow-hidden">
          <div className="p-5 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter media files..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Languages</option>
                {SUPPORTED_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3 py-2 text-xs sm:text-sm text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All Types</option>
                <option value="audio">Audio Only</option>
                <option value="video">Video Only</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 self-end md:self-auto">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'table'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Table View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  viewMode === 'cards'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                Card View
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
              <p className="mt-3 text-xs">Loading media collection...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-16 text-center">
              <FileAudio className="mx-auto h-12 w-12 text-slate-400" />
              <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No media records found</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Upload your first audio or video sample to get started.
              </p>
              <Link
                href="/admin/upload"
                className="inline-flex items-center gap-2 mt-4 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
              >
                <UploadCloud className="h-4 w-4" /> Upload Media
              </Link>
            </div>
          ) : viewMode === 'cards' ? (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {files.map((file) => (
                <MediaCard
                  key={file.id}
                  file={file}
                  isAdmin={true}
                  onDelete={(id) => setDeleteId(id)}
                  onEdit={(f) => setEditingFile(f)}
                  onTogglePublic={(f) => handleTogglePublic(f)}
                  onCopySuccess={(msg) => addToast(msg, 'success')}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Title & File</th>
                    <th className="py-3 px-4">Language</th>
                    <th className="py-3 px-4">Type / Ext</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Public Status</th>
                    <th className="py-3 px-4">Downloads</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {files.map((file) => (
                    <tr key={file.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 dark:text-white truncate" title={file.title}>
                          {file.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 truncate" title={file.original_file_name}>
                          {file.original_file_name}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                          {file.language}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono">
                        <span className="inline-flex items-center gap-1 rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] text-slate-700 dark:text-slate-300">
                          {file.media_type === 'audio' ? <FileAudio className="h-3 w-3 text-emerald-600" /> : <FileVideo className="h-3 w-3 text-indigo-600" />}
                          {file.file_extension}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {formatFileSize(file.file_size)}
                      </td>

                      <td className="py-3.5 px-4">
                        <button
                          type="button"
                          onClick={() => handleTogglePublic(file)}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium transition ${
                            file.is_public
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {file.is_public ? (
                            <>
                              <Globe className="h-3 w-3" /> Public
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3" /> Disabled
                            </>
                          )}
                        </button>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {file.download_count}
                      </td>

                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">
                        {formatDate(file.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => copyUrl(file.public_url)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-2xs"
                            title="Copy direct media URL"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>

                          <a
                            href={file.public_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-2xs"
                            title="Open direct raw media URL"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>

                          <a
                            href={`${file.public_url}?download=1`}
                            download={file.original_file_name}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-2xs"
                            title="Download file"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => setEditingFile(file)}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition shadow-2xs"
                            title="Edit metadata"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteId(file.id)}
                            className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 transition shadow-2xs"
                            title="Delete file"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Media File?"
        message="Are you sure you want to permanently delete this media file? The physical storage file will be deleted and the generated direct URL will immediately stop working (returns 404)."
        confirmLabel="Delete Permanently"
        isDestructive={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />

      <EditModal
        isOpen={!!editingFile}
        file={editingFile}
        onSave={handleSaveEdit}
        onClose={() => setEditingFile(null)}
      />

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
