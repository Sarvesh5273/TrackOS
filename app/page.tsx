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
  ExternalLink,
} from "lucide-react";
import SpecularButton from "@/components/reactbits/SpecularButton";
import DriftWall from "@/components/reactbits/DriftWall";
import MagicBento from "@/components/reactbits/MagicBento";

// Showcase items for the 3D DriftWall representing modern hackathon & engineering deliverables
const SHOWCASE_ITEMS = [
  {
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
    title: "Figma Design System & Mobile Prototypes",
  },
  {
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
    title: "GitHub Webhook & Commit Engine",
  },
  {
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    title: "AI Release Digest & Sprint Changelog",
  },
  {
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    title: "SHA-256 Cryptographic Verification Seal",
  },
  {
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    title: "Team Health & Hero Syndrome Radar",
  },
  {
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
    title: "Peer Co-Signing & Trust Index",
  },
  {
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
    title: "50/50 Split Credit Consensus Room",
  },
  {
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=80",
    title: "Design Maestro & Feature Architect Badges",
  },
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    title: "Distributed Hackathon Collaboration",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    title: "Normalized Multi-Role Attribution",
  },
  {
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    title: "Full-Stack TypeScript & Next.js Core",
  },
  {
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    title: "Real-Time Evidence Timeline",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0d0b14] text-white selection:bg-coral-500 selection:text-white relative overflow-hidden font-sans">
      {/* Background Ambience & Radial Glows */}
      <div className="pointer-events-none absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-coral-500/10 rounded-full blur-[140px]" />
      <div className="pointer-events-none absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[160px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[-5%] w-[600px] h-[600px] bg-coral-600/10 rounded-full blur-[150px]" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#0d0b14]/70 border-b border-white/5 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-coral-500 to-rose-600 flex items-center justify-center shadow-lg shadow-coral-500/25 group-hover:scale-105 transition-transform">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-white group-hover:text-coral-400 transition-colors">
                TeamTrack <span className="text-coral-500">AI</span>
              </span>
              <span className="text-[10px] text-gray-400 tracking-wider uppercase font-semibold">
                Proof of Work OS
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition-colors">
              Features
            </a>
            <a href="#wall" className="hover:text-white transition-colors">
              Deliverables Stream
            </a>
            <a href="#how-it-works" className="hover:text-white transition-colors">
              How It Works
            </a>
            <a href="#scoring" className="hover:text-white transition-colors">
              Scoring Model
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-300 hover:text-white px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              Sign In
            </Link>
            <SpecularButton
              size="sm"
              radius={12}
              tint="#ff6b6b"
              tintOpacity={0.85}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#782e2e"
              intensity={1.2}
              onClick={() => router.push("/login")}
            >
              Get Started
            </SpecularButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-12 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Animated Pill Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-coral-400 text-xs font-semibold tracking-wide mb-8 backdrop-blur-md hover:border-coral-500/40 transition-colors">
          <Sparkles className="w-3.5 h-3.5 text-coral-400 animate-pulse" />
          <span>Next-Gen Hackathon &amp; Team Contribution Engine</span>
          <ChevronRight className="w-3 h-3 text-gray-400" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-5xl mb-6">
          Fair Contribution Tracking for{" "}
          <span className="bg-gradient-to-r from-coral-400 via-rose-400 to-amber-300 bg-clip-text text-transparent">
            High-Velocity Teams
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-gray-300 max-w-2xl mb-10 leading-relaxed font-normal">
          From GitHub commits and PR merges to Figma design systems and pitch decks. 
          Generate tamper-proof cryptographic certificates, AI release notes, and fair normalized scores.
        </p>

        {/* CTAs with SpecularButton */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          <SpecularButton
            size="lg"
            radius={16}
            tint="#ff6b6b"
            tintOpacity={0.9}
            textColor="#ffffff"
            lineColor="#ffffff"
            baseColor="#802828"
            intensity={1.4}
            speed={0.4}
            followMouse={true}
            onClick={() => router.push("/login")}
            className="shadow-2xl shadow-coral-500/20"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="w-4 h-4 ml-1" />
          </SpecularButton>

          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-base transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Github className="w-5 h-5 text-gray-200" />
            <span>Continue with GitHub</span>
          </Link>
        </div>

        {/* Live Proof Badges Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl w-full pt-4 border-t border-white/5 text-left">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-coral-500/10 text-coral-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Real-Time Sync</p>
              <p className="text-[11px] text-gray-400">Webhooks &amp; Auto-Mapping</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Multi-Role Model</p>
              <p className="text-[11px] text-gray-400">Dev, Design, QA &amp; Slides</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">SHA-256 Proof</p>
              <p className="text-[11px] text-gray-400">Tamper-Proof Verification</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">AI Changelog</p>
              <p className="text-[11px] text-gray-400">1-Click Release Digests</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3D DriftWall Showcase Section */}
      <section id="wall" className="relative z-10 py-16 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold text-coral-400 uppercase tracking-widest">
            Live Deliverables Stream
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold mt-2 text-white">
            Every Contribution Captured in 3D
          </h2>
          <p className="text-sm text-gray-400 max-w-xl mx-auto mt-2">
            Move your cursor to tilt and navigate the stream of commits, Figma artboards, QA tests, and verifiable badges.
          </p>
        </div>

        {/* DriftWall Viewport Container */}
        <div className="w-full h-[520px] rounded-3xl border border-white/10 bg-[#060010] shadow-2xl relative overflow-hidden">
          <DriftWall
            items={SHOWCASE_ITEMS}
            columns={5}
            tileWidth={220}
            tileHeight={145}
            gap={20}
            tilt={18}
            turn={-12}
            perspective={1100}
            depth={100}
            speed={38}
            direction="up"
            variance={0.4}
            parallax={0.7}
            lift={70}
            fade={0.65}
            dim={0.6}
            overlayColor="#0d0b14"
          />
        </div>
      </section>

      {/* Interactive Bento Grid Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-coral-500/10 border border-coral-500/20 text-coral-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Activity className="w-3.5 h-3.5" />
            Engineering Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Designed for Fair Hackathons &amp; Teams
          </h2>
          <p className="text-base text-gray-400 max-w-2xl mx-auto mt-4 leading-relaxed">
            Eliminate bias, capture invisible non-code labor, detect team burnout, and build tamper-proof resumes with cryptographic evidence.
          </p>
        </div>

        {/* MagicBento Grid with GSAP Spotlight & Particle Stars */}
        <MagicBento
          enableStars={true}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          glowColor="255, 107, 107"
          spotlightRadius={320}
          particleCount={14}
        />
      </section>

      {/* How It Works 3-Step Walkthrough */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="text-center mb-16">
          <span className="text-xs font-semibold text-coral-400 uppercase tracking-widest">
            Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2">
            From First Commit to Final Certificate in 3 Steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-coral-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-coral-500/10 text-coral-400 flex items-center justify-center font-bold text-xl mb-6">
              1
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Connect Sources</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Connect your GitHub repository for instant commit and PR ingestion. Paste Figma, Loom, Google Slides, or Miro links to credit non-code contributions.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-coral-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-xl mb-6">
              2
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Explainable Scoring</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              The transparent mathematical formula weights effort, quality, impact, and peer co-signs across each category without black-box guessing.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-white/[0.02] border border-white/10 hover:border-coral-500/30 transition-all">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl mb-6">
              3
            </div>
            <h3 className="text-xl font-bold text-white mb-3">Verify &amp; Showcase</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Publish reports to generate a public cryptographic proof certificate with achievement badges to add directly to resumes and LinkedIn.
            </p>
          </div>
        </div>
      </section>

      {/* Transparent Formula Callout Section */}
      <section id="scoring" className="relative z-10 py-16 px-6 max-w-5xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-[#1a1427] to-[#120f1a] border border-white/10 p-8 sm:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Scale className="w-48 h-48 text-white" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-coral-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Lock className="w-4 h-4" />
              100% Explainable &amp; Auditable
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Mathematical Trust Model
            </h2>
            <p className="text-sm text-gray-300 mb-6 max-w-2xl leading-relaxed">
              Every score is computed with transparent mathematical rigor. No arbitrary algorithms:
            </p>
            <div className="bg-[#0c0914] rounded-xl p-5 border border-white/10 font-mono text-xs sm:text-sm text-coral-300 overflow-x-auto">
              <code>V_(m,e,c) = B_e × I_e × A_(m,e) × Q_e × D_e</code>
              <br />
              <code className="text-gray-400">
                S_m = 100 × Σ_c(W_c × N_(m,c)) / Σ_jΣ_c(W_c × N_(j,c))
              </code>
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Bottom Call to Action */}
      <section className="relative z-10 py-24 px-6 text-center max-w-5xl mx-auto">
        <div className="p-12 sm:p-16 rounded-3xl bg-gradient-to-b from-coral-950/40 via-[#151121] to-[#0d0b14] border border-coral-500/20 shadow-2xl relative overflow-hidden">
          <div className="pointer-events-none absolute top-[-50%] left-[25%] w-[400px] h-[400px] bg-coral-500/20 rounded-full blur-[120px]" />

          <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-6">
            Ready to Give Every Teammate Fair Credit?
          </h2>
          <p className="text-base sm:text-lg text-gray-300 max-w-xl mx-auto mb-10 leading-relaxed">
            Create your workspace in seconds. Connect your GitHub repository and start tracking verifiable contributions today.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <SpecularButton
              size="lg"
              radius={18}
              tint="#ff6b6b"
              tintOpacity={0.95}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#8f2d2d"
              intensity={1.5}
              speed={0.4}
              onClick={() => router.push("/login")}
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-5 h-5 ml-1" />
            </SpecularButton>

            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-base transition-all"
            >
              <Github className="w-5 h-5 text-gray-300" />
              <span>Sign In with GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 max-w-7xl mx-auto text-sm text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-coral-500 flex items-center justify-center">
            <BarChart3 className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-white">TeamTrack AI</span>
          <span className="text-xs text-gray-500">© 2026</span>
        </div>

        <div className="flex items-center gap-6 text-xs">
          <span className="flex items-center gap-1.5 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            All Systems Operational
          </span>
          <a href="#scoring" className="hover:text-white transition-colors">
            Scoring Policy
          </a>
          <Link href="/login" className="hover:text-white transition-colors">
            Workspace Login
          </Link>
        </div>
      </footer>
    </div>
  );
}