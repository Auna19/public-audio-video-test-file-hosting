'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Languages,
  Plus,
  Globe,
  FileAudio,
  CheckCircle2,
  AlertCircle,
  Save,
  Search,
  Trash2,
  Sparkles,
} from 'lucide-react';
import ToastContainer from '@/components/Toast.jsx';

const PRESET_BADGE_COLORS = [
  { label: 'Emerald / Green', value: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
  { label: 'Blue / Azure', value: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { label: 'Amber / Orange', value: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  { label: 'Purple / Violet', value: 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
  { label: 'Indigo / Navy', value: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' },
  { label: 'Rose / Pink', value: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-700' },
  { label: 'Zinc / Neutral', value: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700' },
];

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [badgeColor, setBadgeColor] = useState(PRESET_BADGE_COLORS[0].value);
  const [saving, setSaving] = useState(false);
  const [deletingCode, setDeletingCode] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/languages');
      if (res.ok) {
        const data = await res.json();
        setLanguages(Array.isArray(data?.languages) ? data.languages : []);
      } else {
        const err = await res.json().catch(() => ({}));
        addToast(err?.error || 'Failed to fetch languages', 'error');
      }
    } catch (err) {
      console.error('Error loading languages:', err);
      addToast('Network error loading languages', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      addToast('Name and code are required', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toLowerCase(),
          name: name.trim(),
          nativeName: nativeName.trim(),
          badgeColor: badgeColor || PRESET_BADGE_COLORS[0].value,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        addToast(data.error || 'Failed to create language', 'error');
        return;
      }

      addToast(`Added language "${name}" successfully!`, 'success');
      setCode('');
      setName('');
      setNativeName('');
      setShowAddForm(false);
      loadLanguages();
    } catch (err) {
      addToast(err?.message || 'Error creating language', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (langCode, langName) => {
    if (!window.confirm(`Are you sure you want to remove the language category "${langName}" (${langCode})?`)) {
      return;
    }

    setDeletingCode(langCode);
    try {
      const res = await fetch(`/api/languages?code=${encodeURIComponent(langCode)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        addToast(data?.error || 'Failed to delete language', 'error');
        return;
      }

      addToast(`Language "${langName}" removed successfully`, 'success');
      loadLanguages();
    } catch (err) {
      addToast(err?.message || 'Error deleting language', 'error');
    } finally {
      setDeletingCode(null);
    }
  };

  const safeList = Array.isArray(languages) ? languages : [];
  const filteredLanguages = safeList.filter((lang) => {
    if (!lang) return false;
    const q = (searchQuery || '').toLowerCase().trim();
    if (!q) return true;
    return (
      (lang.name || '').toLowerCase().includes(q) ||
      (lang.code || '').toLowerCase().includes(q) ||
      (lang.nativeName || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Languages className="h-7 w-7 text-emerald-600" />
            Language Categories
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage supported language categories for multilingual Nigerian and international audio & video recordings.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition active:scale-95"
        >
          <Plus className="h-4 w-4" />
          <span>{showAddForm ? 'Close Form' : 'Add New Language'}</span>
        </button>
      </div>

      {/* Add New Language Form */}
      {showAddForm && (
        <div className="mb-8 rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-md border border-emerald-200 dark:border-emerald-800 animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-600" />
                Add Language Category
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Add a new language (e.g. Fulfulde, Kanuri, Ibibio, Tiv, French, Spanish) for audio and video categorisation.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Language Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Fulfulde"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Language Code (ISO / slug) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ff or ful"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Native / Script Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pulaar / Fulfulde"
                  value={nativeName}
                  onChange={(e) => setNativeName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800 px-3.5 py-2 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Badge Color Accent
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_BADGE_COLORS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setBadgeColor(preset.value)}
                    className={`flex items-center gap-2 rounded-xl p-2 text-xs border text-left transition ${
                      badgeColor === preset.value
                        ? 'border-emerald-600 bg-emerald-50/50 dark:bg-emerald-950/40 ring-1 ring-emerald-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <span className={`h-3.5 w-3.5 rounded-full border shrink-0 ${preset.value}`} />
                    <span className="truncate text-slate-700 dark:text-slate-300 font-medium">{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Language Category'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search languages by name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
          />
        </div>

        <div className="text-xs text-slate-500 font-medium self-center sm:self-auto">
          Showing <span className="font-bold text-slate-900 dark:text-white">{filteredLanguages.length}</span> of{' '}
          <span className="font-bold text-slate-900 dark:text-white">{safeList.length}</span> categories
        </div>
      </div>

      {/* Languages Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs">Loading languages...</p>
        </div>
      ) : filteredLanguages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <Languages className="mx-auto h-10 w-10 text-slate-400" />
          <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No languages found</h4>
          <p className="text-xs text-slate-500 mt-1">
            {searchQuery ? 'Try adjusting your search query.' : 'Add your first language category above.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLanguages.map((lang) => {
            const langCode = lang.code || '';
            const langName = lang.name || 'Unnamed';
            const langNative = lang.nativeName || '';
            const badgeCls = lang.badgeColor || 'bg-slate-100 text-slate-800 border-slate-300';
            const count = Number(lang.fileCount) || 0;
            const isDeleting = deletingCode === langCode;

            return (
              <div
                key={langCode}
                className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeCls}`}>
                      <Globe className="h-3 w-3" />
                      {langName}
                    </span>
                    <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      {langCode}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {langName}
                  </div>
                  {langNative ? (
                    <div className="text-xs text-slate-500 italic mt-0.5">
                      {langNative}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <FileAudio className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{count}</span> {count === 1 ? 'file' : 'files'}
                  </span>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/media?language=${encodeURIComponent(langCode)}`}
                      className="text-emerald-600 hover:underline font-semibold text-[11px]"
                    >
                      View Files &rarr;
                    </Link>

                    {count === 0 && (
                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() => handleDelete(langCode, langName)}
                        title="Delete category (0 files)"
                        className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
