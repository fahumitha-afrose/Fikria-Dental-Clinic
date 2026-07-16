import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: memory } = await supabase
    .from("memory")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link href="/chat" className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]">
        <ArrowLeft size={16} /> Back to chat
      </Link>

      <h1 className="mb-6 text-xl font-semibold">Profile</h1>

      <ProfileForm
        email={user.email ?? ""}
        name={profile?.name ?? ""}
        company={profile?.company ?? ""}
        industry={profile?.industry ?? ""}
      />

      <h2 className="mb-3 mt-10 text-lg font-semibold">What Fikria AI remembers</h2>
      {memory && memory.length > 0 ? (
        <ul className="space-y-2">
          {memory.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm"
            >
              <span className="capitalize text-[var(--muted)]">
                {m.memory_key.replace(/_/g, " ")}
              </span>
              <span className="font-medium">{m.memory_value}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Nothing saved yet — this fills in as you chat with the AI Consultant.
        </p>
      )}
    </main>
  );
}
