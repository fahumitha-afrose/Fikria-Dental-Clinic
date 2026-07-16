/**
 * Google Calendar extension point — NOT implemented yet, per spec.
 *
 * Wiring this in later should require zero changes to lib/appointments.ts
 * callers: call `syncAppointmentToCalendar` from the same places
 * sendAppointmentConfirmation is called today (app/api/chat/route.ts,
 * app/api/appointments/route.ts), guarded by the same "if env vars present"
 * pattern used in lib/whatsapp.ts.
 */
import type { Appointment, Doctor } from "@/types";

export interface CalendarProvider {
  createEvent(appointment: Appointment, doctor: Doctor): Promise<{ eventId: string } | null>;
  deleteEvent(eventId: string): Promise<void>;
}

export async function syncAppointmentToCalendar(
  appointment: Appointment,
  doctor: Doctor
): Promise<{ eventId: string } | null> {
  if (!process.env.GOOGLE_CALENDAR_CLIENT_ID) {
    // Not configured — no-op until Google Calendar credentials are added.
    return null;
  }
  // Intentionally unimplemented: wire up googleapis' Calendar API here,
  // using a service account or OAuth token stored per clinic, then map
  // appointment fields (appointment.appointment_date/appointment_time,
  // doctor.slot_duration_minutes) to a calendar event.
  console.log("Google Calendar sync requested for", appointment.appointment_code, doctor.name);
  throw new Error("Google Calendar integration is not yet implemented.");
}
