create or replace function public.tp_generate_customer_referral_code(p_customer_id uuid)
returns text
language sql
immutable
as $$
  select
    case
      when p_customer_id is null then null
      else 'TSK-' || upper(right(replace(p_customer_id::text, '-', ''), 8))
    end;
$$;

alter table if exists public.customers
add column if not exists referral_code text;

update public.customers
set referral_code = public.tp_generate_customer_referral_code(id)
where coalesce(trim(referral_code), '') = '';

create or replace function public.tp_customers_set_referral_code_trg()
returns trigger
language plpgsql
as $$
begin
  if coalesce(trim(new.referral_code), '') = '' then
    new.referral_code := public.tp_generate_customer_referral_code(new.id);
  else
    new.referral_code := upper(trim(new.referral_code));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_customers_set_referral_code on public.customers;
create trigger trg_customers_set_referral_code
before insert or update of referral_code on public.customers
for each row
execute function public.tp_customers_set_referral_code_trg();

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'customers_referral_code_key'
      and conrelid = 'public.customers'::regclass
  ) then
    alter table public.customers
    add constraint customers_referral_code_key unique (referral_code);
  end if;
end
$$;

alter table if exists public.orders
add column if not exists referral_code text;

alter table if exists public.orders
add column if not exists referrer_customer_id uuid references public.customers(id) on delete set null;

alter table if exists public.orders
add column if not exists referral_discount_amount numeric(12,2) not null default 0;

alter table if exists public.orders
add column if not exists referral_reward_credits numeric(12,0) not null default 0;

alter table if exists public.orders
add column if not exists referral_credits_granted boolean not null default false;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_referral_discount_amount_nonnegative'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_referral_discount_amount_nonnegative
    check (referral_discount_amount >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'orders_referral_reward_credits_nonnegative'
      and conrelid = 'public.orders'::regclass
  ) then
    alter table public.orders
    add constraint orders_referral_reward_credits_nonnegative
    check (referral_reward_credits >= 0);
  end if;
end
$$;

create or replace function public.tp_orders_grant_referral_credits_trg()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if pg_trigger_depth() > 1 then
    return new;
  end if;

  if coalesce(new.referral_credits_granted, false) then
    return new;
  end if;

  if new.referrer_customer_id is null then
    return new;
  end if;

  if lower(coalesce(new.paid_status, '')) <> 'paid' then
    return new;
  end if;

  if greatest(coalesce(new.referral_reward_credits, 0), 0) > 0 then
    update public.customers
    set available_steak_credits =
      coalesce(available_steak_credits, 0) + greatest(coalesce(new.referral_reward_credits, 0), 0)
    where id = new.referrer_customer_id
      and coalesce(steak_credits_enabled, false) = true;
  end if;

  update public.orders
  set referral_credits_granted = true
  where id = new.id
    and coalesce(referral_credits_granted, false) = false;

  return new;
end;
$$;

drop trigger if exists trg_orders_grant_referral_credits on public.orders;
create trigger trg_orders_grant_referral_credits
after insert or update of paid_status, referrer_customer_id, referral_reward_credits, referral_credits_granted
on public.orders
for each row
execute function public.tp_orders_grant_referral_credits_trg();
