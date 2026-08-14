// prisma/seed.ts
// SRS Section 12.4: Pilot Evaluation Scenarios
// Covers: balanced roles, high-volume/low-impact, low-volume/high-impact, shared work, bots

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding TeamTrack AI demo data...");

  // ============================================
  // Users: 5-person hackathon team
  // ============================================
  const users = await Promise.all([
    prisma.user.create({
      data: {
        email: "alice@example.com",
        name: "Alice Chen",
        timezone: "America/New_York",
        declaredRoles: ["Full-stack Developer", "Team Lead"],
        externalIdentities: {
          create: { provider: "github", providerId: "alicechen", providerUsername: "alicechen", confidence: 1.0 },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "bob@example.com",
        name: "Bob Martinez",
        timezone: "America/Los_Angeles",
        declaredRoles: ["Frontend Developer"],
        externalIdentities: {
          create: { provider: "github", providerId: "bobmart", providerUsername: "bobmart", confidence: 1.0 },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "carol@example.com",
        name: "Carol Kim",
        timezone: "Asia/Seoul",
        declaredRoles: ["UI/UX Designer"],
        externalIdentities: {
          create: { provider: "github", providerId: "carolkim", providerUsername: "carolkim", confidence: 1.0 },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "dave@example.com",
        name: "Dave Patel",
        timezone: "Europe/London",
        declaredRoles: ["QA Engineer", "Technical Writer"],
        externalIdentities: {
          create: { provider: "github", providerId: "davepatel", providerUsername: "davepatel", confidence: 1.0 },
        },
      },
    }),
    prisma.user.create({
      data: {
        email: "eve@example.com",
        name: "Eve Johnson",
        timezone: "America/Chicago",
        declaredRoles: ["Pitch Deck Creator", "Project Coordinator"],
        externalIdentities: {
          create: { provider: "github", providerId: "evej", providerUsername: "evej", confidence: 1.0 },
        },
      },
    }),
  ]);

  const [alice, bob, carol, dave, eve] = users;
  console.log(`Created ${users.length} users`);

  // ============================================
  // Workspace: Hackathon Project
  // ============================================
  const workspace = await prisma.workspace.create({
    data: {
      name: "EcoTrack — Carbon Footprint Tracker",
      description: "A mobile-first web app for tracking personal carbon footprint with social features.",
      projectType: "hackathon",
      startDate: new Date("2026-07-20"),
      endDate: new Date("2026-07-27"),
      timezone: "America/New_York",
      categories: [
        { id: "DEVELOPMENT", name: "Development", weight: 0.30 },
        { id: "DESIGN", name: "Design", weight: 0.20 },
        { id: "DOCUMENTATION_RESEARCH", name: "Documentation & Research", weight: 0.15 },
        { id: "QUALITY_TESTING", name: "Quality & Testing", weight: 0.15 },
        { id: "COORDINATION_REVIEW", name: "Coordination & Review", weight: 0.10 },
        { id: "PRESENTATION_DELIVERY", name: "Presentation & Delivery", weight: 0.10 },
      ],
      reviewWindowHours: 48,
      evidencePolicy: "We collect commits, PRs, issues, and manual evidence. All members can review and dispute before publication.",
      status: "ACTIVE",
      policyVersion: 1,
    },
  });

  // ============================================
  // Memberships
  // ============================================
  await prisma.membership.createMany({
    data: [
      { workspaceId: workspace.id, userId: alice.id, role: "LEADER", declaredContributionRoles: ["Development", "Coordination"], consentGivenAt: new Date(), consentVersion: 1 },
      { workspaceId: workspace.id, userId: bob.id, role: "MEMBER", declaredContributionRoles: ["Development"], consentGivenAt: new Date(), consentVersion: 1 },
      { workspaceId: workspace.id, userId: carol.id, role: "MEMBER", declaredContributionRoles: ["Design"], consentGivenAt: new Date(), consentVersion: 1 },
      { workspaceId: workspace.id, userId: dave.id, role: "MEMBER", declaredContributionRoles: ["Quality & Testing", "Documentation"], consentGivenAt: new Date(), consentVersion: 1 },
      { workspaceId: workspace.id, userId: eve.id, role: "MEMBER", declaredContributionRoles: ["Presentation", "Coordination"], consentGivenAt: new Date(), consentVersion: 1 },
    ],
  });

  // ============================================
  // GitHub Integration
  // ============================================
  await prisma.integration.create({
    data: {
      workspaceId: workspace.id,
      provider: "github",
      requestedScopes: ["repo"],
      grantedScopes: ["repo"],
      selectedResources: [{ type: "repo", id: "team/ecotrack", name: "EcoTrack" }],
      status: "active",
      connectedBy: alice.id,
      lastSyncedAt: new Date("2026-07-27T10:00:00Z"),
    },
  });

  // ============================================
  // Evidence Items — Realistic hackathon timeline
  // ============================================

  // SCENARIO 1: Alice — High volume, mixed impact (Team Lead + Full-stack)
  const aliceCommits = Array.from({ length: 45 }, (_, i) => ({
    workspaceId: workspace.id,
    source: "GITHUB_COMMIT",
    sourceId: `commit-alice-${i}`,
    sourceUrl: `https://github.com/team/ecotrack/commit/alice-${i}`,
    eventType: "commit",
    actorId: alice.id,
    actorUsername: "alicechen",
    timestamp: new Date(Date.parse("2026-07-20T09:00:00Z") + i * 3600000 * 3),
    summary: `Implement feature module ${i + 1}`,
    category: "DEVELOPMENT",
    workType: "created",
    baseWeight: 1.0,
    impactFactor: i % 5 === 0 ? 2.0 : 1.0, // Every 5th commit is higher impact
    qualityFactor: 1.0,
    duplicationFactor: 1.0,
    calculatedValue: i % 5 === 0 ? 2.0 : 1.0,
    syncVersion: "sync-001",
    verificationState: "PROVIDER_VERIFIED",
    metadata: { filesChanged: Math.floor(Math.random() * 5) + 1 },
  }));

  // SCENARIO 2: Bob — Frontend specialist, fewer but focused commits + PRs
  const bobCommits = Array.from({ length: 20 }, (_, i) => ({
    workspaceId: workspace.id,
    source: "GITHUB_COMMIT",
    sourceId: `commit-bob-${i}`,
    sourceUrl: `https://github.com/team/ecotrack/commit/bob-${i}`,
    eventType: "commit",
    actorId: bob.id,
    actorUsername: "bobmart",
    timestamp: new Date(Date.parse("2026-07-21T10:00:00Z") + i * 3600000 * 4),
    summary: `UI component: ${["Login", "Dashboard", "Profile", "Settings", "Charts"][i % 5]}`,
    category: "DEVELOPMENT",
    workType: "created",
    baseWeight: 1.0,
    impactFactor: 1.5,
    qualityFactor: 1.0,
    duplicationFactor: 1.0,
    calculatedValue: 1.5,
    syncVersion: "sync-001",
    verificationState: "PROVIDER_VERIFIED",
    metadata: { filesChanged: 2 },
  }));

  // Bob also created a major PR
  const bobPR = {
    workspaceId: workspace.id,
    source: "GITHUB_PR",
    sourceId: "pr-bob-001",
    sourceUrl: "https://github.com/team/ecotrack/pull/42",
    eventType: "pull_request",
    actorId: bob.id,
    actorUsername: "bobmart",
    timestamp: new Date("2026-07-23T14:00:00Z"),
    summary: "Complete responsive dashboard with real-time charts",
    category: "DEVELOPMENT",
    workType: "created",
    baseWeight: 2.5,
    impactFactor: 3.0,
    qualityFactor: 1.0,
    duplicationFactor: 1.0,
    calculatedValue: 7.5,
    syncVersion: "sync-001",
    verificationState: "PROVIDER_VERIFIED",
    metadata: { prNumber: 42, merged: true, changedFiles: 12, additions: 450, deletions: 30 },
  };

  // SCENARIO 3: Carol — Designer, minimal GitHub activity (non-code work!)
  // Only 3 commits (design system setup), but lots of manual evidence
  const carolCommits = [
    {
      workspaceId: workspace.id,
      source: "GITHUB_COMMIT",
      sourceId: "commit-carol-1",
      sourceUrl: "https://github.com/team/ecotrack/commit/carol-1",
      eventType: "commit",
      actorId: carol.id,
      actorUsername: "carolkim",
      timestamp: new Date("2026-07-21T09:00:00Z"),
      summary: "Add design tokens and color system",
      category: "DESIGN",
      workType: "created",
      baseWeight: 1.0,
      impactFactor: 3.0,
      qualityFactor: 1.0,
      duplicationFactor: 1.0,
      calculatedValue: 3.0,
      syncVersion: "sync-001",
      verificationState: "PROVIDER_VERIFIED",
      metadata: { filesChanged: 3 },
    },
  ];

  // SCENARIO 4: Dave — QA + Docs, critical bug fix (low volume, HIGH impact)
  const daveEvidence = [
    {
      workspaceId: workspace.id,
      source: "GITHUB_ISSUE",
      sourceId: "issue-dave-001",
      sourceUrl: "https://github.com/team/ecotrack/issues/15",
      eventType: "issue",
      actorId: dave.id,
      actorUsername: "davepatel",
      timestamp: new Date("2026-07-24T11:00:00Z"),
      summary: "Critical: Carbon calculation off by 40% for international users",
      category: "QUALITY_TESTING",
      workType: "created",
      baseWeight: 1.5,
      impactFactor: 4.0, // Critical bug discovery
      qualityFactor: 1.0,
      duplicationFactor: 1.0,
      calculatedValue: 6.0,
      syncVersion: "sync-001",
      verificationState: "PROVIDER_VERIFIED",
      metadata: { issueNumber: 15, state: "closed", labels: ["bug", "critical"] },
    },
    {
      workspaceId: workspace.id,
      source: "GITHUB_PR",
      sourceId: "pr-dave-001",
      sourceUrl: "https://github.com/team/ecotrack/pull/56",
      eventType: "pull_request",
      actorId: dave.id,
      actorUsername: "davepatel",
      timestamp: new Date("2026-07-24T16:00:00Z"),
      summary: "Fix carbon calculation precision and add unit tests",
      category: "QUALITY_TESTING",
      workType: "created",
      baseWeight: 2.5,
      impactFactor: 4.0,
      qualityFactor: 1.0,
      duplicationFactor: 1.0,
      calculatedValue: 10.0,
      syncVersion: "sync-001",
      verificationState: "PROVIDER_VERIFIED",
      metadata: { prNumber: 56, merged: true, changedFiles: 4, additions: 120, deletions: 45 },
    },
  ];

  // SCENARIO 5: Eve — Coordinator + Pitch, almost no code
  const eveEvidence = [
    {
      workspaceId: workspace.id,
      source: "GITHUB_COMMENT",
      sourceId: "comment-eve-001",
      sourceUrl: "https://github.com/team/ecotrack/issues/15#issuecomment-1",
      eventType: "comment",
      actorId: eve.id,
      actorUsername: "evej",
      timestamp: new Date("2026-07-24T12:00:00Z"),
      summary: "Coordinated user testing schedule and recruited 12 beta testers",
      category: "COORDINATION_REVIEW",
      workType: "coordination",
      baseWeight: 0.5,
      impactFactor: 2.0,
      qualityFactor: 1.0,
      duplicationFactor: 1.0,
      calculatedValue: 1.0,
      syncVersion: "sync-001",
      verificationState: "PROVIDER_VERIFIED",
      metadata: { issueNumber: 15 },
    },
  ];

  // SCENARIO 6: Bot activity (should be detected and downweighted)
  const botCommits = Array.from({ length: 30 }, (_, i) => ({
    workspaceId: workspace.id,
    source: "GITHUB_COMMIT",
    sourceId: `commit-dependabot-${i}`,
    sourceUrl: `https://github.com/team/ecotrack/commit/bot-${i}`,
    eventType: "commit",
    actorId: null, // Unmapped bot
    actorUsername: "dependabot[bot]",
    timestamp: new Date(Date.parse("2026-07-22T00:00:00Z") + i * 3600000),
    summary: `Bump ${["lodash", "react", "typescript", "eslint"][i % 4]} from x to y`,
    category: "DEVELOPMENT",
    workType: "created",
    baseWeight: 1.0,
    impactFactor: 0.1,
    qualityFactor: 1.0,
    duplicationFactor: 1.0,
    isBotGenerated: true,
    calculatedValue: 0.1,
    syncVersion: "sync-001",
    verificationState: "PROVIDER_VERIFIED",
    metadata: { bot: true },
  }));

  // SCENARIO 7: Shared work — Alice & Bob pair programming
  const sharedWork = {
    workspaceId: workspace.id,
    source: "GITHUB_PR",
    sourceId: "pr-shared-001",
    sourceUrl: "https://github.com/team/ecotrack/pull/30",
    eventType: "pull_request",
    actorId: alice.id, // Primary
    actorUsername: "alicechen",
    timestamp: new Date("2026-07-22T15:00:00Z"),
    summary: "Implement OAuth authentication flow (pair programmed)",
    category: "DEVELOPMENT",
    workType: "collaboration",
    baseWeight: 2.5,
    impactFactor: 2.5,
    qualityFactor: 1.0,
    duplicationFactor: 1.0,
    calculatedValue: 6.25,
    syncVersion: "sync-001",
    verificationState: "PROVIDER_VERIFIED",
    metadata: { prNumber: 30, merged: true, pairProgrammed: true, pairPartner: "bobmart" },
  };

  // Insert all evidence
  await prisma.evidenceItem.createMany({
    data: [
      ...aliceCommits,
      ...bobCommits,
      bobPR,
      ...carolCommits,
      ...daveEvidence,
      ...eveEvidence,
      ...botCommits,
      sharedWork,
    ],
  });

  console.log(`Created ${aliceCommits.length + bobCommits.length + 1 + carolCommits.length + daveEvidence.length + eveEvidence.length + botCommits.length + 1} evidence items`);

  // ============================================
  // Manual Evidence (Critical for non-code roles!)
  // ============================================
  await prisma.manualEvidence.createMany({
    data: [
      // Carol's design work
      {
        workspaceId: workspace.id,
        submittedBy: carol.id,
        title: "Complete UI/UX Design System",
        description: "Created full design system in Figma including 40+ components, 8 screen flows, and interaction prototypes. Conducted 3 rounds of user testing with 8 participants.",
        startDate: new Date("2026-07-20"),
        endDate: new Date("2026-07-25"),
        category: "DESIGN",
        effortBand: "EXTENSIVE",
        workType: "original",
        collaboratorIds: [alice.id, bob.id], // Devs who implemented it
        artifactUrl: "https://figma.com/file/ecotrack-design",
        reviewStatus: "approved",
      },
      // Dave's testing documentation
      {
        workspaceId: workspace.id,
        submittedBy: dave.id,
        title: "Test Plan & QA Documentation",
        description: "Wrote comprehensive test plan covering 50+ test cases. Performed manual QA across iOS Safari, Android Chrome, and desktop. Documented 8 bugs with reproduction steps.",
        startDate: new Date("2026-07-23"),
        endDate: new Date("2026-07-26"),
        category: "QUALITY_TESTING",
        effortBand: "LARGE",
        workType: "original",
        collaboratorIds: [],
        reviewStatus: "approved",
      },
      // Eve's pitch deck
      {
        workspaceId: workspace.id,
        submittedBy: eve.id,
        title: "Demo Day Pitch Deck & Presentation",
        description: "Created 12-slide pitch deck. Delivered 5-min presentation to judges. Prepared Q&A responses for 15 anticipated questions. Coordinated team rehearsal (3 sessions).",
        startDate: new Date("2026-07-25"),
        endDate: new Date("2026-07-27"),
        category: "PRESENTATION_DELIVERY",
        effortBand: "LARGE",
        workType: "original",
        collaboratorIds: [alice.id],
        reviewStatus: "approved",
      },
      // Eve's coordination work
      {
        workspaceId: workspace.id,
        submittedBy: eve.id,
        title: "Sprint Planning & Daily Standups",
        description: "Facilitated daily standups for 7 days. Created and maintained project board. Resolved 5 cross-team blockers. Scheduled and ran 3 retrospectives.",
        startDate: new Date("2026-07-20"),
        endDate: new Date("2026-07-27"),
        category: "COORDINATION_REVIEW",
        effortBand: "MEDIUM",
        workType: "coordination",
        collaboratorIds: [],
        reviewStatus: "approved",
      },
    ],
  });

  console.log("Created 4 manual evidence items");

  // ============================================
  // Identity Mappings
  // ============================================
  await prisma.workspaceIdentityMapping.createMany({
    data: [
      { workspaceId: workspace.id, provider: "github", providerUsername: "alicechen", mappedUserId: alice.id, confidence: 1.0, mappingMethod: "auto" },
      { workspaceId: workspace.id, provider: "github", providerUsername: "bobmart", mappedUserId: bob.id, confidence: 1.0, mappingMethod: "auto" },
      { workspaceId: workspace.id, provider: "github", providerUsername: "carolkim", mappedUserId: carol.id, confidence: 1.0, mappingMethod: "auto" },
      { workspaceId: workspace.id, provider: "github", providerUsername: "davepatel", mappedUserId: dave.id, confidence: 1.0, mappingMethod: "auto" },
      { workspaceId: workspace.id, provider: "github", providerUsername: "evej", mappedUserId: eve.id, confidence: 1.0, mappingMethod: "auto" },
      { workspaceId: workspace.id, provider: "github", providerUsername: "dependabot[bot]", mappedUserId: null, confidence: 0.0, mappingMethod: "unmapped" },
    ],
  });

  console.log("Created identity mappings");

  // ============================================
  // Scoring Policy
  // ============================================
  await prisma.scoringPolicy.create({
    data: {
      workspaceId: workspace.id,
      version: 1,
      categoryWeights: {
        DEVELOPMENT: 0.30,
        DESIGN: 0.20,
        DOCUMENTATION_RESEARCH: 0.15,
        QUALITY_TESTING: 0.15,
        COORDINATION_REVIEW: 0.10,
        PRESENTATION_DELIVERY: 0.10,
      },
      evidenceRules: {
        baseWeights: { GITHUB_COMMIT: 1.0, GITHUB_PR: 2.5, GITHUB_ISSUE: 1.5, GITHUB_REVIEW: 2.0, GITHUB_COMMENT: 0.5, MANUAL: 1.5 },
        impactCaps: { maxPerItem: 5.0, maxPerCategoryPerMember: 50.0 },
        diminishingReturns: { threshold: 50, factor: 0.1 },
      },
      excludedPatterns: ["dependabot", "renovate", "github-actions"],
      modelVersion: "rule-based-v1",
      configSnapshot: { algorithm: "weighted_normalized", version: "1.0" },
      createdBy: alice.id,
    },
  });

  console.log("\n✅ Seed complete!");
  console.log("\nDemo scenario summary:");
  console.log("  • Alice: High-volume dev + team lead (45 commits, mixed impact)");
  console.log("  • Bob: Focused frontend dev (20 commits + 1 major PR)");
  console.log("  • Carol: Designer — MINIMAL GitHub, HEAVY manual evidence (Figma work)");
  console.log("  • Dave: QA — LOW volume, CRITICAL impact (bug discovery + fix)");
  console.log("  • Eve: Coordinator/Pitch — almost no code, manual evidence for coordination + pitch");
  console.log("  • Bot: 30 dependabot commits (should be detected and downweighted)");
  console.log("  • Shared: Alice & Bob pair programming on OAuth PR");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
