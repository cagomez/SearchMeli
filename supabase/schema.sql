-- Script SQL para Supabase (Database Setup para SearchMeli)
-- Ejecutar este script en Supabase SQL Editor

-- 1. Tabla de Perfiles de Usuario (vinculado a auth.users)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Habilitar RLS
alter table public.profiles enable row level security;

create policy "Users can view own profile" 
  on public.profiles for select 
  using (auth.uid() = id);

create policy "Users can update own profile" 
  on public.profiles for update 
  using (auth.uid() = id);

-- 2. Tabla de Historial de Búsquedas Visuales
create table if not exists public.searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  image_url text,
  detected_product_title text not null,
  detected_category text,
  detected_brand text,
  site_id text not null default 'MCO', -- MCO: Colombia, MLM: México, MLA: Argentina, etc.
  results_count int default 0,
  min_price numeric,
  avg_price numeric,
  max_price numeric,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.searches enable row level security;

create policy "Users can view own searches" 
  on public.searches for select 
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert searches" 
  on public.searches for insert 
  with check (auth.uid() = user_id or user_id is null);

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

create policy "Users can view own saved products" 
  on public.saved_products for select 
  using (auth.uid() = user_id);

create policy "Users can insert own saved products" 
  on public.saved_products for insert 
  with check (auth.uid() = user_id);

create policy "Users can delete own saved products" 
  on public.saved_products for delete 
  using (auth.uid() = user_id);

-- Trigger para crear perfil automáticamente al registrar usuario
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
