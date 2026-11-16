'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  X,
  AlertCircle,
  Info,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function NotificationModal({
  isOpen,
  onClose,
  type = 'success',
  title = 'Notification',
  message = '',
  copyUrl = null,
  primaryAction = null, // { label: string, onClick?: () => void, href?: string }
  secondaryAction = null,
  autoCloseMs = null, // e.g. 4000
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      return;
    }

    if (autoCloseMs && typeof autoCloseMs === 'number') {
      const timer = setTimeout(() => {
        onClose?.();
      }, autoCloseMs);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoCloseMs, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!copyUrl) return;
    try {
      await navigator.clipboard.writeText(copyUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'copy':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
            <Copy className="h-6 w-6" />
          </div>
        );
      case 'auth':
      case 'shield':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20">
            <ShieldCheck className="h-6 w-6" />
          </div>
        );
      case 'error':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shadow-sm">
            <AlertCircle className="h-6 w-6" />
          </div>
        );
      case 'info':
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 dark:bg-blue-950/70 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shadow-sm">
            <Info className="h-6 w-6" />
          </div>
        );
      case 'success':
      default:
        return (
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shadow-sm shadow-emerald-500/10">
            <CheckCircle2 className="h-6 w-6" />
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 p-6 sm:p-7 shadow-2xl border border-slate-200/90 dark:border-slate-800 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* Close icon button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className="mb-4">{getIcon()}</div>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
            {title}
          </h3>

          {message ? (
            <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm">
              {message}
            </p>
          ) : null}

          {/* Copyable URL box if provided */}
          {copyUrl && (
            <div className="mt-4 w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 p-3 text-left">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                <span>Direct Media Link</span>
                {copied ? (
                  <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                    <Check className="h-3 w-3" /> Copied to Clipboard
                  </span>
                ) : (
                  <span>Click to copy</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={copyUrl}
                  onClick={(e) => e.target.select()}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-slate-200 select-all focus:outline-none focus:ring-1 focus:ring-emerald-500 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition active:scale-95 shrink-0 ${
                    copied
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-emerald-600 dark:hover:bg-emerald-700'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-6 flex w-full flex-col sm:flex-row items-center justify-center gap-2.5">
            {secondaryAction && (
              <button
                type="button"
                onClick={() => {
                  secondaryAction.onClick?.();
                  if (!secondaryAction.keepOpen) onClose?.();
                }}
                className="w-full sm:w-auto flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
              >
                {secondaryAction.label}
              </button>
            )}

            {primaryAction ? (
              <button
                type="button"
                onClick={() => {
                  primaryAction.onClick?.();
                  if (!primaryAction.keepOpen) onClose?.();
                }}
                className="w-full sm:w-auto flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition active:scale-95"
              >
                {primaryAction.label}
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto min-w-[120px] rounded-xl bg-slate-900 dark:bg-emerald-600 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-slate-800 dark:hover:bg-emerald-700 transition active:scale-95"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
