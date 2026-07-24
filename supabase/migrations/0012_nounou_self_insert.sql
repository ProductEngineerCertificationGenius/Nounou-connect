-- ============================================================
-- 0012_nounou_self_insert.sql
-- Permet aux nounous de s'inscrire sans agence
-- À exécuter après 0011_nounou_update_own_disponibilite.sql
-- ============================================================

-- ----------------------------------------------------------
-- [1] Policy pour l'auto-inscription (agence_id = NULL)
-- ----------------------------------------------------------
create policy if not exists "nounous_insert_self"
  on nounous for insert
  with check (
    auth.uid() = user_id
    AND agence_id IS NULL
  );

-- ----------------------------------------------------------
-- [2] Policy pour permettre à une nounou de mettre à jour son profil
-- ----------------------------------------------------------
create policy if not exists "nounous_update_self"
  on nounous for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------
-- [3] Policy pour permettre à une nounou de supprimer son compte
-- ----------------------------------------------------------
create policy if not exists "nounous_delete_self"
  on nounous for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------
-- [4] Fonction pour l'auto-inscription (contourne RLS)
-- ----------------------------------------------------------
create or replace function nounou_self_register(
  p_phone text,
  p_nom text,
  p_quartier text,
  p_ethnie text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_nounou_id uuid;
begin
  -- Récupérer l'ID de l'utilisateur authentifié
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Vous devez être authentifié pour vous inscrire.';
  end if;

  -- Vérifier que l'utilisateur n'a pas déjà un profil
  if exists (select 1 from nounous where user_id = v_user_id) then
    raise exception 'Vous avez déjà un profil nounou.';
  end if;

  -- Créer le profil nounou (sans agence)
  insert into nounous (
    user_id,
    nom,
    telephone,
    quartier,
    ethnie,
    experience,
    langues,
    tarif,
    disponible,
    agence_id,
    created_at
  ) values (
    v_user_id,
    p_nom,
    p_phone,
    p_quartier,
    p_ethnie,
    'Non renseigné',
    array[]::text[],
    0,
    true,
    null,
    now()
  )
  returning id into v_nounou_id;

  return v_nounou_id;
exception
  when others then
    raise exception 'Erreur lors de l''inscription: %', SQLERRM;
end;
$$;

-- Accorder les droits d'exécution
grant execute on function nounou_self_register(text, text, text, text) to authenticated;
grant execute on function nounou_self_register(text, text, text, text) to anon;

-- ----------------------------------------------------------
-- [5] Vérification : afficher les policies existantes
-- ----------------------------------------------------------
select 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
from pg_policies 
where tablename = 'nounous'
order by policyname;