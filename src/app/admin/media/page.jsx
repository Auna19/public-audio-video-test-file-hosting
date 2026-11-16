'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import MediaCard from '@/components/MediaCard.jsx';
import ConfirmModal from '@/components/ConfirmModal.jsx';
import EditModal from '@/components/EditModal.jsx';
import ToastContainer from '@/components/Toast.jsx';
import NotificationModal from '@/components/NotificationModal.jsx';
import {
  UploadCloud,
  FileAudio,
  FileVideo,
  Search,
  Filter,
  Trash2,
  Edit2,
  Copy,
  ExternalLink,
  Globe,
  Lock,
  Download,
  FolderOpen,
  ArrowUpDown,
  RefreshCw,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, SUPPORTED_EXTENSIONS } from '@/lib/constants.js';

export default function AllMediaPage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedLang, setSelectedLang] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedExt, setSelectedExt] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [viewMode, setViewMode] = useState('table');
  const [toasts, setToasts] = useState([]);
  const [notification, setNotification] = useState({ isOpen: false });

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

  const loadMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        scope: 'admin',
        language: selectedLang,
        mediaType: selectedType,
        search,
        sort: sortBy,
      });
      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list = data.files || [];
        if (selectedExt !== 'all') {
          list = list.filter((f) => f.file_extension.toLowerCase() === selectedExt.toLowerCase());
        }
        setFiles(list);
      }
    } catch (err) {
      console.error('Error loading media:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMedia();
  }, [selectedLang, selectedType, selectedExt, sortBy]);

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
        setNotification({
          isOpen: true,
          type: 'success',
          title: 'Media Deleted Successfully',
          message: 'The media file and its storage record have been permanently removed.',
          autoCloseMs: 3000,
        });
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
        setNotification({
          isOpen: true,
          type: nextPublic ? 'success' : 'info',
          title: nextPublic ? 'Public Access Enabled 🌐' : 'Public Access Disabled 🔒',
          message: nextPublic
            ? `"${file.title}" is now publicly visible and ready for download/streaming.`
            : `"${file.title}" has been disabled. Public requests to its URL will be blocked.`,
          autoCloseMs: 3000,
        });
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
      setNotification({
        isOpen: true,
        type: 'success',
        title: 'Media Details Updated ✍️',
        message: 'Your metadata changes (title, description, tags, language) were saved successfully.',
        autoCloseMs: 3000,
      });
    } else {
      addToast('Failed to update media file.', 'error');
    }
  };

  const copyUrl = (url, title = 'media file') => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    addToast('Direct file URL copied successfully!', 'success');
    setNotification({
      isOpen: true,
      type: 'copy',
      title: 'Direct Link Copied! 📋',
      message: `The direct URL for "${title}" has been copied to your clipboard.`,
      copyUrl: url,
      autoCloseMs: 3500,
    });
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
    <div className="p-6 sm:p-8 max-w-7xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <FolderOpen className="h-7 w-7 text-emerald-600" />
            All Media Files
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Search, filter, manage, and share audio and video sample files in your repository.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/upload"
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition active:scale-95"
          >
            <UploadCloud className="h-4 w-4" />
            <span>Upload New File</span>
          </Link>

          <button
            onClick={loadMedia}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-xs transition"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="mb-6 rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search recordings by title, tags, or file name..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="relative">
            <ArrowUpDown className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="newest">Sort: Newest First</option>
              <option value="oldest">Sort: Oldest First</option>
              <option value="downloads_desc">Sort: Most Downloaded</option>
              <option value="size_desc">Sort: Largest Size</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 justify-end">
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

        {/* Filter Pills */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-slate-500 flex items-center gap-1 mr-1">
              <Filter className="h-3 w-3" /> Language:
            </span>
            <button
              type="button"
              onClick={() => setSelectedLang('all')}
              className={`rounded-lg px-2.5 py-1 transition ${
                selectedLang === 'all'
                  ? 'bg-emerald-600 text-white font-semibold'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All
            </button>
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                type="button"
                onClick={() => setSelectedLang(lang.code)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  selectedLang === lang.code
                    ? 'bg-emerald-600 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {lang.name}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value="all">All Media Types</option>
              <option value="audio">Audio Only</option>
              <option value="video">Video Only</option>
            </select>

            <select
              value={selectedExt}
              onChange={(e) => setSelectedExt(e.target.value)}
              className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 font-mono text-slate-700 dark:text-slate-300 focus:outline-none"
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

      {/* Media Results List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs">Loading media files...</p>
        </div>
      ) : files.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
          <FolderOpen className="mx-auto h-12 w-12 text-slate-400" />
          <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No media records found</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            No files match your current filter settings.
          </p>
        </div>
      ) : viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file) => (
            <MediaCard
              key={file.id}
              file={file}
              isAdmin={true}
              onDelete={(id) => setDeleteId(id)}
              onEdit={(f) => setEditingFile(f)}
              onTogglePublic={(f) => handleTogglePublic(f)}
              onCopySuccess={(url, f) => copyUrl(url, f?.title || file.title)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto shadow-xs">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Title & Original File</th>
                <th className="py-3 px-4">Language</th>
                <th className="py-3 px-4">Format</th>
                <th className="py-3 px-4">File Size</th>
                <th className="py-3 px-4">Public Status</th>
                <th className="py-3 px-4">Downloads</th>
                <th className="py-3 px-4">Upload Date</th>
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
                    <div className="text-[11px] font-mono text-slate-500 truncate" title={file.original_file_name}>
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

                  <td className="py-3.5 px-4 text-slate-500">
                    {formatDate(file.created_at)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => copyUrl(file.public_url, file.title)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        title="Copy direct URL"
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>

                      <a
                        href={file.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        title="Open direct URL"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>

                      <a
                        href={`${file.public_url}?download=1`}
                        download={file.original_file_name}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        title="Download file"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </a>

                      <button
                        type="button"
                        onClick={() => setEditingFile(file)}
                        className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 transition"
                        title="Edit metadata"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteId(file.id)}
                        className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 text-rose-600 hover:bg-rose-100 transition"
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

      {/* Confirmation & Edit Modals */}
      <ConfirmModal
        isOpen={!!deleteId}
        title="Delete Media File?"
        message="Are you sure you want to permanently delete this media file? The physical storage file will be deleted and the generated direct URL will immediately stop working."
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

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={() => setNotification({ isOpen: false })}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        copyUrl={notification.copyUrl}
        primaryAction={notification.primaryAction}
        secondaryAction={notification.secondaryAction}
        autoCloseMs={notification.autoCloseMs}
      />
    </div>
  );
}
