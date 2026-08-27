"use client";

import React from "react";
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
} from "lucide-react";
import SpecularButton from "@/components/reactbits/SpecularButton";
import DriftWall from "@/components/reactbits/DriftWall";
import MagicBento from "@/components/reactbits/MagicBento";
import PillNav from "@/components/reactbits/PillNav";
import ChromaWaves from "@/components/reactbits/ChromaWaves";

// High-contrast, dark-mode engineering & design artifact tiles for DriftWall
const SHOWCASE_ITEMS = [
  {
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=600&q=80",
    title: "GitHub Webhook & Commit Engine",
  },
  {
    image: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=600&q=80",
    title: "SHA-256 Cryptographic Verification Seal",
  },
  {
    image: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=600&q=80",
    title: "Full-Stack TypeScript & Next.js Core",
  },
  {
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=600&q=80",
    title: "Team Health & Hero Syndrome Radar",
  },
  {
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80",
    title: "AI Release Digest & Sprint Changelog",
  },
  {
    image: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?auto=format&fit=crop&w=600&q=80",
    title: "Figma UI Systems & Design Specs",
  },
  {
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?auto=format&fit=crop&w=600&q=80",
    title: "Verified Contributor Achievement Badges",
  },
  {
    image: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?auto=format&fit=crop&w=600&q=80",
    title: "Peer Co-Signing & Trust Index",
  },
  {
    image: "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=600&q=80",
    title: "Real-Time Evidence Timeline",
  },
  {
    image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80",
    title: "Normalized Multi-Role Attribution",
  },
  {
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80",
    title: "50/50 Split Credit Consensus Room",
  },
  {
    image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=600&q=80",
    title: "Distributed Hackathon Collaboration",
  },
];

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#000000] text-[#ededed] selection:bg-white selection:text-black relative overflow-hidden font-sans">
      {/* Precision Dark Dot Grid Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />

      {/* Floating PillNav Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/60 border-b border-white/[0.06] transition-all">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <PillNav
            logo={
              <div className="w-5 h-5 flex items-center justify-center text-white">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
            }
            logoAlt="TeamTrack AI Logo"
            items={[
              { label: "Overview", href: "/" },
              { label: "Deliverables", href: "#wall" },
              { label: "Features", href: "#features" },
              { label: "Workflow", href: "#how-it-works" },
              { label: "Scoring", href: "#scoring" },
            ]}
            baseColor="#ffffff"
            pillColor="#09090b"
            pillTextColor="#a1a1aa"
            hoveredPillTextColor="#000000"
          />

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-400 hover:text-white px-4 py-2 rounded-xl hover:bg-white/[0.04] transition-colors hidden sm:inline-block"
            >
              Sign In
            </Link>
            <SpecularButton
              size="sm"
              radius={12}
              tint="#18181b"
              tintOpacity={0.9}
              textColor="#ffffff"
              lineColor="#ffffff"
              baseColor="#3f3f46"
              intensity={1.2}
              onClick={() => router.push("/login")}
            >
              <span>Launch App</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </SpecularButton>
          </div>
        </div>
      </header>

      {/* Hero Section with Chroma Waves Background */}
      <section className="relative z-10 px-6 pt-24 pb-20 max-w-7xl mx-auto text-center flex flex-col items-center">
        {/* Chroma Waves WebGL Shader Canvas */}
        <div className="absolute inset-0 -top-20 -bottom-10 pointer-events-none overflow-hidden opacity-50 z-0">
          <ChromaWaves
            speed={0.2}
            frequency={1.5}
            amplitude={0.4}
            chroma={0.015}
            color1="#000000"
            color2="#71717a"
            color3="#18181b"
            opacity={0.75}
            interactive={true}
          />
        </div>

        {/* Crisp Monochromatic Pill Badge */}
        <div className="relative z-10 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.03] border border-white/10 text-zinc-300 text-xs font-medium tracking-wide mb-8 backdrop-blur-md hover:border-white/20 transition-colors">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>v1.0 · Tamper-Proof Proof-of-Work Engine</span>
          <ChevronRight className="w-3 h-3 text-zinc-500" />
        </div>

        {/* Hero Title */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.08] max-w-5xl mb-6 text-white">
          Fair contribution tracking
          <br />
          <span className="text-zinc-400">for high-velocity teams.</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-zinc-400 max-w-2xl mb-10 leading-relaxed font-normal">
          Ingest GitHub commits, Figma designs, and manual deliverables into explainable scores. 
          Generate cryptographic SHA-256 contribution certificates and AI changelogs with zero bias.
        </p>

        {/* Primary CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
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
            className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            <Github className="w-4 h-4 text-zinc-300" />
            <span>Continue with GitHub</span>
          </Link>
        </div>

        {/* Monochromatic Live Proof Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl w-full pt-6 border-t border-white/[0.06] text-left">
          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Instant Sync</p>
              <p className="text-[11px] text-zinc-400">GitHub Webhooks</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white flex items-center justify-center">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Multi-Role Model</p>
              <p className="text-[11px] text-zinc-400">100% Normalized</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-emerald-400 flex items-center justify-center">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">SHA-256 Proof</p>
              <p className="text-[11px] text-zinc-400">Public Certificates</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
            <div className="w-8 h-8 rounded-lg bg-white/[0.06] text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">AI Changelog</p>
              <p className="text-[11px] text-zinc-400">Release Digests</p>
            </div>
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
            Tilt and navigate the live stream of commits, Figma design tokens, testing reports, and cryptographic seals.
          </p>
        </div>

        {/* DriftWall Viewport Container */}
        <div className="w-full h-[520px] rounded-2xl border border-white/[0.08] bg-[#050505] shadow-2xl relative overflow-hidden">
          <DriftWall
            items={SHOWCASE_ITEMS}
            columns={5}
            tileWidth={220}
            tileHeight={145}
            gap={18}
            tilt={16}
            turn={-10}
            perspective={1200}
            depth={100}
            speed={36}
            direction="up"
            variance={0.35}
            parallax={0.6}
            lift={64}
            fade={0.65}
            dim={0.55}
            overlayColor="#000000"
          />
        </div>
      </section>

      {/* Interactive Bento Grid Features Section */}
      <section id="features" className="relative z-10 py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-zinc-300 text-xs font-medium uppercase tracking-wider mb-3">
            <Activity className="w-3.5 h-3.5" />
            Engineering Intelligence
          </div>
          <h2 className="text-3xl sm:text-5xl font-bold text-white tracking-tight">
            Built for engineering integrity
          </h2>
          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto mt-3 leading-relaxed">
            Eliminate subjective grading, credit non-code contributions, detect team burnout, and build verifiable resumes with cryptographic proof.
          </p>
        </div>

        {/* MagicBento Grid in Clean Obsidian Palette */}
        <MagicBento
          enableStars={false}
          enableSpotlight={true}
          enableBorderGlow={true}
          enableTilt={true}
          enableMagnetism={true}
          clickEffect={true}
          glowColor="255, 255, 255"
          spotlightRadius={300}
        />
      </section>

      {/* How It Works 3-Step Walkthrough */}
      <section id="how-it-works" className="relative z-10 py-20 px-6 max-w-7xl mx-auto border-t border-white/[0.06]">
        <div className="text-center mb-16">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-widest">
            Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mt-2 tracking-tight">
            How TeamTrack AI operates
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="p-8 rounded-2xl bg-[#09090b] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] text-white flex items-center justify-center font-semibold text-sm mb-6 border border-white/10">
              01
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Automated Ingestion</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Connect your GitHub repository for automatic commit and PR sync. Attach Figma, Loom, Google Slides, or Miro deliverables with automatic metadata unfurling.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#09090b] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] text-white flex items-center justify-center font-semibold text-sm mb-6 border border-white/10">
              02
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Explainable Scoring</h3>
            <p className="text-sm text-zinc-400 leading-relaxed">
              A transparent formula applies category weights, effort bands, quality factors, and peer co-signing without black-box machine learning guesswork.
            </p>
          </div>

          <div className="p-8 rounded-2xl bg-[#09090b] border border-white/[0.08] hover:border-white/20 transition-all">
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] text-white flex items-center justify-center font-semibold text-sm mb-6 border border-white/10">
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
        <div className="rounded-2xl bg-[#09090b] border border-white/[0.08] p-8 sm:p-12 shadow-2xl relative overflow-hidden">
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
            <div className="bg-[#050505] rounded-xl p-5 border border-white/[0.08] font-mono text-xs sm:text-sm text-zinc-300 space-y-2 overflow-x-auto">
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
        <div className="p-12 sm:p-16 rounded-2xl bg-[#09090b] border border-white/[0.08] shadow-2xl relative overflow-hidden">
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
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white font-medium text-sm transition-all"
            >
              <Github className="w-4 h-4 text-zinc-300" />
              <span>Sign In with GitHub</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Minimalist Monochrome Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] py-12 px-6 max-w-7xl mx-auto text-xs text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-6">
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