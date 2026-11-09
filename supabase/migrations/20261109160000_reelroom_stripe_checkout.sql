alter table public.orders
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists checkout_mode text not null default 'demo',
  add column if not exists paid_at timestamptz;

alter table public.orders drop constraint if exists orders_order_status_check;
alter table public.orders
  add constraint orders_order_status_check
  check (order_status in ('demo_confirmed', 'pending_payment', 'paid', 'payment_failed', 'cancelled'));

alter table public.orders drop constraint if exists orders_checkout_mode_check;
alter table public.orders
  add constraint orders_checkout_mode_check
  check (checkout_mode in ('demo', 'test', 'live'));

create unique index if not exists orders_stripe_checkout_session_uidx
  on public.orders(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists orders_user_status_created_idx
  on public.orders(user_id, order_status, created_at desc);

create or replace function public.create_pending_stripe_order(
  p_user_id uuid,
  p_items jsonb,
  p_contact jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_line_count integer;
  v_valid_line_count integer;
  v_duplicate_line_count integer;
  v_total numeric(10, 3);
  v_order_id uuid := gen_random_uuid();
  v_order_number text := 'RR-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  v_name text;
  v_email text;
  v_phone text;
  v_fulfillment text;
  v_address text;
  v_note text;
  v_has_physical boolean;
  v_created_at timestamptz := now();
begin
  if p_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 40 then
    raise exception 'Select at least one item to continue';
  end if;

  select count(*) into v_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer, unit_price_kwd numeric);

  select count(*) into v_valid_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer, unit_price_kwd numeric)
  join public.product_variants as variant
    on variant.id = requested.variant_id
   and variant.available
  where requested.quantity between 1 and 12
    and requested.unit_price_kwd > 0;

  select count(*) - count(distinct requested.variant_id) into v_duplicate_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer, unit_price_kwd numeric);

  if v_line_count <> v_valid_line_count or v_duplicate_line_count > 0 then
    raise exception 'One or more selected options are unavailable';
  end if;

  select
    sum(requested.unit_price_kwd * requested.quantity)::numeric(10, 3),
    bool_or(variant.media_type = 'physical')
  into v_total, v_has_physical
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer, unit_price_kwd numeric)
  join public.product_variants as variant
    on variant.id = requested.variant_id
   and variant.available;

  v_name := left(trim(coalesce(p_contact ->> 'name', '')), 120);
  v_email := left(trim(coalesce(p_contact ->> 'email', '')), 254);
  v_phone := left(trim(coalesce(p_contact ->> 'phone', '')), 40);
  v_fulfillment := case
    when not v_has_physical then 'Digital platform preference'
    when p_contact ->> 'fulfillment' in ('Delivery', 'Pickup') then p_contact ->> 'fulfillment'
    else 'Delivery'
  end;
  v_address := left(trim(coalesce(p_contact ->> 'address', '')), 500);
  v_note := left(trim(coalesce(p_contact ->> 'note', '')), 1000);

  if length(v_name) < 2 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_phone) < 5 then
    raise exception 'Contact details are incomplete';
  end if;
  if v_has_physical and v_fulfillment = 'Delivery' and length(v_address) < 8 then
    raise exception 'A delivery address is required';
  end if;

  insert into public.orders(
    id, user_id, order_number, total_kwd, order_status, checkout_mode,
    contact_name, contact_email, contact_phone, fulfillment_method,
    delivery_address, order_note, created_at
  )
  values (
    v_order_id, p_user_id, v_order_number, v_total, 'pending_payment', 'test',
    v_name, v_email, v_phone, v_fulfillment,
    case when v_fulfillment = 'Delivery' then nullif(v_address, '') else null end,
    nullif(v_note, ''), v_created_at
  );

  insert into public.order_items(
    order_id, product_id, variant_id, product_title, poster_url,
    quantity, unit_price_kwd, media_type, transaction_type,
    selected_format, selected_platform, rental_duration_days
  )
  select
    v_order_id,
    product.id,
    variant.id,
    product.title,
    product.poster_url,
    requested.quantity,
    requested.unit_price_kwd,
    variant.media_type,
    variant.transaction_type,
    variant.format,
    variant.platform,
    variant.rental_duration_days
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer, unit_price_kwd numeric)
  join public.product_variants as variant
    on variant.id = requested.variant_id
   and variant.available
  join public.products as product on product.id = variant.product_id;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_kwd', v_total,
    'order_status', 'pending_payment',
    'checkout_mode', 'test',
    'created_at', v_created_at
  );
end;
$$;

revoke all on function public.create_pending_stripe_order(uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_pending_stripe_order(uuid, jsonb, jsonb) to service_role;
