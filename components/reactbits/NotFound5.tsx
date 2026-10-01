"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { FigmaLogo, LoomLogo, MiroLogo, NotionLogo } from "@/components/PlatformIcons";

function GitHubBrandIcon({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

function LinearBrandIcon({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="currentColor">
      <path d="M12.5 50C12.5 29.2893 29.2893 12.5 50 12.5C70.7107 12.5 87.5 29.2893 87.5 50C87.5 70.7107 70.7107 87.5 50 87.5C29.2893 87.5 12.5 70.7107 12.5 50ZM63.2 38.3L38.3 63.2C38.9 63.8 39.5 64.3 40.2 64.8L64.8 40.2C64.3 39.5 63.8 38.9 63.2 38.3ZM68.9 44.9L44.9 68.9C46.5 69.6 48.2 70 50 70C61.0457 70 70 61.0457 70 50C70 48.2 69.6 46.5 68.9 44.9ZM31.1 55.1L55.1 31.1C53.5 30.4 51.8 30 50 30C38.9543 30 30 38.9543 30 50C30 51.8 30.4 53.5 31.1 55.1Z" />
    </svg>
  );
}

function SupabaseBrandIcon({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.362 9.354H12V.348a.348.348 0 0 0-.585-.254L.198 11.23a.35.35 0 0 0 .237.597H9.84v9.006a.348.348 0 0 0 .585.254l11.217-11.136a.35.35 0 0 0-.28-.597z" />
    </svg>
  );
}

function ShieldProofIcon({ className = "w-14 h-14" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}

interface CardItem {
  id: string;
  name: string;
  bg: string;
  icon: React.ReactNode;
  positionClasses: string;
  initialRotate: number;
  parallaxFactor: number;
  zIndex: number;
}

const CARDS: CardItem[] = [
  // 1. Far Left Tilted Card (Wine / Plum)
  {
    id: "card-figma",
    name: "Figma",
    bg: "bg-[#5b1f3c]",
    icon: (
      <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-black/25 backdrop-blur-sm p-3">
        <FigmaLogo className="w-11 h-11" />
      </div>
    ),
    positionClasses: "w-56 h-72 sm:w-64 sm:h-80 -left-6 sm:left-6 bottom-[-30px]",
    initialRotate: -18,
    parallaxFactor: 1.5,
    zIndex: 10,
  },
  // 2. Left-Center Yellow Base Card
  {
    id: "card-notion",
    name: "Notion",
    bg: "bg-[#f2ba1d]",
    icon: (
      <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm p-3">
        <NotionLogo className="w-11 h-11" />
      </div>
    ),
    positionClasses: "w-48 h-60 sm:w-56 sm:h-72 left-28 sm:left-44 bottom-[-80px]",
    initialRotate: 0,
    parallaxFactor: 0.8,
    zIndex: 5,
  },
  // 3. Left-Center Lime Green Top Card
  {
    id: "card-github",
    name: "GitHub",
    bg: "bg-[#99d52a]",
    icon: <GitHubBrandIcon className="w-16 h-16 text-black" />,
    positionClasses: "w-48 h-64 sm:w-56 sm:h-76 left-24 sm:left-40 bottom-16 sm:bottom-20",
    initialRotate: 0,
    parallaxFactor: 1.2,
    zIndex: 20,
  },
  // 4. Center Sky Blue Base Card
  {
    id: "card-miro",
    name: "Miro",
    bg: "bg-[#54c4e0]",
    icon: (
      <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm p-3">
        <MiroLogo className="w-11 h-11" />
      </div>
    ),
    positionClasses: "w-52 h-64 sm:w-60 sm:h-72 left-1/2 -translate-x-1/2 bottom-[-90px]",
    initialRotate: 0,
    parallaxFactor: 0.9,
    zIndex: 6,
  },
  // 5. Center-Top Tangerine Orange Card
  {
    id: "card-loom",
    name: "Loom",
    bg: "bg-[#e86018]",
    icon: (
      <div className="w-16 h-16 flex items-center justify-center rounded-2xl bg-black/20 backdrop-blur-sm p-3">
        <LoomLogo className="w-11 h-11" />
      </div>
    ),
    positionClasses: "w-48 h-68 sm:w-56 sm:h-80 left-1/2 -translate-x-[42%] bottom-14 sm:bottom-18",
    initialRotate: 0,
    parallaxFactor: 1.4,
    zIndex: 22,
  },
  // 6. Right-Center Navy Slate Card
  {
    id: "card-proof",
    name: "SHA-256 Proof",
    bg: "bg-[#182338]",
    icon: <ShieldProofIcon className="w-16 h-16 text-white" />,
    positionClasses: "w-56 h-72 sm:w-64 sm:h-80 right-28 sm:right-40 bottom-[-50px]",
    initialRotate: 14,
    parallaxFactor: 1.3,
    zIndex: 8,
  },
  // 7. Right Top Lavender Lilac Card
  {
    id: "card-linear",
    name: "Linear",
    bg: "bg-[#baa4e4]",
    icon: <LinearBrandIcon className="w-16 h-16 text-[#2e1065]" />,
    positionClasses: "w-64 h-48 sm:w-76 sm:h-56 right-8 sm:right-16 bottom-20 sm:bottom-24",
    initialRotate: 0,
    parallaxFactor: 1.1,
    zIndex: 25,
  },
  // 8. Far Right Terracotta Sienna Card
  {
    id: "card-supabase",
    name: "Supabase",
    bg: "bg-[#cf5122]",
    icon: <SupabaseBrandIcon className="w-16 h-16 text-emerald-300" />,
    positionClasses: "w-48 h-64 sm:w-56 sm:h-72 -right-4 sm:right-10 bottom-[-70px]",
    initialRotate: 0,
    parallaxFactor: 1.0,
    zIndex: 7,
  },
];

export default function NotFound5() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const y = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setMousePos({ x, y });
  };

  const handleMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="min-h-screen bg-[#000000] text-white relative overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Precision Dark Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_30%,#000_70%,transparent_100%)] opacity-70" />

      {/* Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 text-white group">
          <span className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono font-bold text-xs group-hover:border-zinc-500 transition-colors">
            TT
          </span>
          <span className="font-semibold text-sm tracking-tight text-zinc-300 group-hover:text-white transition-colors">
            TeamTrack AI
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="text-xs font-mono text-zinc-400 hover:text-white px-3.5 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all shadow-md"
        >
          Launch Workspace
        </Link>
      </header>

      {/* Center Narrative & CTA */}
      <main className="relative z-20 w-full max-w-4xl mx-auto px-6 pt-8 pb-4 text-center flex flex-col items-center">
        <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-[1.1] drop-shadow-2xl">
          We can&apos;t find the page<br />you&apos;re looking for.
        </h1>

        {/* CTA Button */}
        <div className="mt-8">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-full bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all shadow-2xl hover:scale-105 active:scale-95 duration-200"
          >
            Take Me Home
          </Link>
        </div>
      </main>

      {/* Interactive Stacking Scattered Colorful Cards Container */}
      <div className="relative z-10 w-full h-[420px] sm:h-[480px] md:h-[540px] flex items-end justify-center overflow-visible pointer-events-auto">
        <div className="relative w-full max-w-7xl h-full flex items-end justify-center">
          {CARDS.map((card) => {
            const isHovered = hoveredCard === card.id;

            // Parallax offset based on cursor position
            const offsetX = mousePos.x * card.parallaxFactor * 24;
            const offsetY = mousePos.y * card.parallaxFactor * 18;
            const rotateOffset = mousePos.x * card.parallaxFactor * 3.5;

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCard(card.id)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  transform: `translate(${offsetX}px, ${
                    offsetY - (isHovered ? 28 : 0)
                  }px) rotate(${card.initialRotate + rotateOffset}deg) scale(${isHovered ? 1.06 : 1})`,
                  transformOrigin: "bottom center",
                  transition: "transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.2s ease",
                  zIndex: isHovered ? 40 : card.zIndex,
                }}
                className={`absolute ${card.positionClasses} ${card.bg} rounded-[32px] sm:rounded-[38px] p-6 sm:p-7 flex flex-col justify-end shadow-2xl cursor-pointer select-none transition-shadow duration-300 border border-white/10`}
              >
                {/* Single Big Clean Platform Logo */}
                <div className="flex items-center justify-start">
                  {card.icon}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
