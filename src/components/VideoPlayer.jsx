'use client';

import React, { useRef } from 'react';

export default function VideoPlayer({ src, poster, title = '' }) {
  const videoRef = useRef(null);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black border border-slate-800 shadow-inner">
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        controls
        preload="metadata"
        className="w-full max-h-72 object-contain aspect-video bg-black"
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
}
