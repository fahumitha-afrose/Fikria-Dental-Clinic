import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffRole } from "@/lib/auth-roles";
import { createAppointment, BookingError } from "@/lib/appointments";
import { sendAppointmentConfirmation } from "@/lib/whatsapp";

/**
 * GET /api/appointments?doctorId=&date=&status=&search() — staff-only
 * listing with filters, used by both the Admin and Doctor dashboards.
 *
 * Reads go through the service-role admin client (see lib/supabase/admin.ts):
 * `appointments`/`patients` have RLS enabled with no SELECT policy for the
 * cookie-bound anon-key client, so querying with that client silently
 * returned zero rows — the dashboards rendered fine but always showed an
 * empty table. Auth/role-check still uses the cookie-bound client, since
 * that's what carries the signed-in staff member's session.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await getStaffRole(supabase, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const { searchParams } = new URL(req.url);
  const doctorId = searchParams.get("doctorId");
  const date = searchParams.get("date");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  let query = admin
    .from("appointments")
    .select("*, patient:patients(*), doctor:doctors(*), service:services(*)")
    .order("appointment_date", { ascending: true })
    .order("appointment_time", { ascending: true });

  if (doctorId) query = query.eq("doctor_id", doctorId);
  if (date) query = query.eq("appointment_date", date);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) {
    console.error("[api/appointments GET] Supabase error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Client-side-style text search across patient name/phone/appointment code
  // (kept simple/in-memory since appointment volumes for a single clinic are small)
  const filtered = search
    ? (data ?? []).filter((a) => {
        const q = search.toLowerCase();
        return (
          a.appointment_code.toLowerCase().includes(q) ||
          a.patient?.name?.toLowerCase().includes(q) ||
          a.patient?.phone?.toLowerCase().includes(q)
        );
      })
    : data ?? [];

  return NextResponse.json({ appointments: filtered });
}

/** POST /api/appointments — manual booking from the dashboard (admin/receptionist creating on a patient's behalf). */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await getStaffRole(supabase, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const body = await req.json();
  const { doctorId, patientName, patientPhone, patientEmail, serviceId, reason, date, time } = body;

  if (!doctorId || !patientName || !patientPhone || !date || !time) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const { data: doctor } = await admin.from("doctors").select("*").eq("id", doctorId).single();
    const appointment = await createAppointment(admin, {
      doctorId,
      patient: { name: patientName, phone: patientPhone, email: patientEmail },
      serviceId,
      reason,
      date,
      time,
    });

    if (doctor) {
      sendAppointmentConfirmation(appointment, doctor, { name: patientName, phone: patientPhone }).catch((err) =>
        console.error("WhatsApp confirmation failed:", err)
      );
    }

    return NextResponse.json({ appointment });
  } catch (err) {
    console.error("[api/appointments POST] Booking failed:", err);
    const message = err instanceof BookingError ? err.message : "Could not create appointment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
