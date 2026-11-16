'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  UploadCloud,
  Trash2,
  Edit3,
  Globe,
  ShieldCheck,
  RefreshCw,
  Clock,
  Filter,
} from 'lucide-react';
import ToastContainer from '@/components/Toast.jsx';

export default function UploadHistoryPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterAction, setFilterAction] = useState('ALL');
  const [clearing, setClearing] = useState(false);
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

  const loadHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/history');
      if (res.ok) {
        const data = await res.json();
        setLogs(Array.isArray(data?.logs) ? data.logs : []);
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load history logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all audit history records? This cannot be undone.')) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch('/api/history', { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        addToast(data?.error || 'Failed to clear history', 'error');
        return;
      }

      addToast('Audit history cleared successfully', 'success');
      loadHistory();
    } catch (err) {
      addToast(err?.message || 'Error clearing history', 'error');
    } finally {
      setClearing(false);
    }
  };

  const getActionBadge = (action) => {
    switch (action) {
      case 'UPLOAD_MEDIA':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2 py-0.5 text-xs font-semibold">
            <UploadCloud className="h-3 w-3" /> Upload Media
          </span>
        );
      case 'DELETE_MEDIA':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 px-2 py-0.5 text-xs font-semibold">
            <Trash2 className="h-3 w-3" /> Delete Media
          </span>
        );
      case 'UPDATE_MEDIA':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 px-2 py-0.5 text-xs font-semibold">
            <Edit3 className="h-3 w-3" /> Update Metadata
          </span>
        );
      case 'CREATE_LANGUAGE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 px-2 py-0.5 text-xs font-semibold">
            <Globe className="h-3 w-3" /> Add Language
          </span>
        );
      case 'DELETE_LANGUAGE':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
            <Trash2 className="h-3 w-3" /> Delete Language
          </span>
        );
      case 'ADMIN_LOGIN':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs font-semibold">
            <ShieldCheck className="h-3 w-3" /> Admin Login
          </span>
        );
      case 'CLEAR_DATA':
        return (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2 py-0.5 text-xs font-semibold">
            <RefreshCw className="h-3 w-3" /> Clear History
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center rounded-md bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-2 py-0.5 text-xs font-semibold">
            {action || 'EVENT'}
          </span>
        );
    }
  };

  const formatDate = (isoStr) => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return String(isoStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return String(isoStr);
    }
  };

  const safeLogs = Array.isArray(logs) ? logs : [];
  const filteredLogs = safeLogs.filter((l) => {
    if (!l) return false;
    if (filterAction === 'ALL') return true;
    return l.action === filterAction;
  });

  return (
    <div className="p-6 sm:p-8 max-w-6xl w-full mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <History className="h-7 w-7 text-emerald-600" />
            Upload History & Audit Activity
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Chronological audit trail of media uploads, metadata edits, deletions, and administrative sessions.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {safeLogs.length > 0 && (
            <button
              type="button"
              disabled={clearing}
              onClick={handleClearHistory}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 hover:bg-rose-100 text-xs font-semibold transition disabled:opacity-50"
              title="Clear all audit records"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}

          <button
            type="button"
            onClick={loadHistory}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white shadow-xs transition"
            title="Refresh history"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {[
          { key: 'ALL', label: 'All Activities' },
          { key: 'UPLOAD_MEDIA', label: 'Uploads' },
          { key: 'UPDATE_MEDIA', label: 'Updates' },
          { key: 'DELETE_MEDIA', label: 'Deletions' },
          { key: 'CREATE_LANGUAGE', label: 'Languages' },
          { key: 'ADMIN_LOGIN', label: 'Logins' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilterAction(tab.key)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
              filterAction === tab.key
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <p className="mt-3 text-xs">Loading activity logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Clock className="mx-auto h-12 w-12 text-slate-400" />
            <h4 className="mt-2 text-sm font-bold text-slate-900 dark:text-white">No activity logged yet</h4>
            <p className="text-xs text-slate-400 mt-1">
              Events will appear as uploads, updates, or deletions occur.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {filteredLogs.map((log) => {
                  if (!log) return null;

                  let parsedDetails = null;
                  try {
                    parsedDetails = log.details ? JSON.parse(log.details) : null;
                  } catch {
                    parsedDetails = log.details;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {parsedDetails && typeof parsedDetails === 'object' ? (
                          <div className="space-y-0.5">
                            {parsedDetails.title && (
                              <div className="font-bold font-sans text-slate-900 dark:text-white">
                                {parsedDetails.title}
                              </div>
                            )}
                            {parsedDetails.name && (
                              <div className="font-bold font-sans text-slate-900 dark:text-white">
                                Language: {parsedDetails.name} {parsedDetails.code ? `(${parsedDetails.code})` : ''}
                              </div>
                            )}
                            {parsedDetails.storagePath && (
                              <div className="text-[11px] text-slate-500 font-mono">
                                Path: {parsedDetails.storagePath}
                              </div>
                            )}
                            {parsedDetails.tags && (
                              <div className="text-[11px] text-slate-500 font-sans">
                                Tags: {parsedDetails.tags}
                              </div>
                            )}
                            {parsedDetails.is_public !== undefined && (
                              <div className="text-[11px] text-slate-500 font-sans">
                                Public status set to: {parsedDetails.is_public ? 'Public (Active)' : 'Disabled (Hidden)'}
                              </div>
                            )}
                            {parsedDetails.ip && (
                              <div className="text-[11px] text-slate-400 font-mono">
                                IP: {parsedDetails.ip}
                              </div>
                            )}
                            {parsedDetails.message && (
                              <div className="text-[11px] text-slate-600 dark:text-slate-400 font-sans">
                                {parsedDetails.message}
                              </div>
                            )}
                            {!parsedDetails.title &&
                              !parsedDetails.name &&
                              !parsedDetails.storagePath &&
                              !parsedDetails.ip &&
                              !parsedDetails.message &&
                              !parsedDetails.tags && (
                                <div className="text-[11px] text-slate-500 font-mono">
                                  {JSON.stringify(parsedDetails)}
                                </div>
                              )}
                          </div>
                        ) : (
                          <span>{typeof parsedDetails === 'string' ? parsedDetails : (log.details || '—')}</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                          {formatDate(log.timestamp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
