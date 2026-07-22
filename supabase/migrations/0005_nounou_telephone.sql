-- ============================================================
-- 0005_nounou_telephone.sql
-- Corrige un trou du parcours Nounou : la table `nounous` n'avait
-- pas de colonne téléphone, donc aucun moyen de relier le compte
-- auth (créé à la 1ère connexion OTP) à la fiche créée par l'agence.
-- À exécuter après 0001-0004.
-- ============================================================

-- ----------------------------------------------------------
-- 1. Colonne téléphone sur nounous
-- ----------------------------------------------------------
alter table nounous add column if not exists telephone text;

-- Un même numéro ne doit correspondre qu'à une seule nounou (les
-- lignes sans téléphone renseigné restent autorisées en multiple,
-- un index unique partiel ignore les NULL).
create unique index if not exists idx_nounous_telephone
  on nounous (telephone)
  where telephone is not null;

-- NB : la colonne n'est pas mise en `not null` pour ne pas casser
-- les lignes existantes déjà en base. Pensez à renseigner le
-- téléphone des nounous déjà créées (via le nouveau champ du
-- formulaire agence, ou une UPDATE manuelle), puis à exécuter :
--   alter table nounous alter column telephone set not null;

-- ----------------------------------------------------------
-- 2. Fonction de rattachement du compte à la 1ère connexion
--
-- Une nounou est créée par son agence sans user_id (cf. 0001_schema).
-- Au premier login OTP réussi, le frontend appelle cette fonction :
-- elle relie automatiquement la ligne `nounous` correspondant au
-- numéro vérifié par Supabase Auth (auth.jwt() ->> 'phone') à
-- l'utilisateur qui vient de se connecter.
--
-- SECURITY DEFINER est nécessaire car la policy RLS "update" sur
-- nounous n'autorise que l'agence propriétaire — la nounou elle-même
-- n'a normalement pas le droit de modifier sa ligne. Ici on contourne
-- volontairement la RLS, mais de façon strictement bornée : on ne
-- touche qu'à UNE ligne, uniquement si son téléphone correspond
-- exactement au téléphone vérifié par Supabase Auth pour la session
-- en cours, et uniquement si elle n'est pas déjà rattachée.
-- ----------------------------------------------------------
create or replace function claim_nounou_profile()
returns nounous
language plpgsql
security definer
set search_path = public
as $$
declare
  v_phone_digits text;
  v_row nounous;
begin
  if auth.uid() is null then
    raise exception 'Utilisateur non authentifié';
  end if;

  -- On ne garde que les chiffres pour comparer, les deux formats
  -- (+225... côté frontend, 225... côté auth.users) doivent matcher.
  v_phone_digits := regexp_replace(coalesce(auth.jwt() ->> 'phone', ''), '\D', '', 'g');

  if v_phone_digits = '' then
    raise exception 'Aucun téléphone vérifié pour cette session';
  end if;

  -- Cas 1 : déjà rattachée (reconnexions suivantes) -> on la renvoie.
  select * into v_row from nounous where user_id = auth.uid();
  if found then
    return v_row;
  end if;

  -- Cas 2 : 1ère connexion -> on rattache la ligne créée par l'agence.
  update nounous
  set user_id = auth.uid()
  where user_id is null
    and telephone is not null
    and regexp_replace(telephone, '\D', '', 'g') = v_phone_digits
  returning * into v_row;

  return v_row; -- null si aucune ligne ne correspond
end;
$$;

grant execute on function claim_nounou_profile() to authenticated;

-- ============================================================
-- Test à faire après exécution (onglet SQL editor, impersonate) :
-- 1. Créer une nounou sans user_id avec un téléphone donné
-- 2. select claim_nounou_profile(); en tant qu'utilisateur authentifié
--    avec ce même téléphone vérifié -> doit renvoyer la ligne et la
--    lier définitivement
-- 3. Rejouer l'appel -> doit renvoyer la même ligne (déjà rattachée)
-- 4. Avec un autre téléphone -> doit renvoyer null
-- ============================================================
