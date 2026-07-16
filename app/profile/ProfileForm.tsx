"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, Input } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface ProfileFormProps {
  email: string;
  name: string;
  company: string;
  industry: string;
}

export function ProfileForm({ email, name, company, industry }: ProfileFormProps) {
  const supabase = createClient();
  const [form, setForm] = useState({ name, company, industry });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("profiles")
        .update({ ...form, updated_at: new Date().toISOString() })
        .eq("id", user.id);
    }
    setSaving(false);
    setSaved(true);
  }

  return (
    <Card className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium">Email</label>
        <Input value={email} disabled className="opacity-60" />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Name</label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Company</label>
        <Input
          value={form.company}
          onChange={(e) => setForm({ ...form, company: e.target.value })}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium">Industry</label>
        <Input
          value={form.industry}
          onChange={(e) => setForm({ ...form, industry: e.target.value })}
        />
      </div>
      <Button onClick={handleSave} isLoading={saving}>
        {saved ? "Saved" : "Save changes"}
      </Button>
    </Card>
  );
}
