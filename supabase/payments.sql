-- =====================================================================
-- POKEWORLD UNIVERSE — pagamentos (Mercado Pago, API de Orders)
-- Rode no SQL Editor do Supabase depois de schema.sql.
-- =====================================================================

-- Pedidos (igual ao schema do pacote pwu-mercadopago)
create table if not exists public.orders (
  id              bigserial primary key,
  user_id         text        not null,            -- auth.users.id
  package_id      text        not null,            -- chave em api/_lib/packages.js
  amount          numeric(10,2) not null,          -- em reais
  coins           integer     not null,            -- já com o bônus embutido
  status          text        not null default 'pending', -- pending | paid | failed | canceled | refunded
  mp_order_id     text unique,                     -- ORD01...
  mp_payment_id   text,                            -- PAY01...
  created_at      timestamptz not null default now(),
  paid_at         timestamptz
);
create index if not exists orders_user_idx     on public.orders (user_id);
create index if not exists orders_mp_order_idx on public.orders (mp_order_id);

-- Log cru de tudo que o Mercado Pago mandou (auditoria)
create table if not exists public.mp_webhook_events (
  id           bigserial primary key,
  mp_order_id  text,
  action       text,
  payload      jsonb       not null,
  received_at  timestamptz not null default now()
);

-- Saldo de coins por jogador
create table if not exists public.wallets (
  user_id    text primary key,
  coins      integer not null default 0 check (coins >= 0),
  updated_at timestamptz not null default now()
);

-- Marca como pago e credita, NA MESMA TRANSAÇÃO. Idempotente:
-- o UPDATE só pega pedidos 'pending'; se não afetar linha, já foi creditado.
create or replace function public.pwu_mark_paid_and_credit(p_order_id bigint, p_mp_payment_id text)
returns boolean language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders
     set status = 'paid', paid_at = now(), mp_payment_id = p_mp_payment_id
   where id = p_order_id and status = 'pending'
  returning * into o;
  if not found then return false; end if;

  insert into public.wallets (user_id, coins) values (o.user_id, o.coins)
  on conflict (user_id) do update set coins = public.wallets.coins + excluded.coins, updated_at = now();
  return true;
end $$;

revoke all on function public.pwu_mark_paid_and_credit(bigint, text) from public, anon, authenticated;
grant execute on function public.pwu_mark_paid_and_credit(bigint, text) to service_role;

-- RLS: o jogador só LÊ o que é dele. Escrita é só do servidor (service_role ignora RLS).
alter table public.orders            enable row level security;
alter table public.wallets           enable row level security;
alter table public.mp_webhook_events enable row level security;

drop policy if exists "orders: ler os próprios" on public.orders;
create policy "orders: ler os próprios" on public.orders for select using (user_id = auth.uid()::text);
drop policy if exists "wallets: ler a própria" on public.wallets;
create policy "wallets: ler a própria" on public.wallets for select using (user_id = auth.uid()::text);
-- mp_webhook_events: sem policy = ninguém lê pelo cliente.
