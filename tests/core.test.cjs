const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const ts = require("typescript");

// Run the pure TypeScript modules without depending on a test framework or
// importing the Next.js server. Their imports are type-only.
function load(file) {
  const source = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function("require", "module", "exports", output)(require, module, module.exports);
  return module.exports;
}

const { linkEvidenceToTasks, verifyingTaskLinks, isTaskVerified, effectiveSplit } = load("lib/tasks.ts");
const { calculateContributionScores } = load("lib/scoring/engine.ts");
const { publicHighlights, publicMemberResults, publicScoringLogic } = load("lib/reports/public.ts");
const { createSeal, verifySeal } = load("lib/reports/seal.ts");
const { inviteOrigin, isLocalInviteUrl } = load("lib/invites/url.ts");

const alice = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const bob = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("only eligible GitHub activity by an assignee verifies a task", () => {
  const item = (overrides = {}) => ({
    source: "github_commit", summary: "finish APP-3", description: null,
    verification_state: "provider_verified", resolved_actor_id: alice,
    is_bot_generated: false, is_excluded: false, is_duplicate: false, ...overrides,
  });
  const linked = linkEvidenceToTasks([
    item(), item({ resolved_actor_id: bob }), item({ is_excluded: true }),
    item({ is_bot_generated: true }), item({ is_duplicate: true }),
    item({ source: "manual" }), item({ verification_state: "disputed" }),
  ], "APP").get(3);
  assert.equal(linked.length, 2);
  const task = { assignee_ids: [alice], confirmed_by: [] };
  assert.equal(verifyingTaskLinks(task, linked).length, 1);
  assert.equal(isTaskVerified(task, verifyingTaskLinks(task, linked).length), true);
  assert.equal(isTaskVerified({ assignee_ids: [bob], confirmed_by: [] }, verifyingTaskLinks({ assignee_ids: [bob] }, [item()]).length), false);
});

test("agreed splits remain attached to the task", () => {
  assert.deepEqual(effectiveSplit({ assignee_ids: [alice, bob], split: { [alice]: 70, [bob]: 30 } }), {
    [alice]: 70, [bob]: 30,
  });
});

test("scoring honors source-specific item weights and explicit shares", () => {
  const evidence = (id, actorId, baseWeight) => ({
    id, source: "github_commit", category: "development", actorId,
    collaboratorIds: [], baseWeight, impactFactor: 1, verificationState: "provider_verified",
    timestamp: new Date("2026-09-01"), metadata: {},
  });
  const output = calculateContributionScores({
    workspaceId: "project", evidenceItems: [evidence("a", alice, 4), evidence("b", bob, 1)],
    categoryWeights: { development: 1 }, members: [{ userId: alice }, { userId: bob }], policyVersion: 1,
  });
  assert.equal(output.memberResults.find((member) => member.userId === alice).contributionShare, 80);
  assert.equal(output.memberResults.find((member) => member.userId === bob).contributionShare, 20);
});

test("public reports redact private, sensitive, bot and non-GitHub activity", () => {
  const item = (id, overrides = {}) => ({
    id, source: "github_commit", source_url: "https://github.com/team/repo/commit/abc",
    summary: "private details", timestamp: "2026-09-01", is_sensitive: false,
    is_excluded: false, is_duplicate: false, is_bot_generated: false, ...overrides,
  });
  const rows = [item("good"), item("secret", { is_sensitive: true }), item("bot", { is_bot_generated: true }),
    item("manual", { source: "manual" }), item("evil", { source_url: "https://github.com.evil.example/a" })];
  assert.deepEqual(publicHighlights(rows, false), []);
  assert.deepEqual(publicHighlights(rows, true).map((row) => row.id), ["good"]);

  const privateMembers = publicMemberResults([{
    userId: alice, displayName: "alice@example.com", email: "alice@example.com", secret: "hidden",
    positiveContributors: [{ evidenceId: "good", description: "private details", impact: 4 }],
  }], {}, []);
  assert.equal(privateMembers[0].displayName, "Teammate");
  assert.equal(privateMembers[0].positiveContributors[0].description, "Activity details hidden");
  assert.equal("email" in privateMembers[0], false);
  assert.equal("secret" in privateMembers[0], false);
  assert.equal("generatedBy" in publicScoringLogic({ generatedBy: alice }), false);
});

test("published report seals detect changes to results and publication time", () => {
  const previous = process.env.REPORT_SIGNING_SECRET;
  process.env.REPORT_SIGNING_SECRET = "unit-test-secret-for-report-sealing";
  try {
    const report = {
      id: "report-1", workspace_id: "project-1", version: 1,
      status: "published", published_at: "2026-09-30T10:00:00Z",
      member_results: [{ userId: alice, contributionShare: 100 }], scoring_logic: { tasks: [] },
    };
    const seal = createSeal(report, "2026-09-30T10:00:00Z");
    const sealed = { ...report, scoring_logic: { ...report.scoring_logic, seal } };
    assert.equal(verifySeal(sealed).status, "valid");
    assert.equal(verifySeal({ ...sealed, published_at: "2026-10-01T10:00:00Z" }).status, "modified");
    assert.equal(verifySeal({ ...sealed, member_results: [] }).status, "modified");
  } finally {
    if (previous === undefined) delete process.env.REPORT_SIGNING_SECRET;
    else process.env.REPORT_SIGNING_SECRET = previous;
  }
});

test("local invite links stay local and production requires a public HTTPS origin", () => {
  assert.equal(inviteOrigin("http://localhost:3000/api/invite", "http://localhost:3000", false), "http://localhost:3000");
  assert.equal(isLocalInviteUrl("http://localhost:3000/invite/token"), true);
  assert.equal(inviteOrigin("https://team.example/api/invite", "http://localhost:3000", true), null);
  assert.equal(inviteOrigin("https://team.example/api/invite", undefined, true), null);
  assert.equal(inviteOrigin("https://team.example/api/invite", "https://team.example/", true), "https://team.example");
  assert.equal(inviteOrigin("https://team.example/api/invite", "http://team.example", true), null);
});
