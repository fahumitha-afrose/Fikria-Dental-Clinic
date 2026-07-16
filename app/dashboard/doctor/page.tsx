import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStaffRole } from "@/lib/auth-roles";
import { DoctorDashboardClient } from "@/components/dashboard/DoctorDashboardClient";

/**
 * One unified Doctor Dashboard (per spec) showing appointments across all
 * doctors, rather than separate per-doctor dashboards. Extension point:
 * to enable individual doctor logins later, add a `doctor_id` column to
 * `admins`/a new `doctor_users` table and filter this query by it —
 * everything else (the table, filters, status actions) stays the same.
 */
export default async function DoctorDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user
  ? await getStaffRole(supabase, user.id)
  : null;

if (role !== "doctor") {
  redirect("/login?redirectedFrom=/dashboard/doctor");
}

  const { data: doctors } = await supabase.from("doctors").select("*").order("name");

  return <DoctorDashboardClient doctors={doctors ?? []} />;
}
