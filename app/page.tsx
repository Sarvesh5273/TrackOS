"use client";

import Link from "next/link";
import { ArrowRight, Github, BarChart3, Shield, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Orbs */}
      <div className="orb top-[-100px] right-[-150px] animate-float" />
      <div className="orb-small bottom-[20%] left-[-100px] animate-float" style={{ animationDelay: "2s" }} />

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-coral-500 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight">TeamTrack AI</span>
        </div>
        <Link
          href="/login"
          className="btn-outline text-sm"
        >
          Sign In
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-16 pb-24 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 border border-border shadow-soft mb-8">
            <Zap className="w-4 h-4 text-coral-500" />
            <span className="text-sm font-medium text-muted">AI-Powered Tracking</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Fair Contribution
            <br />
            <span className="gradient-text">Tracking for Teams</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted max-w-xl mb-10 leading-relaxed">
            From code commits to design files, we analyze every contribution 
            to ensure every team member gets fair recognition.
          </p>

          <div className="flex flex-wrap gap-4">
            <Link href="/login" className="btn-coral inline-flex items-center gap-2 text-lg">
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-outline inline-flex items-center gap-2 text-lg">
              <Github className="w-5 h-5" />
              Continue with GitHub
            </Link>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 py-24 bg-surface-dark">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16">
            <span className="text-sm font-medium text-coral-400 uppercase tracking-wider">Features</span>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mt-3">
              Built for Hackathon Teams
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: <Github className="w-6 h-6" />,
                title: "GitHub Integration",
                desc: "Auto-sync commits, PRs, and issues. No manual data entry.",
              },
              {
                icon: <BarChart3 className="w-6 h-6" />,
                title: "Smart Scoring",
                desc: "Rule-based engine with confidence indicators and explainability.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Fair & Transparent",
                desc: "Bot detection, shared credit splitting, and dispute resolution.",
              },
              {
                icon: <Zap className="w-6 h-6" />,
                title: "Real-time Reports",
                desc: "Generate provisional reports with one click. Export to PDF.",
              },
              {
                icon: <ArrowRight className="w-6 h-6" />,
                title: "Workspace Management",
                desc: "Create workspaces, invite members, track multiple projects.",
              },
              {
                icon: <Shield className="w-6 h-6" />,
                title: "Audit Trail",
                desc: "Every action logged. Full transparency for all stakeholders.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-xl bg-coral-500/20 flex items-center justify-center text-coral-400 mb-4 group-hover:scale-110 transition-transform">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">
            Ready to track contributions fairly?
          </h2>
          <p className="text-muted text-lg mb-10 max-w-xl mx-auto">
            Join teams who use TeamTrack AI to eliminate contribution disputes and reward real work.
          </p>
          <Link href="/login" className="btn-coral inline-flex items-center gap-2 text-lg">
            Start Tracking Now
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-8 border-t border-border">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-coral-500 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold">TeamTrack AI</span>
          </div>
          <p className="text-sm text-muted">Built for fair teams.</p>
        </div>
      </footer>
    </div>
  );
}