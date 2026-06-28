alter table public.content_corrections
  add column if not exists reporter_name text,
  add column if not exists reporter_email text,
  add column if not exists body text;

create index if not exists content_corrections_submitted_at_idx
  on public.content_corrections (submitted_at desc);
