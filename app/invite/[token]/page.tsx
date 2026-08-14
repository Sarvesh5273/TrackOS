"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  Github,
  Loader2,
  Users,
  UserPlus,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";

interface InviteInfo {
  workspace: { id: string; name: string };
  inviter: { name: string | null; email: string };
  role: string;
  expiresAt: string;
}

export default function InvitePage() {
  const { token } = useParams();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notLoggedIn, setNotLoggedIn] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    loadInvite();
  }, [token]);

  const loadInvite = async () => {
    try {
      const res = await fetch(`/api/invite/${token}`);
      if (res.ok) {
        const data = await res.json();
        setInvite(data);
      } else {
        setError("This invite link is invalid or has expired.");
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/invite/${token}/accept`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setAccepted(true);
        setTimeout(() => router.push(`/workspaces/${data.workspaceId}`), 800);
      } else if (res.status === 401) {
        setNotLoggedIn(true);
      } else {
        const err = await res.json();
        setError(err.error || "Failed to accept invitation.");
      }
    } catch (e) {
      setError("Something went wrong. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
      </div>
    );
  }

  if (error && !notLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Invite not available</h2>
          <p className="text-muted mb-6">{error}</p>
          <Link href="/" className="btn-outline inline-flex items-center gap-2 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Go to TeamTrack
          </Link>
        </div>
      </div>
    );
  }

  if (notLoggedIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-coral-50 flex items-center justify-center mx-auto mb-4">
            <Github className="w-7 h-7 text-coral-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">Sign in to accept</h2>
          <p className="text-muted mb-6">
            {invite?.inviter?.name || invite?.inviter?.email || "Someone"} invited you to join{" "}
            <span className="font-semibold text-foreground">{invite?.workspace?.name}</span>. Sign in
            with GitHub to accept the invitation.
          </p>
          <Link
            href={`/login?redirect=/invite/${token}`}
            className="btn-coral w-full inline-flex items-center justify-center gap-2 text-sm"
          >
            <Github className="w-4 h-4" />
            Sign in with GitHub to accept
          </Link>
        </div>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="card p-10 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-7 h-7 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold mb-2">You&apos;re in!</h2>
          <p className="text-muted">Taking you to your new workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="card p-10 max-w-md w-full">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-coral-50 mb-4">
          <Users className="w-7 h-7 text-coral-500" />
        </div>
        <h2 className="text-xl font-bold mb-1">Workspace invitation</h2>
        <p className="text-sm text-muted mb-6">
          {invite?.inviter?.name || invite?.inviter?.email || "A teammate"} invited you to join
        </p>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-lg font-semibold">{invite?.workspace?.name}</p>
          <div className="flex items-center gap-4 mt-3 text-sm text-muted">
            <span className="inline-flex items-center gap-1.5">
              <UserPlus className="w-4 h-4" />
              {invite?.role === "reviewer" ? "Reviewer" : "Member"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              Expires {invite?.expiresAt ? new Date(invite.expiresAt).toLocaleDateString() : ""}
            </span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleAccept}
          disabled={accepting}
          className="btn-coral w-full inline-flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {accepting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4" />
          )}
          {accepting ? "Accepting…" : "Accept Invitation"}
        </button>
      </div>
    </div>
  );
}