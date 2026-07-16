-- Fikria AI Consultant — Supabase schema
-- Run this once in the Supabase SQL Editor after creating your project.

-- Profiles (extends Supabase auth.users with app-specific fields)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  company text,
  industry text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Conversations
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Long-term memory facts
create table if not exists memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  memory_key text not null,
  memory_value text not null,
  confidence numeric default 0.5,
  updated_at timestamptz default now(),
  unique (user_id, memory_key)
);

-- Leads
create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  email text,
  company text,
  interested_service text,
  budget text,
  timeline text,
  notes text,
  status text not null default 'new' check (status in ('new', 'contacted', 'proposal_sent', 'closed')),
  created_at timestamptz default now()
);

-- Indexes
create index if not exists idx_conversations_user on conversations(user_id);
create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_memory_user on memory(user_id);

-- Row Level Security: each user can only access their own rows
alter table profiles enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;
alter table memory enable row level security;
alter table leads enable row level security;

create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

create policy "Users can manage own conversations" on conversations for all using (auth.uid() = user_id);

create policy "Users can manage own messages" on messages for all using (
  exists (select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid())
);

create policy "Users can manage own memory" on memory for all using (auth.uid() = user_id);

create policy "Users can manage own leads" on leads for all using (auth.uid() = user_id);

-- Auto-create a profile row when a new user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.raw_user_meta_data->>'name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
