"use client";

import { useState } from "react";
import { Sidebar } from "@/components/chat/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { ThemeToggle } from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import type { ChatMessage, Conversation } from "@/types";

export function ChatShell({
  initialConversations,
}: {
  initialConversations: Conversation[];
}) {
  const supabase = createClient();
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | undefined>(
    initialConversations[0]?.id
  );
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  async function selectConversation(id: string) {
    setActiveId(id);
    const { data } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages((data ?? []) as ChatMessage[]);
  }

  function startNewChat() {
    setActiveId(undefined);
    setMessages([]);
  }

  function handleConversationCreated(id: string) {
    setActiveId(id);
    setConversations((prev) => [
      { id, user_id: "", title: "New conversation", created_at: "", updated_at: "" },
      ...prev,
    ]);
  }

  return (
    <div className="flex h-screen">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNewChat={startNewChat}
      />
      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-[var(--border)] px-4 py-3">
          <ThemeToggle />
        </header>
        <ChatWindow
          key={activeId ?? "new"}
          conversationId={activeId}
          initialMessages={messages}
          onConversationCreated={handleConversationCreated}
        />
      </div>
    </div>
  );
}
