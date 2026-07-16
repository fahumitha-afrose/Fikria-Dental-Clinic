export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface MemoryFact {
  id: string;
  user_id: string;
  memory_key: string;
  memory_value: string;
  confidence: number;
  updated_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string;
  company: string | null;
  industry: string | null;
  created_at: string;
}

// ── Dental Platform types (additive — Lead/Profile/MemoryFact above are kept) ──

export interface Doctor {
  id: string;
  slug: string;
  name: string;
  specialty: string;
  qualification: string | null;
  experience_years: number;
  biography: string | null;
  treatments: string[];
  languages: string[];
  working_days: string[];
  working_hours_start: string; // "09:00"
  working_hours_end: string; // "17:00"
  slot_duration_minutes: number;
  image_path: string | null;
  active: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
}

export interface Patient {
  id: string;
  user_id: string | null;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Appointment {
  id: string;
  appointment_code: string;
  patient_id: string;
  doctor_id: string;
  service_id: string | null;
  reason: string | null;
  appointment_date: string; // "2026-07-20"
  appointment_time: string; // "14:30"
  status: AppointmentStatus;
  conversation_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields, populated by dashboard queries
  patient?: Patient;
  doctor?: Doctor;
  service?: Service;
}

export interface TimeSlot {
  time: string; // "14:30"
  available: boolean;
}

export interface ClinicInfo {
  clinic_name: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null;
  email: string | null;
  timings: Record<string, string>;
  insurance_info: string[];
}

export interface Lead {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  company: string | null;
  interested_service: string | null;
  budget: string | null;
  timeline: string | null;
  notes: string | null;
  status: "new" | "contacted" | "proposal_sent" | "closed";
  created_at: string;
}
