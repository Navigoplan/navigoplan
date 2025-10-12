"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  mp4: string;
  webm?: string;
  poster?: string;
  className?: string;
  children?: React.ReactNode;
};

export default function HeroVideo({
  mp4,
  webm,
  poster,
  className = "",
  children,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fallbackPoster, setFallbackPoster] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    // Ασφαλείς προεπιλογές για mobile autoplay
    v.muted = true;
    v.playsInline = true;
    // iOS hint (χωρίς ts error)
    (v as any).webkitPlaysInline = true;

    const tryPlay = () => {
      const p = v.play();
      if (p && typeof p.then === "function") {
        p.catch(() => {
          // Αν μπλοκάρει (π.χ. iOS Low Power Mode) δείξε poster
          setFallbackPoster(true);
        });
      }
    };

    // 1η απόπειρα
    tryPlay();

    // Ξαναδοκίμασε μόλις μπορεί να παίξει
    const onCanPlay = () => tryPlay();
    v.addEventListener("canplay", onCanPlay);

    // Μία επιπλέον απόπειρα μετά από user gesture
    const onUserGesture = () => {
      if (v.paused) tryPlay();
      window.removeEventListener("touchstart", onUserGesture);
      window.removeEventListener("click", onUserGesture);
    };
    window.addEventListener("touchstart", onUserGesture, { once: true });
    window.addEventListener("click", onUserGesture, { once: true });

    return () => {
      v.removeEventListener("canplay", onCanPlay);
      window.removeEventListener("touchstart", onUserGesture);
      window.removeEventListener("click", onUserGesture);
    };
  }, []);

  if (fallbackPoster) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {poster && (
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${poster})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "brightness(0.9)",
            }}
          />
        )}
        <div className="absolute inset-0 bg-black/35" />
        <div className="relative z-10 h-full">{children}</div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        // mobile autoplay απαιτεί αυτά:
        muted
        autoPlay
        playsInline
        // iOS attribute χωρίς TS warning
        {...{ "webkit-playsinline": "true" }}
        loop
        controls={false}
        preload="metadata"
        poster={poster}
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      >
        {webm && <source src={webm} type="video/webm" />}
        <source src={mp4} type="video/mp4" />
      </video>

      <div className="pointer-events-none absolute inset-0 bg-black/35" />
      <div className="relative z-10 h-full">{children}</div>
    </div>
  );
}
