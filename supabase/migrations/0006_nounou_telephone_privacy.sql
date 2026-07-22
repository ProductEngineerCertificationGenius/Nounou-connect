-- ============================================================
-- 0006_nounou_telephone_privacy.sql
-- Corrige une régression de confidentialité introduite par
-- 0005_nounou_telephone.sql : la policy "nounous_select_public"
-- (using (true)) rendait le nouveau champ `telephone` lisible par
-- N'IMPORTE QUI (y compris anonyme), au même titre que le nom ou le
-- tarif. À exécuter après 0005_nounou_telephone.sql.
-- ============================================================

-- ----------------------------------------------------------
-- 1. On restreint la lecture de la table `nounous` elle-même à
--    son agence propriétaire et à la nounou elle-même (une fois
--    rattachée). Le grand public perd l'accès direct à la table.
-- ----------------------------------------------------------
drop policy if exists "nounous_select_public" on nounous;

create policy "nounous_select_owner_or_agence"
  on nounous for select
  using (
    user_id = auth.uid()
    or agence_id in (select id from agences where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- 2. Vue publique sans les colonnes sensibles (telephone), pour le
--    parcours de recherche côté ménage / visiteurs anonymes. Les
--    vues s'exécutent avec les droits de leur propriétaire (le rôle
--    qui exécute cette migration, typiquement `postgres`), donc
--    elles contournent volontairement la policy restrictive
--    ci-dessus : c'est le mécanisme standard pour exposer un
--    sous-ensemble de colonnes "public safe" sans exposer la table.
-- ----------------------------------------------------------
create or replace view nounous_public as
select
  id, agence_id, nom, experience, langues, tarif, quartier,
  photo_url, disponible, note_moyenne, created_at
from nounous;

grant select on nounous_public to anon, authenticated;

-- ----------------------------------------------------------
-- 3. rechercher_agences() filtrait déjà sur `nounous` en interne.
--    Comme elle n'était PAS security definer, elle s'exécutait avec
--    les droits de l'appelant (souvent anonyme) : avec la nouvelle
--    policy restrictive, elle ne verrait plus aucune ligne `nounous`
--    et ne renverrait donc plus jamais d'agence. On la repasse en
--    SECURITY DEFINER : elle ne renvoie que des colonnes `agences`
--    (déjà publiques), donc aucune donnée nounou n'est exposée par
--    ce biais, seule la capacité de FILTRER dessus est restaurée.
-- ----------------------------------------------------------
create or replace function rechercher_agences(
  p_quartier text,
  p_besoin   text default null
)
returns setof agences
language sql
stable
security definer
set search_path = public
as $$
  select distinct a.*
  from agences a
  join nounous n on n.agence_id = a.id
  where n.disponible = true
    and n.quartier = p_quartier
    -- and (p_besoin is null or n.specialite = p_besoin)
  order by a.note_moyenne desc;
$$;

-- ----------------------------------------------------------
-- 4. Idem pour claim_nounou_profile (0005) : déjà SECURITY DEFINER,
--    aucun changement nécessaire ici, mentionné pour mémoire.
-- ----------------------------------------------------------

-- ============================================================
-- Frontend à mettre à jour en conséquence (déjà fait dans ce projet) :
-- - Pages PUBLIQUES (visibles par un ménage / visiteur non propriétaire)
--   doivent lire `nounous_public` et non `nounous` :
--     menage/NannyProfile.jsx, menage/AgencyProfile.jsx
-- - Pages PRIVÉES (l'agence gère son propre vivier, la nounou son
--   propre profil) continuent de lire `nounous` directement, la
--   nouvelle policy le permet toujours pour elles :
--     agence/NannyForm.jsx, agence/NannyPool.jsx, agence/Dashboard.jsx,
--     agence/RequestDetail.jsx, nounou/ProfileEdit.jsx,
--     nounou/Reviews.jsx, nounou/AssignmentHistory.jsx
--
-- Test à faire après exécution :
-- 1. Non connecté : select * from nounous;              -> vide/erreur RLS
-- 2. Non connecté : select * from nounous_public;        -> lignes visibles, pas de colonne telephone
-- 3. Non connecté : select rechercher_agences('Cocody'); -> fonctionne comme avant
-- 4. Connecté comme l'agence propriétaire : select * from nounous where agence_id = ...; -> visible, telephone inclus
-- ============================================================
