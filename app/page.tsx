import Link from "next/link";
import {
  Sparkles,
  Clock,
  ShieldCheck,
  PhoneCall,
  MapPin,
  Mail,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { SmileArc } from "@/components/ui/SmileArc";
import { DoctorAvatar } from "@/components/ui/DoctorAvatar";
import { getDoctors, getServices, getFaq, getClinicInfo } from "@/lib/dental-data";
import { OpenReceptionistButton } from "@/components/receptionist/OpenReceptionistButton";
import { Reveal } from "@/components/ui/Reveal";

const TESTIMONIALS = [
  { name: "Ananya R.", text: "Booked my cleaning in under two minutes, right from the chat — no phone tag at all." },
  { name: "Karthik S.", text: "Had tooth pain on a Sunday evening and the receptionist pointed me straight to the right specialist." },
  { name: "Meera V.", text: "It felt like texting an actual front-desk person, not a bot reading a script." },
];

const WHY_US = [
  { icon: Sparkles, title: "AI Receptionist, 24/7", desc: "Get answers and book appointments any time — no hold music, no callbacks." },
  { icon: ShieldCheck, title: "Specialist-matched care", desc: "Tell us what's wrong and we'll point you to the right dentist the first time." },
  { icon: Clock, title: "Real-time availability", desc: "See genuinely open slots for each doctor, updated the moment someone books." },
];

export default async function LandingPage() {
  const [doctors, services, faq, clinic] = await Promise.all([
    getDoctors(),
    getServices(),
    getFaq(),
    getClinicInfo(),
  ]);

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--primary)] font-display text-sm text-[var(--primary-foreground)]">
              F
            </div>
            <span className="font-display text-lg">{clinic.clinic_name}</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#services" className="hover:text-[var(--primary)]">Services</a>
            <a href="#doctors" className="hover:text-[var(--primary)]">Doctors</a>
            <a href="#faq" className="hover:text-[var(--primary)]">FAQ</a>
            <a href="#contact" className="hover:text-[var(--primary)]">Contact</a>
          </nav>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-medium hover:underline sm:inline"
            >
              Staff login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-20 pt-20 text-center">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--border)] px-3 py-1 text-xs text-[var(--muted)]">
          Powered by Fikria Innovations
        </p>
        <h1 className="mb-3 text-4xl leading-tight sm:text-5xl">
          A receptionist who never puts you on hold.
        </h1>
        <SmileArc className="mx-auto mb-5" />
        <p className="mx-auto mb-8 max-w-xl text-lg text-[var(--muted)]">
          Chat with our AI receptionist to find the right dentist, ask about treatments,
          and book your appointment — day or night.
        </p>
        <OpenReceptionistButton
          label="Chat with the receptionist"
          className="inline-flex items-center gap-2 rounded-full bg-[var(--primary)] px-6 py-3 text-sm font-medium text-[var(--primary-foreground)] hover:opacity-90"
        />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Look for the chat bubble in the corner — it&apos;s always on.
        </p>
      </section>

      {/* About */}
      <section className="mx-auto max-w-3xl px-6 py-12 text-center">
        <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">About the clinic</p>
        <h2 className="mb-4 text-2xl">Modern dentistry, genuinely caring</h2>
        <p className="text-[var(--muted)]">
          {clinic.address ? `Located at ${clinic.address}, ` : ""}
          {clinic.clinic_name} brings general, cosmetic, orthodontic, pediatric, and specialist
          dental care together under one roof — supported by an AI receptionist so help is
          never more than a message away.
        </p>
      </section>

      {/* Why choose us */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {WHY_US.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6">
              <Icon className="mb-3 text-[var(--primary)]" size={24} />
              <h3 className="mb-1 font-display text-lg">{title}</h3>
              <p className="text-sm text-[var(--muted)]">{desc}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">What we treat</p>
          <h2 className="text-2xl">Our Services</h2>
        </div>
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((group) => (
            <div key={group.category} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <h3 className="mb-3 font-display text-base text-[var(--primary)]">{group.category}</h3>
              <ul className="space-y-1.5 text-sm text-[var(--muted)]">
                {group.services.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          ))}
        </Reveal>
      </section>

      {/* Doctors */}
      <section id="doctors" className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">Our team</p>
          <h2 className="text-2xl">Meet Our Dentists</h2>
        </div>
        <Reveal className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {doctors.map((doc) => (
            <Link
              href={`/doctors/${doc.slug}`}
              key={doc.slug}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-center transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)]"
            >
              <DoctorAvatar name={doc.name} imagePath={doc.image_path} size={88} className="mx-auto mb-3" />
              <h3 className="font-display text-lg">{doc.name}</h3>
              <p className="mb-2 text-sm text-[var(--primary)]">{doc.specialty}</p>
              <p className="mb-3 text-xs text-[var(--muted)]">{doc.experience_years} years experience</p>
              <p className="text-xs text-[var(--muted)]">{doc.treatments.slice(0, 3).join(" · ")}</p>
            </Link>
          ))}
        </Reveal>
      </section>

      {/* AI Receptionist section */}
      <section className="mx-auto max-w-4xl px-6 py-16 text-center">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-10">
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">Meet the front desk</p>
          <h2 className="mb-3 text-2xl">Your AI Receptionist</h2>
          <p className="mx-auto mb-2 max-w-lg text-[var(--muted)]">
            Ask about symptoms, treatments, timings, or insurance — and book, reschedule, or
            cancel appointments without ever waiting on hold. Available in text or voice.
          </p>
          <p className="text-xs text-[var(--muted)]">Tap the chat bubble in the bottom-right corner to start.</p>
        </div>
      </section>

      {/* Testimonials */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8 text-center">
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">Patients say</p>
          <h2 className="text-2xl">Testimonials</h2>
        </div>
        <Reveal className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="mb-3 text-sm text-[var(--foreground)]">&ldquo;{t.text}&rdquo;</p>
              <p className="text-xs text-[var(--muted)]">— {t.name}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-6 text-center">
          <p className="mb-2 text-xs uppercase tracking-wide text-[var(--primary)]">Good to know</p>
          <h2 className="text-2xl">Frequently Asked Questions</h2>
        </div>
        <Reveal className="space-y-3">
          {faq.map((item) => (
            <details key={item.question} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
              <summary className="cursor-pointer text-sm font-medium">{item.question}</summary>
              <p className="mt-2 text-sm text-[var(--muted)]">{item.answer}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="mb-6 text-2xl">Visit or Reach Us</h2>
        <div className="grid grid-cols-1 gap-4 text-sm text-[var(--muted)] sm:grid-cols-3">
          <div className="flex flex-col items-center gap-2">
            <MapPin className="text-[var(--primary)]" size={20} />
            {clinic.address}
          </div>
          <div className="flex flex-col items-center gap-2">
            <PhoneCall className="text-[var(--primary)]" size={20} />
            {clinic.phone}
          </div>
          <div className="flex flex-col items-center gap-2">
            <Mail className="text-[var(--primary)]" size={20} />
            {clinic.email}
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)] px-6 py-8 text-center text-sm text-[var(--muted)]">
        © {new Date().getFullYear()} {clinic.clinic_name}. A portfolio project by Fikria Innovations.
      </footer>
    </main>
  );
}
