create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id),
  amount_cents integer not null
);

alter table public.invoices enable row level security;

create policy "owner reads own invoices"
  on public.invoices for select
  to authenticated
  using ((select auth.uid()) = owner_id);

create policy "owner writes own invoices"
  on public.invoices for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

grant select, insert, update on public.invoices to authenticated;
