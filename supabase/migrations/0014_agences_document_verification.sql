-- ============================================================
-- 0014_agences_document_verification.sql
-- Ajout : document justificatif d'existence de l'agence +
-- statut de vérification.
-- À exécuter après 0013_nounou_self_photo.sql.
--
-- ⚠️ PROPOSITION à valider/adapter par l'équipe backend avant
-- application. Rédigée côté frontend pour accompagner la
-- fonctionnalité "upload du document agence" (branche
-- feature/ajouts-manquants), car cette fonctionnalité n'était pas
-- prévue dans le cahier des charges initial (cf. doc/cahier-des-
-- charges.md, section MVP : "la vérification n'est pas réalisée
-- par l'équipe du produit"). À confirmer en équipe que ce
-- changement de scope est bien acté.
-- ============================================================

-- ----------------------------------------------------------
-- 1. Colonnes sur `agences`
-- ----------------------------------------------------------
alter table agences
  add column if not exists document_url text,
  add column if not exists document_uploaded_at timestamptz,
  add column if not exists statut_verification text
    not null default 'en_attente'
    check (statut_verification in ('en_attente', 'valide', 'refuse')),
  add column if not exists motif_refus text;

comment on column agences.document_url is
  'URL (privée, signée) du document justificatif uploadé dans le bucket documents-agences.';
comment on column agences.statut_verification is
  'en_attente : document envoyé, pas encore relu. valide / refuse : décision prise par un admin.';
comment on column agences.motif_refus is
  'Raison du refus communiquée à l''agence, si statut_verification = refuse.';

-- ----------------------------------------------------------
-- 2. Bucket Storage dédié, PRIVÉ (contrairement au bucket
--    `photos` de 0004_storage.sql qui est public). Un document
--    justificatif (RCCM, registre de commerce, pièce d'identité
--    du responsable...) ne doit pas être accessible par une URL
--    publique.
-- ----------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documents-agences', 'documents-agences', false)
on conflict (id) do nothing;

-- ----------------------------------------------------------
-- 3. Policies : seule l'agence propriétaire peut uploader / lire
--    / remplacer SON document. Convention de chemin :
--      documents-agences/agences/{agence_id}/{fichier}
-- ----------------------------------------------------------
create or replace function storage_document_agence_est_proprietaire(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_segments text[];
  v_id       uuid;
begin
  v_segments := storage.foldername(p_name);

  if v_segments[1] is distinct from 'agences' then
    return false;
  end if;

  begin
    v_id := v_segments[2]::uuid;
  exception when others then
    return false;
  end;

  return exists (
    select 1 from agences a
    where a.id = v_id
      and a.user_id = auth.uid()
  );
end;
$$;

create policy "documents_agences_lecture_proprietaire"
  on storage.objects for select
  using (
    bucket_id = 'documents-agences'
    and storage_document_agence_est_proprietaire(name)
  );

create policy "documents_agences_upload_proprietaire"
  on storage.objects for insert
  with check (
    bucket_id = 'documents-agences'
    and storage_document_agence_est_proprietaire(name)
  );

create policy "documents_agences_maj_proprietaire"
  on storage.objects for update
  using (
    bucket_id = 'documents-agences'
    and storage_document_agence_est_proprietaire(name)
  );

-- ----------------------------------------------------------
-- NOTE POUR L'ÉQUIPE BACKEND — non traité dans cette migration :
--
-- La revue (valider/refuser) d'un document par un admin n'a pas
-- de rôle "admin" dans le schéma actuel. Deux options possibles :
--   a) Ajouter une colonne `is_admin boolean` (ou une table
--      `admins`) + policies dédiées permettant à un admin de lire
--      tous les documents et de mettre à jour `statut_verification`.
--   b) Traiter la revue hors RLS, via le dashboard Supabase ou un
--      script utilisant la service_role key (ne passe pas par les
--      policies ci-dessus).
-- À trancher avant de construire l'écran de revue admin.
--
-- Convention d'upload côté frontend :
--   supabase.storage.from('documents-agences')
--     .upload(`agences/${agenceId}/document.pdf`, file, { upsert: true })
--   puis, comme le fichier est privé, récupérer une URL signée
--   temporaire pour l'afficher :
--   supabase.storage.from('documents-agences')
--     .createSignedUrl(`agences/${agenceId}/document.pdf`, 3600)
-- ============================================================
