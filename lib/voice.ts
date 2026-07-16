"use client";

/**
 * Modular voice layer for the AI Receptionist widget.
 *
 * Uses the browser's built-in Web Speech API (SpeechRecognition for STT,
 * speechSynthesis for TTS) so voice works with zero external dependencies
 * or API keys. Kept as an isolated module so a cloud provider (e.g. Gemini
 * audio, ElevenLabs, Google Cloud Speech) can be swapped in later behind
 * the same start/stop/speak interface without touching the widget UI.
 */

interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  results: SpeechRecognitionResultLike[] & { length: number };
}
interface SpeechRecognitionErrorEventLike {
  error: string;
}
interface SpeechRecognitionLike {
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  continuous: boolean;
  interimResults: boolean;
  lang: string;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isVoiceSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getSpeechRecognitionCtor()) && Boolean(window.speechSynthesis);
}

export function startListening(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (message: string) => void
): { stop: () => void } | null {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    onError("Voice input isn't supported in this browser. Try Chrome or Edge, or type your message instead.");
    return null;
  }

  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event) => {
    const result = event.results[event.results.length - 1];
    onResult(result[0].transcript, result.isFinal);
  };
  recognition.onerror = (event) => {
    onError(event.error === "not-allowed" ? "Microphone access was denied." : "Voice input failed. Please try again.");
  };

  recognition.start();
  return { stop: () => recognition.stop() };
}

export function speak(text: string, onEnd?: () => void) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel(); // stop any prior utterance
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1;
  utterance.pitch = 1;
  utterance.onend = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}

export function isSpeaking(): boolean {
  return typeof window !== "undefined" && window.speechSynthesis?.speaking;
}
