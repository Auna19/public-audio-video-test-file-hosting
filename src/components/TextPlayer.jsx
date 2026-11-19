'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  RotateCcw,
  Copy,
  Check,
  FileText,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export default function TextPlayer({
  text = '',
  publicUrl = '',
  title = '',
  language = '',
  onCopyText,
  onCopyLink,
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [rate, setRate] = useState(1);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [supported, setSupported] = useState(true);

  const utteranceRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && !('speechSynthesis' in window)) {
      setSupported(false);
    }

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const cleanTextContent = (text || '').trim();
  const wordCount = cleanTextContent ? cleanTextContent.split(/\s+/).length : 0;
  const charCount = cleanTextContent.length;

  const handlePlay = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
      setIsPlaying(true);
      return;
    }

    window.speechSynthesis.cancel();

    if (!cleanTextContent) return;

    const utterance = new SpeechSynthesisUtterance(cleanTextContent);
    utterance.rate = rate;

    // Pick best matching voice if available
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Look for regional or language voice
      const langLower = (language || '').toLowerCase();
      let matchedVoice = null;
      if (langLower.includes('pidgin') || langLower.includes('nigeria') || langLower.includes('hausa') || langLower.includes('yoruba') || langLower.includes('igbo')) {
        matchedVoice = voices.find((v) => v.lang.includes('NG') || v.lang.includes('ng') || v.lang.includes('en-GB'));
      }
      if (!matchedVoice) {
        matchedVoice = voices.find((v) => v.lang.startsWith('en')) || voices[0];
      }
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }
    }

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = (e) => {
      console.warn('SpeechSynthesis error:', e);
      setIsPlaying(false);
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setIsPlaying(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isPlaying && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
      setIsPlaying(false);
    }
  };

  const handleStop = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsPaused(false);
  };

  const handleRateChange = (newRate) => {
    setRate(newRate);
    if (isPlaying || isPaused) {
      handleStop();
      setTimeout(() => {
        handlePlay();
      }, 50);
    }
  };

  const handleCopyText = async () => {
    if (!cleanTextContent) return;
    try {
      await navigator.clipboard.writeText(cleanTextContent);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2000);
      if (onCopyText) {
        onCopyText(cleanTextContent);
      }
    } catch {
      // Fallback
    }
  };

  const handleCopyUrl = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
      if (onCopyLink) {
        onCopyLink(publicUrl);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-4 shadow-lg text-slate-100 flex flex-col gap-3">
      {/* Audio Synthesis Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${isPlaying ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'}`}>
            <Volume2 className="h-4 w-4" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Text to Audio Player
            </div>
            <div className="text-xs text-slate-300">
              {isPlaying ? 'Speaking aloud...' : isPaused ? 'Paused' : 'Ready to listen'}
            </div>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700/60 text-xs">
          {[0.75, 1, 1.25, 1.5].map((speed) => (
            <button
              key={speed}
              type="button"
              onClick={() => handleRateChange(speed)}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                rate === speed
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls & Waveform Simulation */}
      <div className="flex items-center justify-between gap-3 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2">
          {!isPlaying ? (
            <button
              type="button"
              onClick={handlePlay}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors shadow-sm"
              title="Play Text as Audio"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isPaused ? 'Resume' : 'Play Audio'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs transition-colors shadow-sm"
              title="Pause Audio"
            >
              <Pause className="h-3.5 w-3.5" />
              <span>Pause</span>
            </button>
          )}

          {(isPlaying || isPaused) && (
            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
              title="Stop"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Animated Sound Waveform Bars */}
        <div className="flex items-center gap-1 h-5 px-2">
          {[40, 70, 30, 90, 60, 100, 45, 80, 50, 95].map((height, i) => (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-300 ${
                isPlaying
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-slate-700'
              }`}
              style={{
                height: isPlaying ? `${Math.max(20, height * (0.5 + Math.random() * 0.5))}%` : '20%',
                animationDelay: `${i * 70}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Text Content Display */}
      <div className="relative rounded-lg bg-slate-950/80 border border-slate-800 p-3">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-2 mb-2 border-b border-slate-800/60">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Extracted Text</span>
          </div>
          <div>
            <span>{wordCount} words</span> • <span>{charCount} chars</span>
          </div>
        </div>

        <div
          className={`text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap break-words transition-all duration-200 ${
            !isExpanded ? 'max-h-24 overflow-hidden mask-fade-bottom' : 'max-h-96 overflow-y-auto'
          }`}
        >
          {cleanTextContent || (
            <span className="text-slate-500 italic">No text content extracted for this document.</span>
          )}
        </div>

        {cleanTextContent.length > 120 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5" />
                <span>Read More</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Copy Actions Bar */}
      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={handleCopyText}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-amber-400 font-semibold text-xs transition-colors border border-slate-700/60"
        >
          {copiedText ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          <span>{copiedText ? 'Text Copied!' : 'Copy Text'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopyUrl}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700/80 text-slate-200 font-semibold text-xs transition-colors border border-slate-700/60"
        >
          {copiedUrl ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <ExternalLink className="h-3.5 w-3.5" />}
          <span>{copiedUrl ? 'URL Copied!' : 'Copy URL'}</span>
        </button>
      </div>
    </div>
  );
}
