revoke all on function public.handle_reelroom_new_user() from public, anon, authenticated;
revoke all on function public.set_reelroom_updated_at() from public, anon, authenticated;

create policy "Migration ledger is internal only" on public.local_data_migrations
for all to authenticated using (false) with check (false);

comment on function public.merge_browser_data(uuid, text[], jsonb)
is 'Authenticated-only migration RPC. Derives the owner from auth.uid() and merges one browser device once.';

comment on function public.create_demo_order(jsonb, jsonb)
is 'Authenticated-only demo checkout RPC. Derives the owner from auth.uid() and snapshots prices from product_variants.';
