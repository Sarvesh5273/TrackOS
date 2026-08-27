import type { ContributionCategory, WorkType } from "@/types";

export interface UnfurledArtifact {
  platform: "figma" | "loom" | "google_slides" | "google_docs" | "miro" | "notion" | "generic";
  label: string;
  defaultCategory: ContributionCategory;
  suggestedWorkType: WorkType;
  suggestedTitle: string;
  baseWeight: number;
  badgeColor: string;
  icon: string;
}

export function unfurlArtifactUrl(url: string): UnfurledArtifact | null {
  if (!url || typeof url !== "string") return null;
  const lower = url.trim().toLowerCase();

  // 1. Figma
  if (lower.includes("figma.com/")) {
    return {
      platform: "figma",
      label: "Figma Design File",
      defaultCategory: "design",
      suggestedWorkType: "created",
      suggestedTitle: "UI/UX Design System in Figma",
      baseWeight: 2.5,
      badgeColor: "bg-pink-100 text-pink-700 border-pink-200",
      icon: "🎨",
    };
  }

  // 2. Loom
  if (lower.includes("loom.com/share") || lower.includes("loom.com/embed")) {
    return {
      platform: "loom",
      label: "Loom Video Walkthrough",
      defaultCategory: "presentation_delivery",
      suggestedWorkType: "presentation",
      suggestedTitle: "Interactive Demo & Walkthrough Video",
      baseWeight: 2.0,
      badgeColor: "bg-purple-100 text-purple-700 border-purple-200",
      icon: "🎥",
    };
  }

  // 3. Google Slides
  if (lower.includes("docs.google.com/presentation")) {
    return {
      platform: "google_slides",
      label: "Google Slides Pitch Deck",
      defaultCategory: "presentation_delivery",
      suggestedWorkType: "presentation",
      suggestedTitle: "Pitch Presentation & Project Slide Deck",
      baseWeight: 2.2,
      badgeColor: "bg-amber-100 text-amber-700 border-amber-200",
      icon: "📊",
    };
  }

  // 4. Google Docs
  if (lower.includes("docs.google.com/document")) {
    return {
      platform: "google_docs",
      label: "Google Docs Architecture / Specs",
      defaultCategory: "documentation_research",
      suggestedWorkType: "original",
      suggestedTitle: "Technical Architecture & System Specs",
      baseWeight: 1.8,
      badgeColor: "bg-blue-100 text-blue-700 border-blue-200",
      icon: "📄",
    };
  }

  // 5. Miro
  if (lower.includes("miro.com/")) {
    return {
      platform: "miro",
      label: "Miro Architecture / Journey Board",
      defaultCategory: "design",
      suggestedWorkType: "created",
      suggestedTitle: "User Journey & Architecture Board in Miro",
      baseWeight: 2.0,
      badgeColor: "bg-yellow-100 text-yellow-700 border-yellow-200",
      icon: "🗺️",
    };
  }

  // 6. Notion
  if (lower.includes("notion.so/") || lower.includes("notion.site/")) {
    return {
      platform: "notion",
      label: "Notion Knowledge Base",
      defaultCategory: "documentation_research",
      suggestedWorkType: "original",
      suggestedTitle: "Project Knowledge Base & Documentation",
      baseWeight: 1.8,
      badgeColor: "bg-gray-100 text-gray-700 border-gray-200",
      icon: "📝",
    };
  }

  return null;
}
