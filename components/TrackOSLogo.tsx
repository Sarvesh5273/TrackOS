"use client";

import React from "react";
import Image from "next/image";

export interface TrackOSLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showWordmark?: boolean;
  className?: string;
}

export default function TrackOSLogo({
  size = "md",
  showWordmark = true,
  className = "",
}: TrackOSLogoProps) {
  // Balanced Medium Heights
  const heights = {
    sm: "h-6",
    md: "h-7 sm:h-8",
    lg: "h-10 sm:h-12",
    xl: "h-14 sm:h-16",
  };

  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {showWordmark ? (
        /* Full Logo + Wordmark from user provided clean asset */
        <div className={`relative ${heights[size]} flex items-center`}>
          <img
            src="/trackos-logo-clean.png"
            alt="TrackOS"
            className="h-full w-auto object-contain drop-shadow-[0_2px_12px_rgba(255,255,255,0.18)]"
          />
        </div>
      ) : (
        /* Standalone Emblem */
        <div className={`relative ${heights[size]} w-auto aspect-square flex items-center justify-center overflow-hidden rounded-xl bg-zinc-950 border border-zinc-800 p-1.5`}>
          <img
            src="/trackos-logo-clean.png"
            alt="TrackOS Mark"
            className="h-full w-auto object-contain scale-150 -translate-x-[25%]"
          />
        </div>
      )}
    </div>
  );
}
