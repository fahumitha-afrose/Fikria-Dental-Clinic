import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStaffRole(
  supabase: SupabaseClient,
  userId: string
): Promise<"admin" | "receptionist" | "doctor" | null> {

  const [
    { data: admin },
    { data: receptionist },
    { data: doctor }
  ] = await Promise.all([
    supabase
      .from("admins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("receptionists")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle(),

    supabase
      .from("doctor_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle()
  ]);

  if (admin) return "admin";
  if (receptionist) return "receptionist";
  if (doctor) return "doctor";

  return null;
}