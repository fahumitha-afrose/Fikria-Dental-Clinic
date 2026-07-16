import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Clock, Languages, GraduationCap, Stethoscope } from "lucide-react";
import { getDoctorBySlug } from "@/lib/dental-data";
import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { SmileArc } from "@/components/ui/SmileArc";
import { OpenReceptionistButton } from "@/components/receptionist/OpenReceptionistButton";

export default async function DoctorProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doctor = await getDoctorBySlug(slug);
  if (!doctor) notFound();

  return (
    <main className="min-h-screen bg-[var(--background)] px-6 py-10 text-[var(--foreground)]">
      <div className="mx-auto max-w-2xl">
        <Link href="/#doctors" className="mb-6 inline-flex items-center gap-1 text-sm text-[var(--muted)] hover:text-[var(--primary)]">
          <ArrowLeft size={14} /> Back to all doctors
        </Link>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center">
          <DoctorAvatar name={doctor.name} imagePath={doctor.image_path} size={112} className="mx-auto mb-4" />
          <h1 className="font-display text-2xl">{doctor.name}</h1>
          <p className="mb-1 text-[var(--primary)]">{doctor.specialty}</p>
          <p className="text-sm text-[var(--muted)]">{doctor.experience_years} years experience</p>
          <SmileArc className="mx-auto my-4" />
          {doctor.biography && <p className="mx-auto max-w-md text-sm text-[var(--muted)]">{doctor.biography}</p>}

          <OpenReceptionistButton
            label={`Book with ${doctor.name}`}
            message={`I'd like to book an appointment with ${doctor.name}.`}
            className="mt-6 rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm text-[var(--primary-foreground)] hover:opacity-90"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <GraduationCap size={16} className="text-[var(--primary)]" /> Qualification
            </div>
            <p className="text-sm text-[var(--muted)]">{doctor.qualification ?? "Not specified"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Languages size={16} className="text-[var(--primary)]" /> Languages
            </div>
            <p className="text-sm text-[var(--muted)]">{doctor.languages.join(", ") || "English"}</p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Clock size={16} className="text-[var(--primary)]" /> Working Hours
            </div>
            <p className="text-sm text-[var(--muted)]">
              {doctor.working_days.join(", ")} · {doctor.working_hours_start.slice(0, 5)} – {doctor.working_hours_end.slice(0, 5)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Stethoscope size={16} className="text-[var(--primary)]" /> Treatments
            </div>
            <p className="text-sm text-[var(--muted)]">{doctor.treatments.join(", ")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
