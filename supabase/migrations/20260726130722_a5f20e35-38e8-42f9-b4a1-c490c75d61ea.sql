
create table public.companies (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.companies to authenticated;
grant all on public.companies to service_role;
alter table public.companies enable row level security;
create policy "Users can manage their own company" on public.companies for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.customers (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "Users can manage their own customers" on public.customers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.invoices (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.invoices to authenticated;
grant all on public.invoices to service_role;
alter table public.invoices enable row level security;
create policy "Users can manage their own invoices" on public.invoices for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.quotes (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.quotes to authenticated;
grant all on public.quotes to service_role;
alter table public.quotes enable row level security;
create policy "Users can manage their own quotes" on public.quotes for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.expenses (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.expenses to authenticated;
grant all on public.expenses to service_role;
alter table public.expenses enable row level security;
create policy "Users can manage their own expenses" on public.expenses for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.items (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "Users can manage their own items" on public.items for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;
create policy "Users can manage their own projects" on public.projects for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.settings to authenticated;
grant all on public.settings to service_role;
alter table public.settings enable row level security;
create policy "Users can manage their own settings" on public.settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "Users can insert their own receipts" on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can select their own receipts" on storage.objects for select to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can update their own receipts" on storage.objects for update to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text) with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users can delete their own receipts" on storage.objects for delete to authenticated using (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
