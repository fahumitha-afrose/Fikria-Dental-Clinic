import { createClient } from "@/lib/supabase/client";

/**
 * Ensures the visitor has a Supabase session before they chat with the AI
 * receptionist. Most patients never create an account — this uses Supabase
 * anonymous sign-in to get a real auth.users row (and therefore a valid
 * `user.id`) without any signup form, which lets the existing
 * conversations/messages/memory tables (user_id not null) work completely
 * unmodified for both staff accounts and anonymous patients alike.
 *
 * Requires "Enable anonymous sign-ins" turned on in the Supabase Auth
 * settings for this project.
 */
export async function ensurePatientSession() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}
