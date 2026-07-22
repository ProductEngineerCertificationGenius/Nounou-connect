-- ============================================================
-- 0007_calibrage_affichage.sql
-- Corrige les écarts trouvés entre le schéma (0001-0006) et ce que
-- les écrans du frontend attendent réellement (audit du 22/07/2026).
-- À exécuter après 0006_nounou_telephone_privacy.sql.
-- ============================================================

-- ----------------------------------------------------------
-- [1] Vue publique des agences : ajoute `note` (alias de
-- note_moyenne), `nbNounous` et `nbAvis`, attendus par
-- AgencyCard.jsx et AgencyProfile.jsx. `telephone` reste inclus :
-- c'est une donnée volontairement publique (bouton "Contacter" via
-- WhatsApp, cf. ADR 0005), contrairement au téléphone d'une nounou.
-- ----------------------------------------------------------
create or replace view agences_public as
select
  a.id,
  a.nom,
  a.telephone,
  a.quartier,
  a.description,
  a.photo_url,
  a.note_moyenne as note,
  count(distinct n.id) as "nbNounous",
  count(distinct av.id) as "nbAvis"
from agences a
left join nounous n on n.agence_id = a.id
left join avis av on av.nounou_id = n.id
group by a.id;

grant select on agences_public to anon, authenticated;

-- ----------------------------------------------------------
-- [2] Vue publique des nounous : ajoute `note` (alias de
-- note_moyenne), attendu par NannyCard.jsx / NannyProfile.jsx.
-- Redéfinition de la vue posée par 0006 (mêmes colonnes + note).
-- ----------------------------------------------------------
create or replace view nounous_public as
select
  id, agence_id, nom, experience, langues, tarif, quartier,
  photo_url, disponible, note_moyenne, created_at,
  note_moyenne as note
from nounous;

grant select on nounous_public to anon, authenticated;

-- ----------------------------------------------------------
-- [3] RLS manquante : une nounou connectée ne pouvait pas lire ses
-- propres demandes assignées (AssignmentHistory.jsx). Seules
-- l'agence et le ménage étaient couverts par la policy 0002.
-- ----------------------------------------------------------
create policy "demandes_select_nounou_assignee"
  on demandes for select
  using (
    nounou_assignee_id in (select id from nounous where user_id = auth.uid())
  );

-- ----------------------------------------------------------
-- [4] RLS manquante : ni l'agence ni la nounou assignée ne
-- pouvaient lire le nom du ménage lié à une demande (RequestsList,
-- RequestDetail, AssignmentHistory affichent tous un nom de
-- ménage) — la policy `menages_select_own` ne couvre que le
-- ménage lui-même.
--
-- ATTENTION : une policy sur `menages` qui interroge directement
-- `demandes` en sous-requête provoque une récursion infinie, car
-- la policy existante sur `demandes` (0002) interroge elle-même
-- `menages`. On casse le cycle avec une fonction SECURITY DEFINER :
-- exécutée avec les droits de son propriétaire (qui ignore la RLS
-- sur les tables qu'il possède), elle interroge `demandes`
-- directement sans redéclencher l'évaluation de policies dessus.
-- ----------------------------------------------------------
create or replace function menage_visible_via_demande(p_menage_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from demandes d
    where d.menage_id = p_menage_id
      and (
        d.agence_id in (select id from agences where user_id = auth.uid())
        or d.nounou_assignee_id in (select id from nounous where user_id = auth.uid())
      )
  );
$$;

create policy "menages_select_via_demande"
  on menages for select
  using (menage_visible_via_demande(id));

-- ============================================================
-- Tests à faire après exécution :
-- 1. select * from agences_public limit 1;  -> colonnes note/nbNounous/nbAvis présentes
-- 2. select * from nounous_public limit 1;  -> colonne note présente, telephone absente
-- 3. En tant que nounou connectée : select * from demandes
--    where nounou_assignee_id = <sa nounou_id>; -> visible
-- 4. En tant qu'agence connectée : select m.nom from demandes d
--    join menages m on m.id = d.menage_id where d.agence_id = <son id>;
--    -> nom visible (avant ce correctif : toujours null)
-- ============================================================
