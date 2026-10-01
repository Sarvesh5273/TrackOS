"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
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
import TrackOSLogo from "@/components/TrackOSLogo";
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
            <span className="text-xs font-mono text-zinc-300 font-semibold">Credit Split</span>
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
            <span className="text-xs font-mono text-zinc-300 font-semibold">Weekly Update</span>
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
  const pageContainerRef = useRef<HTMLDivElement>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("/api/user/profile", { cache: "no-store" })
      .then((response) => {
        if (active) setIsSignedIn(response.ok);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const appHref = isSignedIn ? "/dashboard" : "/login";

  useEffect(() => {
    if (typeof window === "undefined") return;
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      // 1. Feature Section Header
      gsap.from(".feature-header", {
        scrollTrigger: {
          trigger: ".feature-header",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 35,
        duration: 0.75,
        ease: "power3.out",
      });

      // 2. Feature Panels
      const panels = gsap.utils.toArray<HTMLElement>(".feature-panel");
      panels.forEach((panel) => {
        const textCol = panel.querySelector(".feature-text");
        const widgetCol = panel.querySelector(".feature-widget");
        const checkItems = panel.querySelectorAll(".feature-check");

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: panel,
            start: "top 80%",
            toggleActions: "play none none reverse",
          },
        });

        if (textCol) {
          tl.from(
            textCol,
            {
              opacity: 0,
              y: 30,
              duration: 0.7,
              ease: "power3.out",
            },
            0
          );
        }

        if (widgetCol) {
          tl.from(
            widgetCol,
            {
              opacity: 0,
              y: 40,
              scale: 0.96,
              duration: 0.75,
              ease: "power3.out",
            },
            0.1
          );
        }

        if (checkItems.length > 0) {
          tl.from(
            checkItems,
            {
              opacity: 0,
              x: -15,
              stagger: 0.08,
              duration: 0.45,
              ease: "power2.out",
            },
            0.25
          );
        }
      });

      // 3. Mathematical Scoring Section
      const scoringTl = gsap.timeline({
        scrollTrigger: {
          trigger: "#scoring",
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      scoringTl.from(
        ".scoring-left",
        {
          opacity: 0,
          x: -30,
          duration: 0.75,
          ease: "power3.out",
        },
        0
      );

      scoringTl.from(
        ".scoring-right",
        {
          opacity: 0,
          x: 30,
          scale: 0.96,
          duration: 0.75,
          ease: "power3.out",
        },
        0.1
      );

      // 5. High-Impact Bottom CTA
      gsap.from(".cta-container", {
        scrollTrigger: {
          trigger: ".cta-container",
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        opacity: 0,
        y: 40,
        scale: 0.96,
        duration: 0.8,
        ease: "power3.out",
      });
    }, pageContainerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div ref={pageContainerRef} className="min-h-screen bg-[#000000] text-[#ededed] selection:bg-white selection:text-black relative overflow-hidden font-sans">
      {/* Precision Dark Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

      {/* Unified Glassmorphism Header */}
      <header className="fixed top-0 inset-x-0 z-50 bg-black/25 backdrop-blur-xl border-b border-white/[0.08] transition-all before:absolute before:inset-x-0 before:top-0 before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Left: Medium Balanced TrackOS Logo */}
          <Link href="/" className="flex items-center shrink-0 group">
            <TrackOSLogo size="md" />
          </Link>

          {/* Center: Cohesive Frosted Glass PillNav with GSAP Animations */}
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
              pillColor="rgba(255, 255, 255, 0.03)"
              pillTextColor="#a1a1aa"
              hoveredPillTextColor="#000000"
            />
          </div>

          {/* Right: Matching Glass Pill Action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => router.push(appHref)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white text-black text-xs font-semibold hover:bg-zinc-200 transition-all shadow-[0_2px_12px_rgba(255,255,255,0.18)] active:scale-95"
            >
              <span>{isSignedIn ? "Dashboard" : "Sign In"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section: Full-Width Section with Edge-to-Edge Chroma Waves Background */}
      <section className="relative z-10 w-full overflow-hidden pt-32 sm:pt-40 pb-24">
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
            A simple task board.
            <br />
            <span className="text-zinc-400 font-medium">Fair credit for everyone.</span>
          </h1>

          {/* 1-Line Clean Subtitle */}
          <p className="text-base sm:text-lg text-zinc-300 max-w-xl mb-10 leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Plan tasks, link GitHub work, and share a signed report of who did what. Built for student and hackathon teams.
          </p>

          {/* Single High-Impact Primary CTA */}
          <div className="flex flex-col items-center gap-3">
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
              onClick={() => router.push(appHref)}
            >
              <span>{isSignedIn ? "Open Dashboard" : "Get Started with GitHub"}</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </SpecularButton>

            <span className="text-xs text-zinc-400 font-mono">
              Free for open source &middot; No credit card required
            </span>
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
              <span className="ml-3 text-xs font-mono text-zinc-400">trackos.dev/verify/rep_7f8a92e104bc</span>
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
            Traditional tools only count git lines. TrackOS values the complete software lifecycle.
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

          {/* Right: TrackOS Way */}
          <div className="p-8 rounded-2xl bg-[#09090b] border border-emerald-500/20 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 text-emerald-400 font-semibold text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>With TrackOS</span>
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
                <span>Shared tasks split credit equally; custom splits apply only when everyone on the task approves.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>A public report page with a signed seal that shows if anything changed after publishing.</span>
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
        <div className="feature-header text-center max-w-3xl mx-auto">
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
        <div className="feature-panel grid lg:grid-cols-2 gap-12 items-center">
          <div className="feature-text space-y-6">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono font-semibold">
              <GitBranch className="w-3.5 h-3.5 text-white" /> 01 / INGESTION ENGINE
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Connect once. Ingest every deliverable in real-time.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Never fill out a status report again. TrackOS connects directly to your GitHub repository, Figma design system, Loom walkthroughs, and Miro architecture—automatically attributing contributions with zero configuration.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Instant Webhook Ingestion:</strong> Commits, pull requests, and code reviews sync in under 500ms.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Non-Code Deliverable Parsing:</strong> Automatically attributes Figma frames, Loom demos, and Notion RFCs.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Bot &amp; Noise Pruning:</strong> Automatically strips Dependabot bumps, formatting churn, and empty merges.</span>
              </div>
            </div>
          </div>

          {/* Panel 1 Interactive Widget */}
          <div className="feature-widget rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-4">
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
        <div className="feature-panel grid lg:grid-cols-2 gap-12 items-center">
          {/* Panel 2 Interactive Widget */}
          <div className="feature-widget rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-5 order-2 lg:order-1">
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

          <div className="feature-text space-y-6 order-1 lg:order-2">
            <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-900 text-zinc-300 border border-zinc-800 text-xs font-mono font-semibold">
              <Scale className="w-3.5 h-3.5 text-white" /> 02 / TRUST ENGINE
            </span>
            <h3 className="text-2xl sm:text-4xl font-bold text-white tracking-tight leading-tight">
              Zero black boxes. Just explainable math.
            </h3>
            <p className="text-sm sm:text-base text-zinc-400 leading-relaxed">
              Traditional hackathons and engineering sprints grade teams by commit count—rewarding churn and ignoring non-code work. TrackOS uses transparent category weights and a peer consensus room to guarantee fair attribution.
            </p>
            <div className="space-y-3 pt-2 text-sm text-zinc-300">
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Multi-Role Weighting:</strong> Tailor category weights for hackathons, design sprints, or core engineering.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
<span><strong className="text-white">Agreed credit splits:</strong> Pair on a task, share its credit. Commits that mention the task are shared the same way.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">100% Normalized Math:</strong> Every member score sums to $100\%$ with full mathematical auditability.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 3: Cryptographic Proof & Team Health Radar */}
        <div className="feature-panel grid lg:grid-cols-2 gap-12 items-center">
          <div className="feature-text space-y-6">
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
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Public /verify Certificates:</strong> Immutable SHA-256 proof certificates with verifiable provenance.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Team Health &amp; Velocity Radar:</strong> Warns leads when one engineer carries &gt;70% workload at 3:00 AM.</span>
              </div>
              <div className="feature-check flex items-start gap-3">
                <Check className="w-4 h-4 text-white shrink-0 mt-1" />
                <span><strong className="text-white">Weekly updates:</strong> What got done, what&apos;s overdue, and who&apos;s gone quiet, ready to paste into your team chat.</span>
              </div>
            </div>
          </div>

          {/* Panel 3 Interactive Widget */}
          <div className="feature-widget rounded-2xl bg-[#09090b] border border-zinc-800 p-6 shadow-2xl space-y-4">
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
                https://trackos.dev/verify/rep_7f8a92e104bc
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
            How TrackOS operates
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
              Publish the report to get a public link for judges or your professor, sealed with an HMAC-SHA256 signature that reveals later edits.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive Mathematical Scoring & Auditability */}
      <section id="scoring" className="relative z-10 py-20 px-6 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-[#09090b] border border-zinc-800 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="grid lg:grid-cols-12 gap-10 items-center">
            {/* Left: Math Equations with Clear Structure */}
            <div className="scoring-left lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono">
                <Lock className="w-3.5 h-3.5" /> 100% EXPLAINABLE &amp; AUDITABLE MATH
              </div>
              <h2 className="text-2xl sm:text-4xl font-bold text-white tracking-tight">
                Mathematical scoring. <br />
                <span className="text-zinc-400">Zero black box guesswork.</span>
              </h2>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Every contribution is evaluated through deterministic equations that normalize effort, peer co-signing, and multi-disciplinary weights.
              </p>

              {/* Formula Cards */}
              <div className="space-y-3 font-mono">
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Deliverable Value Function</span>
                  <p className="text-sm sm:text-base text-white font-bold tracking-wide">
                    V<sub className="text-zinc-400">(m,e,c)</sub> = B<sub className="text-zinc-400">e</sub> · I<sub className="text-zinc-400">e</sub> · A<sub className="text-zinc-400">(m,e)</sub> · Q<sub className="text-zinc-400">e</sub> · D<sub className="text-zinc-400">e</sub>
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-black border border-zinc-800 space-y-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Normalized Member Attribution</span>
                  <p className="text-sm sm:text-base text-white font-bold tracking-wide">
                    S<sub className="text-zinc-400">m</sub> = 100 × (Σ W<sub className="text-zinc-400">c</sub>N<sub className="text-zinc-400">(m,c)</sub>) / (Σ W<sub className="text-zinc-400">c</sub>N<sub className="text-zinc-400">(total,c)</sub>)
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Variable Breakdown Matrix */}
            <div className="scoring-right lg:col-span-6 rounded-2xl bg-zinc-950 border border-zinc-800 p-6 sm:p-7 space-y-4 shadow-xl">
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider font-semibold">
                Variable Transparency Matrix
              </span>
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <p className="text-white font-bold">B_e · Baseline</p>
                  <p className="text-zinc-400 text-[11px] leading-tight">Deliverable base effort tier</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <p className="text-white font-bold">I_e · Complexity</p>
                  <p className="text-zinc-400 text-[11px] leading-tight">Diff lines, frame count, video length</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <p className="text-white font-bold">A_(m,e) · Consensus</p>
                  <p className="text-zinc-400 text-[11px] leading-tight">Peer co-signed attribution split</p>
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-1">
                  <p className="text-white font-bold">W_c · Role Weight</p>
                  <p className="text-zinc-400 text-[11px] leading-tight">Code 45%, Design 35%, QA 20%</p>
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono text-emerald-400 flex items-center justify-between">
                <span>✓ Mathematical Audit: Guaranteed Σ S_m = 100%</span>
                <span className="font-bold font-mono">STABLE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Bottom Call to Action */}
      <section className="relative z-10 py-24 px-6 text-center max-w-5xl mx-auto">
        <div className="cta-container p-12 sm:p-16 rounded-3xl bg-[#09090b] border border-zinc-800 shadow-2xl relative overflow-hidden">
          {/* Ambient Specular Glow */}
          <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-purple-500/10 rounded-full blur-[120px]" />

          <div className="relative z-10 space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> START IN SECONDS · FREE FOR OPEN SOURCE
            </div>

            <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight max-w-2xl mx-auto leading-tight">
              Give every teammate verified credit.
            </h2>

            <p className="text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
              Connect your GitHub repository and Figma design system to start generating tamper-proof proof of work today.
            </p>

            {/* Feature Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-400 font-mono py-2">
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Instant Webhook Sync
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> 100% Normalized Math
              </span>
              <span className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400" /> Cryptographic SHA-256 Proof
              </span>
            </div>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 pt-4">
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
                onClick={() => router.push(appHref)}
              >
                <span>{isSignedIn ? "Open Dashboard" : "Get Started with GitHub"}</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </SpecularButton>

              <span className="text-xs text-zinc-400 font-mono">
                No credit card required &middot; 30-second setup
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Engineering Intelligence Footer */}
      <footer className="relative z-10 border-t border-zinc-800/80 bg-[#050507] pt-16 pb-12 px-6">
        <div className="max-w-7xl mx-auto space-y-12">
          {/* Top 4-Column Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 text-xs">
            {/* Column 1: Brand & Operational Status (2 cols on md) */}
            <div className="col-span-2 space-y-4">
              <TrackOSLogo size="lg" />

              <p className="text-zinc-400 text-xs leading-relaxed max-w-sm">
                Engineering intelligence and cryptographic proof of work for high-velocity teams. Eliminate subjective grading and attribute every contribution with mathematical certainty.
              </p>

              {/* Real-time System Status Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900/90 border border-zinc-800 text-[11px] font-mono text-zinc-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 font-semibold">Webhooks Active</span>
                <span className="text-zinc-500">· 24ms avg latency</span>
              </div>
            </div>

            {/* Column 2: Product */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white font-mono">Product</p>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Ingestion Engine
                  </a>
                </li>
                <li>
                  <a href="#scoring" className="hover:text-white transition-colors">
                    Mathematical Scoring
                  </a>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white transition-colors">
                    Architecture
                  </a>
                </li>
                <li>
                  <a href="#wall" className="hover:text-white transition-colors">
                    Deliverable Showcase
                  </a>
                </li>
                <li>
                  <Link href={appHref} className="hover:text-white transition-colors">
                    Launch Workspace
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Integrations */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white font-mono">Integrations</p>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <span className="text-zinc-300">GitHub</span>
                  <span className="text-zinc-600 text-[10px] ml-1.5 font-mono">Commits &amp; PRs</span>
                </li>
                <li>
                  <span className="text-zinc-300">Figma</span>
                  <span className="text-zinc-600 text-[10px] ml-1.5 font-mono">Design Frames</span>
                </li>
                <li>
                  <span className="text-zinc-300">Loom</span>
                  <span className="text-zinc-600 text-[10px] ml-1.5 font-mono">Video Specs</span>
                </li>
                <li>
                  <span className="text-zinc-300">Miro</span>
                  <span className="text-zinc-600 text-[10px] ml-1.5 font-mono">Architecture</span>
                </li>
                <li>
                  <span className="text-zinc-300">Google Docs &amp; Notion</span>
                </li>
              </ul>
            </div>

            {/* Column 4: Integrity & Math */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white font-mono">Integrity</p>
              <ul className="space-y-2 text-zinc-400">
                <li>
                  <a href="#scoring" className="hover:text-white transition-colors">
                    SHA-256 Provenance
                  </a>
                </li>
                <li>
                  <a href="#scoring" className="hover:text-white transition-colors">
                    Deterministic Formula
                  </a>
                </li>
                <li>
                  <a href="#scoring" className="hover:text-white transition-colors">
                    Bot &amp; Sybil Pruning
                  </a>
                </li>
                <li>
                  <a href="#scoring" className="hover:text-white transition-colors">
                    Credit Splits
                  </a>
                </li>
                <li>
                  <span className="text-emerald-400 font-mono text-[11px]">100% Audit Guarantee</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Legal & Copyright Bar */}
          <div className="pt-8 border-t border-zinc-800/60 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-zinc-500 font-mono">
            <div>
              &copy; {new Date().getFullYear()} TrackOS. All rights reserved. Built for engineering integrity.
            </div>

            <div className="flex items-center gap-6">
              <Link href={appHref} className="hover:text-zinc-300 transition-colors">
                {isSignedIn ? "Dashboard" : "Sign In"}
              </Link>
              <a href="#scoring" className="hover:text-zinc-300 transition-colors">
                Scoring Whitepaper
              </a>
              <span className="text-zinc-700">·</span>
              <span className="text-zinc-400">SHA-256 Protocol</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
