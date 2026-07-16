import { createClient } from "@/lib/supabase/server";
import type { Doctor, Service, ClinicInfo } from "@/types";
import doctorsKnowledge from "@/knowledge/doctors.json";
import servicesKnowledge from "@/knowledge/services.json";
import faqKnowledge from "@/knowledge/faq.json";
import clinicKnowledge from "@/knowledge/clinic.json";

/**
 * Public content (doctors, services, clinic info, FAQ) is read from Supabase
 * — the same source of truth the dashboards write to — with the bundled
 * knowledge/*.json used only as a fallback so the marketing site still
 * renders correctly before `supabase/seed-dental.sql` has been run.
 */

export async function getDoctors(): Promise<Doctor[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("doctors").select("*").eq("active", true).order("name");
  if (data && data.length > 0) return data as Doctor[];
  return (doctorsKnowledge as unknown[]).map((d, i) => ({ id: `seed-${i}`, active: true, ...(d as object) })) as Doctor[];
}

export async function getDoctorBySlug(slug: string): Promise<Doctor | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("doctors").select("*").eq("slug", slug).single();
  if (data) return data as Doctor;
  const fallback = (doctorsKnowledge as { slug: string }[]).find((d) => d.slug === slug);
  return fallback ? ({ id: `seed-${slug}`, active: true, ...fallback } as Doctor) : null;
}

export async function getServices(): Promise<{ category: string; services: string[] }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("services").select("*");
  if (data && data.length > 0) {
    const grouped = new Map<string, string[]>();
    (data as Service[]).forEach((s) => {
      const cat = s.category ?? "Other";
      grouped.set(cat, [...(grouped.get(cat) ?? []), s.name]);
    });
    return Array.from(grouped, ([category, services]) => ({ category, services }));
  }
  return servicesKnowledge as { category: string; services: string[] }[];
}

export async function getFaq(): Promise<{ question: string; answer: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("faq").select("question, answer");
  if (data && data.length > 0) return data;
  return faqKnowledge as { question: string; answer: string }[];
}

export async function getClinicInfo(): Promise<ClinicInfo> {
  const supabase = await createClient();
  const { data } = await supabase.from("clinic_information").select("*").limit(1).maybeSingle();
  if (data) return data as ClinicInfo;
  return {
    clinic_name: clinicKnowledge.name,
    address: clinicKnowledge.address,
    phone: clinicKnowledge.phone,
    whatsapp_number: clinicKnowledge.whatsapp,
    email: clinicKnowledge.email,
    timings: { "Mon-Fri": "9:00 AM - 7:00 PM", Sat: "9:00 AM - 4:00 PM", Sun: "Closed" },
    insurance_info: ["Star Health", "HDFC Ergo", "ICICI Lombard", "Self-pay / Cash"],
  };
}
