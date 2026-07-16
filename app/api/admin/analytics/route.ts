import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

import { getStaffRole } from "@/lib/auth-roles";

// Ensures this route is always executed fresh (never statically cached),
// so analytics reflect the current DB state immediately after any
// appointment status change, booking, or cancellation.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  

const {
  data: { user },
} = await supabase.auth.getUser();

if (!user || (await getStaffRole(supabase, user.id)) !== "admin") {
  return NextResponse.json({ error: "Not authorized" }, { status: 403 });
}

const admin = createAdminClient();

  const [{ count: totalPatients }, { count: totalDoctors }, { data: appointments }] =
  await Promise.all([
    admin.from("patients").select("*", { count: "exact", head: true }),
    admin.from("doctors").select("*", { count: "exact", head: true }),
    admin
      .from("appointments")
      .select("*, patient:patients(*), doctor:doctors(name), service:services(name)"),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const all = appointments ?? [];
  const doctorCounts = new Map<string, number>();
  const treatmentCounts = new Map<string, number>();
  all.forEach((a) => {
    const dName = a.doctor?.name;
    if (dName) doctorCounts.set(dName, (doctorCounts.get(dName) ?? 0) + 1);
    const tName = a.service?.name ?? a.reason;
    if (tName) treatmentCounts.set(tName, (treatmentCounts.get(tName) ?? 0) + 1);
  });
  const mostBookedDoctor = [...doctorCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
  const mostRequestedTreatment = [...treatmentCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  return NextResponse.json({
    totalPatients: totalPatients ?? 0,
    totalDoctors: totalDoctors ?? 0,
    totalAppointments: all.length,
    todayAppointments: all.filter((a) => a.appointment_date === today).length,
    // Bounded to a rolling 7/30-day window ending today — previously had no
    // upper bound, so any future-dated appointment (booked weeks or months
    // ahead) was incorrectly counted as part of "this week"/"this month".
    weeklyAppointments: all.filter((a) => a.appointment_date >= weekAgo && a.appointment_date <= today).length,
    monthlyAppointments: all.filter((a) => a.appointment_date >= monthAgo && a.appointment_date <= today).length,
    completed: all.filter((a) => a.status === "completed").length,
    cancelled: all.filter((a) => a.status === "cancelled").length,
    pending: all.filter((a) => a.status === "pending").length,
    // "Upcoming" must exclude both cancelled AND completed — a future-dated
    // appointment already marked completed shouldn't still read as upcoming.
    upcoming: all.filter(
      (a) => a.appointment_date > today && a.status !== "cancelled" && a.status !== "completed"
    ).length,
    mostBookedDoctor,
    mostRequestedTreatment,
  });
}
