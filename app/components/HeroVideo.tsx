"use client";

import React, { useEffect, useRef, useState } from "react";

type Props = {
  webm?: string;         // προαιρετικό .webm (καλύτερη συμπίεση)
  mp4: string;           // .mp4 fallback (H.264)
  poster?: string;       // static εικόνα μέχρι να φορτώσει
  className?: string;
  children?: React.ReactNode; // overlay περιεχόμενο (τίτλοι/κουμπιά)
};

export default function HeroVideo({ webm, mp4, poster, className, children }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [shouldPlay, setShouldPlay] = useState(true);

  useEffect(() => {
    // Respect "prefers-reduced-motion" & Data Saver & πολύ μικρές οθόνες
    const prefersReduced = typeof window !== "undefined" &&
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const isSmall = typeof window !== "undefined" && window.innerWidth < 640; // <sm
    const saveData = (navigator as any)?.connection?.saveData === true;

    if (prefersReduced || isSmall || saveData) setShouldPlay(false);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (shouldPlay) {
      // Ασφαλές autoplay: muted + playsInline
      v.muted = true;
      v.play().catch(() => {
        // Αν αποτύχει, απλώς μην κάνεις τίποτα (κάποια κινητά απαιτούν user gesture)
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [shouldPlay]);

  return (
    <div className={`relative h-[80vh] min-h-[520px] w-full overflow-hidden rounded-none ${className ?? ""}`}>
      {/* Το βίντεο γεμίζει ολόκληρο το container */}
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        // Εάν δεν πρέπει να παίξει (mobile/reduced), τουλάχιστον δείχνουμε poster
        style={{ display: "block" }}
      >
        {webm && <source src={webm} type="video/webm" />}
        <source src={mp4} type="video/mp4" />
      </video>

      {/* Σκούρο overlay για να διαβάζεται το κείμενο */}
      <div className="pointer-events-none absolute inset-0 bg-black/30" />

      {/* Gradient από κάτω για τίτλους */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/50 to-transparent" />

      {/* Περιεχόμενο πάνω από το video */}
      <div className="relative z-10 mx-auto flex h-full max-w-7xl items-center px-6">
        {children}
      </div>
    </div>
  );
}
