"use client";

import { useEffect, useRef, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import type { ChatMessage } from "@/types";

const SUGGESTED_PROMPTS = [
  "I need an AI chatbot for my business.",
  "Build a website for my business.",
  "Improve my brand.",
  "I need data analytics.",
  "Tell me about Fikria.",
  "Recommend services for my startup.",
];

interface ChatWindowProps {
  conversationId?: string;
  initialMessages: ChatMessage[];
  onConversationCreated: (id: string) => void;
}

export function ChatWindow({
  conversationId,
  initialMessages,
  onConversationCreated,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text: string) {
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      conversation_id: conversationId ?? "",
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      {
        id: assistantId,
        conversation_id: conversationId ?? "",
        role: "assistant",
        content: "",
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId && newConvId !== conversationId) {
        onConversationCreated(newConvId);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: acc } : m))
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                content:
                  "Sorry, something went wrong on my end. Please try sending that again.",
              }
            : m
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {isEmpty ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 py-24 text-center">
            <h2 className="text-2xl font-semibold">
              Hi, I&apos;m Fikria AI Consultant
            </h2>
            <p className="text-[var(--muted)]">
              I&apos;m here to understand your business and help you discover the
              right digital solutions. How can I help you today?
            </p>
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-left text-sm transition-colors hover:border-[var(--primary)]"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {isStreaming && (
              <div className="flex gap-1 px-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.3s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.15s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
      <ChatInput onSend={sendMessage} disabled={isStreaming} />
    </div>
  );
}
