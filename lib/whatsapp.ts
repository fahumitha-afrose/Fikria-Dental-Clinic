import type { Appointment, Doctor } from "@/types";

/**
 * Modular WhatsApp notification service.
 *
 * Provider-agnostic by design: swap META or TWILIO in as env vars become
 * available, with zero changes needed in calling code (app/api/appointments,
 * lib/appointments.ts). If no credentials are configured, messages are
 * logged and "sent" is simulated so the booking flow still completes end
 * to end in local/demo environments.
 */

type SendResult = { simulated: boolean; success: boolean; providerMessageId?: string };

interface WhatsAppProvider {
  send(to: string, body: string): Promise<SendResult>;
}

class MetaCloudProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<SendResult> {
    const token = process.env.WHATSAPP_META_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_META_PHONE_NUMBER_ID;
    const res = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { body },
      }),
    });
    const data = await res.json();

if (!res.ok) {
  console.log("META ERROR RESPONSE:");
  console.log(JSON.stringify(data, null, 2));
  throw new Error(`Meta WhatsApp API error: ${res.status}`);
}
    return { simulated: false, success: true, providerMessageId: data?.messages?.[0]?.id };
  }
}

class TwilioProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<SendResult> {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_WHATSAPP_FROM!; // e.g. "whatsapp:+14155238886"
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: body }),
    });
    if (!res.ok) throw new Error(`Twilio API error: ${res.status}`);
    const data = await res.json();
    return { simulated: false, success: true, providerMessageId: data?.sid };
  }
}

class SimulatedProvider implements WhatsAppProvider {
  async send(to: string, body: string): Promise<SendResult> {
    // No real credentials configured — log so the flow is visible in dev/demo.
    console.log(`[WhatsApp SIMULATED] to=${to}\n${body}`);
    return { simulated: true, success: true };
  }
}

function resolveProvider(): WhatsAppProvider {
  if (process.env.WHATSAPP_PROVIDER === "meta" && process.env.WHATSAPP_META_TOKEN) {
    return new MetaCloudProvider();
  }
  if (process.env.WHATSAPP_PROVIDER === "twilio" && process.env.TWILIO_ACCOUNT_SID) {
    return new TwilioProvider();
  }
  return new SimulatedProvider();
}

function formatConfirmationMessage(
  appointment: Appointment,
  doctor: Doctor,
  patientName: string
): string {
  return [
    `Hi ${patientName}, your appointment at Fikria Dental Clinic is confirmed! ✅`,
    ``,
    `Doctor: ${doctor.name} (${doctor.specialty})`,
    `Date: ${appointment.appointment_date}`,
    `Time: ${appointment.appointment_time}`,
    `Appointment ID: ${appointment.appointment_code}`,
    ``,
    `Reply here if you need to reschedule or cancel. See you soon!`,
  ].join("\n");
}

export async function sendAppointmentConfirmation(
  appointment: Appointment,
  doctor: Doctor,
  patient: { name: string; phone: string }
): Promise<SendResult> {
  const provider = resolveProvider();
  const message = formatConfirmationMessage(appointment, doctor, patient.name);
  try {
    return await provider.send(patient.phone, message);
  } catch (err) {
    console.error("WhatsApp send failed, falling back to simulation:", err);
    return new SimulatedProvider().send(patient.phone, message);
  }
}

export async function sendStatusUpdate(
  patientPhone: string,
  patientName: string,
  appointmentCode: string,
  newStatus: string
): Promise<SendResult> {
  const provider = resolveProvider();
  const message = `Hi ${patientName}, your appointment ${appointmentCode} at Fikria Dental Clinic is now: ${newStatus}.`;
  try {
    return await provider.send(patientPhone, message);
  } catch (err) {
    console.error("WhatsApp send failed, falling back to simulation:", err);
    return new SimulatedProvider().send(patientPhone, message);
  }
}
