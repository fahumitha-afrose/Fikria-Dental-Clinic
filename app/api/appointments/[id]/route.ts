import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStaffRole } from "@/lib/auth-roles";
import { updateAppointmentStatus, rescheduleAppointment, BookingError } from "@/lib/appointments";
import { sendStatusUpdate } from "@/lib/whatsapp";
import type { AppointmentStatus } from "@/types";

/**
 * PATCH /api/appointments/:id — update status, or reschedule to a new
 * date/time. Staff-only. Uses the service-role admin client for the actual
 * appointments table read/write (see lib/supabase/admin.ts); the
 * cookie-bound client is only used for the auth/role check.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !(await getStaffRole(supabase, user.id))) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const admin = createAdminClient();

  const body = await req.json();
  const { status, date, time } = body as { status?: AppointmentStatus; date?: string; time?: string };

  try {
    if (date && time) {
      await rescheduleAppointment(admin, id, date, time);
    }
    if (status) {
      await updateAppointmentStatus(admin, id, status);
    }

    const { data: appt, error: fetchErr } = await admin
      .from("appointments")
      .select("*, patient:patients(*)")
      .eq("id", id)
      .single();

    if (fetchErr) {
      console.error("[api/appointments/:id PATCH] Could not re-fetch appointment after update:", fetchErr);
    }

    if (appt?.patient) {
      sendStatusUpdate(
        appt.patient.phone,
        appt.patient.name,
        appt.appointment_code,
        status ? status : `rescheduled to ${date} ${time}`
      ).catch((err) => console.error("WhatsApp status update failed:", err));
    }

    return NextResponse.json({ appointment: appt });
  } catch (err) {
    console.error("[api/appointments/:id PATCH] Update failed:", err);
    const message = err instanceof BookingError ? err.message : "Could not update appointment.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
