import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = createAdminClient();
    const { data: disputes, error } = await admin
      .from("disputes")
      .select("*")
      .eq("workspace_id", params.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ disputes: disputes || [] });
  } catch (err: any) {
    console.error("GET disputes error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { evidenceId, title, reason, proposedSplitPercent } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const admin = createAdminClient();
    const { data: dispute, error } = await admin
      .from("disputes")
      .insert({
        workspace_id: params.id,
        raised_by: user.id,
        status: "open",
        evidence_item_id: evidenceId || null,
        reason: reason || title,
        proposed_split: proposedSplitPercent || 50,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ dispute });
  } catch (err: any) {
    console.error("POST dispute error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { disputeId, action, resolutionNotes } = body;

    if (!disputeId || !action) {
      return NextResponse.json({ error: "Missing disputeId or action" }, { status: 400 });
    }

    const admin = createAdminClient();

    // 1. Fetch dispute
    const { data: dispute, error: dError } = await admin
      .from("disputes")
      .select("*")
      .eq("id", disputeId)
      .eq("workspace_id", params.id)
      .single();

    if (dError || !dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const newStatus = action === "accept" ? "resolved" : "rejected";

    // 2. If accepted and linked to evidence, add co-author credit
    if (action === "accept" && dispute.evidence_item_id) {
      const { data: evidence } = await admin
        .from("evidence_items")
        .select("collaborator_usernames")
        .eq("id", dispute.evidence_item_id)
        .single();

      if (evidence) {
        const existing = evidence.collaborator_usernames || [];
        const { data: userData } = await admin.auth.admin.getUserById(dispute.raised_by);
        const nameToAdd = userData?.user?.user_metadata?.user_name || userData?.user?.email || "co-author";
        if (!existing.includes(nameToAdd)) {
          await admin
            .from("evidence_items")
            .update({
              collaborator_usernames: [...existing, nameToAdd],
              verification_state: "collaborator_confirmed",
            })
            .eq("id", dispute.evidence_item_id);
        }
      }
    }

    // 3. Update dispute record
    const { data: updated, error: uError } = await admin
      .from("disputes")
      .update({
        status: newStatus,
        resolution_notes: resolutionNotes || `Marked as ${newStatus} by team consensus`,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", disputeId)
      .select()
      .single();

    if (uError) {
      return NextResponse.json({ error: uError.message }, { status: 500 });
    }

    return NextResponse.json({ dispute: updated });
  } catch (err: any) {
    console.error("PUT dispute error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
