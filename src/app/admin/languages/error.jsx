'use client';

import React, { useEffect } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function LanguagesError({ error, reset }) {
  useEffect(() => {
    console.error('Languages error caught:', error);
  }, [error]);

  return (
    <div className="p-8 max-w-lg mx-auto text-center">
      <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/30 p-6">
        <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-900 dark:text-white">Unable to load Languages</h3>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 mb-4">
          {error?.message || 'An unexpected client error occurred while loading language categories.'}
        </p>
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Try Again</span>
        </button>
      </div>
    </div>
  );
}
