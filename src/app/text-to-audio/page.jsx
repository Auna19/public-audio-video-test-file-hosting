'use client';

import React, { useState, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar.jsx';
import ToastContainer from '@/components/Toast.jsx';
import NotificationModal from '@/components/NotificationModal.jsx';
import TextPlayer from '@/components/TextPlayer.jsx';
import {
  Volume2,
  FileText,
  Copy,
  Check,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Download,
  Filter,
  Search,
  Globe,
  Radio,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '@/lib/constants.js';

const LANGUAGE_SAMPLES = {
  ha: {
    title: 'Hausa - Morning Greetings & AI Speech Sample',
    text: 'Barka da safiya! Wannan rubutu ne na gwaji don fasahar sauya rubutu zuwa sauti da kuma gwajin fahimtar harshen Hausa. Dandalin yana taimaka wa masu bincike da masu haɓaka software samun ingantattun bayanan murya da rubutu a harsunan Najeriya.',
  },
  yo: {
    title: 'Yoruba - Idanwo Oro si Ohun',
    text: 'E kaaro o! Eyi je apere oro lati se idanwo iyipada oro si ohun ati imo ede Yoruba. A n pese awon faili yi fun iwadi imo-ero ati idagbasoke ero ayelujara ti o n gbo ede abinibi wa.',
  },
  ig: {
    title: 'Igbo - Nnwale Ederede gaa n’Olu',
    text: 'Ututu oma! Nke a bu ihe atumatu iji nwalee teknụzụ ntụgharị ederede gaa n\'olu n\'asụsụ Igbo. Anyị na-enye faịlụ ndị a maka nnyocha ọgụgụ isi na ngwanrọ na-aghọta asụsụ anyị.',
  },
  pcm: {
    title: 'Nigerian Pidgin - Daily News & Speech Test',
    text: 'Good morning o! Dis na test text make we see how dis text to audio go dey work well well for Nigerian Pidgin. We dey give people and developers direct link to test speech recognition and AI systems for our local languages.',
  },
  en: {
    title: 'English - Platform Introduction & Testing Script',
    text: 'Welcome to the Nigerian Multilingual Test Platform. This system hosts high-fidelity audio, video, and text documents across Nigerian languages including Hausa, Yoruba, Igbo, and Nigerian Pidgin for automated speech recognition and artificial intelligence testing.',
  },
  other: {
    title: 'Other / Custom Language - Multilingual Test Sample',
    text: 'Welcome! This section supports custom and international languages including French, Arabic, and Swahili for speech synthesis and text-to-speech testing.',
  },
};

export default function TextToAudioStudioPage() {
  const [activeLang, setActiveLang] = useState('ha');
  const [inputText, setInputText] = useState(LANGUAGE_SAMPLES.ha.text);
  const [sourceUrl, setSourceUrl] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [languages, setLanguages] = useState(SUPPORTED_LANGUAGES);

  // Library state
  const [libraryFiles, setLibraryFiles] = useState([]);
  const [loadingLibrary, setLoadingLibrary] = useState(true);
  const [filterLang, setFilterLang] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications & toasts
  const [toasts, setToasts] = useState([]);
  const [notification, setNotification] = useState({ isOpen: false });

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

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Fetch dynamic languages from API
  useEffect(() => {
    fetch('/api/languages')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (Array.isArray(data?.languages) && data.languages.length > 0) {
          setLanguages(data.languages);
        }
      })
      .catch((err) => console.error('Failed to load dynamic languages:', err));
  }, []);

  // Load public text/document files from API
  const loadTextLibrary = async () => {
    try {
      setLoadingLibrary(true);
      const params = new URLSearchParams({
        scope: 'public',
        mediaType: 'text',
        language: filterLang,
        search: searchQuery,
      });
      const res = await fetch(`/api/media?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLibraryFiles(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load text library:', err);
    } finally {
      setLoadingLibrary(false);
    }
  };

  useEffect(() => {
    loadTextLibrary();
  }, [filterLang]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTextLibrary();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectSample = (langCode) => {
    setActiveLang(langCode);
    if (LANGUAGE_SAMPLES[langCode]) {
      setInputText(LANGUAGE_SAMPLES[langCode].text);
    } else {
      const match = languages.find((l) => l.code === langCode);
      setInputText(`Sample text for ${match ? match.name : langCode} speech synthesis and text-to-audio testing.`);
    }
    if (isPlaying || isPaused) {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const handleLoadToStudio = (file) => {
    if (!file.text_content) {
      addToast('This document has no extracted text content.', 'info');
      return;
    }
    setInputText(file.text_content);
    if (file.language_code) {
      setActiveLang(file.language_code);
    }
    if (file.public_url) {
      setSourceUrl(file.public_url);
    }
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
    addToast(`Loaded "${file.title}" into Text-to-Audio Studio!`, 'success');
    setNotification({
      isOpen: true,
      type: 'success',
      title: 'Loaded into Studio! 🎙️',
      message: `The extracted text from "${file.title}" (${file.language}) has been loaded into the interactive synthesizer.`,
      autoCloseMs: 3500,
    });
  };

  const handlePlayStudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      addToast('Speech synthesis is not supported on this browser.', 'error');
      return;
    }

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    const clean = (inputText || '').trim();
    if (!clean) {
      addToast('Please enter text to listen to audio.', 'info');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = rate;

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      let matchedVoice = null;
      const langLower = (activeLang || '').toLowerCase();
      if (langLower === 'fr' || langLower.includes('french')) {
        matchedVoice = voices.find((v) => v.lang.startsWith('fr'));
      } else if (langLower === 'ar' || langLower.includes('arabic')) {
        matchedVoice = voices.find((v) => v.lang.startsWith('ar'));
      } else if (langLower === 'sw' || langLower.includes('swahili')) {
        matchedVoice = voices.find((v) => v.lang.startsWith('sw'));
      } else if (['ha', 'yo', 'ig', 'pcm'].includes(langLower)) {
        matchedVoice = voices.find((v) => v.lang.includes('NG') || v.lang.includes('ng') || v.lang.includes('en-GB'));
      }
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang.includes('NG') || v.lang.includes('ng') || v.lang.includes('en-GB')) ||
                       voices.find((v) => v.lang.startsWith('en')) ||
                       voices[0];
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePauseStudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStopStudio = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleCopyInputText = async () => {
    if (!inputText.trim()) return;
    try {
      await navigator.clipboard.writeText(inputText);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
      addToast('Text copied to clipboard!', 'success');
      setNotification({
        isOpen: true,
        type: 'copy',
        title: 'Text Copied to Clipboard! 📋',
        message: 'The text snippet has been successfully copied and is ready for use.',
        copyUrl: inputText,
        autoCloseMs: 3500,
      });
    } catch {
      // Fallback
    }
  };

  const handleCopySourceUrl = async () => {
    const url = sourceUrl.trim() || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
      addToast('URL copied to clipboard!', 'success');
      setNotification({
        isOpen: true,
        type: 'copy',
        title: 'URL Copied! 📋',
        message: 'The link has been copied to your clipboard.',
        copyUrl: url,
        autoCloseMs: 3500,
      });
    } catch {
      // Fallback
    }
  };

  const handleDownloadTxt = () => {
    if (!inputText.trim()) return;
    const blob = new Blob([inputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeLang}_sample_text.txt`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('Text file downloaded successfully!', 'success');
  };

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  return (
    <div className="min-h-screen bg-slate-50/70 dark:bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-amber-950 text-white p-8 sm:p-12 mb-10 shadow-xl border border-slate-800">
          <div className="relative z-10 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/20 px-3.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30 backdrop-blur-md mb-4">
              <Volume2 className="h-3.5 w-3.5 animate-pulse text-amber-400" />
              URL / Text-to-Audio Studio & Repository
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight">
              Multilingual Text-to-Audio Studio
            </h1>
            <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed">
              Listen to speech synthesis from documents (.txt, .pdf, .docx, .rtf, .csv), copy extracted text, copy direct URLs, and test automated speech generation across Hausa, Yoruba, Igbo, Nigerian Pidgin, and English.
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-mono text-amber-200/90">
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Check className="h-4 w-4 text-amber-400" /> Copy Text Anytime
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Check className="h-4 w-4 text-amber-400" /> Direct Public File URLs
              </div>
              <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                <Check className="h-4 w-4 text-amber-400" /> Web Speech Synthesis Player
              </div>
            </div>
          </div>

          <div className="absolute right-0 top-0 -mt-10 -mr-10 h-72 w-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        </div>

        {/* Live Studio Card */}
        <div className="mb-12 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span>Interactive Text to Speech Synthesizer</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Select a language preset below, or paste your own script to listen and copy.
              </p>
            </div>

            {/* Language Quick Selector Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {languages.map((lang) => {
                const code = lang.code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectSample(code)}
                    className={`rounded-xl px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                      activeLang === code
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {lang.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Textarea Area */}
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider flex items-center gap-1">
                <FileText className="h-3.5 w-3.5 text-amber-500" /> Script / Text Content
              </span>
              <span className="font-mono text-[11px]">
                {wordCount} words • {charCount} characters
              </span>
            </div>

            <textarea
              rows={5}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or write text here to convert to speech or copy..."
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/80 p-4 text-xs sm:text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed shadow-inner"
            />

            {/* URL Input Bar (optional) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="sm:col-span-2">
                <input
                  type="url"
                  placeholder="Optional reference source URL (e.g. https://...)"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800 px-3.5 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyInputText}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/40 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100 transition active:scale-95 cursor-pointer shadow-xs"
                >
                  {copiedText ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopySourceUrl}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition active:scale-95 cursor-pointer"
                >
                  {copiedUrl ? <Check className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                  <span>Copy URL</span>
                </button>
              </div>
            </div>

            {/* Live Playback Deck */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-4 text-white shadow-md border border-slate-800">
              <div className="flex items-center gap-3">
                {!isPlaying ? (
                  <button
                    type="button"
                    onClick={handlePlayStudio}
                    className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2.5 text-xs sm:text-sm font-bold text-slate-950 shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{isPaused ? 'Resume Audio' : 'Play Text to Audio'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePauseStudio}
                    className="flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition active:scale-95 cursor-pointer"
                  >
                    <Pause className="h-4 w-4" />
                    <span>Pause Audio</span>
                  </button>
                )}

                {(isPlaying || isPaused) && (
                  <button
                    type="button"
                    onClick={handleStopStudio}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                    title="Stop Audio"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}

                {/* Sound wave visualizer bars */}
                <div className="flex items-center gap-1 h-6 px-3">
                  {[35, 75, 45, 95, 60, 100, 50, 85, 40, 90, 70, 30].map((h, i) => (
                    <span
                      key={i}
                      className={`w-1 rounded-full transition-all duration-300 ${
                        isPlaying ? 'bg-amber-400 animate-pulse' : 'bg-slate-700'
                      }`}
                      style={{
                        height: isPlaying ? `${Math.max(20, h * (0.6 + Math.random() * 0.4))}%` : '20%',
                        animationDelay: `${i * 60}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Speed rate pills & download button */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                  {[0.75, 1, 1.25, 1.5].map((speed) => (
                    <button
                      key={speed}
                      type="button"
                      onClick={() => setRate(speed)}
                      className={`px-2.5 py-1 rounded-lg font-bold transition ${
                        rate === speed
                          ? 'bg-amber-500 text-slate-950 shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition"
                  title="Download .txt"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download .txt</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Text & Document Library Section */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-amber-500" />
                <span>Uploaded Documents & Text to Audio Library</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Browse text files (.txt, .pdf, .docx, .rtf, .csv) and URL resources uploaded by administrators.
              </p>
            </div>

            {/* Language filter pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilterLang('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filterLang === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                }`}
              >
                All Languages
              </button>
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setFilterLang(lang.code)}
                  className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    filterLang === lang.code
                      ? 'bg-amber-500 text-slate-950 shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by title, content or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-xs"
            />
          </div>

          {/* Results grid */}
          {loadingLibrary ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <p className="mt-3 text-xs">Loading text documents...</p>
            </div>
          ) : libraryFiles.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
              <FileText className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
                No text documents found
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                No text documents have been uploaded matching this language yet. Administrators can upload .txt, .pdf, .docx files or publish direct text via the admin upload page.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {libraryFiles.map((file) => (
                <div
                  key={file.id}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2.5 py-0.5 text-xs font-semibold">
                        {file.language}
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {file.file_extension}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1 mb-1">
                      {file.title}
                    </h3>
                    <p className="text-xs text-slate-500 truncate mb-4">
                      {file.original_file_name}
                    </p>

                    <TextPlayer
                      text={file.text_content || ''}
                      publicUrl={file.public_url}
                      title={file.title}
                      language={file.language}
                      onCopyText={(text) => {
                        addToast('Text copied to clipboard!', 'success');
                        setNotification({
                          isOpen: true,
                          type: 'copy',
                          title: 'Text Copied to Clipboard! 📋',
                          message: `Extracted text from "${file.title}" copied to clipboard.`,
                          copyUrl: text,
                          autoCloseMs: 3500,
                        });
                      }}
                      onCopyLink={(url) => {
                        addToast('Direct URL copied to clipboard!', 'success');
                        setNotification({
                          isOpen: true,
                          type: 'copy',
                          title: 'Direct Link Copied! 📋',
                          message: `The direct URL for "${file.title}" has been copied.`,
                          copyUrl: url,
                          autoCloseMs: 3500,
                        });
                      }}
                    />

                    <button
                      type="button"
                      onClick={() => handleLoadToStudio(file)}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800/80 px-3 py-2 text-xs font-bold transition cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Load into Studio Player</span>
                    </button>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <a
                      href={file.public_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 font-mono flex items-center gap-1"
                    >
                      <ExternalLink className="h-3 w-3" />
                      <span>Open File</span>
                    </a>

                    <a
                      href={`${file.public_url}?download=1`}
                      download={file.original_file_name}
                      className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400 hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

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
