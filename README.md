# Fikria AI Consultant

An AI-powered business consultant chatbot for **Fikria**, an AI-first Digital
Innovation Agency. It behaves like a real consultant — it listens, asks
follow-up questions, recommends Fikria services that actually fit, and
remembers key facts about each visitor across sessions.

Built lean, on purpose: one Next.js app, no separate backend. Supabase
handles auth + database, and a single API route talks to Gemini.

## Stack

- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind CSS** (hand-written UI primitives, no component library dependency)
- **Supabase** — Postgres database + Authentication
- **Google Gemini API** — conversational AI, called only from a server-side route handler

## Features

- Landing page, Login & Signup (Supabase Auth)
- Streaming AI chat with suggested prompts
- Persistent chat history (multiple conversations, resumable)
- Long-term memory — the assistant extracts and remembers durable facts
  (industry, budget, goals, etc.) and uses them to personalize future replies
- Profile page (edit details, view saved memory)
- Settings page (light/dark mode, clear history, delete account)
- Fully responsive, light/dark theming

## Project Structure

```
app/
  page.tsx                  # Landing page
  (auth)/login/page.tsx
  (auth)/signup/page.tsx
  chat/page.tsx              # Server component: loads conversations
  chat/ChatShell.tsx         # Client component: sidebar + active chat state
  profile/page.tsx
  profile/ProfileForm.tsx
  settings/page.tsx
  api/chat/route.ts          # Streams Gemini replies, saves messages, updates memory
  api/account/route.ts       # Account deletion (service-role key, server-only)
components/
  chat/                      # Sidebar, ChatWindow, MessageBubble, ChatInput
  ui/                        # Button, Card, Input primitives
  ThemeToggle.tsx
lib/
  supabase/client.ts         # Browser Supabase client
  supabase/server.ts         # Server Supabase client
  gemini.ts                  # Prompt building + Gemini calls + memory extraction
  memory.ts                  # Read/write long-term memory facts
  utils.ts
knowledge/
  company.json, services.json, faq.json   # Swap these to re-skin for another client
supabase/
  schema.sql                 # Run once in the Supabase SQL editor
types/index.ts
middleware.ts                 # Protects /chat, /profile, /settings
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Create a Supabase project** at [supabase.com](https://supabase.com), then run
   `supabase/schema.sql` in the SQL Editor (Project → SQL Editor → New query).

3. **Get a Gemini API key** at [aistudio.google.com/apikey](https://aistudio.google.com/apikey).

4. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Project Settings → API
   - `SUPABASE_SERVICE_ROLE_KEY` — same page (used only server-side, for account deletion)
   - `GEMINI_API_KEY` — from AI Studio

5. **Run locally**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000`.

## Deployment

- Push to GitHub, import into **Vercel**.
- Add the same environment variables in Vercel's Project Settings.
- Supabase is already hosted — no separate deployment needed.

## Notes

- The knowledge base (`knowledge/*.json`) is deliberately separate from
  application logic — swap these three files and the branding in
  `app/globals.css` to reuse this app for a different client.
- Gemini is called only from `app/api/chat/route.ts` (a server route handler),
  so the API key is never exposed to the browser.
- A benign build warning may appear referencing `@supabase/supabase-js` and
  the Edge Runtime — it does not affect functionality; the middleware runs on
  the default Node.js runtime.
