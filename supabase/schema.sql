-- Script SQL para Supabase (Database Setup para SearchMeli con Soporte de Roles y Admin)
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de Perfiles de Usuario
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  role text not null default 'user', -- 'admin' o 'user'
  must_change_password boolean not null default false,
  gemini_api_key text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Si la tabla ya existía, añadir las nuevas columnas de forma segura
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists must_change_password boolean not null default false;
alter table public.profiles add column if not exists gemini_api_key text;

-- Habilitar RLS
alter table public.profiles enable row level security;

-- Políticas de Profiles
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) = 'admin');

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id or (select role from public.profiles where id = auth.uid()) = 'admin');

-- 2. Tabla de Historial de Búsquedas Visuales
create table if not exists public.searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  image_url text,
  detected_product_title text not null,
  detected_category text,
  detected_brand text,
  site_id text not null default 'MCO',
  results_count int default 0,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.searches enable row level security;

drop policy if exists "Users can view own searches" on public.searches;
create policy "Users can view own searches" 
  on public.searches for select 
  using (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can insert searches" on public.searches;
create policy "Users can insert searches" 
  on public.searches for insert 
  with check (auth.uid() = user_id or user_id is null);

drop policy if exists "Users can delete own searches" on public.searches;
create policy "Users can delete own searches" 
  on public.searches for delete 
  using (auth.uid() = user_id);

-- 3. Tabla de Productos Favoritos o Monitoreados
create table if not exists public.saved_products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  meli_id text not null,
  title text not null,
  price numeric not null,
  currency_id text not null,
  permalink text not null,
  thumbnail text,
  seller_name text,
  has_free_shipping boolean default false,
  is_full boolean default false,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.saved_products enable row level security;

drop policy if exists "Users can view own saved products" on public.saved_products;
create policy "Users can view own saved products" 
  on public.saved_products for select 
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own saved products" on public.saved_products;
create policy "Users can insert own saved products" 
  on public.saved_products for insert 
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete own saved products" on public.saved_products;
create policy "Users can delete own saved products" 
  on public.saved_products for delete 
  using (auth.uid() = user_id);

-- 4. Trigger para crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (
    id, 
    email, 
    full_name, 
    role, 
    must_change_password
  )
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role),
    must_change_password = coalesce(excluded.must_change_password, profiles.must_change_password);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
