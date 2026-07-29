-- ============================================================
-- 0021_photo_menage.sql
-- Ajoute la possibilité pour un ménage d'avoir une photo de profil
-- (jusqu'ici seules `agences` et `nounous` en avaient une, cf.
-- 0001_schema.sql / commentaire dans ProfilPage.tsx).
--
-- Deux ajouts nécessaires :
--
-- 1. `menages.photo_url` : la colonne n'existait pas.
--
-- 2. La fonction `storage_photo_est_proprietaire()`
--    (0009_storage_policy_stricte.sql) ne reconnaît que les chemins
--    `nounous/{id}` et `agences/{id}` dans le bucket "photos". Un
--    upload vers `menages/{id}` était donc silencieusement refusé
--    par la policy RLS du storage. On étend la fonction pour couvrir
--    ce 3e cas, en vérifiant que le ménage ciblé par le chemin
--    appartient bien à l'utilisateur connecté (menages.user_id).
-- ============================================================

alter table menages add column if not exists photo_url text;

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
  elsif v_type = 'menages' then
    return exists (
      select 1
      from menages m
      where m.id = v_id
        and m.user_id = auth.uid()
    );
  end if;

  return false;
end;
$$;

-- Les 3 policies (insert/update/delete, 0009_storage_policy_stricte.sql)
-- appellent déjà cette fonction sans rien connaître de plus : elles
-- profitent automatiquement du nouveau cas 'menages' ci-dessus, pas
-- besoin de les recréer.

-- Convention d'upload côté frontend :
--   supabase.storage.from('photos')
--     .upload(`menages/${menageId}/photo.jpg`, file, { upsert: true })
--   puis stocker l'URL publique obtenue dans menages.photo_url

-- ============================================================
-- Fin 0021_photo_menage.sql
-- ============================================================
