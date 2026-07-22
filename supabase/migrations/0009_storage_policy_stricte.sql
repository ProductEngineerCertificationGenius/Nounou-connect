-- ============================================================
-- 0009_storage_policy_stricte.sql
-- Rôle 4 — Durcissement de la policy Storage (bucket "photos")
-- À exécuter après 0008_security_definer_view_documentee.sql.
--
-- Problème corrigé : la policy d'origine (0004_storage.sql)
-- autorisait tout utilisateur connecté à uploader dans
-- {auth.uid()}/xxx.jpg, sans vérifier que le fichier concerne
-- bien une nounou (ou une agence) dont il est réellement
-- propriétaire. C'était une convention de nommage côté frontend,
-- pas une contrainte vérifiée par Postgres.
--
-- Nouvelle convention de chemin (à respecter côté frontend) :
--   photos/nounous/{nounou_id}/{fichier}
--   photos/agences/{agence_id}/{fichier}
--
-- La policy vérifie, via une jointure sur nounous/agences, que
-- l'agence propriétaire du nounou_id (ou de l'agence_id) dans le
-- chemin correspond bien à auth.uid().
-- ============================================================

-- On retire les anciennes policies d'écriture, trop permissives.
drop policy if exists "photos_upload_utilisateur_connecte" on storage.objects;
drop policy if exists "photos_maj_utilisateur_connecte" on storage.objects;

-- La lecture publique (0004_storage.sql) reste inchangée : les
-- photos doivent être visibles sans authentification dans l'app.

-- ----------------------------------------------------------
-- Fonction utilitaire : l'utilisateur connecté est-il bien
-- l'agence propriétaire de la ressource visée par le chemin ?
--   - foldername[1] = 'nounous' -> on vérifie via nounous.agence_id
--   - foldername[1] = 'agences' -> on vérifie directement agences.id
-- ----------------------------------------------------------
create or replace function storage_photo_est_proprietaire(p_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_segments text[];
  v_type     text;
  v_id       uuid;
begin
  v_segments := storage.foldername(p_name);
  v_type := v_segments[1];

  -- id invalide (pas un uuid) -> refus silencieux plutôt qu'exception
  begin
    v_id := v_segments[2]::uuid;
  exception when others then
    return false;
  end;

  if v_type = 'nounous' then
    return exists (
      select 1
      from nounous n
      join agences a on a.id = n.agence_id
      where n.id = v_id
        and a.user_id = auth.uid()
    );
  elsif v_type = 'agences' then
    return exists (
      select 1
      from agences a
      where a.id = v_id
        and a.user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

-- ----------------------------------------------------------
-- Upload : autorisé uniquement si l'agence connectée possède
-- effectivement la nounou (ou l'agence) ciblée par le chemin.
-- ----------------------------------------------------------
create policy "photos_upload_proprietaire_reel"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and storage_photo_est_proprietaire(name)
  );

-- ----------------------------------------------------------
-- Remplacement d'une photo existante : même règle.
-- ----------------------------------------------------------
create policy "photos_maj_proprietaire_reel"
  on storage.objects for update
  using (
    bucket_id = 'photos'
    and storage_photo_est_proprietaire(name)
  );

-- ----------------------------------------------------------
-- Suppression : alignée sur la même règle (absente de la
-- version 0004, ajoutée ici par cohérence).
-- ----------------------------------------------------------
create policy "photos_suppression_proprietaire_reel"
  on storage.objects for delete
  using (
    bucket_id = 'photos'
    and storage_photo_est_proprietaire(name)
  );

-- Convention d'upload côté frontend (mise à jour) :
--   supabase.storage.from('photos')
--     .upload(`nounous/${nounouId}/photo.jpg`, file, { upsert: true })
--   puis stocker l'URL publique obtenue dans nounous.photo_url
--
--   supabase.storage.from('photos')
--     .upload(`agences/${agenceId}/photo.jpg`, file, { upsert: true })
--   puis stocker l'URL publique obtenue dans agences.photo_url

-- ============================================================
-- Fin 0007_storage_policy_stricte.sql
-- ============================================================
