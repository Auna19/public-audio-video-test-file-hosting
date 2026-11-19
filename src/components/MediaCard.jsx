'use client';

import React, { useState } from 'react';
import {
  Copy,
  Check,
  Download,
  ExternalLink,
  Music,
  Video,
  FileText,
  Trash2,
  Edit2,
  Lock,
  Globe,
  Tag,
  Calendar,
  HardDrive,
} from 'lucide-react';
import AudioPlayer from './AudioPlayer.jsx';
import VideoPlayer from './VideoPlayer.jsx';
import TextPlayer from './TextPlayer.jsx';
import { SUPPORTED_LANGUAGES, DOCUMENT_EXTENSIONS } from '@/lib/constants.js';

export default function MediaCard({
  file,
  isAdmin = false,
  onDelete,
  onEdit,
  onTogglePublic,
  onCopySuccess,
  onCopyText,
}) {
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const isTextMedia =
    file.media_type === 'text' ||
    DOCUMENT_EXTENSIONS.has((file.file_extension || '').toLowerCase());

  const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === file.language_code);
  const badgeColor = langObj ? langObj.badgeColor : 'bg-slate-100 text-slate-800 border-slate-300';

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(file.public_url);
      setCopied(true);
      if (onCopySuccess) {
        onCopySuccess(file.public_url, file);
      }
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  const downloadUrl = `${file.public_url}?download=1`;

  const parsedTags = file.tags
    ? file.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all hover:shadow-md hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900">
      {/* Top Header */}
      <div className="p-5 pb-4">
        {/* Badges row */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {/* Language Badge */}
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}
            >
              <Globe className="h-3 w-3" />
              {file.language}
            </span>

            {/* Media Type & Extension Badge */}
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-mono font-medium text-slate-700 dark:text-slate-300">
              {isTextMedia ? (
                <FileText className="h-3 w-3 text-amber-500" />
              ) : file.media_type === 'audio' ? (
                <Music className="h-3 w-3 text-emerald-600" />
              ) : (
                <Video className="h-3 w-3 text-indigo-600" />
              )}
              {file.file_extension}
            </span>
          </div>

          {/* Visibility badge / downloads */}
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            {isAdmin && (
              <button
                type="button"
                onClick={() => onTogglePublic && onTogglePublic(file)}
                title={file.is_public ? 'Publicly accessible (click to disable)' : 'Private / Disabled (click to enable)'}
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
            )}
            <span className="flex items-center gap-1 font-mono text-[11px]">
              <Download className="h-3 w-3" />
              {file.download_count} dl
            </span>
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-bold text-slate-900 dark:text-white line-clamp-1" title={file.title}>
          {file.title}
        </h3>

        {/* Original filename & metadata */}
        <p className="mt-0.5 text-xs font-mono text-slate-500 dark:text-slate-400 truncate" title={file.original_file_name}>
          {file.original_file_name}
        </p>

        {/* Description */}
        {file.description ? (
          <p className="mt-2 text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
            {file.description}
          </p>
        ) : null}

        {/* Tags */}
        {parsedTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1">
            {parsedTags.map((tag, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-400"
              >
                <Tag className="h-2.5 w-2.5" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Media Player preview */}
        <div className="mt-4">
          {isTextMedia ? (
            <TextPlayer
              text={file.text_content || ''}
              publicUrl={file.public_url}
              title={file.title}
              language={file.language}
              onCopyText={(text) => onCopyText && onCopyText(text, file)}
              onCopyLink={(url) => onCopySuccess && onCopySuccess(url, file)}
            />
          ) : file.media_type === 'audio' ? (
            <AudioPlayer src={file.public_url} title={file.title} />
          ) : (
            <VideoPlayer src={file.public_url} title={file.title} />
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/40 p-4">
        {/* File stats info */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mb-3">
          <span className="flex items-center gap-1 font-mono">
            <HardDrive className="h-3 w-3" />
            {formatFileSize(file.file_size)}
          </span>
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(file.created_at)}
          </span>
        </div>

        {/* Primary Buttons: Copy Link, Copy Text (if text), & Download */}
        <div className={`grid ${isTextMedia && file.text_content ? 'grid-cols-3' : 'grid-cols-2'} gap-2`}>
          <button
            type="button"
            onClick={handleCopyLink}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold shadow-xs transition active:scale-95 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750'
            }`}
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy Link
              </>
            )}
          </button>

          {isTextMedia && file.text_content && (
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(file.text_content);
                  setCopiedText(true);
                  if (onCopyText) onCopyText(file.text_content, file);
                  setTimeout(() => setCopiedText(false), 2500);
                } catch (e) {
                  console.error(e);
                }
              }}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold shadow-xs transition active:scale-95 ${
                copiedText
                  ? 'bg-amber-600 text-white'
                  : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              {copiedText ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Copied!
                </>
              ) : (
                <>
                  <FileText className="h-3.5 w-3.5" /> Copy Text
                </>
              )}
            </button>
          )}

          <a
            href={downloadUrl}
            download={file.original_file_name}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 dark:bg-emerald-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 dark:hover:bg-emerald-700 transition active:scale-95"
          >
            <Download className="h-3.5 w-3.5" /> Download
          </a>
        </div>

        {/* Open Direct Public URL link */}
        <div className="mt-2.5 flex items-center justify-between text-[11px]">
          <a
            href={file.public_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 font-mono transition"
            title="Open raw media file directly in browser"
          >
            <ExternalLink className="h-3 w-3" />
            <span>Open Direct URL</span>
          </a>

          {/* Admin Management Buttons */}
          {isAdmin && (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onEdit && onEdit(file)}
                className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition"
                title="Edit details"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete && onDelete(file.id)}
                className="p-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition"
                title="Delete media file"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
