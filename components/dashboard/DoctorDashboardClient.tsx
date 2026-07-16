"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, CalendarDays, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { Appointment, AppointmentStatus, Doctor } from "@/types";
import { TableRowSkeleton, CardSkeleton } from "@/components/ui/Loading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pending: "bg-[var(--warning)]/15 text-[var(--warning)]",
  confirmed: "bg-[var(--secondary)]/15 text-[var(--secondary)]",
  completed: "bg-[var(--success)]/15 text-[var(--success)]",
  cancelled: "bg-[var(--danger)]/15 text-[var(--danger)]",
  no_show: "bg-[var(--muted)]/15 text-[var(--muted)]",
};

export function DoctorDashboardClient({ doctors }: { doctors: Doctor[] }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [doctorFilter, setDoctorFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    const params = new URLSearchParams();
    if (doctorFilter) params.set("doctorId", doctorFilter);
    if (dateFilter) params.set("date", dateFilter);
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/appointments?${params.toString()}`);
      if (!res.ok) throw new Error("Request failed");
      const data = await res.json();

      console.log("Appointments API Response:", data);

      setAppointments(data.appointments);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctorFilter, dateFilter, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300); // debounce free-text search
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  async function setStatus(id: string, status: AppointmentStatus) {
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)));
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const summary = useMemo(() => {
    return {
      today: appointments.filter((a) => a.appointment_date === today).length,
      upcoming: appointments.filter((a) => a.appointment_date > today && a.status !== "cancelled").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      pending: appointments.filter((a) => a.status === "pending").length,
    };
  }, [appointments, today]);

  return (
    <div className="min-h-screen bg-[var(--background)] p-6 text-[var(--foreground)]">
      <h1 className="mb-1 font-display text-2xl">Doctor Dashboard</h1>
      <p className="mb-6 text-sm text-[var(--muted)]">Appointments across all doctors, in one place.</p>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {loading && appointments.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
            <SummaryCard icon={CalendarDays} label="Today" value={summary.today} />
            <SummaryCard icon={Clock} label="Upcoming" value={summary.upcoming} />
            <SummaryCard icon={CheckCircle2} label="Completed" value={summary.completed} />
            <SummaryCard icon={XCircle} label="Pending" value={summary.pending} />
          </>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, phone, or ID..."
            className="rounded-lg border border-[var(--border)] bg-[var(--card)] py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={doctorFilter}
          onChange={(e) => setDoctorFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <option value="">All doctors</option>
          {doctors.map((d) => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm"
        >
          <option value="">All statuses</option>
          {(["pending", "confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      {error ? (
        <ErrorState title="Couldn't load appointments" onRetry={load} />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted)]">
              <tr>
                <th className="px-4 py-3">Appointment ID</th>
                <th className="px-4 py-3">Patient</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Doctor</th>
                <th className="px-4 py-3">Treatment</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading &&
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={8} />)}
              {!loading && appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8">
                    <EmptyState
                      icon={CalendarDays}
                      title="No appointments match these filters"
                      description="Try widening your search, or clearing a filter above."
                    />
                  </td>
                </tr>
              )}
              {appointments.map((a) => (
                <tr key={a.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="appointment-code px-4 py-3 text-xs">{a.appointment_code}</td>
                  <td className="px-4 py-3">{a.patient?.name}</td>
                  <td className="px-4 py-3">{a.patient?.phone}</td>
                  <td className="px-4 py-3">{a.doctor?.name}</td>
                  <td className="px-4 py-3">{a.service?.name ?? a.reason ?? "—"}</td>
                  <td className="px-4 py-3">{a.appointment_date}</td>
                  <td className="px-4 py-3">{a.appointment_time?.slice(0, 5)}</td>
                  <td className="px-4 py-3">
                    <select
                      value={a.status}
                      onChange={(e) => setStatus(a.id, e.target.value as AppointmentStatus)}
                      aria-label={`Status for appointment ${a.appointment_code}`}
                      className={`rounded-full border-0 px-2 py-1 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--primary)] ${STATUS_STYLES[a.status]}`}
                    >
                      {(["pending", "confirmed", "completed", "cancelled", "no_show"] as AppointmentStatus[]).map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof CalendarDays; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
      <Icon className="mb-2 text-[var(--primary)]" size={18} />
      <p className="font-display text-2xl">{value}</p>
      <p className="text-xs text-[var(--muted)]">{label}</p>
    </div>
  );
}
