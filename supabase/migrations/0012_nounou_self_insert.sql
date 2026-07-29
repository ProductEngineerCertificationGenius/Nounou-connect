-- ============================================================
-- 0012_nounou_self_insert.sql
-- Permet à une nounou de s'inscrire elle-même, sans être ajoutée
-- au préalable par une agence (feature de la branche feature-noah).
-- À exécuter après 0011_nounou_update_own_disponibilite.sql
--
-- NB : cette migration corrige plusieurs incompatibilités entre le
-- fichier d'origine (branche feature-noah) et le schéma réel
-- (0001_schema.sql) qui l'auraient fait échouer tel quel :
--   1. `agence_id` était NOT NULL (cf. 0001_schema.sql) — corrigé
--      ci-dessous par un ALTER, sinon tout INSERT avec agence_id
--      NULL est rejeté par la contrainte.
--   2. La colonne `ethnie` n'existe nulle part dans le schéma —
--      ajoutée ci-dessous, sinon l'INSERT échoue (colonne inconnue).
--   3. `create policy if not exists` n'est pas une syntaxe valide en
--      PostgreSQL (CREATE POLICY ne supporte pas IF NOT EXISTS) —
--      remplacé par un bloc DROP POLICY IF EXISTS + CREATE POLICY,
--      idempotent et rejouable sans erreur.
--   4. La fonction renvoyait un simple uuid, ce qui aurait demandé
--      un aller-retour supplémentaire côté frontend pour récupérer
--      la fiche. Elle renvoie maintenant la ligne complète, sur le
--      même modèle que claim_nounou_profile() (0005_nounou_telephone.sql).
-- ============================================================

-- ----------------------------------------------------------
-- [0] Ajustements de schéma nécessaires à l'auto-inscription
-- ----------------------------------------------------------
alter table nounous alter column agence_id drop not null;
alter table nounous add column if not exists ethnie text;

-- ----------------------------------------------------------
-- [1] Policy pour l'auto-inscription (agence_id = NULL)
-- ----------------------------------------------------------
drop policy if exists "nounous_insert_self" on nounous;
create policy "nounous_insert_self"
  on nounous for insert
  with check (
    auth.uid() = user_id
    and agence_id is null
  );

-- ----------------------------------------------------------
-- [2] Policy pour permettre à une nounou de mettre à jour son profil
-- ----------------------------------------------------------
drop policy if exists "nounous_update_self" on nounous;
create policy "nounous_update_self"
  on nounous for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------
-- [3] Policy pour permettre à une nounou de supprimer son compte
-- ----------------------------------------------------------
drop policy if exists "nounous_delete_self" on nounous;
create policy "nounous_delete_self"
  on nounous for delete
  using (user_id = auth.uid());

-- ----------------------------------------------------------
-- [4] Fonction pour l'auto-inscription (contourne RLS le temps de
-- l'insertion, SECURITY DEFINER comme claim_nounou_profile())
-- ----------------------------------------------------------
create or replace function nounou_self_register(
  p_phone text,
  p_nom text,
  p_quartier text,
  p_ethnie text default null
)
returns nounous
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_row nounous;
begin
  v_user_id := auth.uid();

  if v_user_id is null then
    raise exception 'Vous devez être authentifié pour vous inscrire.';
  end if;

  -- Idempotent : si un profil existe déjà pour cet utilisateur, on le
  -- renvoie tel quel plutôt que d'échouer (reconnexions suivantes).
  select * into v_row from nounous where user_id = v_user_id;
  if found then
    return v_row;
  end if;

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
  returning * into v_row;

  return v_row;
end;
$$;

grant execute on function nounou_self_register(text, text, text, text) to authenticated;

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
