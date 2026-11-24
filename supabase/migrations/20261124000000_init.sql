-- Post-Assistent: Tabellen, Zugriffsschutz (Row Level Security) und Datei-Speicher.
--
-- Ausführen im Supabase-Dashboard unter "SQL Editor" (einmal, komplett)
-- oder mit der Supabase CLI: supabase db push
--
-- Grundregel: Jede Zeile gehört genau einem Nutzer (nutzer_id). Über die API (Rolle
-- "authenticated") sieht und ändert jeder Nutzer nur seine eigenen Zeilen und Dateien.
-- Die Rolle "anon" (nicht angemeldet) hat keinen Zugriff.

-- ---------------------------------------------------------------------------
-- Typen
-- ---------------------------------------------------------------------------

create type public.vorgang_status as enum ('offen', 'in_arbeit', 'erledigt');
create type public.dringlichkeit as enum ('niedrig', 'mittel', 'hoch');

-- ---------------------------------------------------------------------------
-- Tabellen
-- ---------------------------------------------------------------------------

-- Ein Vorgang = ein analysierter Brief.
create table public.vorgang (
  id                      uuid primary key default gen_random_uuid(),
  nutzer_id               uuid not null default auth.uid()
                            references auth.users (id) on delete cascade,
  absender                text not null,
  kategorie               text not null,
  zusammenfassung_einfach text not null,
  was_ist_zu_tun          text[] not null default '{}',
  -- frist: von der KI vorgeschlagen, bis der Nutzer sie bestätigt oder ändert.
  -- frist_bestaetigt = true heißt: Der Nutzer hat den Stand geprüft (auch "keine Frist").
  frist                   date,
  frist_bestaetigt        boolean not null default false,
  folgen_bei_nichtstun    text not null,
  dringlichkeit           public.dringlichkeit not null,
  status                  public.vorgang_status not null default 'offen',
  -- true, wenn die Analyse eine Beispiel-Antwort war (Beispielmodus ohne KI)
  beispiel                boolean not null default false,
  erstellt_am             timestamptz not null default now(),
  aktualisiert_am         timestamptz not null default now()
);

-- Eine Seite (Foto oder PDF) eines Briefs. Die Datei liegt im Storage-Bucket "dokumente".
create table public.dokument (
  id             uuid primary key default gen_random_uuid(),
  vorgang_id     uuid not null references public.vorgang (id) on delete cascade,
  nutzer_id      uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  seite          integer not null check (seite > 0),
  -- Pfad im Bucket: <nutzer_id>/<vorgang_id>/<seite>.<endung>
  speicherpfad   text not null unique,
  dateiname      text not null,
  mime_typ       text not null,
  groesse_bytes  bigint not null check (groesse_bytes >= 0),
  erstellt_am    timestamptz not null default now(),
  unique (vorgang_id, seite),
  -- Der Pfad muss im Ordner des Besitzers liegen (passt zur Storage-Regel unten)
  check (speicherpfad like nutzer_id::text || '/%')
);

-- Erinnerung an einen Vorgang (z. B. 3 Tage vor der Frist).
create table public.erinnerung (
  id             uuid primary key default gen_random_uuid(),
  vorgang_id     uuid not null references public.vorgang (id) on delete cascade,
  nutzer_id      uuid not null default auth.uid()
                   references auth.users (id) on delete cascade,
  erinnerung_am  timestamptz not null,
  nachricht      text,
  gesendet_am    timestamptz,
  erstellt_am    timestamptz not null default now()
);

-- Indizes für die Übersicht (nach Frist sortiert) und für Zugriffe über vorgang_id
create index vorgang_nutzer_frist_idx on public.vorgang (nutzer_id, status, frist);
create index dokument_vorgang_idx on public.dokument (vorgang_id);
create index dokument_nutzer_idx on public.dokument (nutzer_id);
create index erinnerung_vorgang_idx on public.erinnerung (vorgang_id);
create index erinnerung_nutzer_faellig_idx on public.erinnerung (nutzer_id, erinnerung_am)
  where gesendet_am is null;

-- aktualisiert_am automatisch pflegen
create function public.setze_aktualisiert_am()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.aktualisiert_am := now();
  return new;
end;
$$;

create trigger vorgang_aktualisiert_am
  before update on public.vorgang
  for each row execute function public.setze_aktualisiert_am();

-- ---------------------------------------------------------------------------
-- Zugriffsschutz (Row Level Security)
-- ---------------------------------------------------------------------------

alter table public.vorgang    enable row level security;
alter table public.dokument   enable row level security;
alter table public.erinnerung enable row level security;

-- Nicht angemeldete Nutzer (anon) bekommen gar keinen Zugriff; angemeldete nur über die Regeln unten.
revoke all on table public.vorgang, public.dokument, public.erinnerung from anon;
grant select, insert, update, delete
  on table public.vorgang, public.dokument, public.erinnerung to authenticated;

-- vorgang: nur eigene Zeilen
create policy vorgang_select on public.vorgang
  for select to authenticated
  using ((select auth.uid()) = nutzer_id);

create policy vorgang_insert on public.vorgang
  for insert to authenticated
  with check ((select auth.uid()) = nutzer_id);

create policy vorgang_update on public.vorgang
  for update to authenticated
  using ((select auth.uid()) = nutzer_id)
  with check ((select auth.uid()) = nutzer_id);

create policy vorgang_delete on public.vorgang
  for delete to authenticated
  using ((select auth.uid()) = nutzer_id);

-- dokument: nur eigene Zeilen, und nur zu eigenen Vorgängen
create policy dokument_select on public.dokument
  for select to authenticated
  using ((select auth.uid()) = nutzer_id);

create policy dokument_insert on public.dokument
  for insert to authenticated
  with check (
    (select auth.uid()) = nutzer_id
    and exists (
      select 1 from public.vorgang v
      where v.id = vorgang_id and v.nutzer_id = (select auth.uid())
    )
  );

create policy dokument_update on public.dokument
  for update to authenticated
  using ((select auth.uid()) = nutzer_id)
  with check (
    (select auth.uid()) = nutzer_id
    and exists (
      select 1 from public.vorgang v
      where v.id = vorgang_id and v.nutzer_id = (select auth.uid())
    )
  );

create policy dokument_delete on public.dokument
  for delete to authenticated
  using ((select auth.uid()) = nutzer_id);

-- erinnerung: nur eigene Zeilen, und nur zu eigenen Vorgängen
create policy erinnerung_select on public.erinnerung
  for select to authenticated
  using ((select auth.uid()) = nutzer_id);

create policy erinnerung_insert on public.erinnerung
  for insert to authenticated
  with check (
    (select auth.uid()) = nutzer_id
    and exists (
      select 1 from public.vorgang v
      where v.id = vorgang_id and v.nutzer_id = (select auth.uid())
    )
  );

create policy erinnerung_update on public.erinnerung
  for update to authenticated
  using ((select auth.uid()) = nutzer_id)
  with check (
    (select auth.uid()) = nutzer_id
    and exists (
      select 1 from public.vorgang v
      where v.id = vorgang_id and v.nutzer_id = (select auth.uid())
    )
  );

create policy erinnerung_delete on public.erinnerung
  for delete to authenticated
  using ((select auth.uid()) = nutzer_id);

-- ---------------------------------------------------------------------------
-- Datei-Speicher (Storage)
-- ---------------------------------------------------------------------------

-- Privater Bucket: Dateien sind nie öffentlich abrufbar, nur über kurzlebige signierte Links.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'dokumente',
  'dokumente',
  false,
  10485760, -- 10 MB je Datei
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Jeder Nutzer darf nur Dateien in seinem eigenen Ordner "<nutzer_id>/..." lesen und schreiben.
create policy dokumente_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy dokumente_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy dokumente_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy dokumente_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'dokumente'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
