'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error('Admin error caught:', error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full rounded-2xl border border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-900 p-6 text-center shadow-lg">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Something went wrong</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4">
          {error?.message || 'An unexpected client error occurred.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Reload Section</span>
        </button>
      </div>
    </div>
  );
}
