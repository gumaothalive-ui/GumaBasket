-- ══════════════════════════════════════════════════════════════
-- order_messages: Real-time chat between customer and driver
-- Run this in your Supabase SQL Editor
-- ══════════════════════════════════════════════════════════════

create table if not exists public.order_messages (
  id          uuid primary key default gen_random_uuid(),
  order_ref   text not null,
  sender      text not null check (sender in ('customer', 'driver')),
  text        text not null,
  created_at  timestamptz not null default now()
);

-- Index for fast per-order queries
create index if not exists order_messages_order_ref_idx
  on public.order_messages (order_ref, created_at asc);

-- ── Row Level Security ──
alter table public.order_messages enable row level security;

-- Allow anyone with the anon key to read messages for an order
-- (tighten this in production with auth.uid() checks)
create policy "read_own_order_messages"
  on public.order_messages for select
  using (true);

-- Allow inserts from customer or driver
create policy "insert_order_messages"
  on public.order_messages for insert
  with check (sender in ('customer', 'driver'));

-- ── Enable Realtime ──
-- Supabase Dashboard → Database → Replication → add order_messages
-- OR run:
alter publication supabase_realtime add table public.order_messages;
