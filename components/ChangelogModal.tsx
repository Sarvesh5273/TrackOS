"use client";

import { useState, useEffect } from "react";
import {
  Sparkles,
  Copy,
  Check,
  X,
  FileText,
  Loader2,
  Download,
  Share2,
} from "lucide-react";

interface ChangelogModalProps {
  workspaceId: string;
  workspaceName: string;
  onClose: () => void;
}

export default function ChangelogModal({
  workspaceId,
  workspaceName,
  onClose,
}: ChangelogModalProps) {
  const [loading, setLoading] = useState(true);
  const [markdown, setMarkdown] = useState("");
  const [counts, setCounts] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    generateChangelog();
  }, [workspaceId]);

  const generateChangelog = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/changelog/generate`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setMarkdown(data.markdown || "");
        setCounts(data.counts || null);
      }
    } catch (err) {
      console.error("Failed to generate changelog:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CHANGELOG-${workspaceName.toLowerCase().replace(/\s+/g, "-")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-2xl shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-coral-50 text-coral-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                AI Sprint &amp; Release Digest
              </h3>
              <p className="text-xs text-muted">
                Auto-synthesized from verified commits, PRs, and design artifacts.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-coral-500" />
            <p className="text-sm font-medium text-muted">
              Analyzing commits, PRs, and design deliverables...
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {counts && (
              <div className="grid grid-cols-4 gap-2 text-center pb-2">
                <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                  <span className="block text-base font-bold text-blue-800">
                    {counts.features}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-blue-600">
                    Features
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-pink-50 border border-pink-100">
                  <span className="block text-base font-bold text-pink-800">
                    {counts.design}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-pink-600">
                    Design
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                  <span className="block text-base font-bold text-emerald-800">
                    {counts.fixes}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-emerald-600">
                    Fixes
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                  <span className="block text-base font-bold text-amber-800">
                    {counts.docs}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-600">
                    Docs
                  </span>
                </div>
              </div>
            )}

            <div className="rounded-2xl bg-gray-900 text-gray-100 p-5 font-mono text-xs overflow-x-auto leading-relaxed border border-gray-800 shadow-inner">
              <pre className="whitespace-pre-wrap">{markdown}</pre>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
          <button
            onClick={generateChangelog}
            disabled={loading}
            className="text-xs text-muted hover:text-foreground font-medium disabled:opacity-50"
          >
            Regenerate
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="btn-outline text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download .MD
            </button>
            <button
              onClick={handleCopy}
              disabled={loading}
              className="btn-coral text-xs py-1.5 px-3 inline-flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied to Clipboard!" : "Copy Changelog"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
