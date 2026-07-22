-- ============================================================
-- 0001_schema.sql
-- Rôle 1 — Lead Backend / Schéma
-- À exécuter en premier, dans l'éditeur SQL de Supabase
-- (ou via `supabase db push` si vous utilisez la CLI).
-- ============================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------
-- Ménages
-- ----------------------------------------------------------
create table menages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  nom         text not null,
  telephone   text not null,
  quartier    text not null,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

-- ----------------------------------------------------------
-- Agences
-- ----------------------------------------------------------
create table agences (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  nom           text not null,
  telephone     text not null,
  quartier      text not null,
  description   text,
  photo_url     text,
  note_moyenne  numeric(2, 1) not null default 0,
  created_at    timestamptz not null default now(),
  unique (user_id)
);

-- ----------------------------------------------------------
-- Nounous
-- ----------------------------------------------------------
create table nounous (
  id          uuid primary key default gen_random_uuid(),
  agence_id   uuid not null references agences (id) on delete cascade,
  -- nullable : une nounou peut être créée par son agence sans avoir
  -- de compte propre (cf. cahier des charges §6, parcours Nounou)
  user_id     uuid references auth.users (id) on delete set null,
  nom         text not null,
  experience  text not null,
  langues     text[] not null default '{}',
  tarif       integer not null check (tarif >= 0),
  quartier    text not null,
  photo_url   text,
  disponible  boolean not null default true,
  note_moyenne numeric(2, 1) not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id)
);

create index idx_nounous_agence on nounous (agence_id);
create index idx_nounous_recherche on nounous (quartier, disponible);

-- ----------------------------------------------------------
-- Demandes (mise en relation ménage <-> agence)
-- ----------------------------------------------------------
create table demandes (
  id                 uuid primary key default gen_random_uuid(),
  agence_id          uuid not null references agences (id) on delete cascade,
  menage_id          uuid not null references menages (id) on delete cascade,
  nounou_assignee_id uuid references nounous (id) on delete set null,
  quartier           text not null,
  besoin             text not null,
  temps              text not null,
  logement            text not null,
  statut             text not null default 'En attente'
                        check (statut in ('En attente', 'Assignée')),
  date               timestamptz not null default now()
);

create index idx_demandes_agence on demandes (agence_id, statut);
create index idx_demandes_menage on demandes (menage_id);

-- ----------------------------------------------------------
-- Avis (notation post mise en relation)
-- ----------------------------------------------------------
create table avis (
  id          uuid primary key default gen_random_uuid(),
  nounou_id   uuid not null references nounous (id) on delete cascade,
  menage_id   uuid not null references menages (id) on delete cascade,
  note        integer not null check (note between 1 and 5),
  commentaire text,
  created_at  timestamptz not null default now()
);

create index idx_avis_nounou on avis (nounou_id);

-- ----------------------------------------------------------
-- Recherches (historique côté ménage)
-- ----------------------------------------------------------
create table recherches (
  id         uuid primary key default gen_random_uuid(),
  menage_id  uuid not null references menages (id) on delete cascade,
  quartier   text not null,
  besoin     text not null,
  temps      text not null,
  logement   text not null,
  date       timestamptz not null default now()
);

create index idx_recherches_menage on recherches (menage_id, date desc);

-- ============================================================
-- Fin 0001_schema.sql — Rôle 2 peut désormais activer la RLS
-- (voir 0002_rls.sql)
-- ============================================================
