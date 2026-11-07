create table if not exists public.products (
  id text primary key,
  title text not null,
  description text not null default '',
  release_year smallint check (release_year is null or release_year between 1888 and 2100),
  genre text not null default 'Uncategorized',
  genres text[] not null default '{}',
  director text not null default '',
  runtime integer check (runtime is null or runtime between 1 and 1000),
  poster_url text,
  backdrop_url text,
  source_page text,
  palette text[] not null default array['#202629', '#8b9c91']::text[],
  physical_available boolean not null default false,
  digital_available boolean not null default false,
  featured boolean not null default false,
  is_criterion boolean not null default false,
  is_animated boolean not null default false,
  collections text[] not null default '{}',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists products_display_order_idx on public.products(display_order);
create index if not exists products_release_year_idx on public.products(release_year);
create index if not exists products_genres_idx on public.products using gin(genres);
create index if not exists products_collections_idx on public.products using gin(collections);

create table if not exists public.product_variants (
  id text primary key,
  product_id text not null references public.products(id) on delete cascade,
  media_type text not null check (media_type in ('physical', 'digital')),
  transaction_type text not null check (transaction_type in ('buy', 'rent')),
  format text,
  platform text,
  price_kwd numeric(9, 3) not null check (price_kwd > 0),
  price_is_demo boolean not null default true,
  available boolean not null default true,
  stock_quantity integer check (stock_quantity is null or stock_quantity >= 0),
  rental_duration_days integer,
  created_at timestamptz not null default now(),
  constraint product_variant_format_platform_check check (
    (media_type = 'physical' and format in ('DVD', 'Blu-ray', '4K Ultra HD') and platform is null)
    or
    (media_type = 'digital' and format is null and platform in ('Apple TV', 'Amazon Prime Video', 'Google TV', 'YouTube Movies'))
  ),
  constraint product_variant_rental_check check (
    (transaction_type = 'buy' and rental_duration_days is null)
    or
    (transaction_type = 'rent' and rental_duration_days between 1 and 365)
  )
);

create index if not exists product_variants_product_idx on public.product_variants(product_id);
create index if not exists product_variants_available_idx on public.product_variants(available, media_type, transaction_type);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or length(display_name) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_reelroom_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reelroom_profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_reelroom_updated_at();

create or replace function public.handle_reelroom_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger reelroom_on_auth_user_created
after insert on auth.users
for each row execute function public.handle_reelroom_new_user();

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

create index if not exists favorites_user_created_idx on public.favorites(user_id, created_at desc);

create table if not exists public.cart_items (
  user_id uuid not null references auth.users(id) on delete cascade,
  variant_id text not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity between 1 and 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create index if not exists cart_items_user_updated_idx on public.cart_items(user_id, updated_at desc);

create table if not exists public.local_data_migrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid not null,
  migrated_at timestamptz not null default now(),
  primary key (user_id, device_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text not null unique,
  total_kwd numeric(10, 3) not null check (total_kwd > 0),
  order_status text not null default 'demo_confirmed' check (order_status = 'demo_confirmed'),
  contact_name text not null,
  contact_email text not null,
  contact_phone text not null,
  fulfillment_method text not null check (fulfillment_method in ('Delivery', 'Pickup', 'Digital platform preference')),
  delivery_address text,
  order_note text,
  created_at timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders(user_id, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id text references public.products(id) on delete set null,
  variant_id text references public.product_variants(id) on delete set null,
  product_title text not null,
  poster_url text,
  quantity integer not null check (quantity between 1 and 12),
  unit_price_kwd numeric(9, 3) not null check (unit_price_kwd > 0),
  media_type text not null check (media_type in ('physical', 'digital')),
  transaction_type text not null check (transaction_type in ('buy', 'rent')),
  selected_format text,
  selected_platform text,
  rental_duration_days integer,
  created_at timestamptz not null default now(),
  constraint order_item_selection_check check (
    (media_type = 'physical' and selected_format in ('DVD', 'Blu-ray', '4K Ultra HD') and selected_platform is null)
    or
    (media_type = 'digital' and selected_format is null and selected_platform in ('Apple TV', 'Amazon Prime Video', 'Google TV', 'YouTube Movies'))
  )
);

create index if not exists order_items_order_idx on public.order_items(order_id);

create or replace function public.merge_browser_data(
  p_device_id uuid,
  p_favorite_ids text[],
  p_cart_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_migration_created integer;
  v_favorites_added integer := 0;
  v_cart_lines_added integer := 0;
  v_requested_lines integer;
  v_valid_lines integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_device_id is null or jsonb_typeof(coalesce(p_cart_items, '[]'::jsonb)) <> 'array' then
    raise exception 'Invalid browser data';
  end if;

  insert into public.local_data_migrations(user_id, device_id)
  values (v_user_id, p_device_id)
  on conflict (user_id, device_id) do nothing;
  get diagnostics v_migration_created = row_count;
  if v_migration_created = 0 then
    return jsonb_build_object('already_migrated', true, 'favorites_added', 0, 'cart_lines_added', 0);
  end if;

  insert into public.favorites(user_id, product_id)
  select v_user_id, product.id
  from public.products as product
  where product.id = any(coalesce(p_favorite_ids, '{}'::text[]))
  on conflict (user_id, product_id) do nothing;
  get diagnostics v_favorites_added = row_count;

  select count(*) into v_requested_lines
  from jsonb_to_recordset(coalesce(p_cart_items, '[]'::jsonb)) as requested(variant_id text, quantity integer);

  select count(*) into v_valid_lines
  from jsonb_to_recordset(coalesce(p_cart_items, '[]'::jsonb)) as requested(variant_id text, quantity integer)
  join public.product_variants as variant on variant.id = requested.variant_id and variant.available
  where requested.quantity between 1 and 12;

  if v_requested_lines <> v_valid_lines then
    raise exception 'One or more saved cart items are unavailable';
  end if;

  insert into public.cart_items(user_id, variant_id, quantity)
  select v_user_id, requested.variant_id, least(12, sum(requested.quantity))::integer
  from jsonb_to_recordset(coalesce(p_cart_items, '[]'::jsonb)) as requested(variant_id text, quantity integer)
  group by requested.variant_id
  on conflict (user_id, variant_id) do update
    set quantity = least(12, public.cart_items.quantity + excluded.quantity),
        updated_at = now();
  get diagnostics v_cart_lines_added = row_count;

  return jsonb_build_object(
    'already_migrated', false,
    'favorites_added', v_favorites_added,
    'cart_lines_added', v_cart_lines_added
  );
end;
$$;

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
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 40 then
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

  return jsonb_build_object(
    'id', v_order_id,
    'order_number', v_order_number,
    'total_kwd', v_total,
    'order_status', 'demo_confirmed',
    'created_at', now()
  );
end;
$$;

alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.profiles enable row level security;
alter table public.favorites enable row level security;
alter table public.cart_items enable row level security;
alter table public.local_data_migrations enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

grant select on public.products, public.product_variants to anon, authenticated;
grant select on public.profiles to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select, insert, delete on public.favorites to authenticated;
grant select, insert, update(quantity), delete on public.cart_items to authenticated;
grant select on public.orders, public.order_items to authenticated;
revoke all on public.local_data_migrations from anon, authenticated;
revoke all on function public.merge_browser_data(uuid, text[], jsonb) from public, anon, authenticated;
revoke all on function public.create_demo_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.merge_browser_data(uuid, text[], jsonb) to authenticated;
grant execute on function public.create_demo_order(jsonb, jsonb) to authenticated;

create policy "Public can read products" on public.products
for select to anon, authenticated using (true);

create policy "Public can read available variants" on public.product_variants
for select to anon, authenticated using (available);

create policy "Users can read their profile" on public.profiles
for select to authenticated using ((select auth.uid()) = id);

create policy "Users can update their profile" on public.profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "Users can read their favorites" on public.favorites
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can add their favorites" on public.favorites
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can remove their favorites" on public.favorites
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their cart" on public.cart_items
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can add to their cart" on public.cart_items
for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "Users can update their cart" on public.cart_items
for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "Users can remove from their cart" on public.cart_items
for delete to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their orders" on public.orders
for select to authenticated using ((select auth.uid()) = user_id);

create policy "Users can read their order items" on public.order_items
for select to authenticated using (
  exists (
    select 1 from public.orders
    where orders.id = order_items.order_id
      and orders.user_id = (select auth.uid())
  )
);
