"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [clearing, setClearing] = useState(false);

  async function handleClearHistory() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setClearing(true);
    const { data: conversations } = await supabase
      .from("conversations")
      .select("id")
      .eq("user_id", user.id);

    const ids = (conversations ?? []).map((c) => c.id);
    if (ids.length > 0) {
      await supabase.from("messages").delete().in("conversation_id", ids);
      await supabase.from("conversations").delete().eq("user_id", user.id);
    }
    setClearing(false);
    router.refresh();
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "This will permanently delete your account and all data. This cannot be undone. Continue?"
    );
    if (!confirmed) return;

    // Deleting the auth user requires admin privileges (service role), which
    // must run server-side. This calls a route handler that performs it securely.
    await fetch("/api/account", { method: "DELETE" });
    await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl px-4 py-10">
      <Link
        href="/chat"
        className="mb-6 inline-flex items-center gap-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={16} /> Back to chat
      </Link>

      <h1 className="mb-6 text-xl font-semibold">Settings</h1>

      <div className="space-y-4">
        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Appearance</p>
            <p className="text-sm text-[var(--muted)]">Toggle light or dark mode.</p>
          </div>
          <ThemeToggle />
        </Card>

        <Card className="flex items-center justify-between">
          <div>
            <p className="font-medium">Clear chat history</p>
            <p className="text-sm text-[var(--muted)]">
              Deletes all your conversations. Saved memory is kept.
            </p>
          </div>
          <Button variant="secondary" onClick={handleClearHistory} isLoading={clearing}>
            Clear
          </Button>
        </Card>

        <Card className="flex items-center justify-between border-red-500/30">
          <div>
            <p className="font-medium text-red-500">Delete account</p>
            <p className="text-sm text-[var(--muted)]">
              Permanently deletes your account and all associated data.
            </p>
          </div>
          <Button
            variant="secondary"
            className="border-red-500/40 text-red-500 hover:bg-red-500/10"
            onClick={handleDeleteAccount}
          >
            Delete
          </Button>
        </Card>
      </div>
    </main>
  );
}
