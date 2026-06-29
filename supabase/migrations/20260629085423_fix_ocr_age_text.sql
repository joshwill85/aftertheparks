-- Forward repair for historical OCR age text that was corrected in source fixtures.
-- The original bootstrap migrations are already applied in production, so keep the
-- data correction as an explicit follow-up migration.

update public.resort_activities
set description = replace(description, 'ages I2 and up', 'ages 12 and up')
where normalized_name in ('painting-experience', 'art-de-la-mosaique')
  and description like '%ages I2 and up%';

update public.resort_activity_editions
set description = replace(description, 'ages I2 and up', 'ages 12 and up')
where activity_catalog_id in (
    select id
    from public.activity_catalog
    where normalized_name in ('painting-experience', 'art-de-la-mosaique')
  )
  and description like '%ages I2 and up%';
