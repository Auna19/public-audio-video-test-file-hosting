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
  Tag,
} from 'lucide-react';
import ToastContainer from '@/components/Toast.jsx';

export default function LanguagesPage() {
  const [languages, setLanguages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [nativeName, setNativeName] = useState('');
  const [badgeColor, setBadgeColor] = useState('bg-teal-100 text-teal-800 border-teal-300');
  const [saving, setSaving] = useState(false);
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

  const loadLanguages = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/languages');
      if (res.ok) {
        const data = await res.json();
        setLanguages(data.languages || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLanguages();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/languages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim().toLowerCase(),
          name: name.trim(),
          nativeName: nativeName.trim(),
          badgeColor,
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

  return (
    <div className="p-6 sm:p-8 max-w-5xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Languages className="h-7 w-7 text-emerald-600" />
            Language Categories
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Manage supported language categories for multilingual audio and video recordings.
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
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" />
            Add Language Category
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
            Add a new language (e.g. Fulfulde, Kanuri, Ibibio, French) for audio and video categorisation.
          </p>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1">
                  Language Name
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
                  Language Code (ISO / slug)
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
                  Native / Script Name
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

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition active:scale-95 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Saving...' : 'Save Language'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Languages Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <p className="mt-3 text-xs">Loading languages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {languages.map((lang) => (
            <div
              key={lang.code}
              className="rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${lang.badgeColor}`}
                  >
                    <Globe className="h-3 w-3" />
                    {lang.name}
                  </span>
                  <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {lang.code}
                  </span>
                </div>

                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {lang.name}
                </div>
                {lang.nativeName ? (
                  <div className="text-xs text-slate-500 italic mt-0.5">
                    {lang.nativeName}
                  </div>
                ) : null}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <FileAudio className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{lang.fileCount}</span> {lang.fileCount === 1 ? 'file' : 'files'}
                </span>

                <Link
                  href={`/admin/media?language=${lang.code}`}
                  className="text-emerald-600 hover:underline font-medium text-[11px]"
                >
                  View Files &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
