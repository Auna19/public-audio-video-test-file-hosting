export const SUPPORTED_LANGUAGES = [
  { code: 'ha', name: 'Hausa', nativeName: 'Harshen Hausa', badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700' },
  { code: 'ig', name: 'Igbo', nativeName: 'Asụsụ Igbo', badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300 dark:border-amber-700' },
  { code: 'yo', name: 'Yoruba', nativeName: 'Èdè Yorùbá', badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700' },
  { code: 'pcm', name: 'Nigerian Pidgin', nativeName: 'Naijá / Brokin', badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-300 dark:border-purple-700' },
  { code: 'en', name: 'English', nativeName: 'English (Nigerian / West African)', badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-300 dark:border-blue-700' },
  { code: 'other', name: 'Other', nativeName: 'Custom Language', badgeColor: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-700' },
];

export const SUPPORTED_EXTENSIONS = [
  '.aac',
  '.amr',
  '.avi',
  '.flac',
  '.m4a',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp3',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.webm',
  '.weba',
];

export const AUDIO_EXTENSIONS = new Set([
  '.aac',
  '.amr',
  '.flac',
  '.m4a',
  '.mp3',
  '.oga',
  '.ogg',
  '.opus',
  '.wav',
  '.weba',
]);

export const VIDEO_EXTENSIONS = new Set([
  '.avi',
  '.m4v',
  '.mkv',
  '.mov',
  '.mp4',
  '.mpeg',
  '.mpg',
  '.webm',
]);

export const MIME_TYPE_MAP = {
  '.aac': 'audio/aac',
  '.amr': 'audio/amr',
  '.avi': 'video/x-msvideo',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.m4v': 'video/x-m4v',
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.mpeg': 'video/mpeg',
  '.mpg': 'video/mpeg',
  '.oga': 'audio/ogg',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus',
  '.wav': 'audio/wav',
  '.webm': 'video/webm',
  '.weba': 'audio/webm',
};

// Default max upload size: 100 MB
export const DEFAULT_MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
