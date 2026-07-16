import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffRole } from "@/lib/auth-roles";

/**
 * Generic admin CRUD endpoint for the small set of content tables the admin
 * dashboard manages. Kept as one dynamic route (rather than one file per
 * resource) since the shape of each operation is identical — an allowlist
 * keeps this safe from arbitrary table access.
 *
 * /api/admin/doctors            GET (list), POST (create)
 * /api/admin/doctors?id=...     PATCH (update), DELETE
 * /api/admin/services           same shape
 * /api/admin/faq                same shape
 * /api/admin/clinic_information  GET, PATCH (singleton row, no create/delete)
 * /api/admin/patients            GET (list) only
 *
 * All actual table reads/writes go through the service-role admin client
 * (lib/supabase/admin.ts): only `doctors`/`services`/`clinic_information`/`faq`
 * have public SELECT policies — there are no insert/update/delete policies
 * for any of these tables, and `patients` has no policies at all. Using the
 * cookie-bound anon-key client here would silently return zero rows on GET
 * and fail outright on every write. The cookie-bound client is still used
 * for `requireAdmin` since that needs the signed-in staff member's session.
 */
const ALLOWED_TABLES = new Set(["doctors", "services", "faq", "clinic_information", "patients"]);

function logSupabaseError(context: string, error: { message: string; code?: string; details?: string; hint?: string } | null) {
  if (!error) return;
  console.error(`[api/admin] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

async function requireAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role = await getStaffRole(supabase, user.id);
  return role === "admin" ? user : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!ALLOWED_TABLES.has(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const query = admin.from(resource).select("*");
  const { data, error } =
    resource === "clinic_information" ? await query.maybeSingle() : await query.order("created_at", { ascending: false });

  logSupabaseError(`GET ${resource}`, error);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!ALLOWED_TABLES.has(resource) || resource === "clinic_information") {
    return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const body = await req.json();
  const { data, error } = await admin.from(resource).insert(body).select().single();
  logSupabaseError(`POST ${resource}`, error);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!ALLOWED_TABLES.has(resource)) return NextResponse.json({ error: "Unknown resource" }, { status: 404 });

  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const body = await req.json();

  if (resource === "clinic_information") {
    // Singleton row: update whichever row exists rather than requiring an id
    const { data: existing } = await admin.from("clinic_information").select("id").limit(1).maybeSingle();
    const { data, error } = existing
      ? await admin.from("clinic_information").update(body).eq("id", existing.id).select().single()
      : await admin.from("clinic_information").insert(body).select().single();
    logSupabaseError("PATCH clinic_information", error);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ data });
  }

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { data, error } = await admin.from(resource).update(body).eq("id", id).select().single();
  logSupabaseError(`PATCH ${resource}`, error);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ data });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ resource: string }> }) {
  const { resource } = await params;
  if (!ALLOWED_TABLES.has(resource) || resource === "clinic_information") {
    return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
  }

  const supabase = await createClient();
  if (!(await requireAdmin(supabase))) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await admin.from(resource).delete().eq("id", id);
  logSupabaseError(`DELETE ${resource}`, error);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
