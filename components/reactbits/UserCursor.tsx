"use client";

import React, { useEffect, useRef, useState } from "react";

export interface UserCursorProps {
  name?: string;
  role?: string;
  color?: string;
  textColor?: string;
  avatarUrl?: string;
  showTag?: boolean;
  tiltEffect?: boolean;
  springDamping?: number;
  className?: string;
}

export default function UserCursor({
  name = "User",
  role,
  color = "#8b5cf6", // Vibrant Obsidian Purple
  textColor = "#ffffff",
  avatarUrl,
  showTag = true,
  tiltEffect = true,
  springDamping = 0.22,
  className = "",
}: UserCursorProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const cursorRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);

  const posRef = useRef({
    targetX: -100,
    targetY: -100,
    currentX: -100,
    currentY: -100,
    tagX: -100,
    tagY: -100,
    vx: 0,
    vy: 0,
  });

  const rafRef = useRef<number>();

  useEffect(() => {
    // Only enable on devices with fine pointer (mouse/trackpad, not touchscreen)
    if (typeof window === "undefined" || !window.matchMedia("(pointer: fine)").matches) {
      return;
    }

    setMounted(true);

    const handleMouseMove = (e: MouseEvent) => {
      posRef.current.targetX = e.clientX;
      posRef.current.targetY = e.clientY;
      if (!visible) setVisible(true);
    };

    const handleMouseEnter = () => setVisible(true);
    const handleMouseLeave = () => setVisible(false);
    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseenter", handleMouseEnter);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    // 60FPS Spring & Tilt physics loop
    const animate = () => {
      const p = posRef.current;

      // Pointer physics
      p.currentX += (p.targetX - p.currentX) * 0.95;
      p.currentY += (p.targetY - p.currentY) * 0.95;

      // Tag spring physics (trailing smoothly behind pointer)
      const prevTagX = p.tagX;
      const prevTagY = p.tagY;
      p.tagX += (p.targetX - p.tagX) * springDamping;
      p.tagY += (p.targetY - p.tagY) * springDamping;

      p.vx = p.tagX - prevTagX;
      p.vy = p.tagY - prevTagY;

      // Directional tilt angle (-18deg to +18deg)
      const tilt = tiltEffect ? Math.max(-18, Math.min(18, p.vx * 1.2)) : 0;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${p.currentX}px, ${p.currentY}px, 0)`;
      }

      if (tagRef.current) {
        tagRef.current.style.transform = `translate3d(${p.tagX + 16}px, ${p.tagY + 16}px, 0) rotate(${tilt}deg)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseenter", handleMouseEnter);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [visible, springDamping, tiltEffect]);

  if (!mounted) return null;

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[999999] overflow-hidden transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      } ${className}`}
      aria-hidden="true"
    >
      {/* Figma-style Precise SVG Pointer Arrow */}
      <div
        ref={cursorRef}
        className="absolute top-0 left-0 will-change-transform"
        style={{
          transform: `translate3d(${posRef.current.currentX}px, ${posRef.current.currentY}px, 0)`,
          transition: "transform 0.04s cubic-bezier(0,0,0.2,1)",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={`transition-transform duration-100 ${
            isMouseDown ? "scale-90" : "scale-100"
          }`}
          style={{ filter: "drop-shadow(0 2px 5px rgba(0,0,0,0.5))" }}
        >
          <path
            d="M5.65376 12.3673H5.46026L5.31717L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
            fill={color}
            stroke="#000000"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Floating Name Tag Badge with Smooth Spring Tilt */}
      {showTag && (
        <div
          ref={tagRef}
          className="absolute top-0 left-0 will-change-transform"
          style={{
            transform: `translate3d(${posRef.current.tagX + 16}px, ${posRef.current.tagY + 16}px, 0)`,
          }}
        >
          <div
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold shadow-2xl border border-white/20 select-none backdrop-blur-sm"
            style={{
              backgroundColor: color,
              color: textColor,
              boxShadow: "0 8px 24px rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)",
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-4 h-4 rounded-full object-cover border border-white/40"
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            )}
            <span className="font-mono text-[11px] tracking-tight truncate max-w-[140px]">
              {name}
            </span>
            {role && (
              <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-black/30 font-mono text-white/90">
                {role}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
