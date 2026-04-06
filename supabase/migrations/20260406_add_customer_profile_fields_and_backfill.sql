alter table if exists public.customers
add column if not exists attention_to text;

alter table if exists public.customers
add column if not exists address_line1 text;

alter table if exists public.customers
add column if not exists address_line2 text;

alter table if exists public.customers
add column if not exists barangay text;

alter table if exists public.customers
add column if not exists city text;

alter table if exists public.customers
add column if not exists province text;

alter table if exists public.customers
add column if not exists postal_code text;

alter table if exists public.customers
add column if not exists country text;

alter table if exists public.customers
add column if not exists delivery_note text;

update public.customers
set country = 'Philippines'
where nullif(trim(coalesce(country, '')), '') is null;

update public.customers c
set
  attention_to = coalesce(nullif(trim(c.attention_to), ''), nullif(trim(p.attention_to), '')),
  address_line1 = coalesce(nullif(trim(c.address_line1), ''), nullif(trim(p.address_line1), '')),
  address_line2 = coalesce(nullif(trim(c.address_line2), ''), nullif(trim(p.address_line2), '')),
  barangay = coalesce(nullif(trim(c.barangay), ''), nullif(trim(p.barangay), '')),
  city = coalesce(nullif(trim(c.city), ''), nullif(trim(p.city), '')),
  province = coalesce(nullif(trim(c.province), ''), nullif(trim(p.province), '')),
  postal_code = coalesce(nullif(trim(c.postal_code), ''), nullif(trim(p.postal_code), '')),
  country = coalesce(nullif(trim(c.country), ''), nullif(trim(p.country), ''), 'Philippines'),
  delivery_note = coalesce(nullif(trim(c.delivery_note), ''), nullif(trim(p.delivery_note), '')),
  address = coalesce(
    nullif(trim(c.address), ''),
    nullif(
      concat_ws(
        ', ',
        nullif(trim(p.attention_to), ''),
        nullif(trim(p.address_line1), ''),
        nullif(trim(p.address_line2), ''),
        nullif(trim(p.barangay), ''),
        nullif(trim(p.city), ''),
        nullif(trim(p.province), ''),
        nullif(trim(p.postal_code), ''),
        nullif(trim(p.country), '')
      ),
      ''
    ),
    c.address
  ),
  notes = coalesce(c.notes, p.delivery_note)
from public.profiles p
where p.customer_id = c.id;

with latest_order as (
  select distinct on (o.customer_id)
    o.customer_id,
    nullif(trim(o.full_name), '') as full_name,
    nullif(trim(o.email), '') as email,
    nullif(trim(o.phone), '') as phone,
    nullif(trim(o.address), '') as address,
    nullif(trim(o.postal_code), '') as postal_code,
    nullif(trim(o.notes), '') as notes,
    o.created_at
  from public.orders o
  where o.customer_id is not null
  order by o.customer_id, o.created_at desc
)
update public.customers c
set
  full_name = coalesce(nullif(trim(c.full_name), ''), lo.full_name, c.full_name),
  email = coalesce(nullif(trim(c.email), ''), lo.email, c.email),
  phone = coalesce(nullif(trim(c.phone), ''), lo.phone, c.phone),
  address = coalesce(nullif(trim(c.address), ''), lo.address, c.address),
  address_line1 = coalesce(nullif(trim(c.address_line1), ''), lo.address, c.address_line1),
  postal_code = coalesce(nullif(trim(c.postal_code), ''), lo.postal_code, c.postal_code),
  delivery_note = coalesce(nullif(trim(c.delivery_note), ''), lo.notes, c.delivery_note),
  notes = coalesce(c.notes, lo.notes)
from latest_order lo
where lo.customer_id = c.id;
