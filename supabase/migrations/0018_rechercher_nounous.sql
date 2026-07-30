-- ============================================================
-- 0018_rechercher_nounous.sql
-- Le parcours de recherche du ménage (RechercheNounou.tsx) affichait
-- des AGENCES correspondantes (RPC rechercher_agences, cf. 0006) au
-- lieu des NOUNOUS elles-mêmes. Or le besoin métier est : la famille
-- remplit le questionnaire puis voit directement les profils des
-- nounous disponibles (nom, quartier, expérience, tarif, note, photo)
-- et choisit celle qui l'intéresse — pas l'agence.
--
-- Cette fonction retourne des lignes de `nounous_public` (vue définie
-- en 0006_nounou_telephone_privacy.sql), qui expose déjà uniquement
-- les colonnes "safe" pour un visiteur non-propriétaire (pas de
-- téléphone). Comme la vue tourne déjà avec les droits de son
-- propriétaire (contourne RLS), la fonction n'a pas besoin d'être
-- SECURITY DEFINER pour ça, mais on le garde par cohérence avec
-- rechercher_agences() et pour se prémunir d'un futur changement de
-- propriétaire de la vue.
--
-- À exécuter après 0017_nounous_select_via_demande_affiliation.sql.
-- ============================================================

create or replace function rechercher_nounous(
  p_quartier text,
  p_besoin   text default null
)
returns setof nounous_public
language sql
stable
security definer
set search_path = public
as $$
  select np.*
  from nounous_public np
  where np.disponible = true
    and np.quartier = p_quartier
    -- `besoin` n'existe pas comme colonne sur `nounous` (pas de
    -- spécialité distincte dans le schéma actuel, cf. note similaire
    -- dans rechercher_agences) : le paramètre est accepté pour
    -- garder la même signature d'appel côté frontend, mais n'est pas
    -- encore utilisé comme filtre.
  order by np.note_moyenne desc nulls last;
$$;

grant execute on function rechercher_nounous(text, text) to anon, authenticated;

-- ----------------------------------------------------------
-- Appel depuis le frontend :
--   supabase.rpc('rechercher_nounous', { p_quartier, p_besoin })
-- ----------------------------------------------------------

-- ----------------------------------------------------------
-- Test à faire après exécution :
-- 1. Non connecté : select * from rechercher_nounous('Cocody');
--    -> renvoie les nounous disponibles à Cocody, sans téléphone.
-- ============================================================
