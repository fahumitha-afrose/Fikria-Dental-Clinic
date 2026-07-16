"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, MessageSquare, User, Settings, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Conversation } from "@/types";

interface SidebarProps {
  conversations: Conversation[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function Sidebar({ conversations, activeId, onSelect, onNewChat }: SidebarProps) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-[var(--border)] bg-[var(--card)] p-3">
      <div className="mb-4 flex items-center gap-2 px-2 py-1">
        <div className="h-7 w-7 rounded-lg bg-[var(--primary)]" />
        <span className="font-semibold">Fikria AI</span>
      </div>

      <button
        onClick={onNewChat}
        className="mb-3 flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--background)]"
      >
        <Plus size={16} /> New Chat
      </button>

      <div className="flex-1 space-y-1 overflow-y-auto">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c.id)}
            className={`flex w-full items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm transition-colors ${
              c.id === activeId
                ? "bg-[var(--primary)]/10 text-[var(--primary)]"
                : "hover:bg-[var(--background)]"
            }`}
          >
            <MessageSquare size={14} className="shrink-0" />
            <span className="truncate">{c.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-3 space-y-1 border-t border-[var(--border)] pt-3">
        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--background)]"
        >
          <User size={16} /> Profile
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-[var(--background)]"
        >
          <Settings size={16} /> Settings
        </Link>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-500 hover:bg-red-500/10"
        >
          <LogOut size={16} /> Log Out
        </button>
      </div>
    </aside>
  );
}
