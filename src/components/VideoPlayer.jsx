'use client';

import React, { useRef, useEffect, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function VideoPlayer({ src, poster, title = '' }) {
  const videoRef = useRef(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
    if (videoRef.current) {
      try {
        videoRef.current.load();
      } catch {}
    }
  }, [src]);

  const handleRetry = () => {
    setHasError(false);
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 shadow-inner">
      {hasError ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 aspect-video">
          <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
          <p className="text-xs text-rose-400 font-medium">Unable to load video stream</p>
          <button
            type="button"
            onClick={handleRetry}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition"
          >
            <RefreshCw className="h-3 w-3" /> Retry Video
          </button>
        </div>
      ) : (
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          controls
          preload="metadata"
          crossOrigin="anonymous"
          onError={() => setHasError(true)}
          className="w-full max-h-72 object-contain aspect-video bg-black"
        >
          Your browser does not support the video tag.
        </video>
      )}
    </div>
  );
}
