create or replace function public.create_demo_order(p_items jsonb, p_contact jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_line_count integer;
  v_valid_line_count integer;
  v_duplicate_line_count integer;
  v_total numeric(10, 3);
  v_order_id uuid;
  v_order_number text;
  v_name text;
  v_email text;
  v_phone text;
  v_fulfillment text;
  v_address text;
  v_note text;
  v_has_physical boolean;
  v_created_at timestamptz;
  v_items jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if coalesce(jsonb_typeof(p_items), 'null') <> 'array'
     or jsonb_array_length(p_items) < 1
     or jsonb_array_length(p_items) > 40 then
    raise exception 'Select at least one item to continue';
  end if;

  select count(*) into v_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer);
  select count(*) into v_valid_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id and variant.available;
  select count(*) - count(distinct requested.variant_id) into v_duplicate_line_count
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer);

  if v_line_count <> v_valid_line_count or v_duplicate_line_count > 0 then
    raise exception 'One or more selected options are unavailable';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer)
    where requested.quantity is null or requested.quantity < 1 or requested.quantity > 12
  ) then
    raise exception 'Cart quantities must be between 1 and 12';
  end if;

  select
    sum(variant.price_kwd * requested.quantity)::numeric(10, 3),
    bool_or(variant.media_type = 'physical')
  into v_total, v_has_physical
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id and variant.available;

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

  v_order_id := gen_random_uuid();
  v_order_number := 'RR-' || to_char(now(), 'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.orders(
    id, user_id, order_number, total_kwd, order_status,
    contact_name, contact_email, contact_phone, fulfillment_method,
    delivery_address, order_note
  )
  values (
    v_order_id, v_user_id, v_order_number, v_total, 'demo_confirmed',
    v_name, v_email, v_phone, v_fulfillment,
    case when v_fulfillment = 'Delivery' then nullif(v_address, '') else null end,
    nullif(v_note, '')
  )
  returning created_at into v_created_at;

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
    variant.price_kwd,
    variant.media_type,
    variant.transaction_type,
    variant.format,
    variant.platform,
    variant.rental_duration_days
  from jsonb_to_recordset(p_items) as requested(variant_id text, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id and variant.available
  join public.products as product on product.id = variant.product_id;

  delete from public.cart_items where user_id = v_user_id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', item.id,
    'order_id', item.order_id,
    'product_id', item.product_id,
    'variant_id', item.variant_id,
    'product_title', item.product_title,
    'poster_url', item.poster_url,
    'quantity', item.quantity,
    'unit_price_kwd', item.unit_price_kwd,
    'media_type', item.media_type,
    'transaction_type', item.transaction_type,
    'selected_format', item.selected_format,
    'selected_platform', item.selected_platform,
    'rental_duration_days', item.rental_duration_days
  ) order by item.product_title, item.id), '[]'::jsonb)
  into v_items
  from public.order_items as item
  where item.order_id = v_order_id;

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_kwd', v_total,
    'order_status', 'demo_confirmed',
    'contact_name', v_name,
    'fulfillment_method', v_fulfillment,
    'created_at', v_created_at,
    'items', v_items
  );
end;
$$;
