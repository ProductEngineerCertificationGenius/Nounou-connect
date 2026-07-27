-- ============================================================
-- 0013_nounou_self_photo.sql
-- Complète 0012_nounou_self_insert.sql : une nounou sans agence
-- doit pouvoir gérer sa propre photo, alors que la policy Storage
-- posée par 0009_storage_policy_stricte.sql ne reconnaît que
-- l'agence propriétaire comme uploadeur légitime.
-- À exécuter après 0012_nounou_self_insert.sql.
--
-- Principe : on ÉTEND storage_photo_est_proprietaire() pour qu'elle
-- reconnaisse un second cas légitime (nounou = propriétaire directe
-- de sa fiche, via n.user_id = auth.uid()), EN PLUS du cas existant
-- (agence propriétaire). Comme les 3 policies de 0009 appellent déjà
-- cette fonction par son nom (pas par sa définition), un simple
-- `create or replace function` suffit à propager le changement sans
-- toucher aux policies elles-mêmes, et sans rien retirer au cas
-- agence déjà en place :
--   - nounou créée par une agence (agence_id not null, user_id
--     éventuellement null tant que non réclamée) -> toujours gérée
--     uniquement par son agence, comme avant (aucun changement de
--     comportement pour ce cas).
--   - nounou auto-inscrite (agence_id null, user_id = son propre
--     auth.uid() dès la création, cf. nounou_self_register()) ->
--     désormais autorisée à uploader/remplacer/supprimer sa propre
--     photo.
-- ============================================================

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
      -- Cas 1 (inchangé) : agence propriétaire de la nounou.
      select 1
      from nounous n
      join agences a on a.id = n.agence_id
      where n.id = v_id
        and a.user_id = auth.uid()
    ) or exists (
      -- Cas 2 (nouveau) : nounou auto-inscrite, propriétaire directe
      -- de sa propre fiche (agence_id est alors null, cf. 0012).
      select 1
      from nounous n
      where n.id = v_id
        and n.user_id = auth.uid()
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

-- ============================================================
-- Vérification à faire après exécution (SQL editor, impersonate) :
-- 1. En tant qu'agence A, uploader une photo pour une nounou de son
--    vivier -> doit toujours fonctionner (cas 1, inchangé).
-- 2. En tant qu'agence A, tenter d'uploader une photo pour une
--    nounou de l'agence B -> doit toujours échouer.
-- 3. En tant que nounou auto-inscrite (user_id = auth.uid(),
--    agence_id null), uploader sa propre photo -> doit désormais
--    réussir (cas 2, nouveau).
-- 4. En tant que nounou auto-inscrite, tenter d'uploader la photo
--    d'une AUTRE nounou -> doit échouer.
-- ============================================================
