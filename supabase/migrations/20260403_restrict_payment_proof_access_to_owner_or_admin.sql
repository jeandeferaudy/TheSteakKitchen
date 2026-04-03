create or replace function public.tp_can_access_payment_proof_object(object_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      auth.uid() is not null
      and split_part(coalesce(object_name, ''), '/', 1) = 'u-' || auth.uid()::text
    )
    or (
      public.tp_request_session_id() is not null
      and split_part(coalesce(object_name, ''), '/', 1) = 'anon-' || public.tp_request_session_id()
    )
    or coalesce(public.tp_is_admin(), false);
$$;

revoke all on function public.tp_can_access_payment_proof_object(text) from public;
grant execute on function public.tp_can_access_payment_proof_object(text) to public;

drop policy if exists "public can upload payment proofs" on storage.objects;
drop policy if exists "public can update payment proofs" on storage.objects;
drop policy if exists "public can read payment proofs metadata" on storage.objects;
drop policy if exists "owners and admins can manage payment proofs" on storage.objects;
drop policy if exists "owners and admins can update payment proofs" on storage.objects;
drop policy if exists "owners and admins can read payment proofs" on storage.objects;
drop policy if exists "owners and admins can delete payment proofs" on storage.objects;

create policy "owners and admins can manage payment proofs"
on storage.objects
for insert
to public
with check (
  bucket_id in ('payment-proofs', 'payment_proofs')
  and public.tp_can_access_payment_proof_object(name)
);

create policy "owners and admins can update payment proofs"
on storage.objects
for update
to public
using (
  bucket_id in ('payment-proofs', 'payment_proofs')
  and public.tp_can_access_payment_proof_object(name)
)
with check (
  bucket_id in ('payment-proofs', 'payment_proofs')
  and public.tp_can_access_payment_proof_object(name)
);

create policy "owners and admins can read payment proofs"
on storage.objects
for select
to public
using (
  bucket_id in ('payment-proofs', 'payment_proofs')
  and public.tp_can_access_payment_proof_object(name)
);

create policy "owners and admins can delete payment proofs"
on storage.objects
for delete
to public
using (
  bucket_id in ('payment-proofs', 'payment_proofs')
  and public.tp_can_access_payment_proof_object(name)
);
