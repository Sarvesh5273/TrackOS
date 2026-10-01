"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Github,
  ArrowLeft,
  Loader2,
  ArrowRight,
  Mail,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import ChromaWaves from "@/components/reactbits/ChromaWaves";
import TrackOSLogo from "@/components/TrackOSLogo";

export interface Auth2Props {
  onSuccessRedirect?: string;
}

export default function Auth2({ onSuccessRedirect = "/dashboard" }: Auth2Props) {
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const getRedirectUrl = () => {
    if (typeof window === "undefined") return onSuccessRedirect;
    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    return redirect && redirect.startsWith("/") && !redirect.startsWith("//")
      ? redirect
      : onSuccessRedirect;
  };

  const handleGitHubLogin = async () => {
    setLoading(true);
    setMessage(null);

    const safeRedirect = getRedirectUrl();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
      },
    });

    if (error) {
      console.error(error);
      setMessage({ type: "error", text: error.message || "Failed to authenticate with GitHub." });
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setEmailLoading(true);
    setMessage(null);

    const safeRedirect = getRedirectUrl();
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeRedirect)}`,
      },
    });

    setEmailLoading(false);
    if (error) {
      setMessage({ type: "error", text: error.message || "Failed to send magic link." });
    } else {
      setMessage({
        type: "success",
        text: "Magic link sent! Check your inbox to sign in.",
      });
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white grid lg:grid-cols-12 relative overflow-hidden font-sans">
      {/* Left Panel: ChromaWaves Silk Canvas Background (5 cols on lg) */}
      <div className="lg:col-span-5 relative hidden lg:flex flex-col justify-between p-12 border-r border-zinc-800/80 overflow-hidden bg-[#050507]">
        {/* Full Interactive Chroma Waves Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-80 z-0">
          <ChromaWaves
            speed={0.4}
            frequency={0.35}
            distortion={1.4}
            grain={0.06}
            color1="#ffffff"
            color2="#8B5CF6"
            color3="#050408"
            opacity={0.9}
            interactive={true}
          />
        </div>

        {/* Ambient Dark Veil Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.55)_0%,rgba(0,0,0,0.85)_100%)] pointer-events-none z-[1]" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <TrackOSLogo size="lg" />
          </Link>
        </div>

        {/* Center Minimal Typography */}
        <div className="relative z-10 space-y-3 my-auto">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)]">
            Engineering intelligence. <br />
            <span className="text-zinc-400 font-medium">Deterministic proof of work.</span>
          </h1>
          <p className="text-zinc-300 text-sm leading-relaxed max-w-sm drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            Automated deliverable attribution, burnout detection, and verifiable engineering credentials.
          </p>
        </div>
      </div>

      {/* Right Panel: Professional SaaS Sign-In Card (7 cols on lg) */}
      <div className="lg:col-span-7 flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative bg-[#000000]">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to home</span>
          </Link>
        </div>

        {/* Center Sign In Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          <div className="rounded-2xl bg-[#09090b] border border-zinc-800 p-8 sm:p-10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] space-y-6">
            <div className="space-y-1.5">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sign in to TrackOS
              </h2>
              <p className="text-xs text-zinc-400">
                Access your repositories, sprint velocity, and proof of work.
              </p>
            </div>

            {message && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2.5 font-medium ${
                  message.type === "success"
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                    : "bg-red-500/10 border border-red-500/20 text-red-300"
                }`}
              >
                {message.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            {/* Primary GitHub OAuth Button */}
            <div className="space-y-4 pt-1">
              <button
                onClick={handleGitHubLogin}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-white text-black font-semibold text-sm hover:bg-zinc-200 transition-all flex items-center justify-center gap-2.5 shadow-md active:scale-[0.99] disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Github className="w-4 h-4 text-black" />
                )}
                <span>{loading ? "Connecting to GitHub..." : "Continue with GitHub"}</span>
              </button>

              {/* Clean Centered Hairline Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full border-t border-zinc-800" />
                <span className="absolute px-3 bg-[#09090b] text-[11px] font-mono text-zinc-500 uppercase tracking-wider">
                  or email link
                </span>
              </div>

              {/* Magic Link Email Form */}
              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label htmlFor="email" className="block text-[11px] font-mono text-zinc-400 uppercase tracking-wider mb-1.5">
                    Work Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full h-11 bg-black border border-zinc-800 rounded-xl pl-10 pr-4 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={emailLoading || !email}
                  className="w-full h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {emailLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ArrowRight className="w-3.5 h-3.5" />
                  )}
                  <span>{emailLoading ? "Sending Link..." : "Send Magic Link"}</span>
                </button>
              </form>
            </div>

            {/* Legal / Policy */}
            <div className="pt-2 text-center text-[11px] text-zinc-500 leading-relaxed">
              By continuing, you agree to TrackOS&apos;s{" "}
              <span className="text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-white">
                Terms
              </span>{" "}
              and{" "}
              <span className="text-zinc-400 underline underline-offset-2 cursor-pointer hover:text-white">
                Privacy Policy
              </span>
              .
            </div>
          </div>
        </div>

        {/* Bottom Footer Details */}
        <div className="text-center sm:text-left text-[11px] text-zinc-600 font-mono">
          &copy; {new Date().getFullYear()} TrackOS. Built for engineering integrity.
        </div>
      </div>
    </div>
  );
}
