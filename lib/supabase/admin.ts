import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses Row Level Security entirely.
 *
 * SERVER-ONLY. Never import this into a Client Component or expose
 * SUPABASE_SERVICE_ROLE_KEY to the browser.
 *
 * Why this exists: `patients` and `appointments` (and the other dental
 * content tables) have RLS enabled in schema-dental.sql but intentionally
 * have NO insert/update/delete policies for anon/authenticated roles — the
 * schema comments say access should go through "the service role key", but
 * lib/supabase/server.ts's cookie-bound client actually authenticates with
 * the ANON key. Under RLS, an anon-key client with no matching policy
 * doesn't error on SELECT (it silently returns zero rows) but DOES error on
 * INSERT/UPDATE/DELETE — which is exactly the "Could not save patient
 * details." failure. This client is the fix: use it for the actual
 * privileged reads/writes in lib/appointments.ts and the admin CRUD routes,
 * while the cookie-bound client from lib/supabase/server.ts continues to
 * handle auth (`auth.getUser()`) and the tables that DO have working
 * auth.uid()-based policies (conversations, messages, memory).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — required for admin/service-role Supabase access."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
