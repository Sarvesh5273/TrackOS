"use client";

import { useState } from "react";
import Link from "next/link";
import { Github, ArrowLeft, Loader2 } from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setLoading(true);

    const params = new URLSearchParams(window.location.search);
    const redirect = params.get("redirect");
    const safeRedirect =
      redirect && redirect.startsWith("/") && !redirect.startsWith("//")
        ? redirect
        : "/dashboard";

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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center px-6">
      <div className="orb top-[-200px] right-[-200px] opacity-25" />
      <div className="orb-small bottom-[-100px] left-[-100px] opacity-20" />

      <Link
        href="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to home
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-coral-500 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Github className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
          <p className="text-muted">Sign in to access your workspaces</p>
        </div>

        <div className="card p-8">
          <button
            onClick={handleGitHubLogin}
            disabled={loading}
            className="w-full btn-primary disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Github className="w-5 h-5" />
            )}
            {loading ? "Connecting..." : "Continue with GitHub"}
          </button>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted">
              By signing in, you agree to our{" "}
              <span className="text-coral-500 hover:underline cursor-pointer">Terms</span>
              {" "}and{" "}
              <span className="text-coral-500 hover:underline cursor-pointer">Privacy Policy</span>
              .
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            New here?{" "}
            <Link href="/" className="text-coral-500 font-medium hover:underline">
              Learn more about TeamTrack
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}