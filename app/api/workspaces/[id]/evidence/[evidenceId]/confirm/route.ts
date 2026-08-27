import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string; evidenceId: string } }
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
      .select("id, role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden: Not a member of this workspace" }, { status: 403 });
    }

    // Fetch the evidence item
    const { data: evidenceItem, error: fetchError } = await supabase
      .from("evidence_items")
      .select("*")
      .eq("id", params.evidenceId)
      .eq("workspace_id", params.id)
      .single();

    if (fetchError || !evidenceItem) {
      return NextResponse.json({ error: "Evidence item not found" }, { status: 404 });
    }

    if (evidenceItem.actor_id === user.id) {
      return NextResponse.json({ error: "You cannot co-sign your own evidence item" }, { status: 400 });
    }

    const meta = (evidenceItem.metadata || {}) as Record<string, any>;
    const confirmations = Array.isArray(meta.confirmations) ? [...meta.confirmations] : [];

    const alreadyConfirmed = confirmations.some((c: any) => c.userId === user.id);
    if (!alreadyConfirmed) {
      confirmations.push({
        userId: user.id,
        userEmail: user.email,
        confirmedAt: new Date().toISOString(),
      });
    }

    const newQualityFactor = 0.9; // Boost quality factor for collaborator confirmed
    const newCalculatedValue = (evidenceItem.base_weight || 1.0) * (evidenceItem.impact_factor || 1.0) * newQualityFactor;

    // Update evidence item
    const { data: updatedEvidence, error: updateError } = await supabase
      .from("evidence_items")
      .update({
        verification_state: "collaborator_confirmed",
        quality_factor: newQualityFactor,
        calculated_value: newCalculatedValue,
        metadata: {
          ...meta,
          confirmations,
        },
      })
      .eq("id", params.evidenceId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    // Update manual evidence record if linked
    if (evidenceItem.source === "manual" && evidenceItem.source_id) {
      await supabase
        .from("manual_evidence")
        .update({
          review_status: "approved",
          confirmations,
        })
        .eq("id", evidenceItem.source_id);
    }

    // Log audit event
    await supabase.from("audit_events").insert({
      actor_id: user.id,
      workspace_id: params.id,
      action: "evidence.confirmed",
      object_type: "evidence_item",
      object_id: params.evidenceId,
      new_value: { confirmedBy: user.email, confirmationCount: confirmations.length },
    });

    return NextResponse.json({
      success: true,
      evidence: updatedEvidence,
      message: "Evidence successfully co-signed and verified",
    });
  } catch (err: any) {
    console.error("API error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
