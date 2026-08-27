"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Github,
  BarChart3,
  Shield,
  Zap,
  CheckCircle2,
  Lock,
  FileCheck2,
  Sparkles,
  Users,
  Layers,
  Scale,
  Activity,
  Award,
  ChevronRight,
  GitBranch,
  Terminal,
  Code2,
  Cpu,
  XCircle,
  Check,
  Flame,
  CheckCheck,
} from "lucide-react";
import SpecularButton from "@/components/reactbits/SpecularButton";
import DriftWall, { type DriftWallItem } from "@/components/reactbits/DriftWall";
import MagicBento from "@/components/reactbits/MagicBento";
import PillNav from "@/components/reactbits/PillNav";
import ChromaWaves from "@/components/reactbits/ChromaWaves";
import { FigmaLogo, LoomLogo, GoogleDocsLogo, MiroLogo, NotionLogo } from "@/components/PlatformIcons";

// Meaningful, bespoke deliverable UI tickets for DriftWall 3D Stream
const SHOWCASE_ITEMS: DriftWallItem[] = [
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Github className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">PR #42 · Merged</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-emerald-400 font-bold">+1.20</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">feat(auth): PKCE Flow</p>
          <p className="text-[10px] text-zinc-500 font-mono">+342 -12 lines · 8 files</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@sarvesh</span>
          <span className="text-zinc-500">CODE · 45%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FigmaLogo className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Figma System</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-purple-400 font-bold">+1.60</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Design Tokens v2.4 (Dark)</p>
          <p className="text-[10px] text-zinc-500 font-mono">14 Component Frames</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@sarvesh</span>
          <span className="text-zinc-500">DESIGN · 35%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">SHA-256 Proof</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">SEALED</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Cert #9f8a2c1d4e6b</p>
          <p className="text-[10px] text-zinc-500 font-mono">Immutable Provenance Hash</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>/verify/rep_7f8a</span>
          <span className="text-emerald-400 font-semibold">100% Valid</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LoomLogo className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Loom Demo</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-blue-400 font-bold">+1.00</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Architecture Walkthrough</p>
          <p className="text-[10px] text-zinc-500 font-mono">3m 12s HD Video Spec</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@sarvesh</span>
          <span className="text-zinc-500">PITCH · 20%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">QA Audit</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-emerald-400 font-bold">PASS</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Playwright E2E Suite</p>
          <p className="text-[10px] text-zinc-500 font-mono">18/18 Tests · 99.4%</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>CI Pipeline #142</span>
          <span className="text-zinc-500">+0.90</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Dispute Room</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400 font-bold">50/50</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Joint Feature Co-Sign</p>
          <p className="text-[10px] text-zinc-500 font-mono">Sarvesh (50%) &amp; Alex (50%)</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>✓ Co-Signed</span>
          <span className="text-zinc-500">CONSENSUS</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">AI Changelog</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 font-bold">v1.2.0</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Sprint Release Digest</p>
          <p className="text-[10px] text-zinc-500 font-mono">Synthesized from 48 Commits</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>4 Features · 2 Fixes</span>
          <span className="text-emerald-400">READY</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MiroLogo className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Miro Board</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-yellow-400 font-bold">+0.80</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">System Webhook Topology</p>
          <p className="text-[10px] text-zinc-500 font-mono">6 Microservices &amp; Schema</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@alex</span>
          <span className="text-zinc-500">ARCH · 15%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Health Radar</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-emerald-400 font-bold">94%</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Sprint Velocity Balance</p>
          <p className="text-[10px] text-zinc-500 font-mono">0 Critical Burnout Alerts</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>3 Teammates</span>
          <span className="text-emerald-400">BALANCED</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <NotionLogo className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Notion RFC</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300 font-bold">+1.10</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">RFC #104: Scoring Model</p>
          <p className="text-[10px] text-zinc-500 font-mono">12 Pages · Product Spec</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@sarvesh</span>
          <span className="text-zinc-500">SPEC · 20%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-3.5 h-3.5 text-white" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Commit #e81f</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-white font-bold">+0.85</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">perf(core): vector cache</p>
          <p className="text-[10px] text-zinc-500 font-mono">+120 -8 lines · 3 files</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@alex</span>
          <span className="text-zinc-500">CODE · 45%</span>
        </div>
      </div>
    ),
  },
  {
    content: (
      <div className="w-full h-full bg-[#09090b] border border-zinc-800 p-3.5 flex flex-col justify-between text-left select-none rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoogleDocsLogo className="w-3.5 h-3.5" />
            <span className="text-xs font-mono text-zinc-300 font-semibold">Pitch Deck</span>
          </div>
          <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-amber-400 font-bold">+1.20</span>
        </div>
        <div>
          <p className="text-xs font-semibold text-white truncate">Final Sprint Presentation</p>
          <p className="text-[10px] text-zinc-500 font-mono">18 Slides Verified</p>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px] text-zinc-400 font-mono">
          <span>@dave</span>
          <span className="text-zinc-500">PITCH · 20%</span>
        </div>
      </div>
    ),
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#000000] text-[#ededed] selection:bg-white selection:text-black relative overflow-hidden font-sans">
      {/* Precision Dark Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

      {/* Solid Matte Header with Centered PillNav */}
      <header className="sticky top-0 z-50 bg-[#09090b] border-b border-zinc-800 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Spacer to balance right actions on desktop */}
          <div className="w-24 hidden sm:block shrink-0" />

          {/* Center: Centered PillNav */}
          <div className="flex-1 flex justify-center">
            <PillNav
              items={[
                { label: "Overview", href: "/" },
                { label: "Deliverables", href: "#wall" },
                { label: "Features", href: "#features" },
                { label: "Comparison", href: "#comparison" },
                { label: "Workflow", href: "#how-it-works" },
                { label: "Scoring", href: "#scoring" },
              ]}
              baseColor="#ffffff"
              pillColor="#18181b"
              pillTextColor="#a1a1aa"
              hoveredPillTextColor="#000000"
            />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/login"
              className="text-xs font-medium text-zinc-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-zinc-800 transition-colors hidden sm:inline-block"
            >
              Sign In
            </Link>
            <button
              onClick={() => router.push("/login")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-colors"
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section: Full-Width Section with Edge-to-Edge Chroma Waves Background */}
      <section className="relative z-10 w-full overflow-hidden pt-24 sm:pt-32 pb-24">
        {/* Full-Bleed Chroma Waves Canvas across 100% of browser window */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-75 z-0">
          <ChromaWaves
            speed={0.4}
            frequency={0.35}
            distortion={1.4}
            grain={0.06}
            color1="#ffffff"
            color2="#8B5CF6"
            color3="#050408"
            opacity={0.85}
            interactive={true}
          />
        </div>

        {/* Ambient Dark Gradient Veil for Maximum Readability */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.7)_0%,rgba(0,0,0,0.3)_60%,transparent_100%)] pointer-events-none z-[1]" />

        {/* Centered Content Container */}
        <div className="relative z-10 px-6 max-w-5xl mx-auto text-center flex flex-col items-center">
          {/* Hero Title: Punchy 2 lines */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] max-w-4xl mb-6 text-white drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Fair contribution tracking.
            <br />
            <span className="text-zinc-400 font-medium">Ship with confidence.</span>
          </h1>

          {/* 1-Line Clean Subtitle */}
          <p className="text-base sm:text-lg text-zinc-300 max-w-xl mb-10 leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Turn GitHub commits, Figma designs, and team deliverables into tamper-proof proof of work.
          </p>

          {/* Primary CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            <SpecularButton
              size="lg"
              radius={14}
              tint="#18181b"
              tintOpacity={0.95}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#3f3f46"
              intensity={1.4}
              speed={0.35}
              followMouse={true}
              onClick={() => router.push("/login")}
            >
              <span>Launch Workspace</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </SpecularButton>

            <Link
              href="/login"
              className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium text-sm transition-all shadow-md"
            >
              <Github className="w-4 h-4 text-zinc-300" />
              <span>Continue with GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Integration Ecosystem Infinite Horizontal Marquee */}
      <section className="relative z-10 py-10 border-y border-zinc-800/80 bg-[#050507] overflow-hidden">
        <div className="w-full flex [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="flex animate-marquee items-center gap-16 text-zinc-400 text-sm font-medium whitespace-nowrap">
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-white shrink-0" />
              <span className="text-white font-semibold">GitHub Commits &amp; PRs</span>
            </div>
            <div className="flex items-center gap-3">
              <FigmaLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Figma Design Frames</span>
            </div>
            <div className="flex items-center gap-3">
              <LoomLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Loom Demos</span>
            </div>
            <div className="flex items-center gap-3">
              <MiroLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Miro Architecture</span>
            </div>
            <div className="flex items-center gap-3">
              <GoogleDocsLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Docs &amp; Slide Decks</span>
            </div>
            <div className="flex items-center gap-3">
              <NotionLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Notion Specs</span>
            </div>
            {/* Duplicated track for seamless infinite scroll */}
            <div className="flex items-center gap-3">
              <Github className="w-5 h-5 text-white shrink-0" />
              <span className="text-white font-semibold">GitHub Commits &amp; PRs</span>
            </div>
            <div className="flex items-center gap-3">
              <FigmaLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Figma Design Frames</span>
            </div>
            <div className="flex items-center gap-3">
              <LoomLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Loom Demos</span>
            </div>
            <div className="flex items-center gap-3">
              <MiroLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Miro Architecture</span>
            </div>
            <div className="flex items-center gap-3">
              <GoogleDocsLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Docs &amp; Slide Decks</span>
            </div>
            <div className="flex items-center gap-3">
              <NotionLogo className="w-5 h-5 shrink-0" />
              <span className="text-white font-semibold">Notion Specs</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Verifiable Report Preview Section */}
      <section className="relative z-10 py-20 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            Cryptographic Integrity
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            Proof of work you can verify anywhere
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto mt-2">
            Every published sprint generates a public SHA-256 certificate for resumes, LinkedIn, and judges.
          </p>
        </div>

        {/* Live Verifiable Product Card Window */}
        <div className="w-full rounded-2xl bg-[#09090b] border border-zinc-800 shadow-[0_20px_60px_rgba(0,0,0,0.9)] p-6 sm:p-8 text-left">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-5 border-b border-zinc-800/80 mb-6">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-700" />
              <span className="ml-3 text-xs font-mono text-zinc-400">teamtrack.ai/verify/rep_7f8a92e104bc</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-200 border border-zinc-700 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-zinc-300" /> SHA-256 Verified
              </span>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-zinc-900 text-zinc-400 border border-zinc-800">
                Confidence: 1.00
              </span>
            </div>
          </div>

          {/* Contributor Card Breakdown */}
          <div className="grid sm:grid-cols-3 gap-6 items-center">
            <div className="sm:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-white text-black font-bold flex items-center justify-center text-sm shadow">
                    SB
                  </div>
                  <div>
                    <h4 className="text-base font-semibold text-white">Sarvesh Bijawe</h4>
                    <p className="text-xs text-zinc-400">Lead Architect &amp; Systems Engineer</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-white tracking-tight">100.0%</span>
                  <p className="text-[11px] text-zinc-400">Attributed Share</p>
                </div>
              </div>

              {/* Monochromatic Pro Progress Bar */}
              <div className="space-y-2">
                <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                  <div className="bg-white h-full w-[45%]" />
                  <div className="bg-zinc-400 h-full w-[35%]" />
                  <div className="bg-zinc-600 h-full w-[20%]" />
                </div>
                <div className="flex items-center gap-4 text-[11px] text-zinc-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white block" /> Code (45%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 block" /> Design (35%)
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 block" /> Testing (20%)
                  </span>
                </div>
              </div>

              {/* Developer Badges (Zero Emojis) */}
              <div className="flex flex-wrap gap-2 pt-1 text-xs">
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-zinc-400" />
                  Lead Architect
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  Design Systems
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                  QA Audit Passed
                </span>
              </div>
            </div>

            {/* Key Evidence Box */}
            <div className="bg-zinc-950 rounded-xl p-4 border border-zinc-800 space-y-3 text-xs font-mono">
              <p className="text-zinc-400 uppercase text-[10px] font-sans font-semibold tracking-wider">
                Audited Evidence
              </p>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="truncate">UI/UX Design System in Figma</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px]">+1.60</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="truncate">Webhook Ingestion Engine</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px]">+1.00</span>
              </div>
              <div className="flex items-center justify-between text-zinc-300">
                <span className="truncate">SHA-256 Public Certificate</span>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-white font-mono text-[11px]">+1.00</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison: Broken vs Fair Paradigm */}
      <section id="comparison" className="relative z-10 py-24 px-6 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
            The Contribution Problem
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold text-white mt-2 tracking-tight">
            Stop grading teams by commit count.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto mt-3">
            Traditional tools only count git lines. TeamTrack AI values the complete software lifecycle.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Broken Way */}
          <div className="p-8 rounded-2xl bg-[#09090b] border border-red-500/20 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 text-red-400 font-semibold text-sm">
              <XCircle className="w-5 h-5 text-red-400" />
              <span>Traditional Hackathon &amp; Team Tracking</span>
            </div>
            <ul className="space-y-3.5 text-sm text-zinc-400">
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>Designers &amp; QA testers get 0 credit because they don&apos;t write code.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>Commit-padding and formatting changes artificially inflate contribution.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>Last-minute disputes over who built what with zero evidence trail.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-red-400 font-bold">✕</span>
                <span>No verifiable proof to show judges, hiring managers, or LinkedIn.</span>
              </li>
            </ul>
          </div>

          {/* Right: TeamTrack AI Way */}
          <div className="p-8 rounded-2xl bg-[#09090b] border border-emerald-500/20 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>With TeamTrack AI</span>
            </div>
            <ul className="space-y-3.5 text-sm text-zinc-300">
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Multi-role category weighting balances Dev, Design, QA, and Pitch.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Automated webhook author mapping, bot filtering, and duplicate pruning.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Interactive Dispute &amp; Consensus Room to agree on 50/50 joint credit splits.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>Permanent public SHA-256 proof certificates with earned achievement badges.</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* 3D DriftWall Showcase Section */}
      <section id="wall" className="relative z-10 py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
            Deliverables Stream
          </span>
          <h2 className="text-2xl sm:text-4xl font-bold mt-1 text-white tracking-tight">
            Every contribution verified in 3D
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto mt-2">
            Move your cursor to navigate the live stream of commits, Figma design tokens, testing reports, and cryptographic seals.
          </p>
        </div>

        {/* DriftWall Viewport Container */}
        <div className="w-full h-[520px] rounded-2xl border border-zinc-800 bg-[#050505] shadow-2xl relative overflow-hidden">
          <DriftWall
            items={SHOWCASE_ITEMS}
            columns={5}
            tileWidth={240}
            tileHeight={135}
            gap={16}
            tilt={14}
            turn={-8}
            perspective={1200}
            depth={80}
            speed={32}
            direction="up"
            variance={0.35}
            parallax={0.6}
            lift={64}
            fade={0.3}
            dim={0.92}
            overlayColor="transparent"
          />
        </div>
      </section>

      {/* Engineering Intelligence: Linear-Style Alternating Feature Panels (Option A) */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto space-y-28">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-medium uppercase tracking-wider mb-3">
            <Activity className="w-3.5 h-3.5" />
            Engineering Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Built for engineering integrity
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 mt-3 leading-relaxed">
            Eliminate subjective grading, credit non-code contributions, detect team burnout, and build verifiable resumes with cryptographic proof.
          </p>
        </div>

        {/* Panel 1: Multi-Signal Ingestion Engine */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono font-semibold">
              <GitBranch className="w-3.5 h-3.5 text-white" /> 01 / INGESTION ENGINE
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Connect once. Ingest every deliverable in real-time.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Never fill out a status report again. TeamTrack AI connects directly to your GitHub repository, Figma design system, Loom walkthroughs, and Miro architecture—automatically attributing contributions with zero configuration.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Instant Webhook Ingestion:</strong> Commits, pull requests, and code reviews sync in under 500ms.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Non-Code Deliverable Parsing:</strong> Automatically attributes Figma frames, Loom demos, and Notion RFCs.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Bot &amp; Noise Pruning:</strong> Automatically strips Dependabot bumps, formatting churn, and empty merges.</span>
              </div>
            </div>
          </div>

          {/* Panel 1 Interactive Widget */}
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-mono text-zinc-300 font-semibold">LIVE WEBHOOK PIPE (INGESTING)</span>
              </div>
              <span className="text-[11px] font-mono text-zinc-500">latency: 24ms</span>
            </div>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Github className="w-4 h-4 text-white shrink-0" />
                  <div>
                    <p className="text-white font-medium">PR #42: feat(auth): PKCE OAuth</p>
                    <p className="text-[11px] text-zinc-500">+340 -12 lines · 8 files</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-semibold">+1.20</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FigmaLogo className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-white font-medium">Design Tokens v2.4 (Dark Mode)</p>
                    <p className="text-[11px] text-zinc-500">14 Component Frames Verified</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-semibold">+1.60</span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LoomLogo className="w-4 h-4 shrink-0" />
                  <div>
                    <p className="text-white font-medium">Demo: Architecture &amp; API Spec</p>
                    <p className="text-[11px] text-zinc-500">3m 12s Walkthrough</p>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-white font-semibold">+1.00</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Mathematical Trust & 50/50 Consensus Room (Alternated) */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Panel 2 Interactive Widget */}
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-5 order-2 lg:order-1">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <span className="text-xs font-mono text-zinc-300 font-semibold">ROLE WEIGHT CONFIGURATION</span>
              <span className="text-[11px] font-mono text-zinc-500">normalized Σ = 100%</span>
            </div>

            {/* Role Weights Breakdown */}
            <div className="space-y-2">
              <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden flex">
                <div className="bg-white h-full w-[45%]" />
                <div className="bg-zinc-400 h-full w-[35%]" />
                <div className="bg-zinc-600 h-full w-[20%]" />
              </div>
              <div className="flex items-center justify-between text-xs text-zinc-400 font-mono pt-1">
                <span>Code (45%)</span>
                <span>Design (35%)</span>
                <span>QA &amp; Pitch (20%)</span>
              </div>
            </div>

            {/* 50/50 Consensus Resolution Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Dispute Resolution Room</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                  ✓ Co-Signed
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Shared deliverable: <strong>Auth Engine + UI Prototype</strong>
              </p>
              <div className="grid grid-cols-2 gap-3 pt-1 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <p className="text-zinc-400">Sarvesh B.</p>
                  <p className="text-white font-bold">50% Attribution</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <p className="text-zinc-400">Alex Chen</p>
                  <p className="text-white font-bold">50% Attribution</p>
                </div>
              </div>
            </div>

            {/* Formula Preview */}
            <div className="p-3 rounded-lg bg-black font-mono text-[11px] text-zinc-400 border border-zinc-800/80">
              V_(m,e,c) = B_e × I_e × A_(m,e) × Q_e × D_e
            </div>
          </div>

          <div className="space-y-6 order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono font-semibold">
              <Scale className="w-3.5 h-3.5 text-white" /> 02 / TRUST ENGINE
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Zero black boxes. Just explainable math.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Traditional hackathons and engineering sprints grade teams by commit count—rewarding churn and ignoring non-code work. TeamTrack AI uses transparent category weights and a peer consensus room to guarantee fair attribution.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Multi-Role Weighting:</strong> Tailor category weights for hackathons, design sprints, or core engineering.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">1-Click Dispute Consensus:</strong> Teammates agree on joint attribution with tamper-proof peer co-signing.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">100% Normalized Math:</strong> Every member score sums to $100\%$ with full mathematical auditability.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Cryptographic Proof & Team Health Radar */}
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono font-semibold">
              <Shield className="w-3.5 h-3.5 text-white" /> 03 / PROOF &amp; HEALTH
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Public proof of work + pre-burnout team health.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Publish sprint deliverables into permanent cryptographic certificates for resumes, LinkedIn, and hackathon judges. Concurrently monitor workload velocity to prevent pre-deadline hero syndrome and burnout.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Public /verify Certificates:</strong> Immutable SHA-256 proof certificates with verifiable provenance.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Team Health &amp; Velocity Radar:</strong> Warns leads when one engineer carries &gt;70% workload at 3:00 AM.</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">AI Sprint Changelogs:</strong> Synthesizes commit diffs into stakeholder-ready release digests in seconds.</span>
              </div>
            </div>
          </div>

          {/* Panel 3 Interactive Widget */}
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-white" />
                <span className="text-xs font-mono text-zinc-300 font-semibold">CERTIFICATE &amp; HEALTH MATRIX</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                PROV_9f8a2c1
              </span>
            </div>

            {/* Public Certificate Link Card */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white">Public Verification URL</span>
                <span className="text-[10px] text-zinc-500 font-mono">SHA-256 SEALED</span>
              </div>
              <div className="p-2 rounded-lg bg-black border border-zinc-800 text-xs font-mono text-zinc-300 truncate">
                https://teamtrack.ai/verify/rep_7f8a92e104bc
              </div>
            </div>

            {/* Health Radar Card */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">Team Health &amp; Velocity Radar</span>
                <span className="text-emerald-400 font-semibold font-mono text-[11px]">94% Healthy</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <p className="text-zinc-500 text-[10px]">WORKLOAD BALANCE</p>
                  <p className="text-white font-semibold">Even Distribution</p>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800">
                  <p className="text-zinc-500 text-[10px]">BURNOUT RADAR</p>
                  <p className="text-emerald-400 font-semibold">0 Critical Alerts</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works 3-Step Walkthrough */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t border-zinc-800/80">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
            Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            How TeamTrack AI operates
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-600 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-semibold text-sm mb-6 border border-zinc-700">
              01
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Automated Ingestion</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Connect your GitHub repository for automatic commit and PR sync. Attach Figma, Loom, Google Slides, or Miro deliverables with automatic metadata unfurling.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-600 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-semibold text-sm mb-6 border border-zinc-700">
              02
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Explainable Scoring</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A transparent formula applies category weights, effort bands, quality factors, and peer co-signing without black-box machine learning guesswork.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#09090b] border border-zinc-800 hover:border-zinc-600 transition-all">
            <div className="w-10 h-10 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-semibold text-sm mb-6 border border-zinc-700">
              03
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Cryptographic Proof</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Publish provisional reports to generate permanent public URLs with SHA-256 verification hashes and earned contributor achievement badges.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Formula Callout Section */}
      <section id="scoring" className="relative z-10 py-16 px-6 max-w-5xl mx-auto">
        <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Lock className="w-3.5 h-3.5" />
              100% Explainable &amp; Auditable
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 tracking-tight">
              Mathematical scoring formula
            </h2>
            <p className="text-sm text-zinc-400 mb-6 max-w-2xl leading-relaxed">
              Every member score is calculated transparently using verifiable mathematical equations:
            </p>
            <div className="bg-[#050505] rounded-xl p-5 border border-zinc-800 font-mono text-xs sm:text-sm text-zinc-300 space-y-2 overflow-x-auto">
              <p className="text-zinc-200">V_(m,e,c) = B_e × I_e × A_(m,e) × Q_e × D_e</p>
              <p className="text-zinc-400">
                S_m = 100 × Σ_c(W_c × N_(m,c)) / Σ_jΣ_c(W_c × N_(j,c))
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Bottom Call to Action */}
      <section className="relative z-10 py-24 px-6 text-center max-w-5xl mx-auto">
        <div className="p-12 sm:p-16 rounded-2xl bg-[#09090b] border border-zinc-800 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute top-[-50%] left-1/2 -translate-x-1/2 w-[400px] h-[300px] bg-white/[0.03] rounded-full blur-[100px]" />

          <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
            Give every teammate verified credit.
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-lg mx-auto mb-8 leading-relaxed">
            Create your workspace in seconds. Connect your GitHub repository and start generating tamper-proof proof of work today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <SpecularButton
              size="lg"
              radius={14}
              tint="#18181b"
              tintOpacity={0.95}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#3f3f46"
              intensity={1.4}
              speed={0.35}
              onClick={() => router.push("/login")}
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </SpecularButton>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium text-sm transition-all"
            >
              <Github className="w-4 h-4 text-zinc-300" />
              <span>Sign In with GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Minimalist Pro Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 py-12 px-6 max-w-7xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-white text-black flex items-center justify-center">
            <BarChart3 className="w-3 h-3" />
          </div>
          <span className="font-semibold text-zinc-200">TeamTrack AI</span>
          <span className="text-zinc-600">· Proof of Work OS</span>
        </div>

        <div className="flex items-center gap-6">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Systems Operational
          </span>
          <a href="#scoring" className="hover:text-zinc-300 transition-colors">
            Scoring Policy
          </a>
          <Link href="/login" className="hover:text-zinc-300 transition-colors">
            Login
          </Link>
        </div>
      </footer>
    </div>
  );
}