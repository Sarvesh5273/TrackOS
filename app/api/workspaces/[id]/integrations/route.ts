import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, audit, dbError, handle, readJson, requireMember } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { GitHubSyncService, parseRepo } from "@/lib/integrations/github";

export const dynamic = "force-dynamic";

/** Never send the stored token to the browser. */
function sanitize(row: Record<string, any> | null) {
  if (!row) return null;
  const { credential_ref, ...rest } = row;
  return { ...rest, has_token: Boolean(credential_ref) };
}

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin } = await requireMember(params.id);
    const { data, error } = await admin
      .from("integrations")
      .select("*")
      .eq("workspace_id", params.id)
      .eq("provider", "github")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw dbError(error);
    return NextResponse.json({ integration: sanitize(data) });
  });
}

const bodySchema = z.object({
  provider: z.literal("github").default("github"),
  config: z.object({
    repo: z.string().trim().min(1, "Repository is required").max(200),
    token: z.string().trim().max(255).optional(),
  }),
});

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handle(async () => {
    const { admin, user } = await requireMember(params.id, { leader: true });
    const { config } = await readJson(request, bodySchema);

    const parsed = parseRepo(config.repo);
    if (!parsed) throw new HttpError(400, "Use the format owner/repo (for example facebook/react).");

    const customToken = config.token || null;
    const {
      data: { session },
    } = await createClient().auth.getSession();
    const token = customToken || session?.provider_token || process.env.GITHUB_TOKEN || null;

    let details;
    try {
      details = await new GitHubSyncService(token).validateRepository(parsed.owner, parsed.repo);
    } catch (err: any) {
      if (err?.status === 404) {
        throw new HttpError(
          400,
          `Repository ${parsed.owner}/${parsed.repo} wasn't found. If it's private, add a GitHub token with read access.`
        );
      }
      if (err?.status === 401 || err?.status === 403) {
        throw new HttpError(400, "GitHub rejected the token. Check that it's valid and can read this repository.");
      }
      throw new HttpError(400, "Couldn't reach GitHub. Try again in a moment.");
    }

    const selected = {
      repo: `${parsed.owner}/${parsed.repo}`,
      owner: parsed.owner,
      name: parsed.repo,
      fullName: details.fullName,
      isPrivate: details.isPrivate,
      defaultBranch: details.defaultBranch,
    };

    const { data: existing, error: exError } = await admin
      .from("integrations")
      .select("id")
      .eq("workspace_id", params.id)
      .eq("provider", "github")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (exError) throw dbError(exError);

    const values = {
      selected_resources: selected,
      status: "active",
      credential_ref: customToken,
      error_message: null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = existing
      ? await admin.from("integrations").update(values).eq("id", existing.id).select().single()
      : await admin
          .from("integrations")
          .insert({ ...values, workspace_id: params.id, provider: "github", connected_by: user.id })
          .select()
          .single();
    if (error) throw dbError(error);

    await audit(admin, {
      actorId: user.id,
      workspaceId: params.id,
      action: "integration.connected",
      objectType: "integration",
      objectId: data.id,
      newValue: { repo: selected.fullName, withToken: Boolean(customToken) },
    });

    return NextResponse.json({ integration: sanitize(data) }, { status: existing ? 200 : 201 });
  });
}
