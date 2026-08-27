import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: { id: string; reportId: string } }
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
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data: report, error: reportError } = await supabase
      .from("reports")
      .select("*")
      .eq("id", params.reportId)
      .eq("workspace_id", params.id)
      .maybeSingle();

    if (reportError || !report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ report });
  } catch (err: any) {
    console.error("GET report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; reportId: string } }
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
      .select("role")
      .eq("workspace_id", params.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership || membership.role !== "leader") {
      return NextResponse.json({ error: "Forbidden: Leader only" }, { status: 403 });
    }

    const admin = createAdminClient();

    // First unlink any reports referencing this report as previous_version_id
    await admin
      .from("reports")
      .update({ previous_version_id: null })
      .eq("previous_version_id", params.reportId);

    // Delete the report
    const { error: deleteError } = await admin
      .from("reports")
      .delete()
      .eq("id", params.reportId)
      .eq("workspace_id", params.id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }

    // Log audit event
    await admin.from("audit_events").insert({
      actor_id: user.id,
      workspace_id: params.id,
      action: "report.deleted",
      object_type: "report",
      object_id: params.reportId,
    });

    return NextResponse.json({ success: true, message: "Report deleted successfully" });
  } catch (err: any) {
    console.error("DELETE report error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
