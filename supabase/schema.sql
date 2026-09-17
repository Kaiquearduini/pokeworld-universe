-- =====================================================================
-- POKEWORLD UNIVERSE — schema do CMS (Supabase)
-- Rode no SQL Editor do projeto. Depois rode seed.sql para os dados iniciais.
-- =====================================================================

-- ---------- perfis + papel de admin ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

-- ---------- conteúdo ----------
create table if not exists public.news (
  slug text primary key,
  title text not null,
  tag text not null default 'Novidade',
  date date not null default current_date,
  image text,
  excerpt text,
  body jsonb not null default '[]'::jsonb,
  featured boolean not null default false,
  hidden boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.pokemon (
  id text primary key,
  name text not null,
  role text not null default 'atacante',
  range text not null default 'ranged',
  difficulty int not null default 3,
  image text,
  description text,
  stats jsonb not null default '{}'::jsonb,
  hidden boolean not null default false,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.site_texts (
  key text primary key,
  value text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- RLS ----------
alter table public.profiles   enable row level security;
alter table public.news       enable row level security;
alter table public.pokemon    enable row level security;
alter table public.site_texts enable row level security;

drop policy if exists "perfil: ler o próprio" on public.profiles;
create policy "perfil: ler o próprio" on public.profiles for select using (id = auth.uid() or public.is_admin());

drop policy if exists "news: leitura pública" on public.news;
create policy "news: leitura pública" on public.news for select using (hidden = false or public.is_admin());
drop policy if exists "news: admin escreve" on public.news;
create policy "news: admin escreve" on public.news for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "pokemon: leitura pública" on public.pokemon;
create policy "pokemon: leitura pública" on public.pokemon for select using (hidden = false or public.is_admin());
drop policy if exists "pokemon: admin escreve" on public.pokemon;
create policy "pokemon: admin escreve" on public.pokemon for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists "textos: leitura pública" on public.site_texts;
create policy "textos: leitura pública" on public.site_texts for select using (true);
drop policy if exists "textos: admin escreve" on public.site_texts;
create policy "textos: admin escreve" on public.site_texts for all using (public.is_admin()) with check (public.is_admin());

-- ---------- storage para imagens do painel ----------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media: leitura pública" on storage.objects;
create policy "media: leitura pública" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media: admin envia" on storage.objects;
create policy "media: admin envia" on storage.objects for insert with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media: admin apaga" on storage.objects;
create policy "media: admin apaga" on storage.objects for delete using (bucket_id = 'media' and public.is_admin());

-- ---------- como tornar alguém admin ----------
-- 1) a pessoa cria a conta pelo site (Iniciar sessão > Criar conta)
-- 2) rode:  update public.profiles set is_admin = true where email = 'seu@email.com';
