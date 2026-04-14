"use client";

import { useRef, useState, useEffect } from "react";

export default function HeroVSL() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const unmute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    setMuted(false);
    if (video.paused) video.play();
  };

  return (
    <div
      className="relative w-full border border-border rounded-[10px] overflow-hidden cursor-pointer group"
      onClick={unmute}
      onMouseEnter={unmute}
    >
      <video
        ref={videoRef}
        src="/hero.mp4"
        autoPlay
        loop
        muted
        playsInline
        className="w-full aspect-video object-cover bg-surface-muted"
      />

      {/* Muted indicator */}
      {muted && playing && (
        <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2 py-1 bg-white/80 rounded-md">
          <svg className="w-3 h-3 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
          </svg>
          <span className="text-[10px] text-text-secondary">Sound off</span>
        </div>
      )}
    </div>
  );
}
