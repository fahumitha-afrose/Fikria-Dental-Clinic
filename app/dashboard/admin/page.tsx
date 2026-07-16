import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffRole } from "@/lib/auth-roles";
import { AdminDashboardClient } from "@/components/dashboard/AdminDashboardClient";

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const role = user ? await getStaffRole(supabase, user.id) : null;
  if (role !== "admin") {
    redirect("/login?redirectedFrom=/dashboard/admin");
  }

  // Fetched via the admin (service-role) client rather than the cookie client:
  // `doctors` only has a public SELECT policy for active=true, and the admin
  // dashboard's appointment filters should be able to show every doctor
  // (including inactive ones, who may still have historical appointments).
  const admin = createAdminClient();
  const { data: doctors } = await admin.from("doctors").select("*").order("name");

  return <AdminDashboardClient doctors={doctors ?? []} />;
}
