"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Stethoscope,
  ListChecks,
  HelpCircle,
  Building2,
  CalendarClock,
  Users,
  Trash2,
} from "lucide-react";
import type { Doctor, Service, ClinicInfo, Patient } from "@/types";
import { DoctorDashboardClient } from "@/components/dashboard/DoctorDashboardClient";
import { BarChart } from "@/components/ui/BarChart";
import { CardSkeleton, PageLoading } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

type Tab = "overview" | "doctors" | "services" | "faq" | "clinic" | "appointments" | "patients";

const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "appointments", label: "Appointments", icon: CalendarClock },
  { id: "doctors", label: "Doctors", icon: Stethoscope },
  { id: "services", label: "Services", icon: ListChecks },
  { id: "faq", label: "FAQ", icon: HelpCircle },
  { id: "clinic", label: "Clinic Info", icon: Building2 },
  { id: "patients", label: "Patients", icon: Users },
];

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error ?? "Request failed");
  return res.json();
}

export function AdminDashboardClient({ doctors }: { doctors: Doctor[] }) {
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-[var(--border)] p-4 md:block">
          <p className="mb-4 font-display text-lg">Admin</p>
          <nav className="space-y-1">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm ${
                  tab === id ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "hover:bg-[var(--card)]"
                }`}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Mobile tab bar */}
        <nav className="fixed bottom-0 left-0 right-0 z-30 flex justify-around border-t border-[var(--border)] bg-[var(--card)] p-2 md:hidden">
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`rounded-lg p-2 ${tab === id ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}
            >
              <Icon size={18} />
            </button>
          ))}
        </nav>

        <main className="flex-1 p-6 pb-20 md:pb-6">
          {tab === "overview" && <OverviewTab />}
          {tab === "appointments" && <DoctorDashboardClient doctors={doctors} />}
          {tab === "doctors" && <DoctorsTab />}
          {tab === "services" && <ServicesTab />}
          {tab === "faq" && <FaqTab />}
          {tab === "clinic" && <ClinicTab />}
          {tab === "patients" && <PatientsTab />}
        </main>
      </div>
    </div>
  );
}

function OverviewTab() {
  const [stats, setStats] = useState<Record<string, number | string> | null>(null);
  const [error, setError] = useState(false);

  function load() {
    setError(false);
    setStats(null);
    api("/api/admin/analytics").then(setStats).catch(() => setError(true));
  }
  useEffect(() => { load(); }, []);

  if (error) return <ErrorState title="Couldn't load analytics" onRetry={load} />;

  if (!stats) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  const cards: [string, number | string][] = [
    ["Total Patients", stats.totalPatients],
    ["Total Doctors", stats.totalDoctors],
    ["Total Appointments", stats.totalAppointments],
    ["Today's Appointments", stats.todayAppointments],
    ["Upcoming", stats.upcoming],
    ["Weekly Appointments", stats.weeklyAppointments],
    ["Monthly Appointments", stats.monthlyAppointments],
    ["Most Booked Doctor", stats.mostBookedDoctor],
    ["Most Requested Treatment", stats.mostRequestedTreatment],
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Analytics</h1>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
            <p className="font-display text-xl">{value}</p>
            <p className="text-xs text-[var(--muted)]">{label}</p>
          </div>
        ))}
      </div>
      <div className="max-w-md rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 font-display text-base">Appointment Status Breakdown</h2>
        <BarChart
          data={[
            { label: "Completed", value: Number(stats.completed) },
            { label: "Pending", value: Number(stats.pending) },
            { label: "Cancelled", value: Number(stats.cancelled) },
          ]}
        />
      </div>
    </div>
  );
}

function DoctorsTab() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState({ name: "", slug: "", specialty: "", experience_years: 0 });

  async function load() {
    const { data } = await api("/api/admin/doctors");
    setDoctors(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addDoctor(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/doctors", {
      method: "POST",
      body: JSON.stringify({ ...form, treatments: [], languages: [], working_days: ["Mon", "Tue", "Wed", "Thu", "Fri"] }),
    });
    setForm({ name: "", slug: "", specialty: "", experience_years: 0 });
    load();
  }

  async function removeDoctor(id: string) {
    await api(`/api/admin/doctors?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Manage Doctors</h1>
      <form onSubmit={addDoctor} className="mb-6 grid grid-cols-2 gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-5">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input required placeholder="Slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input required placeholder="Specialty" value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input type="number" placeholder="Years" value={form.experience_years} onChange={(e) => setForm({ ...form, experience_years: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-[var(--primary-foreground)]">Add Doctor</button>
      </form>
      <div className="space-y-2">
        {doctors.length === 0 && <EmptyState title="No doctors yet" description="Add your first doctor using the form above." />}
        {doctors.map((d) => (
          <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <span>{d.name} — <span className="text-[var(--muted)]">{d.specialty}</span></span>
            <button onClick={() => removeDoctor(d.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServicesTab() {
  const [services, setServices] = useState<Service[]>([]);
  const [form, setForm] = useState({ name: "", category: "", duration_minutes: 30 });

  async function load() {
    const { data } = await api("/api/admin/services");
    setServices(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addService(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/services", { method: "POST", body: JSON.stringify(form) });
    setForm({ name: "", category: "", duration_minutes: 30 });
    load();
  }
  async function removeService(id: string) {
    await api(`/api/admin/services?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Manage Services</h1>
      <form onSubmit={addService} className="mb-6 grid grid-cols-1 gap-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:grid-cols-4">
        <input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input type="number" placeholder="Duration (min)" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })} className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm text-[var(--primary-foreground)]">Add Service</button>
      </form>
      <div className="space-y-2">
        {services.length === 0 && <EmptyState title="No services yet" description="Add your first service using the form above." />}
        {services.map((s) => (
          <div key={s.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <span>{s.name} — <span className="text-[var(--muted)]">{s.category}</span></span>
            <button onClick={() => removeService(s.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FaqTab() {
  const [items, setItems] = useState<{ id: string; question: string; answer: string }[]>([]);
  const [form, setForm] = useState({ question: "", answer: "" });

  async function load() {
    const { data } = await api("/api/admin/faq");
    setItems(data ?? []);
  }
  useEffect(() => { load(); }, []);

  async function addFaq(e: React.FormEvent) {
    e.preventDefault();
    await api("/api/admin/faq", { method: "POST", body: JSON.stringify(form) });
    setForm({ question: "", answer: "" });
    load();
  }
  async function removeFaq(id: string) {
    await api(`/api/admin/faq?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Manage FAQ</h1>
      <form onSubmit={addFaq} className="mb-6 space-y-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <input required placeholder="Question" value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <textarea required placeholder="Answer" value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]">Add FAQ</button>
      </form>
      <div className="space-y-2">
        {items.length === 0 && <EmptyState title="No FAQs yet" description="Add your first FAQ using the form above." />}
        {items.map((f) => (
          <div key={f.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <div className="flex items-start justify-between">
              <p className="font-medium">{f.question}</p>
              <button onClick={() => removeFaq(f.id)} className="text-[var(--danger)]"><Trash2 size={16} /></button>
            </div>
            <p className="mt-1 text-[var(--muted)]">{f.answer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClinicTab() {
  const [info, setInfo] = useState<ClinicInfo | null>(null);

  useEffect(() => {
    api("/api/admin/clinic_information").then((r) => setInfo(r.data)).catch(() => {});
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!info) return;
    await api("/api/admin/clinic_information", { method: "PATCH", body: JSON.stringify(info) });
  }

  if (!info) return <PageLoading label="Loading clinic information..." />;

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Clinic Information</h1>
      <form onSubmit={save} className="max-w-lg space-y-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <input value={info.clinic_name} onChange={(e) => setInfo({ ...info, clinic_name: e.target.value })} placeholder="Clinic name" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input value={info.address ?? ""} onChange={(e) => setInfo({ ...info, address: e.target.value })} placeholder="Address" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input value={info.phone ?? ""} onChange={(e) => setInfo({ ...info, phone: e.target.value })} placeholder="Phone" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <input value={info.email ?? ""} onChange={(e) => setInfo({ ...info, email: e.target.value })} placeholder="Email" className="w-full rounded-lg border border-[var(--border)] px-3 py-2 text-sm" />
        <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm text-[var(--primary-foreground)]">Save Changes</button>
      </form>
    </div>
  );
}

function PatientsTab() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    api("/api/admin/patients").then((r) => setPatients(r.data ?? [])).catch(() => {});
  }, []);

  const filtered = patients.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.phone.includes(search)
  );

  return (
    <div>
      <h1 className="mb-6 font-display text-2xl">Patients</h1>
      <input
        placeholder="Search by name or phone..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4 w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
      />
      <div className="space-y-2">
        {filtered.map((p) => (
          <div key={p.id} className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3 text-sm">
            <p className="font-medium">{p.name}</p>
            <p className="text-[var(--muted)]">{p.phone} {p.email ? `· ${p.email}` : ""}</p>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState title="No patients found" description="Patients appear here automatically once they book through the AI receptionist." />}
      </div>
    </div>
  );
}
