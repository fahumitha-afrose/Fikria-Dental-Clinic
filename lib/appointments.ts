import type { SupabaseClient, PostgrestError } from "@supabase/supabase-js";
import type { Appointment, Doctor, TimeSlot } from "@/types";

/** Generates a short, human-friendly appointment code like "FKD-7K2QAB". */
export function generateAppointmentCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return `FKD-${code}`;
}

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function toHHMM(mins: number): string {
  const h = Math.floor(mins / 60)
    .toString()
    .padStart(2, "0");
  const m = (mins % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Logs the FULL Supabase/Postgres error (message, code, details, hint) —
 * not just a generic string — so failures like RLS denials (code 42501),
 * FK violations (23503), or unique violations (23505) are immediately
 * diagnosable from server logs instead of only surfacing a vague message
 * to the patient.
 */
function logSupabaseError(context: string, error: PostgrestError | null) {
  if (!error) return;
  console.error(`[appointments] ${context}:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * Builds the doctor's slots for a given date and marks which are already
 * booked. Returns [] (not an error) if the doctor doesn't work that day —
 * callers should treat an empty array as "no availability that day".
 *
 * IMPORTANT: `supabase` must be a client that can actually read the
 * `appointments` table (see lib/supabase/admin.ts) — the `appointments`
 * table has RLS enabled with no read policy for anon/authenticated roles,
 * so a cookie-bound anon-key client silently gets zero rows back here
 * (no error — RLS denial on SELECT is invisible), which previously made
 * every slot look available even when it wasn't.
 */
export async function getAvailableSlots(
  supabase: SupabaseClient,
  doctor: Doctor,
  dateISO: string // "2026-07-20"
): Promise<TimeSlot[]> {
  const date = new Date(`${dateISO}T00:00:00`);
  const dayAbbr = DAY_ABBR[date.getDay()];

  if (!doctor.working_days.includes(dayAbbr)) return [];

  // Don't offer slots in the past for today's date
  const now = new Date();
  const isToday = dateISO === now.toISOString().slice(0, 10);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const start = toMinutes(doctor.working_hours_start);
  const end = toMinutes(doctor.working_hours_end);
  const step = doctor.slot_duration_minutes || 30;

  const { data: booked, error: bookedErr } = await supabase
    .from("appointments")
    .select("appointment_time")
    .eq("doctor_id", doctor.id)
    .eq("appointment_date", dateISO)
    .in("status", ["pending", "confirmed"]);

  logSupabaseError("getAvailableSlots: reading existing bookings", bookedErr);

  const bookedTimes = new Set((booked ?? []).map((b) => (b.appointment_time as string).slice(0, 5)));

  const slots: TimeSlot[] = [];
  for (let t = start; t + step <= end; t += step) {
    const time = toHHMM(t);
    if (isToday && t <= nowMinutes) continue; // no booking in the past
    slots.push({ time, available: !bookedTimes.has(time) });
  }
  return slots;
}

export class BookingError extends Error {}

/**
 * Creates an appointment with a final race-condition-safe check: the DB's
 * unique (doctor_id, appointment_date, appointment_time) constraint is the
 * real source of truth for "no double booking" — this pre-check just gives
 * a friendlier error message before hitting that constraint.
 *
 * IMPORTANT: `supabase` must be the service-role client (lib/supabase/admin.ts).
 * `patients` and `appointments` have RLS enabled with NO insert policy for
 * any non-service role, so calling this with the cookie-bound anon-key
 * client fails on the patients insert below with a 42501 (RLS violation) —
 * that was the exact cause of "Could not save patient details."
 */
export async function createAppointment(
  supabase: SupabaseClient,
  params: {
    doctorId: string;
    patient: { name: string; phone: string; email?: string | null };
    serviceId?: string | null;
    reason?: string | null;
    date: string;
    time: string;
    conversationId?: string | null;
  }
): Promise<Appointment> {
  const { data: doctor, error: doctorErr } = await supabase
    .from("doctors")
    .select("*")
    .eq("id", params.doctorId)
    .single();

  logSupabaseError("createAppointment: fetching doctor", doctorErr);
  if (!doctor) throw new BookingError("Selected doctor was not found.");

  const dayAbbr = DAY_ABBR[new Date(`${params.date}T00:00:00`).getDay()];
  if (!(doctor.working_days as string[]).includes(dayAbbr)) {
    throw new BookingError(`Dr. ${doctor.name} doesn't work on that day.`);
  }
  const mins = toMinutes(params.time);
  if (mins < toMinutes(doctor.working_hours_start) || mins >= toMinutes(doctor.working_hours_end)) {
    throw new BookingError("That time is outside the doctor's working hours.");
  }

  const { data: clash, error: clashErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", params.doctorId)
    .eq("appointment_date", params.date)
    .eq("appointment_time", params.time)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  logSupabaseError("createAppointment: checking for existing slot clash", clashErr);
  if (clash) throw new BookingError("That slot was just booked. Please choose another time.");

  // Find or create the patient by phone (natural key for unauthenticated patients)
  const { data: existingPatient, error: patientLookupErr } = await supabase
    .from("patients")
    .select("*")
    .eq("phone", params.patient.phone)
    .maybeSingle();
  logSupabaseError("createAppointment: looking up existing patient", patientLookupErr);

  let patient = existingPatient;

  if (!patient) {
    const { data: created, error: patientErr } = await supabase
      .from("patients")
      .insert({
        name: params.patient.name,
        phone: params.patient.phone,
        email: params.patient.email ?? null,
      })
      .select()
      .single();

    logSupabaseError("createAppointment: inserting new patient", patientErr);

    if (patientErr || !created) {
      // Surface *why* it failed in logs (RLS denial vs. duplicate phone vs.
      // something else) while still giving the patient a friendly message.
      throw new BookingError(
        patientErr?.code === "23505"
          ? "That phone number is already registered — please try again."
          : "Could not save patient details."
      );
    }
    patient = created;
  }

  const appointment_code = generateAppointmentCode();

  const { data: appointment, error } = await supabase
    .from("appointments")
    .insert({
      appointment_code,
      patient_id: patient.id,
      doctor_id: params.doctorId,
      service_id: params.serviceId ?? null,
      reason: params.reason ?? null,
      appointment_date: params.date,
      appointment_time: params.time,
      status: "confirmed",
      conversation_id: params.conversationId ?? null,
    })
    .select()
    .single();

  logSupabaseError("createAppointment: inserting appointment", error);

  if (error || !appointment) {
    // Unique constraint violation (23505) means the slot was taken concurrently
    if (error?.code === "23505") {
      throw new BookingError("That slot was just booked. Please choose another time.");
    }
    throw new BookingError("Could not create the appointment. Please try again.");
  }

  const { error: historyErr } = await supabase.from("appointment_status_history").insert({
    appointment_id: appointment.id,
    from_status: null,
    to_status: "confirmed",
  });
  logSupabaseError("createAppointment: writing status history", historyErr);

  return appointment as Appointment;
}

export async function updateAppointmentStatus(
  supabase: SupabaseClient,
  appointmentId: string,
  toStatus: Appointment["status"]
) {
  const { data: existing, error: existingErr } = await supabase
    .from("appointments")
    .select("status")
    .eq("id", appointmentId)
    .single();
  logSupabaseError("updateAppointmentStatus: fetching current status", existingErr);

  const { error } = await supabase
    .from("appointments")
    .update({ status: toStatus, updated_at: new Date().toISOString() })
    .eq("id", appointmentId);
  logSupabaseError("updateAppointmentStatus: updating status", error);
  if (error) throw new BookingError("Could not update appointment status.");

  const { error: historyErr } = await supabase.from("appointment_status_history").insert({
    appointment_id: appointmentId,
    from_status: existing?.status ?? null,
    to_status: toStatus,
  });
  logSupabaseError("updateAppointmentStatus: writing status history", historyErr);
}

export async function rescheduleAppointment(
  supabase: SupabaseClient,
  appointmentId: string,
  newDate: string,
  newTime: string
) {
  const { data: appt, error: apptErr } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();
  logSupabaseError("rescheduleAppointment: fetching appointment", apptErr);
  if (!appt) throw new BookingError("Appointment not found.");

  const { data: clash, error: clashErr } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", appt.doctor_id)
    .eq("appointment_date", newDate)
    .eq("appointment_time", newTime)
    .neq("id", appointmentId)
    .in("status", ["pending", "confirmed"])
    .maybeSingle();
  logSupabaseError("rescheduleAppointment: checking for slot clash", clashErr);
  if (clash) throw new BookingError("That slot is already booked. Please choose another time.");

  const { error } = await supabase
    .from("appointments")
    .update({ appointment_date: newDate, appointment_time: newTime, updated_at: new Date().toISOString() })
    .eq("id", appointmentId);
  logSupabaseError("rescheduleAppointment: updating appointment", error);
  if (error) throw new BookingError("Could not reschedule. Please try another slot.");
}

/** Finds a patient's most relevant upcoming appointment by phone — used by the
 * AI receptionist for "cancel/reschedule my appointment" flows. */
export async function findAppointmentByPhone(supabase: SupabaseClient, phone: string) {
  const { data: patient, error: patientErr } = await supabase
    .from("patients")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();
  logSupabaseError("findAppointmentByPhone: looking up patient", patientErr);
  if (!patient) return null;

  const { data, error } = await supabase
    .from("appointments")
    .select("*, doctor:doctors(*), service:services(*)")
    .eq("patient_id", patient.id)
    .in("status", ["pending", "confirmed"])
    .order("appointment_date", { ascending: true })
    .limit(1)
    .maybeSingle();
  logSupabaseError("findAppointmentByPhone: looking up appointment", error);

  return data as Appointment | null;
}
