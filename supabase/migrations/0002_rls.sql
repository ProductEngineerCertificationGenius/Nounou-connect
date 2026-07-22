-- ============================================================
-- 0002_rls.sql
-- Rôle 2 — Authentification & Sécurité
-- À exécuter après 0001_schema.sql.
-- Active la Row Level Security et pose une policy pour chaque
-- opération (select / insert / update / delete) sur chaque table.
-- ============================================================

-- ----------------------------------------------------------
-- Activation RLS sur toutes les tables
-- ----------------------------------------------------------
alter table menages    enable row level security;
alter table agences    enable row level security;
alter table nounous    enable row level security;
alter table demandes   enable row level security;
alter table avis       enable row level security;
alter table recherches enable row level security;

-- ----------------------------------------------------------
-- Menages : privé, un ménage ne voit / modifie que sa ligne
-- ----------------------------------------------------------
create policy "menages_select_own"
  on menages for select
  using (user_id = auth.uid());

create policy "menages_insert_own"
  on menages for insert
  with check (user_id = auth.uid());

create policy "menages_update_own"
  on menages for update
  using (user_id = auth.uid());

-- ----------------------------------------------------------
-- Agences : profil public en lecture, écriture réservée au propriétaire
-- ----------------------------------------------------------
create policy "agences_select_public"
  on agences for select
  using (true);

create policy "agences_insert_own"
  on agences for insert
  with check (user_id = auth.uid());

create policy "agences_update_own"
  on agences for update
  using (user_id = auth.uid());

-- ----------------------------------------------------------
-- Nounous : profil public en lecture, écriture réservée à l'agence
-- propriétaire (agence_id doit correspondre à l'agence de l'utilisateur)
-- ----------------------------------------------------------
create policy "nounous_select_public"
  on nounous for select
  using (true);

create policy "nounous_insert_own_agence"
  on nounous for insert
  with check (
    agence_id in (select id from agences where user_id = auth.uid())
  );

create policy "nounous_update_own_agence"
  on nounous for update
  using (
    agence_id in (select id from agences where user_id = auth.uid())
  );

create policy "nounous_delete_own_agence"
  on nounous for delete
  using (
    agence_id in (select id from agences where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- Demandes : visibles uniquement par l'agence concernée et le
-- ménage qui l'a créée. Le ménage crée, l'agence met à jour.
-- ----------------------------------------------------------
create policy "demandes_select_agence_ou_menage"
  on demandes for select
  using (
    agence_id in (select id from agences where user_id = auth.uid())
    or menage_id in (select id from menages where user_id = auth.uid())
  );

create policy "demandes_insert_menage"
  on demandes for insert
  with check (
    menage_id in (select id from menages where user_id = auth.uid())
  );

create policy "demandes_update_agence"
  on demandes for update
  using (
    agence_id in (select id from agences where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- Avis : lecture publique (affichés sur le profil nounou),
-- écriture réservée au ménage auteur, pas de update/delete au MVP
-- ----------------------------------------------------------
create policy "avis_select_public"
  on avis for select
  using (true);

create policy "avis_insert_menage"
  on avis for insert
  with check (
    menage_id in (select id from menages where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- Recherches : privé, un ménage ne voit / crée que ses propres
-- recherches
-- ----------------------------------------------------------
create policy "recherches_select_own"
  on recherches for select
  using (
    menage_id in (select id from menages where user_id = auth.uid())
  );

create policy "recherches_insert_own"
  on recherches for insert
  with check (
    menage_id in (select id from menages where user_id = auth.uid())
  );

-- ============================================================
-- Tests à exécuter avant de passer à la suite (via l'onglet
-- "Impersonate" du SQL editor, ou en se connectant réellement avec
-- deux comptes ménages distincts depuis l'app) :
--
-- 1. Ménage A ne doit PAS voir les recherches du Ménage B
-- 2. Agence A ne doit PAS pouvoir modifier une nounou de l'Agence B
-- 3. Un utilisateur non connecté doit pouvoir lire `agences`,
--    `nounous` et `avis`, mais rien d'autre
-- ============================================================
