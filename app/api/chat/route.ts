import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { streamReceptionistReply, extractMemoryFact, extractBookingIntent } from "@/lib/gemini";
import { getMemory, saveMemoryFact } from "@/lib/memory";
import {
  getAvailableSlots,
  createAppointment,
  findAppointmentByPhone,
  rescheduleAppointment,
  updateAppointmentStatus,
  BookingError,
} from "@/lib/appointments";
import { sendAppointmentConfirmation, sendStatusUpdate } from "@/lib/whatsapp";
import type { ChatMessage } from "@/types";

/**
 * AI Receptionist chat endpoint.
 *
 * Reused unchanged from the original AI Consultant: auth check, conversation
 * creation, message persistence, streaming response pattern, and fire-and-
 * forget memory extraction. Patients using the floating widget authenticate
 * via Supabase anonymous sign-in (see components/receptionist/FloatingWidget),
 * so `user` below is always present without requiring a real account —
 * this keeps the existing `conversations.user_id not null` schema untouched.
 *
 * New in this version: a booking-intent extraction pass runs BEFORE the
 * streamed reply, executing real availability/booking/cancel/reschedule
 * actions against Supabase so the assistant narrates real data instead of
 * inventing it (see lib/gemini.ts extractBookingIntent + TOOL RESULTS block).
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  // Service-role client — required for appointments/patients/doctors writes
  // and reads, since those tables have RLS enabled with no policies for the
  // anon-key cookie client (see lib/supabase/admin.ts for why).
  const admin = createAdminClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { conversationId, message } = await req.json();
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  let convId = conversationId as string | undefined;
  if (!convId) {
    const { data: conv, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: message.slice(0, 60) })
      .select()
      .single();

    if (error || !conv) {
      return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
    }
    convId = conv.id;
  }

  const { error: userMsgErr } = await supabase.from("messages").insert({
    conversation_id: convId,
    role: "user",
    content: message,
  });
  if (userMsgErr) console.error("[chat] Could not save user message:", userMsgErr);

  const { data: history } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", convId)
    .order("created_at", { ascending: true })
    .limit(20);

  const typedHistory = (history ?? []) as ChatMessage[];
  const memory = await getMemory(supabase, user.id);

  // ── Booking-intent pass: real DB actions happen here, before streaming ──
  let toolResult: string | undefined;
  try {
    const intent = await extractBookingIntent(typedHistory, message);

    if (intent.action === "check_availability") {
      const { data: doctor } = await admin
        .from("doctors")
        .select("*")
        .eq("slug", intent.doctorSlug)
        .single();

      if (!doctor) {
        toolResult = `Could not find a doctor matching "${intent.doctorSlug}". Ask the patient to clarify or pick from the DOCTORS list.`;
      } else {
        const slots = await getAvailableSlots(admin, doctor, intent.date);
        const available = slots.filter((s) => s.available).map((s) => s.time);
        toolResult =
          available.length > 0
            ? `Available times for ${doctor.name} on ${intent.date}: ${available.join(", ")}.`
            : `${doctor.name} has no available slots on ${intent.date} (either fully booked or not a working day). Suggest the patient try a different date.`;
      }
    }

    if (intent.action === "book") {
      const { data: doctor } = await admin
        .from("doctors")
        .select("*")
        .eq("slug", intent.doctorSlug)
        .single();

      if (!doctor) {
        toolResult = `Could not find a doctor matching "${intent.doctorSlug}". Ask the patient to clarify.`;
      } else {
        try {
          const appointment = await createAppointment(admin, {
            doctorId: doctor.id,
            patient: { name: intent.patientName, phone: intent.patientPhone },
            reason: intent.reason ?? null,
            date: intent.date,
            time: intent.time,
            conversationId: convId,
          });
          toolResult = `Booking CONFIRMED. Appointment ID: ${appointment.appointment_code}. Doctor: ${doctor.name}. Date: ${intent.date}. Time: ${intent.time}.`;

          sendAppointmentConfirmation(appointment, doctor, {
            name: intent.patientName,
            phone: intent.patientPhone,
          }).catch((err) => console.error("WhatsApp confirmation failed:", err));
        } catch (err) {
          toolResult =
            err instanceof BookingError
              ? `Booking FAILED: ${err.message} Offer the patient an alternative.`
              : `Booking FAILED due to an unexpected error. Apologize and offer to connect them with clinic staff.`;
        }
      }
    }

    if (intent.action === "cancel") {
      const appt = await findAppointmentByPhone(admin, intent.patientPhone);
      if (!appt) {
        toolResult = `No upcoming appointment found for phone ${intent.patientPhone}. Ask the patient to double-check the number.`;
      } else {
        await updateAppointmentStatus(admin, appt.id, "cancelled");
        sendStatusUpdate(intent.patientPhone, appt.patient?.name ?? "Patient", appt.appointment_code, "cancelled").catch(
          (err) => console.error("WhatsApp status update failed:", err)
        );
        toolResult = `Appointment ${appt.appointment_code} has been CANCELLED successfully.`;
      }
    }

    if (intent.action === "reschedule") {
      const appt = await findAppointmentByPhone(admin, intent.patientPhone);
      if (!appt) {
        toolResult = `No upcoming appointment found for phone ${intent.patientPhone}. Ask the patient to double-check the number.`;
      } else {
        try {
          await rescheduleAppointment(admin, appt.id, intent.date, intent.time);
          sendStatusUpdate(
            intent.patientPhone,
            appt.patient?.name ?? "Patient",
            appt.appointment_code,
            `rescheduled to ${intent.date} ${intent.time}`
          ).catch((err) => console.error("WhatsApp status update failed:", err));
          toolResult = `Appointment ${appt.appointment_code} RESCHEDULED to ${intent.date} at ${intent.time}.`;
        } catch (err) {
          toolResult =
            err instanceof BookingError
              ? `Reschedule FAILED: ${err.message} Offer the patient an alternative.`
              : `Reschedule FAILED due to an unexpected error.`;
        }
      }
    }
  } catch (err) {
    console.error("Booking intent handling failed:", err);
    // Non-fatal — assistant will simply reply conversationally without tool grounding
  }

  try {
    const stream = await streamReceptionistReply(typedHistory, memory, message, toolResult);

    const encoder = new TextEncoder();
    let fullReply = "";

    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.text ?? "";
          fullReply += text;
          controller.enqueue(encoder.encode(text));
        }
        controller.close();

        await supabase.from("messages").insert({
          conversation_id: convId,
          role: "assistant",
          content: fullReply,
        });

        extractMemoryFact(message, fullReply)
          .then((fact) => {
            if (fact) {
              saveMemoryFact(supabase, user.id, fact.key, fact.value, fact.confidence);
            }
          })
          .catch((err) => console.error("Memory extraction failed:", err));
      },
    });

    return new NextResponse(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversation-Id": convId!,
      },
    });
  } catch (err) {
    console.error("Gemini stream error:", err);
    return NextResponse.json(
      { error: "The AI Receptionist is temporarily unavailable. Please try again, or call the clinic directly." },
      { status: 502 }
    );
  }
}
