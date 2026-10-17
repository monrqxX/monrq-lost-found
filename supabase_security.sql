-- MONRQ security baseline for Supabase Postgres and Storage.
-- The application currently stores its lost/found records in MongoDB; this script
-- does not create a second public.items table. It enables RLS and denies access
-- by default to existing public tables, then adds the requested policies only if
-- public.items has both user_id and visibility columns.
-- Review existing public-schema policies before applying: they are replaced so
-- that older permissive policies cannot override the strict rules below.

begin;

do $$
declare
  table_row record;
  policy_row record;
  has_user_id boolean;
  has_visibility boolean;
  safe_select_columns text;
  column_row record;
begin
  for table_row in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', table_row.tablename);

    for policy_row in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = table_row.tablename
    loop
      execute format('drop policy %I on public.%I', policy_row.policyname, table_row.tablename);
    end loop;
  end loop;

  if to_regclass('public.items') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'user_id'
    ) into has_user_id;
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'visibility'
    ) into has_visibility;

    if has_user_id and has_visibility then
      execute 'revoke all privileges on table public.items from anon, authenticated';
      for column_row in
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'items'
      loop
        execute format('revoke all privileges (%I) on table public.items from anon, authenticated', column_row.column_name);
      end loop;
      execute 'grant insert, update, delete on table public.items to authenticated';

      select string_agg(format('%I', column_name), ', ' order by ordinal_position)
      into safe_select_columns
      from information_schema.columns
      where table_schema = 'public' and table_name = 'items'
        and column_name = any(array[
          'id', 'type', 'category', 'subcategory', 'title', 'brand', 'model', 'color',
          'date_occurred', 'city', 'status', 'visibility', 'created_at', 'updated_at', 'image_count'
        ]);
      if safe_select_columns is not null then
        execute format('grant select (%s) on table public.items to anon, authenticated', safe_select_columns);
      end if;

      execute $policy$
        create policy items_public_select on public.items
        for select to anon, authenticated
        using (visibility = 'PUBLIC' and coalesce(to_jsonb(items)->>'status', 'OPEN') <> 'DELETED')
      $policy$;
      execute $policy$
        create policy items_owner_select on public.items
        for select to authenticated
        using (auth.uid()::text = user_id::text)
      $policy$;
      execute $policy$
        create policy items_authenticated_insert on public.items
        for insert to authenticated
        with check (auth.uid()::text = user_id::text)
      $policy$;
      execute $policy$
        create policy items_owner_update on public.items
        for update to authenticated
        using (auth.uid()::text = user_id::text)
        with check (auth.uid()::text = user_id::text)
      $policy$;
      execute $policy$
        create policy items_owner_delete on public.items
        for delete to authenticated
        using (auth.uid()::text = user_id::text)
      $policy$;
    else
      raise notice 'public.items is missing user_id or visibility; RLS remains enabled with no access policies.';
    end if;
  else
    raise notice 'No public.items table found. MongoDB remains the application data store.';
  end if;
end $$;

-- Item photos are intentionally public once uploaded. Storage records the uploader
-- identity on each object; UUID-only public paths do not expose account IDs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('item-images', 'item-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set name = excluded.name,
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists item_images_owner_select on storage.objects;
drop policy if exists item_images_owner_select_restrict on storage.objects;
drop policy if exists item_images_owner_insert on storage.objects;
drop policy if exists item_images_owner_insert_restrict on storage.objects;
drop policy if exists item_images_owner_delete on storage.objects;
drop policy if exists item_images_owner_delete_restrict on storage.objects;
drop policy if exists item_images_no_update_restrict on storage.objects;

create policy item_images_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'item-images'
  and owner_id = auth.uid()::text
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);
create policy item_images_owner_select_restrict on storage.objects
as restrictive for select to public
using (
  bucket_id <> 'item-images'
  or (auth.uid() is not null and owner_id = auth.uid()::text)
);

create policy item_images_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'item-images'
  and owner_id = auth.uid()::text
  and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
);
create policy item_images_owner_insert_restrict on storage.objects
as restrictive for insert to authenticated
with check (
  bucket_id <> 'item-images'
  or (
    owner_id = auth.uid()::text
    and name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  )
);

create policy item_images_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'item-images'
  and owner_id = auth.uid()::text
);
create policy item_images_owner_delete_restrict on storage.objects
as restrictive for delete to authenticated
using (bucket_id <> 'item-images' or owner_id = auth.uid()::text);

-- This app never updates an uploaded object in place (uploads use upsert=false).
-- Deny object updates even if a broader policy exists for another bucket.
create policy item_images_no_update_restrict on storage.objects
as restrictive for update to public
using (bucket_id <> 'item-images')
with check (bucket_id <> 'item-images');

commit;
