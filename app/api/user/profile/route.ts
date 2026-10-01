import { NextResponse } from "next/server";
import { z } from "zod";
import { HttpError, handle, readJson, requireUser } from "@/lib/api/auth";
import { createClient } from "@/lib/supabase/server";
import { declaredGithubLogin, displayNameOf, verifiedGithubLogin } from "@/lib/identity";
import type { User } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

function toProfile(user: User) {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const verified = verifiedGithubLogin(user);
  return {
    id: user.id,
    email: user.email,
    name: displayNameOf(user),
    username: verified || declaredGithubLogin(user) || "",
    githubUsername: declaredGithubLogin(user) || "",
    githubVerified: verified,
    avatarUrl: meta.avatar_url || "",
    declaredRoles: Array.isArray(meta.declared_roles) ? meta.declared_roles : [],
  };
}

export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return NextResponse.json({ profile: toProfile(user) });
  });
}

const updateSchema = z.object({
  name: z.string().trim().min(1, "Name can't be empty").max(80).optional(),
  githubUsername: z
    .string()
    .trim()
    .transform((v) => v.replace(/^@/, ""))
    .refine((v) => v === "" || /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/.test(v), "That doesn't look like a GitHub username")
    .optional(),
  declaredRoles: z.array(z.string().trim().min(1).max(40)).max(5).optional(),
});

export async function PUT(request: Request) {
  return handle(async () => {
    await requireUser();
    const input = await readJson(request, updateSchema);
    const supabase = createClient();

    const data: Record<string, unknown> = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.githubUsername !== undefined) data.github_username = input.githubUsername || null;
    if (input.declaredRoles !== undefined) data.declared_roles = input.declaredRoles;

    const { data: updated, error } = await supabase.auth.updateUser({ data });
    if (error || !updated.user) throw new HttpError(500, "Couldn't save your profile. Try again.");

    return NextResponse.json({ success: true, profile: toProfile(updated.user) });
  });
}
