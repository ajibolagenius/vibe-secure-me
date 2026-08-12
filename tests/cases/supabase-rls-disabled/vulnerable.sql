create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  amount_cents integer not null
);

grant select, insert, update on public.invoices to authenticated;
