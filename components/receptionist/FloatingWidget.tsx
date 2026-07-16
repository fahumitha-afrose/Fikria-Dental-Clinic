"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Mic, Square, Volume2, VolumeX } from "lucide-react";
import { SmileArc } from "@/components/ui/SmileArc";
import { ensurePatientSession } from "@/lib/supabase/anon";
import { isVoiceSupported, startListening, speak, stopSpeaking } from "@/lib/voice";
import type { ChatMessage } from "@/types";

const GREETING =
  "Hi there! 👋 I'm the Fikria Dental Clinic AI receptionist. Tell me what's bringing you in today, or ask me anything about the clinic.";

export function FloatingWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const stopListenRef = useRef<{ stop: () => void } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVoiceSupported(isVoiceSupported());
  }, []);

  useEffect(() => {
    function handleOpenRequest(e: Event) {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      setOpen(true);
      if (detail?.message) setInput(detail.message);
    }
    window.addEventListener("fikria:open-receptionist", handleOpenRequest);
    return () => window.removeEventListener("fikria:open-receptionist", handleOpenRequest);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setSending(true);
    setInput("");
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed, created_at: new Date().toISOString() } as ChatMessage,
    ]);

    try {
      await ensurePatientSession();

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: trimmed }),
      });

      if (!res.ok || !res.body) throw new Error("Request failed");

      const newConvId = res.headers.get("X-Conversation-Id");
      if (newConvId) setConversationId(newConvId);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      const assistantId = crypto.randomUUID();

      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", created_at: new Date().toISOString() } as ChatMessage,
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantText += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: assistantText } : m))
        );
      }

      if (voiceOn && assistantText) speak(assistantText);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I'm having trouble responding right now. Please try again in a moment, or call the clinic directly.",
          created_at: new Date().toISOString(),
        } as ChatMessage,
      ]);
    } finally {
      setSending(false);
    }
  }

  function toggleMic() {
    if (listening) {
      stopListenRef.current?.stop();
      setListening(false);
      return;
    }
    const handle = startListening(
      (transcript, isFinal) => {
        setInput(transcript);
        if (isFinal) {
          setListening(false);
          sendMessage(transcript);
        }
      },
      () => setListening(false)
    );
    if (handle) {
      stopListenRef.current = handle;
      setListening(true);
    }
  }

  function toggleVoiceOutput() {
    if (voiceOn) stopSpeaking();
    setVoiceOn((v) => !v);
  }

  return (
    <>
      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Chat with our AI receptionist"}
        className="fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] shadow-lg shadow-[var(--primary)]/30 transition-transform hover:scale-105 active:scale-95"
      >
        {open ? <X size={26} /> : <MessageCircle size={26} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="AI Receptionist chat"
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--card)]/95 shadow-2xl backdrop-blur-md"
          >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--primary)] px-4 py-3 text-[var(--primary-foreground)]">
            <div>
              <p className="font-display text-base">Fikria Dental Receptionist</p>
              <p className="text-xs opacity-80">Usually replies instantly</p>
            </div>
            {voiceSupported && (
              <button
                onClick={toggleVoiceOutput}
                aria-label={voiceOn ? "Turn off spoken replies" : "Turn on spoken replies"}
                className="rounded-full p-2 hover:bg-white/10"
              >
                {voiceOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" role="log" aria-live="polite" aria-label="Conversation with the AI receptionist">
            {messages.length === 0 && (
              <div className="rounded-xl rounded-bl-sm bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)]">
                {GREETING}
              </div>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "ml-auto rounded-br-sm bg-[var(--secondary)] text-white"
                    : "rounded-bl-sm bg-[var(--background)] text-[var(--foreground)]"
                }`}
              >
                {m.content || (
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)] [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--muted)]" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="px-4 pb-1">
            <SmileArc className="opacity-40" />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(input);
            }}
            className="flex items-center gap-2 border-t border-[var(--border)] p-3"
          >
            {voiceSupported && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? "Stop listening" : "Speak your message"}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                  listening ? "bg-[var(--danger)] text-white" : "bg-[var(--background)] text-[var(--muted)]"
                }`}
              >
                {listening ? <Square size={15} /> : <Mic size={16} />}
              </button>
            )}
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              aria-label="Type your message to the receptionist"
              className="flex-1 rounded-full border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm outline-none focus:border-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)] disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
