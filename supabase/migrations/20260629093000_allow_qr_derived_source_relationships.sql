-- Allow v3 QR-derived source documents to be represented in the source graph.
-- The child source is the QR target document; the parent is the visual flyer/sign
-- whose QR crop produced the link.

do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.source_relationships'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%relationship_type%'
  limit 1;

  if constraint_name is not null then
    execute format(
      'alter table public.source_relationships drop constraint %I',
      constraint_name
    );
  end if;
end $$;

alter table public.source_relationships
  add constraint source_relationships_relationship_type_check
  check (
    relationship_type in (
      'index_links_parent_detail',
      'index_lists_resort_join',
      'resort_page_links_pdf',
      'resort_page_links_detail',
      'detail_page_links_menu',
      'secondary_enriches_disney_row',
      'qr_links_derived_source'
    )
  );
