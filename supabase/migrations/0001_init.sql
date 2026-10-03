-- ============================================================
-- Plickify Tools — initial schema (run in Supabase SQL Editor)
-- Tables: profiles, products, orders, licenses, license_devices,
--         site_settings + RLS, triggers, storage for tool files.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- profiles (1:1 with auth.users, created by trigger)
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  full_name  text,
  avatar_url text,
  role       text not null default 'user' check (role in ('user', 'staff', 'admin')),
  created_at timestamptz not null default now()
);

-- Admin check as SECURITY DEFINER so policies can read profiles
-- without tripping RLS recursion.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- Auto-create a profile whenever someone signs in (Google OAuth).
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- products (the tools/extensions sold on the store)
-- ------------------------------------------------------------
create table if not exists public.products (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  slug           text not null unique,
  description    text,
  category       text,
  price          numeric(10, 2) not null default 0 check (price >= 0),
  original_price numeric(10, 2),
  version        text,
  file_path      text,           -- object path inside the tool-files bucket
  is_active      boolean not null default true,
  download_count integer not null default 0,
  created_at     timestamptz not null default now()
);

-- ------------------------------------------------------------
-- orders (bKash/Nagad payment + admin verification)
-- ------------------------------------------------------------
create table if not exists public.orders (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  amount     numeric(10, 2) not null check (amount >= 0),
  method     text not null check (method in ('bkash', 'nagad')),
  trx_id     text not null check (length(trx_id) >= 6),
  status     text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on public.orders (user_id, status);
create index if not exists orders_status_idx on public.orders (status);

-- ------------------------------------------------------------
-- licenses + devices (drive the desktop app activation gate)
-- ------------------------------------------------------------
-- Key format: PFT-XXXX-XXXX-XXXX-XXXX (unambiguous alphabet, random).
create or replace function public.generate_license_key()
returns text
language plpgsql
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  group_text text;
  result     text := '';
begin
  for i in 1..4 loop
    group_text := '';
    for j in 1..4 loop
      group_text := group_text || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    result := result || case when i > 1 then '-' else '' end || group_text;
  end loop;
  return 'PFT-' || result;
end;
$$;

create table if not exists public.licenses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  product_id  uuid references public.products (id) on delete set null,
  label       text not null default 'License',
  key         text not null unique default public.generate_license_key(),
  status      text not null default 'active' check (status in ('active', 'revoked')),
  max_devices integer not null default 2 check (max_devices >= 1),
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists licenses_user_idx on public.licenses (user_id);
create index if not exists licenses_key_idx on public.licenses (key);

create table if not exists public.license_devices (
  id            uuid primary key default gen_random_uuid(),
  license_id    uuid not null references public.licenses (id) on delete cascade,
  device_id     text not null,
  first_seen_at timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  revoked       boolean not null default false,
  unique (license_id, device_id)
);

-- ------------------------------------------------------------
-- site_settings (payment numbers, support info, banners)
-- ------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value) values
  ('bkash_number', ''),
  ('nagad_number', ''),
  ('payment_note', 'Send Money (not Payment) to the number above. Approval takes 5–30 minutes.'),
  ('support_email', ''),
  ('support_whatsapp', ''),
  ('announcement', '')
on conflict (key) do nothing;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.products        enable row level security;
alter table public.orders          enable row level security;
alter table public.licenses        enable row level security;
alter table public.license_devices enable row level security;
alter table public.site_settings   enable row level security;

-- profiles: read self / admin; update self (role locked) / admin.
drop policy if exists "read own profile" on public.profiles;
create policy "read own profile" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "admin reads profiles" on public.profiles;
create policy "admin reads profiles" on public.profiles
  for select to authenticated using (public.is_admin());

-- The role check reads the pre-update value from the statement snapshot,
-- so a normal user cannot promote themselves.
drop policy if exists "update own profile" on public.profiles;
create policy "update own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "admin updates profiles" on public.profiles;
create policy "admin updates profiles" on public.profiles
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- products: everyone sees active products; admin manages all.
drop policy if exists "read active products" on public.products;
create policy "read active products" on public.products
  for select using (is_active or public.is_admin());

drop policy if exists "admin manages products" on public.products;
create policy "admin manages products" on public.products
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- orders: buyers insert pending orders at the real price, see their own;
-- admin verifies (approve/reject).
drop policy if exists "read own orders" on public.orders;
create policy "read own orders" on public.orders
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin reads orders" on public.orders;
create policy "admin reads orders" on public.orders
  for select to authenticated using (public.is_admin());

drop policy if exists "insert own pending order" on public.orders;
create policy "insert own pending order" on public.orders
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and status = 'pending'
    and amount = (select p.price from public.products p where p.id = product_id)
    and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

drop policy if exists "admin updates orders" on public.orders;
create policy "admin updates orders" on public.orders
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- licenses: owners read theirs; admin issues/revokes.
drop policy if exists "read own licenses" on public.licenses;
create policy "read own licenses" on public.licenses
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "admin manages licenses" on public.licenses;
create policy "admin manages licenses" on public.licenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- license_devices: owners see their device list; admin revokes seats.
drop policy if exists "read devices of own licenses" on public.license_devices;
create policy "read devices of own licenses" on public.license_devices
  for select to authenticated
  using (exists (
    select 1 from public.licenses l where l.id = license_id and l.user_id = auth.uid()
  ));

drop policy if exists "admin manages devices" on public.license_devices;
create policy "admin manages devices" on public.license_devices
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- site_settings: readable by everyone (store + pre-login pages), admin editable.
drop policy if exists "read settings" on public.site_settings;
create policy "read settings" on public.site_settings for select using (true);

drop policy if exists "admin manages settings" on public.site_settings;
create policy "admin manages settings" on public.site_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ============================================================
-- RPC: download counter (best effort from the dashboard)
-- ============================================================
create or replace function public.increment_download(p_product_id uuid)
returns void
language sql security definer
set search_path = public
as $$
  update public.products set download_count = download_count + 1
  where id = p_product_id
    and (
      public.is_admin()
      or exists (
        select 1 from public.orders o
        where o.product_id = p_product_id
          and o.user_id = auth.uid()
          and o.status = 'approved'
      )
    );
$$;

-- ============================================================
-- Storage: private bucket for the files buyers download
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit)
values ('tool-files', 'tool-files', false, 1073741824)  -- 1 GiB max
on conflict (id) do nothing;

drop policy if exists "admin manages tool files" on storage.objects;
create policy "admin manages tool files" on storage.objects
  for all to authenticated
  using (bucket_id = 'tool-files' and public.is_admin())
  with check (bucket_id = 'tool-files' and public.is_admin());

-- Path convention: <product_id>/<timestamp>-<filename>
drop policy if exists "buyers read tool files" on storage.objects;
create policy "buyers read tool files" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'tool-files'
    and exists (
      select 1 from public.orders o
      where o.status = 'approved'
        and o.user_id = auth.uid()
        and o.product_id::text = (storage.foldername(name))[1]
    )
  );

-- ============================================================
-- DONE. Make yourself admin (replace the email):
--
--   update public.profiles
--   set role = 'admin'
--   where email = 'you@gmail.com';
--
-- Then add your bKash/Nagad numbers in Admin → Settings.
-- ============================================================
