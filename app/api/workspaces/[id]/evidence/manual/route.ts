import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

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

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      work_type,
      effort_band,
      start_date,
      end_date,
      artifact_url,
    } = body as {
      title: string;
      description: string;
      category: string;
      work_type: string;
      effort_band: string;
      start_date: string;
      end_date: string;
      artifact_url?: string;
    };

    if (!title || !category) {
      return NextResponse.json(
        { error: "Title and category are required" },
        { status: 400 }
      );
    }

    const safeDescription = description?.trim() || title || "Contribution deliverable";
    const actorName =
      user.user_metadata?.user_name ||
      user.user_metadata?.preferred_username ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      user.email ||
      "Contributor";

    const VALID_WORK_TYPES = ["original", "collaboration", "review", "coordination", "presentation"];
    const safeWorkType = VALID_WORK_TYPES.includes(work_type?.toLowerCase()) ? work_type.toLowerCase() : "original";

    const VALID_EFFORT_BANDS = ["SMALL", "MEDIUM", "LARGE", "EXTENSIVE"];
    const safeEffortBand = VALID_EFFORT_BANDS.includes(effort_band?.toUpperCase()) ? effort_band.toUpperCase() : "MEDIUM";

    const { data: manualEvidence, error: meError } = await supabase
      .from("manual_evidence")
      .insert({
        workspace_id: params.id,
        submitted_by: user.id,
        title,
        description: safeDescription,
        start_date: start_date || new Date().toISOString(),
        end_date: end_date || null,
        category,
        effort_band: safeEffortBand,
        work_type: safeWorkType,
        artifact_url: artifact_url || null,
        review_status: "pending",
      })
      .select()
      .single();

    if (meError) {
      return NextResponse.json({ error: meError.message }, { status: 500 });
    }

    const { data: evidenceItem, error: eiError } = await supabase
      .from("evidence_items")
      .insert({
        workspace_id: params.id,
        source: "manual",
        source_id: manualEvidence.id,
        source_url: artifact_url || null,
        event_type: "manual_evidence",
        actor_id: user.id,
        actor_username: actorName,
        actor_email: user.email,
        timestamp: start_date || new Date().toISOString(),
        summary: title,
        description: safeDescription,
        category,
        work_type: safeWorkType,
        verification_state: "manual_submitted",
        base_weight: 1.5,
        impact_factor:
          safeEffortBand === "EXTENSIVE"
            ? 3.0
            : safeEffortBand === "LARGE"
            ? 2.0
            : safeEffortBand === "MEDIUM"
            ? 1.5
            : 1.0,
        quality_factor: 0.7,
        duplication_factor: 1.0,
        is_duplicate: false,
        is_bot_generated: false,
        is_excluded: false,
        sync_version: `manual-${Date.now()}`,
      })
      .select()
      .single();

    if (eiError) {
      return NextResponse.json({ error: eiError.message }, { status: 500 });
    }

    return NextResponse.json({ evidence: evidenceItem, manual_evidence: manualEvidence }, { status: 201 });
  } catch (err) {
    console.error("API error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}