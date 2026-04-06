alter table if exists public.ui_branding
add column if not exists offer_steak_credits_to_guests boolean not null default false;

alter table if exists public.ui_branding
add column if not exists auto_activate_steak_credits_for_new_accounts boolean not null default false;

insert into public.ui_branding (id)
values (1)
on conflict (id) do nothing;
